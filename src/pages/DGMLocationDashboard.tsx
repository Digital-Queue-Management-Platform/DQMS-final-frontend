import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import api from "../config/api"
import BranchDashboardPage from "../admin/adminPages/BranchDashboardPage"

interface Region { id: string; name: string; outlets: { id: string; name: string }[] }

export default function DGMLocationDashboard() {
    const [allOutlets, setAllOutlets] = useState<{ id: string; name: string; regionName: string }[]>([])
    const [loadingRegions, setLoadingRegions] = useState(true)
    const [regionError, setRegionError] = useState("")
    const [timeframe, setTimeframe] = useState('Today')

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
    }, [dgmToken])

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

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900">Regional Location Dashboard</h1>
                <p className="text-sm text-gray-500">View live analytics for outlets within your assigned regions.</p>
            </div>
            
            <BranchDashboardPage 
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                outlets={allOutlets}
            />
        </div>
    )
}
