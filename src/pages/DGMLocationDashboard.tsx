import { useState, useEffect } from "react"
import { AlertCircle, BarChart3, Users } from "lucide-react"
import api from "../config/api"
import BranchDashboardPage from "../admin/adminPages/BranchDashboardPage"
import RTOMPerformanceDashboard from "../components/RTOMPerformanceDashboard"

interface DGMProfile {
    id: string
    name: string
    provinceId: string
    provinceName: string
    outlets: { id: string; name: string; region?: { name: string } }[]
}

export default function DGMLocationDashboard() {
    const [dgmProfile, setDgmProfile] = useState<DGMProfile | null>(null)
    const [allOutlets, setAllOutlets] = useState<{ id: string; name: string; regionName: string }[]>([])
    const [loadingRegions, setLoadingRegions] = useState(true)
    const [regionError, setRegionError] = useState("")
    const [timeframe, setTimeframe] = useState('Today')
    const [viewMode, setViewMode] = useState<'outlets' | 'rtoms'>('rtoms') // Default to RTOM view

    const dgmToken = localStorage.getItem("dgmToken")

    // Fetch DGM profile and outlets
    useEffect(() => {
        const load = async () => {
            setLoadingRegions(true)
            try {
                const res = await api.get("/dgm/me", { headers: { Authorization: `Bearer ${dgmToken}` } })
                const profile: DGMProfile = res.data.dgm
                setDgmProfile(profile)
                
                // Convert outlets to the format expected by BranchDashboardPage
                const outlets = profile.outlets.map(outlet => ({
                    id: outlet.id,
                    name: outlet.name,
                    regionName: outlet.region?.name || profile.provinceName
                }))
                setAllOutlets(outlets)
                setRegionError("")
            } catch (err: any) {
                setRegionError("Failed to load your province data")
            } finally { setLoadingRegions(false) }
        }
        load()
    }, [dgmToken])

    if (loadingRegions) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading province data…</div>
    if (regionError) return (
        <div className="p-6 max-w-xl mx-auto mt-12 bg-white rounded-2xl border border-red-100 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />{regionError}
        </div>
    )
    if (allOutlets.length === 0 && viewMode === 'outlets') return (
        <div className="p-6 max-w-xl mx-auto mt-12 bg-white rounded-2xl border border-gray-100 text-center text-gray-500">
            No outlets found in your assigned province yet.
        </div>
    )

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Provincial Analytics Dashboard</h1>
                        <p className="text-sm text-gray-500">
                            Monitor performance across {dgmProfile?.provinceName} province 
                            {allOutlets.length > 0 && ` (${allOutlets.length} outlet${allOutlets.length !== 1 ? 's' : ''})`}
                        </p>
                    </div>
                    
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('rtoms')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'rtoms'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            RTOM Performance
                        </button>
                        <button
                            onClick={() => setViewMode('outlets')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'outlets'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Teleshop Analytics
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Conditional Rendering based on view mode */}
            {viewMode === 'rtoms' ? (
                <RTOMPerformanceDashboard 
                    timeframe={timeframe}
                    setTimeframe={setTimeframe}
                />
            ) : (
                <>
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Teleshop Analytics</h2>
                        <p className="text-sm text-gray-500">
                            View live analytics for teleshop outlets within your assigned province ({dgmProfile?.provinceName}).
                        </p>
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
