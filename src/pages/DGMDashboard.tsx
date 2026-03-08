import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { LayoutDashboard, Building2, Users, Star, RefreshCw, MapPin, BellOff } from "lucide-react"
import api from "../config/api"

interface Outlet { id: string; name: string; location: string; isActive: boolean; _count?: { officers: number } }
interface DGMRegion { id: string; name: string; outlets: Outlet[] }
interface DGMProfile { id: string; name: string; email?: string; mobileNumber: string; gmId: string; regionIds: string[]; regions: DGMRegion[] }

export default function DGMDashboard() {
    const navigate = useNavigate()
    const [dgm, setDGM] = useState<DGMProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const loadProfile = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("dgmToken")
            const res = await api.get("/dgm/me", { headers: { Authorization: `Bearer ${token}` } })
            setDGM(res.data.dgm)
        } catch (err: any) {
            if (err.response?.status === 401) { localStorage.removeItem("dgm"); localStorage.removeItem("dgmToken"); navigate("/dgm/login") }
            else setError("Failed to load profile")
        } finally { setLoading(false) }
    }

    useEffect(() => { loadProfile() }, [])

    const totalOutlets = dgm?.regions.reduce((sum, r) => sum + r.outlets.length, 0) || 0

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
                    { label: "Assigned Regions", value: dgm.regions.length, icon: MapPin, color: "bg-teal-100 text-teal-600" },
                    { label: "Total Outlets", value: totalOutlets, icon: Building2, color: "bg-emerald-100 text-emerald-600" },
                    { label: "My RTOMs", value: dgm.regions.length, icon: Users, color: "bg-orange-100 text-orange-600" },
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
                    { label: "Closure Notices", icon: BellOff, to: "/dgm/closure-notices", color: "bg-amber-600 hover:bg-amber-700" },
                ].map((action, i) => (
                    <motion.button key={action.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => navigate(action.to)}
                        className={`flex items-center gap-2 px-4 py-2.5 ${action.color} text-white rounded-xl text-sm font-semibold transition-all shadow-sm`}>
                        <action.icon className="w-4 h-4" />
                        {action.label}
                    </motion.button>
                ))}
            </div>

            {/* Regions & Outlets */}
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Assigned Regions</h2>
            {dgm.regions.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">No regions assigned yet.</div>
            )}
            <div className="space-y-4">
                {dgm.regions.map((region, ri) => (
                    <motion.div key={region.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + ri * 0.05 }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <MapPin className="w-4 h-4 text-teal-500" />
                            <p className="font-semibold text-slate-900">{region.name}</p>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{region.outlets.length} outlet{region.outlets.length !== 1 ? "s" : ""}</span>
                        </div>
                        {region.outlets.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {region.outlets.map(outlet => (
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
                ))}
            </div>
        </div>
    )
}