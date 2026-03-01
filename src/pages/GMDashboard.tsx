import { useState, useEffect } from "react"
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

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
    if (!gm) return null

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">GM Dashboard</h1>
                        <p className="text-sm text-gray-500">Welcome, {gm.name}</p>
                    </div>
                </div>
                <button onClick={loadProfile} className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Scope", value: "Island-wide", icon: Globe, color: "bg-violet-100 text-violet-600" },
                    { label: "Total Regions", value: gm.regionCount, icon: MapPin, color: "bg-blue-100 text-blue-600" },
                    { label: "Total Outlets", value: gm.outletCount, icon: Building2, color: "bg-emerald-100 text-emerald-600" },
                    { label: "Your DGMs", value: gm.dgmCount, icon: Users, color: "bg-orange-100 text-orange-600" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Manage DGMs", icon: Users, to: "/gm/manage-dgms", color: "bg-violet-600 hover:bg-violet-700" },
                    { label: "View Feedbacks", icon: Star, to: "/gm/feedback", color: "bg-blue-600 hover:bg-blue-700" },
                    { label: "Closure Notices", icon: BellOff, to: "/gm/closure-notices", color: "bg-amber-600 hover:bg-amber-700" },
                ].map(action => (
                    <button key={action.label} onClick={() => navigate(action.to)}
                        className={`flex items-center gap-3 p-4 ${action.color} text-white rounded-2xl text-sm font-semibold transition-all shadow-sm`}>
                        <action.icon className="w-5 h-5" />
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
