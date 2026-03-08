import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { LayoutDashboard, Users, Star, RefreshCw, Globe, MapPin, Building2, BellOff } from "lucide-react"
import api from "../config/api"

interface GMProfile { id: string; name: string; email?: string; mobileNumber: string; isActive: boolean; dgmCount: number; regionCount: number; outletCount: number }

export default function GMDashboard() {
    const navigate = useNavigate()
    const [gm, setGM] = useState<GMProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const loadProfile = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("gmToken")
            const res = await api.get("/gm/me", { headers: { Authorization: `Bearer ${token}` } })
            setGM(res.data.gm)
        } catch (err: any) {
            if (err.response?.status === 401) { localStorage.removeItem("gm"); localStorage.removeItem("gmToken"); navigate("/gm/login") }
            else setError("Failed to load profile")
        } finally { setLoading(false) }
    }

    useEffect(() => { loadProfile() }, [])

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
                    { label: "Scope", value: "Island-wide", icon: Globe, color: "bg-violet-100 text-violet-600" },
                    { label: "Total Regions", value: gm.regionCount, icon: MapPin, color: "bg-blue-100 text-blue-600" },
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

            {/* Quick Actions */}
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Manage DGMs", icon: Users, to: "/gm/manage-dgms", color: "bg-violet-600 hover:bg-violet-700" },
                    { label: "View Feedbacks", icon: Star, to: "/gm/feedback", color: "bg-indigo-600 hover:bg-indigo-700" },
                    { label: "Closure Notices", icon: BellOff, to: "/gm/closure-notices", color: "bg-amber-600 hover:bg-amber-700" },
                ].map((action, i) => (
                    <motion.button key={action.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07 }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => navigate(action.to)}
                        className={`flex items-center gap-3 p-4 ${action.color} text-white rounded-2xl text-sm font-semibold transition-all shadow-sm`}>
                        <action.icon className="w-5 h-5" />
                        {action.label}
                    </motion.button>
                ))}
            </div>
        </div>
    )
}