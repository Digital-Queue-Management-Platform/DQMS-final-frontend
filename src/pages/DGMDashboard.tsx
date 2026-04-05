import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import api from "../config/api"
import BranchDashboardPage from "../admin/adminPages/BranchDashboardPage"
import { LayoutDashboard, Building2, Users, Star, RefreshCw, MapPin, Bell, Eye, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react"

interface Outlet { 
    id: string; 
    name: string; 
    location: string; 
    isActive: boolean; 
    _count?: { officers: number; tokens: number };
    region?: { name: string };
}

interface DGMProfile { 
    id: string; 
    name: string; 
    email?: string; 
    mobileNumber: string; 
    gmId: string; 
    provinceId?: string;
    provinceName?: string;
    outlets: Outlet[];
    rtomCount: number;
    outletCount: number;
}

export default function DGMDashboard() {
    const navigate = useNavigate()
    const [dgm, setDGM] = useState<DGMProfile | null>(null)
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
            const token = localStorage.getItem("dgmToken")
            const res = await api.get("/dgm/me", { headers: { Authorization: `Bearer ${token}` } })
            setDGM(res.data.dgm)
            // Load branches metrics after profile
            fetchBranchMetrics(res.data.dgm)
        } catch (err: any) {
            if (err.response?.status === 401) { localStorage.removeItem("dgm"); localStorage.removeItem("dgmToken"); navigate("/dgm/login") }
            else setError("Failed to load profile")
        } finally { setLoading(false) }
    }

    const fetchBranchMetrics = async (profile: DGMProfile) => {
        setBranchLoading(true)
        try {
            // Use outlets directly from DGM profile (province-based, no more nested regions)
            const outlets = profile.outlets || []
            if (outlets.length === 0) {
                setBranchData([])
                setBranchLoading(false)
                return
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

            const metrics = await Promise.all(outlets.map(async (o: any) => {
                try {
                    const aRes = await api.get('/dgm/analytics', { params: { outletId: o.id, startDate: start.toISOString(), endDate: end.toISOString() } })
                    const a = aRes.data || {}
                    const fb = a.feedbackStats || []
                    const totalFb = fb.reduce((s: number, f: any) => s + (f.count || f._count || 0), 0)
                    const avgR = totalFb > 0 ? fb.reduce((s: number, f: any) => s + (f.rating * (f.count || f._count || 0)), 0) / totalFb : 0
                    
                    return {
                        id: o.id,
                        name: o.name,
                        region: o.region?.name || profile.provinceName || 'Unassigned',
                        customersServed: a.totalTokens || 0,
                        avgWaitingTime: a.avgWaitTime || 0,
                        rating: Math.round(avgR * 10) / 10,
                        trend: (a.avgWaitTime || 0) > 15 ? 'up' : 'down'
                    }
                } catch {
                    return { id: o.id, name: o.name, region: o.region?.name || profile.provinceName || 'Unassigned', customersServed: 0, avgWaitingTime: 0, rating: 0, trend: 'down' }
                }
            }))
            setBranchData(metrics)
        } catch (err) {
            console.error("Failed to load branch metrics", err)
        } finally { setBranchLoading(false) }
    }

    useEffect(() => { 
        loadProfile() 
        const interval = setInterval(() => {
            if (dgm) fetchBranchMetrics(dgm)
        }, 60000)
        return () => clearInterval(interval)
    }, [timeframe])

    const totalOutlets = dgm?.outlets?.length || 0

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
        </div>
    )
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
    if (!dgm) return null

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">DGM Dashboard</h1>
                        <p className="text-sm text-slate-500">Welcome back, <span className="font-medium text-teal-600">{dgm.name}</span></p>
                    </div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadProfile}
                    className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl transition-colors">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </motion.button>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {[
                    { label: "Assigned Province", value: dgm.provinceName || "Not Assigned", icon: MapPin, color: "bg-teal-100 text-teal-600" },
                    { label: "Total Outlets", value: totalOutlets, icon: Building2, color: "bg-emerald-100 text-emerald-600" },
                    { label: "My RTOMs", value: dgm.rtomCount || 0, icon: Users, color: "bg-orange-100 text-orange-600" },
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

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
                {[
                    { label: "Manage RTOMs", icon: Users, to: "/dgm/manage-rtoms", color: "bg-teal-600 hover:bg-teal-700" },
                    { label: "View Feedbacks", icon: Star, to: "/dgm/feedback", color: "bg-indigo-600 hover:bg-indigo-700" },
                    { label: "Branch Notices", icon: Bell, to: "/dgm/closure-notices", color: "bg-amber-600 hover:bg-amber-700" },
                ].map((action, i) => (
                    <motion.button key={action.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => navigate(action.to)}
                        className={`flex items-center gap-2 px-4 py-2.5 ${action.color} text-white rounded-xl text-sm font-semibold transition-all shadow-sm`}>
                        <action.icon className="w-4 h-4" />
                        {action.label}
                    </motion.button>
                ))}
            </div>

            {/* Branch Performance Table */}
            <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-800">Branch Performance Overview</h2>
                        {branchLoading && <div className="animate-spin h-3 w-3 border-2 border-teal-600 border-t-transparent rounded-full" />}
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['Today', 'Weekly', 'Monthly', 'Annual'].map((tf) => (
                            <button key={tf} onClick={() => setTimeframe(tf)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${timeframe === tf ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
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
                                            className="inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-700 font-semibold text-sm transition-colors"
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

            {/* Province & Outlets */}
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Your Province</h2>
            {!dgm.provinceName && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">No province assigned yet.</div>
            )}
            {dgm.provinceName && (
                <div className="space-y-4">
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <MapPin className="w-4 h-4 text-teal-500" />
                            <p className="font-semibold text-slate-900">{dgm.provinceName}</p>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{totalOutlets} outlet{totalOutlets !== 1 ? "s" : ""}</span>
                        </div>
                        {dgm.outlets && dgm.outlets.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {dgm.outlets.map(outlet => (
                                    <div key={outlet.id} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5">
                                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{outlet.name}</p>
                                            <p className="text-xs text-slate-400 truncate">{outlet.location}</p>
                                        </div>
                                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full shrink-0 ${outlet.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                            {outlet.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Drill-down Branch Dashboard */}
            {showBranchDashboard && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-[1600px] mx-auto">
                        <div className="flex items-center justify-between mb-8 overflow-x-auto gap-4">
                            <button onClick={() => setShowBranchDashboard(false)}
                                className="flex-shrink-0 flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold transition-colors">
                                <ArrowLeft className="w-5 h-5" /> Back to Regional Overview
                            </button>
                            
                            <div className="flex-shrink-0 flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                {['Today', 'Weekly', 'Monthly', 'Annual'].map((tf) => (
                                    <button key={tf} onClick={() => setTimeframe(tf)}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${timeframe === tf ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
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