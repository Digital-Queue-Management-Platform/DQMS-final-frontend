import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import api, { WS_URL } from "../config/api"
import Header2 from "../admin/adminComponents/branchDashboardComponents/Header2"
import OverviewCards from "../admin/adminComponents/branchDashboardComponents/OverviewCards"
import AnalyticsCharts from "../admin/adminComponents/branchDashboardComponents/AnalyticsCharts"
import AgentPerformance from "../admin/adminComponents/branchDashboardComponents/AgentPerformance"

interface Outlet { id: string; name: string; region?: { name: string } }

const NOT_SELECTED = "Not selected"

export default function GMLocationDashboard() {
    const [outlets, setOutlets] = useState<Outlet[]>([])
    const [loadingOutlets, setLoadingOutlets] = useState(true)
    const [outletError, setOutletError] = useState("")

    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedName, setSelectedName] = useState(NOT_SELECTED)
    const [hasSelected, setHasSelected] = useState(false)

    const [overview, setOverview] = useState({ totalCustomers: 0, avgWaitingTime: 0, avgServiceTime: 0, customerSatisfaction: 0 })
    const [analyticsData, setAnalyticsData] = useState({ hourlyWaitingTimes: [], serviceTypes: [], ratingDistribution: [] })
    const [tokenFlow, setTokenFlow] = useState<any[]>([])
    const [agents, setAgents] = useState<any[]>([])

    // Fetch ALL outlets island-wide (GMs have unrestricted access)
    useEffect(() => {
        const load = async () => {
            setLoadingOutlets(true)
            try {
                const res = await api.get("/queue/outlets")
                setOutlets(res.data || [])
            } catch (err: any) {
                setOutletError("Failed to load outlets")
            } finally { setLoadingOutlets(false) }
        }
        load()
    }, [])

    // Fetch analytics whenever outlet changes
    useEffect(() => {
        if (!selectedId || !hasSelected) return
        fetchData(selectedId)

        const interval = setInterval(() => fetchData(selectedId), 60000)
        const ws = new WebSocket(WS_URL)
        ws.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data)
                if (["TOKEN_COMPLETED", "NEW_TOKEN", "OFFICER_STATUS_CHANGE"].includes(d.type)) fetchData(selectedId)
            } catch { }
        }
        return () => { clearInterval(interval); try { ws.close() } catch { } }
    }, [selectedId, hasSelected])

    const fetchData = async (outletId: string) => {
        try {
            const start = new Date(); start.setHours(0, 0, 0, 0)
            const end = new Date(); end.setHours(23, 59, 59, 999)

            const res = await api.get("/admin/analytics", {
                params: { outletId, startDate: start.toISOString(), endDate: end.toISOString() }
            })
            const a = res.data || {}

            const fb = a.feedbackStats || []
            const total = fb.reduce((s: number, f: any) => s + (f._count || 0), 0)
            const avgFb = total > 0 ? fb.reduce((s: number, f: any) => s + f.rating * (f._count || 0), 0) / total : 0

            setOverview({
                totalCustomers: a.totalTokens || 0,
                avgWaitingTime: a.avgWaitTime || 0,
                avgServiceTime: a.avgServiceTime || 0,
                customerSatisfaction: Math.round(avgFb * 10) / 10
            })
            setAnalyticsData({
                ratingDistribution: (a.feedbackStats || []).map((f: any) => ({ rating: f.rating, count: f._count })),
                serviceTypes: a.serviceTypes || [],
                hourlyWaitingTimes: a.hourlyWaitingTimes || []
            })

            // Hourly token flow
            const hours: any[] = []
            for (let h = 8; h <= 17; h++) {
                const s = new Date(start); s.setHours(h, 0, 0, 0)
                const e2 = new Date(start); e2.setHours(h, 59, 59, 999)
                try {
                    const r = await api.get("/admin/analytics", { params: { outletId, startDate: s.toISOString(), endDate: e2.toISOString() } })
                    hours.push({ hour: `${String(h).padStart(2, "0")}:00`, issued: r.data.totalTokens || 0, completed: r.data.totalTokens || 0 })
                } catch { hours.push({ hour: `${String(h).padStart(2, "0")}:00`, issued: 0, completed: 0 }) }
            }
            setTokenFlow(hours)

            // Officers
            const agentsData = (a.officerPerformance || []).map((op: any) => ({
                id: op.officer?.id || Math.random().toString(36).slice(2),
                name: op.officer?.name || "Officer",
                status: op.officer?.status || "active",
                tokensHandled: op.tokensHandled || op._count || 0,
                avgServiceTime: op.avgServiceTime || 0,
                avgRating: op.avgRating || 0
            }))
            if (agentsData.length === 0) {
                try {
                    const q = await api.get(`/queue/outlet/${outletId}`)
                    const map = new Map<string, any>()
                        ; (q.data.inService || []).forEach((t: any) => {
                            if (t.officer) map.set(t.officer.id, { id: t.officer.id, name: t.officer.name, status: "serving", tokensHandled: 0, avgServiceTime: 0, avgRating: 0 })
                        })
                    setAgents(Array.from(map.values()))
                } catch { setAgents([]) }
            } else { setAgents(agentsData) }
        } catch (err) { console.error("GM location analytics error:", err) }
    }

    if (loadingOutlets) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading outlets…</div>
    if (outletError) return (
        <div className="p-6 max-w-xl mx-auto mt-12 bg-white rounded-2xl border border-red-100 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />{outletError}
        </div>
    )

    // Group outlets by region for the dropdown label: "Region – Outlet"
    const branchOptions = [NOT_SELECTED, ...outlets.map(o => o.region ? `${o.region.name} – ${o.name}` : o.name)]

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900">Location Dashboard</h1>
                <p className="text-sm text-gray-500">Select any outlet island-wide to view its live analytics.</p>
            </div>
            <Header2
                selectedBranch={selectedName}
                setSelectedBranch={(name) => {
                    setHasSelected(true)
                    if (name === NOT_SELECTED) { setSelectedId(null); setSelectedName(NOT_SELECTED); return }
                    // match by label "Region – Outlet" or plain name
                    const o = outlets.find(x => (x.region ? `${x.region.name} – ${x.name}` : x.name) === name)
                    if (o) setSelectedId(o.id)
                    setSelectedName(name)
                }}
                branchOptions={branchOptions}
            />
            {selectedId && (
                <>
                    <OverviewCards data={overview} />
                    <div className="mt-6">
                        <AnalyticsCharts data={analyticsData} tokenData={tokenFlow} outletId={selectedId} />
                        <AgentPerformance agents={agents} />
                    </div>
                </>
            )}
        </div>
    )
}
