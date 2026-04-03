import { useState, useEffect } from "react"
import { AlertCircle, BarChart3, Building2 } from "lucide-react"
import api from "../config/api"
import ProvinceDashboardPage from "../components/ProvinceDashboardPage"
import BranchDashboardPage from "../admin/adminPages/BranchDashboardPage"

interface Province { 
  id: string; 
  name: string; 
  dgm?: { name: string; id: string } 
}

export default function GMLocationDashboard() {
    const [provinces, setProvinces] = useState<Province[]>([])
    const [allOutlets, setAllOutlets] = useState<{ id: string; name: string; regionName: string }[]>([])
    const [loadingProvinces, setLoadingProvinces] = useState(true)
    const [provinceError, setProvinceError] = useState("")
    const [timeframe, setTimeframe] = useState('Today')
    const [viewMode, setViewMode] = useState<'provinces' | 'outlets'>('provinces') // Default to province view

    const gmToken = localStorage.getItem("gmToken")

    // Fetch GM's assigned provinces + teleshop outlets
    useEffect(() => {
        const load = async () => {
            setLoadingProvinces(true)
            try {
                const [provincesRes, outletsRes] = await Promise.all([
                    api.get("/gm/provinces", { headers: { Authorization: `Bearer ${gmToken}` } }),
                    api.get("/gm/outlets", { headers: { Authorization: `Bearer ${gmToken}` } })
                ])
                
                setProvinces(provincesRes.data?.provinces || [])
                setAllOutlets(outletsRes.data?.outlets || [])
                
            } catch (err: any) {
                setProvinceError("Failed to load provinces and teleshop outlets")
                console.error("GM data fetch error:", err)
            } finally { 
                setLoadingProvinces(false) 
            }
        }
        load()
    }, [gmToken])

    if (loadingProvinces) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading provinces…</div>
    if (provinceError) return (
        <div className="p-6 max-w-xl mx-auto mt-12 bg-white rounded-2xl border border-red-100 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />{provinceError}
        </div>
    )

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Regional Analytics Dashboard</h1>
                        <p className="text-sm text-gray-500">Monitor performance across your assigned regions and provinces</p>
                    </div>
                    
                    {/* View Toggle - Province Analytics First */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('provinces')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'provinces'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Province Analytics
                        </button>
                        <button
                            onClick={() => setViewMode('outlets')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'outlets'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Building2 className="w-4 h-4" />
                            Teleshop Analytics
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Conditional Rendering based on view mode */}
            {viewMode === 'provinces' ? (
                <>
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Province-Level Analytics</h2>
                        <p className="text-sm text-gray-500">View aggregated analytics for each province in your region.</p>
                    </div>
                    
                    <ProvinceDashboardPage 
                        timeframe={timeframe}
                        setTimeframe={setTimeframe}
                        provinces={provinces}
                    />
                </>
            ) : (
                <>
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Teleshop Analytics</h2>
                        <p className="text-sm text-gray-500">View live analytics for teleshop outlets within your assigned provinces.</p>
                    </div>
                    
                    <BranchDashboardPage 
                        timeframe={timeframe}
                        setTimeframe={setTimeframe}
                        outlets={allOutlets}
                    />
                </>
            )}
        </div>
    )
}
