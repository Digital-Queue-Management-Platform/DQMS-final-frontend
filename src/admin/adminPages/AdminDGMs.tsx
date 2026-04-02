import { useState, useEffect } from "react"
import { AlertCircle, UserCheck } from "lucide-react"
import api from "../../config/api"

interface DGM {
    id: string; name: string; mobileNumber: string; email?: string
    gmId: string; gm?: { id: string; name: string }
    provinceId?: string; province?: { id: string; name: string; regionId: string }
    regionIds: string[]; isActive: boolean; createdAt: string
}

export default function AdminDGMs() {
    const [dgms, setDGMs] = useState<DGM[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const adminToken = localStorage.getItem("adminToken") || localStorage.getItem("dq_jwt")

    const fetchData = async () => {
        setLoading(true)
        try {
            const dgmsRes = await api.get("/admin/dgms", { headers: { Authorization: `Bearer ${adminToken}` } })
            setDGMs(dgmsRes.data.dgms || [])
            setError("")
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load data")
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UserCheck className="w-6 h-6 text-teal-600" />Deputy General Managers</h1>
                    <p className="text-sm text-gray-500 mt-1">View DGM accounts. DGMs are created and managed by their respective GMs.</p>
                </div>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

            {/* DGM table */}
            {loading ? (
                <div className="py-16 text-center text-gray-400">Loading DGMs…</div>
            ) : dgms.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-gray-400">
                    <UserCheck className="w-12 h-12 mx-auto mb-3" /><p>No DGMs created yet.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Mobile</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">GM</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Province</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {dgms.map(dgm => (
                                <tr key={dgm.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{dgm.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{dgm.mobileNumber}</td>
                                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{dgm.gm?.name || "—"}</td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        {dgm.province ? (
                                            <span className="text-teal-600 font-medium">
                                                {dgm.province.name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">No Province Assigned</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dgm.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                            {dgm.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}