import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import api from "../config/api"
import BranchDashboardPage from "../admin/adminPages/BranchDashboardPage"
import { LayoutDashboard, Users, Star, RefreshCw, Globe, MapPin, Building2, Eye, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react"

interface GMProfile { 
    id: string; 
    name: string; 
    email?: string; 
    mobileNumber: string; 
    isActive: boolean; 
    dgmCount: number; 
    regionCount: number; 
    outletCount: number;
    regionId?: string;
    regionName?: string;
}

export default function GMDashboard() {
    const navigate = useNavigate()
    const [gm, setGM] = useState<GMProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [branchData, setBranchData] = useState<any[]>([])
    const [branchLoading, setBranchLoading] = useState(false)
    const [showBranchDashboard, setShowBranchDashboard] = useState(false)
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
    const [selectedBranchName, setSelectedBranchName] = useState<string | null>(null)
    const [timeframe, setTimeframe] = useState('Today')

    const loadProfile = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("gmToken")
            const res = await api.get("/gm/me", { headers: { Authorization: `Bearer ${token}` } })
            setGM(res.data.gm)
            // Load branches metrics after profile
            fetchBranchMetrics()
        } catch (err: any) {
            if (err.response?.status === 401) { localStorage.removeItem("gm"); localStorage.removeItem("gmToken"); navigate("/gm/login") }
            else setError("Failed to load profile")
        } finally { setLoading(false) }
    }

    const fetchBranchMetrics = async () => {
        setBranchLoading(true)
        try {
            // Use GM-specific outlets endpoint (region-filtered)
            const res = await api.get('/gm/outlets')
            console.log('GM outlets response:', res.data)
            const outlets = res.data?.outlets || []  // Handle {success: true, outlets: [...]} structure
            
            if (!Array.isArray(outlets)) {
                console.error('Expected outlets array, got:', outlets)
                throw new Error('Invalid outlets data structure')
            }
            
            const start = new Date()
            const end = new Date()
            end.setHours(23, 59, 59, 999)

            if (timeframe === 'Today') {
                start.setHours(0, 0, 0, 0)
            } else if (timeframe === 'Weekly') {
                start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0)
            } else if (timeframe === 'Monthly') {
                start.setMonth(start.getMonth() - 1); start.setHours(0, 0, 0, 0)
            } else if (timeframe === 'Annual') {
                start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0)
            }

            // Get region-wide analytics once
            const aRes = await api.get('/gm/analytics', { 
                params: { 
                    startDate: start.toISOString(), 
                    endDate: end.toISOString()
                } 
            })
            const a = aRes.data || {}
            const fb = a.feedbackStats || []
            const totalFb = fb.reduce((s: number, f: any) => s + (f.count || f._count || 0), 0)
            const avgR = totalFb > 0 ? fb.reduce((s: number, f: any) => s + (f.rating * (f.count || f._count || 0)), 0) / totalFb : 0
            
            // Distribute region data across outlets
            const metrics = outlets.map((o: any) => ({
                id: o.id,
                name: o.name,
                region: o.region?.name || 'Unassigned',
                customersServed: Math.floor((a.totalTokens || 0) / outlets.length), // Distribute region total
                avgWaitingTime: a.avgWaitTime || 0,
                rating: Math.round(avgR * 10) / 10,
                trend: (a.avgWaitTime || 0) > 15 ? 'up' : 'down'
            }))
            
            console.log('GM Branch Metrics:', { 
                totalTokens: a.totalTokens, 
                avgWaitTime: a.avgWaitTime, 
                rating: avgR,
                outletsCount: outlets.length 
            })
            setBranchData(metrics)
        } catch (err) {
            console.error("Failed to load branch metrics", err)
            setBranchData([])  // Set empty array on error
        } finally { setBranchLoading(false) }
    }

    useEffect(() => { 
        loadProfile()
        const interval = setInterval(() => {
            fetchBranchMetrics()
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    // Refetch data when timeframe changes
    useEffect(() => {
        if (gm) {  // Only fetch if GM is loaded
            fetchBranchMetrics()
        }
    }, [timeframe])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
        </div>
    )
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
    if (!gm) return null

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">GM Dashboard</h1>
                        <p className="text-sm text-slate-500">Welcome back, <span className="font-medium text-violet-600">{gm.name}</span></p>
                    </div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadProfile}
                    className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </motion.button>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Scope", value: gm.regionName || "Region-wide", icon: MapPin, color: "bg-violet-100 text-violet-600" },
                    { label: "Assigned Region", value: gm.regionName || "Not Assigned", icon: Globe, color: "bg-blue-100 text-blue-600" },
                    { label: "Total Outlets", value: gm.outletCount, icon: Building2, color: "bg-emerald-100 text-emerald-600" },
                    { label: "Your DGMs", value: gm.dgmCount, icon: Users, color: "bg-orange-100 text-orange-600" },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Branch Performance Table */}
            <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-800">Branch Performance Overview</h2>
                        {branchLoading && <div className="animate-spin h-3 w-3 border-2 border-violet-600 border-t-transparent rounded-full" />}
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['Today', 'Weekly', 'Monthly', 'Annual'].map((tf) => (
                            <button key={tf} onClick={() => setTimeframe(tf)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${timeframe === tf ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Branch</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Region</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Served</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Avg Wait</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Rating</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {branchData.map(branch => (
                                <tr key={branch.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900">{branch.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-500">{branch.region}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">{branch.customersServed}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-700">{branch.avgWaitingTime}m</span>
                                            {branch.trend === 'up' ? <TrendingUp className="w-4 h-4 text-red-500" /> : <TrendingDown className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                            <span className="font-medium text-slate-900">{branch.rating}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => {
                                                setSelectedBranchId(branch.id)
                                                setSelectedBranchName(branch.name)
                                                setShowBranchDashboard(true)
                                            }}
                                            className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 font-semibold text-sm transition-colors"
                                        >
                                            <Eye className="w-4 h-4" /> View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drill-down Branch Dashboard */}
            {showBranchDashboard && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-[1600px] mx-auto">
                        <div className="flex items-center justify-between mb-8 overflow-x-auto gap-4">
                            <button onClick={() => setShowBranchDashboard(false)}
                                className="flex-shrink-0 flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold transition-colors">
                                <ArrowLeft className="w-5 h-5" /> Back to Overview
                            </button>
                            
                            <div className="flex-shrink-0 flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                {['Today', 'Weekly', 'Monthly', 'Annual'].map((tf) => (
                                    <button key={tf} onClick={() => setTimeframe(tf)}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${timeframe === tf ? 'bg-violet-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <BranchDashboardPage 
                            timeframe={timeframe} 
                            setTimeframe={setTimeframe}
                            initialBranchId={selectedBranchId}
                            initialBranchName={selectedBranchName}
                            outlets={branchData.map(b => ({ id: b.id, name: b.name }))}
                        />
                    </div>
                </motion.div>
            )}
        </div>
    )
}