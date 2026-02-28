import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import api, { WS_URL } from "../config/api"
import Header2 from "../admin/adminComponents/branchDashboardComponents/Header2"
import OverviewCards from "../admin/adminComponents/branchDashboardComponents/OverviewCards"
import AnalyticsCharts from "../admin/adminComponents/branchDashboardComponents/AnalyticsCharts"
import AgentPerformance from "../admin/adminComponents/branchDashboardComponents/AgentPerformance"

interface Region { id: string; name: string; outlets: { id: string; name: string }[] }

const NOT_SELECTED = "Not selected"

export default function DGMLocationDashboard() {
    const [allOutlets, setAllOutlets] = useState<{ id: string; name: string; regionName: string }[]>([])
    const [loadingRegions, setLoadingRegions] = useState(true)
    const [regionError, setRegionError] = useState("")

    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedName, setSelectedName] = useState(NOT_SELECTED)
    const [hasSelected, setHasSelected] = useState(false)

    const [overview, setOverview] = useState({ totalCustomers: 0, avgWaitingTime: 0, avgServiceTime: 0, customerSatisfaction: 0 })
    const [analyticsData, setAnalyticsData] = useState({ hourlyWaitingTimes: [], serviceTypes: [], ratingDistribution: [] })
    const [tokenFlow, setTokenFlow] = useState<any[]>([])
    const [agents, setAgents] = useState<any[]>([])

    const dgmToken = localStorage.getItem("dgmToken")

    // Fetch DGM's assigned regions + outlets
    useEffect(() => {
        const load = async () => {
            setLoadingRegions(true)
            try {
                const res = await api.get("/dgm/rtoms", { headers: { Authorization: `Bearer ${dgmToken}` } })
                const r: Region[] = res.data.regions || []
                const flat = r.flatMap(region => region.outlets.map(o => ({ id: o.id, name: o.name, regionName: region.name })))
                setAllOutlets(flat)
            } catch (err: any) {
                setRegionError("Failed to load your regions")
            } finally { setLoadingRegions(false) }
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

            const res = await api.get("/dgm/analytics", {
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

            const hours: any[] = []
            for (let h = 8; h <= 17; h++) {
                const s = new Date(start); s.setHours(h, 0, 0, 0)
                const e2 = new Date(start); e2.setHours(h, 59, 59, 999)
                try {
                    const r = await api.get("/dgm/analytics", { params: { outletId, startDate: s.toISOString(), endDate: e2.toISOString() } })
                    hours.push({ hour: `${String(h).padStart(2, "0")}:00`, issued: r.data.totalTokens || 0, completed: r.data.totalTokens || 0 })
                } catch { hours.push({ hour: `${String(h).padStart(2, "0")}:00`, issued: 0, completed: 0 }) }
            }
            setTokenFlow(hours)

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
        } catch (err) { console.error("DGM location analytics error:", err) }
    }

    if (loadingRegions) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading regions…</div>
    if (regionError) return (
        <div className="p-6 max-w-xl mx-auto mt-12 bg-white rounded-2xl border border-red-100 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />{regionError}
        </div>
    )
    if (allOutlets.length === 0) return (
        <div className="p-6 max-w-xl mx-auto mt-12 bg-white rounded-2xl border border-gray-100 text-center text-gray-500">
            No outlets found in your assigned regions yet.
        </div>
    )

    const branchOptions = [NOT_SELECTED, ...allOutlets.map(o => `${o.regionName} – ${o.name}`)]

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900">Location Dashboard</h1>
                <p className="text-sm text-gray-500">Select an outlet from your assigned regions to view its live analytics.</p>
            </div>
            <Header2
                selectedBranch={selectedName}
                setSelectedBranch={(name) => {
                    setHasSelected(true)
                    if (name === NOT_SELECTED) { setSelectedId(null); setSelectedName(NOT_SELECTED); return }
                    const o = allOutlets.find(x => `${x.regionName} – ${x.name}` === name)
                    if (o) setSelectedId(o.id)
                    setSelectedName(name)
                }}
                branchOptions={branchOptions}
            />
            {selectedId && (
                <>
                    <OverviewCards data={overview} />
                    <div className="mt-6">
                        <AnalyticsCharts data={analyticsData} tokenData={tokenFlow} outletId={selectedId} apiEndpoint="/dgm/analytics" />
                        <AgentPerformance agents={agents} />
                    </div>
                </>
            )}
        </div>
    )
}
