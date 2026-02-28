import { useState, useEffect } from "react"
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

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
    if (!dgm) return null

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">DGM Dashboard</h1>
                        <p className="text-sm text-gray-500">Welcome, {dgm.name}</p>
                    </div>
                </div>
                <button onClick={loadProfile} className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {[
                    { label: "Assigned Regions", value: dgm.regions.length, icon: MapPin, color: "bg-teal-100 text-teal-600" },
                    { label: "Total Outlets", value: totalOutlets, icon: Building2, color: "bg-emerald-100 text-emerald-600" },
                    { label: "My RTOMs", value: dgm.regions.length, icon: Users, color: "bg-orange-100 text-orange-600" },
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
            <div className="flex flex-wrap gap-3 mb-8">
                {[
                    { label: "Manage RTOMs", icon: Users, to: "/dgm/manage-rtoms", color: "bg-teal-600 hover:bg-teal-700" },
                    { label: "View Feedbacks", icon: Star, to: "/dgm/feedback", color: "bg-blue-600 hover:bg-blue-700" },
                    { label: "Closure Notices", icon: BellOff, to: "/dgm/closure-notices", color: "bg-amber-600 hover:bg-amber-700" },
                ].map(action => (
                    <button key={action.label} onClick={() => navigate(action.to)}
                        className={`flex items-center gap-2 px-4 py-2.5 ${action.color} text-white rounded-xl text-sm font-semibold transition-all shadow-sm`}>
                        <action.icon className="w-4 h-4" />
                        {action.label}
                    </button>
                ))}
            </div>

            {/* Regions & Outlets */}
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Assigned Regions</h2>
            {dgm.regions.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">No regions assigned yet.</div>
            )}
            <div className="space-y-4">
                {dgm.regions.map(region => (
                    <div key={region.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <MapPin className="w-4 h-4 text-teal-500" />
                            <p className="font-semibold text-gray-900">{region.name}</p>
                            <span className="text-xs text-gray-400">{region.outlets.length} outlet{region.outlets.length !== 1 ? "s" : ""}</span>
                        </div>
                        {region.outlets.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {region.outlets.map(o => (
                                    <span key={o.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${o.isActive ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
                                        <Building2 className="w-3 h-3" />{o.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
