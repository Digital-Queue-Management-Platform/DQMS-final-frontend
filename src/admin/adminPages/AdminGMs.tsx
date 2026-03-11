import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, X, CheckCircle, AlertCircle, Users } from "lucide-react"
import api from "../../config/api"

interface GM {
    id: string; name: string; mobileNumber: string; email?: string
    isActive: boolean; createdAt: string
}

export default function AdminGMs() {
    const [gms, setGMs] = useState<GM[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editingGM, setEditingGM] = useState<GM | null>(null)
    const [form, setForm] = useState({ name: "", mobileNumber: "", email: "", isActive: true })
    const [submitting, setSubmitting] = useState(false)

    const adminToken = localStorage.getItem("adminToken") || localStorage.getItem("dq_jwt")

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get("/admin/gms", { headers: { Authorization: `Bearer ${adminToken}` } })
            setGMs(res.data.gms || [])
            setError("")
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load GMs")
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const openCreate = () => { setEditingGM(null); setForm({ name: "", mobileNumber: "", email: "", isActive: true }); setShowForm(true); setError(""); setSuccess("") }
    const openEdit = (gm: GM) => { setEditingGM(gm); setForm({ name: gm.name, mobileNumber: gm.mobileNumber, email: gm.email || "", isActive: gm.isActive }); setShowForm(true); setError(""); setSuccess("") }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true)
        try {
            if (editingGM) {
                await api.put(`/admin/gms/${editingGM.id}`, form, { headers: { Authorization: `Bearer ${adminToken}` } })
                setSuccess("GM updated successfully")
            } else {
                await api.post("/admin/gms", form, { headers: { Authorization: `Bearer ${adminToken}` } })
                setSuccess("GM created successfully")
            }
            setShowForm(false); fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Operation failed")
        } finally { setSubmitting(false) }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete GM "${name}"? This will also delete all their DGMs.`)) return
        try {
            await api.delete(`/admin/gms/${id}`, { headers: { Authorization: `Bearer ${adminToken}` } })
            setSuccess("GM deleted"); fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to delete GM")
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-violet-600" />General Managers</h1>
                    <p className="text-sm text-gray-500 mt-1">GMs are island-wide minor admins. They create and manage DGMs.</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
                    <Plus className="w-4 h-4" /> Add GM
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><X className="w-4 h-4" /></button>
                        <h2 className="text-lg font-bold text-gray-900 mb-5">{editingGM ? "Edit GM" : "Create New GM"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="e.g. Kamal Perera" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                                <input type="tel" value={form.mobileNumber} onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="e.g. 0771234567" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="e.g. kamal@slt.lk" />
                            </div>
                            {editingGM && (
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="gmActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 text-violet-600" />
                                    <label htmlFor="gmActive" className="text-sm font-medium text-gray-700">Active</label>
                                </div>
                            )}
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50">
                                    {submitting ? "Saving…" : editingGM ? "Update GM" : "Create GM"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-gray-400">Loading GMs…</div>
            ) : gms.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3" /><p>No GMs yet. Create the first one.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Mobile</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {gms.map(gm => (
                                <tr key={gm.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{gm.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{gm.mobileNumber}</td>
                                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{gm.email || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gm.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                            {gm.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            <button onClick={() => openEdit(gm)} className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(gm.id, gm.name)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                                        </div>
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
