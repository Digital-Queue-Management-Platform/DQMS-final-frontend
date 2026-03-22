import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import api from "../config/api"
import BranchDashboardPage from "../admin/adminPages/BranchDashboardPage"

interface Outlet { id: string; name: string; region?: { name: string } }

export default function GMLocationDashboard() {
    const [outlets, setOutlets] = useState<Outlet[]>([])
    const [loadingOutlets, setLoadingOutlets] = useState(true)
    const [outletError, setOutletError] = useState("")
    const [timeframe, setTimeframe] = useState('Today')

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

    if (loadingOutlets) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading outlets…</div>
    if (outletError) return (
        <div className="p-6 max-w-xl mx-auto mt-12 bg-white rounded-2xl border border-red-100 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />{outletError}
        </div>
    )

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900">Island-wide Location Dashboard</h1>
                <p className="text-sm text-gray-500">View live analytics for any outlet across the entire network.</p>
            </div>
            
            <BranchDashboardPage 
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                outlets={outlets}
            />
        </div>
    )
}
