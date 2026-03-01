import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, X, CheckCircle, AlertCircle, Users, MapPin } from "lucide-react"
import api from "../config/api"

interface Region { id: string; name: string; assignedDgm?: { id: string; name: string } | null }
interface DGM {
    id: string; name: string; mobileNumber: string; email?: string
    gmId: string; regionIds: string[]; regionNames?: string[]; isActive: boolean; createdAt: string
}

export default function GMManageDGMs() {
    const [dgms, setDGMs] = useState<DGM[]>([])
    const [regions, setRegions] = useState<Region[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<DGM | null>(null)
    const [form, setForm] = useState({ name: "", mobileNumber: "", email: "", regionIds: [] as string[], isActive: true })
    const [submitting, setSubmitting] = useState(false)

    const token = localStorage.getItem("gmToken")

    const fetchData = async () => {
        setLoading(true)
        try {
            const [dgmsRes, regionsRes] = await Promise.all([
                api.get("/gm/dgms", { headers: { Authorization: `Bearer ${token}` } }),
                api.get("/gm/regions", { headers: { Authorization: `Bearer ${token}` } })
            ])
            setDGMs(dgmsRes.data.dgms || [])
            setRegions(regionsRes.data.regions || [])
            setError("")
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load data")
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const openCreate = () => { setEditing(null); setForm({ name: "", mobileNumber: "", email: "", regionIds: [], isActive: true }); setShowForm(true); setError(""); setSuccess("") }
    const openEdit = (d: DGM) => { setEditing(d); setForm({ name: d.name, mobileNumber: d.mobileNumber, email: d.email || "", regionIds: d.regionIds, isActive: d.isActive }); setShowForm(true); setError(""); setSuccess("") }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true)
        try {
            if (editing) {
                await api.put(`/gm/dgms/${editing.id}`, form, { headers: { Authorization: `Bearer ${token}` } })
                setSuccess("DGM updated")
            } else {
                await api.post("/gm/dgms", form, { headers: { Authorization: `Bearer ${token}` } })
                setSuccess("DGM created successfully")
            }
            setShowForm(false); fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Operation failed")
        } finally { setSubmitting(false) }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete DGM "${name}"?`)) return
        try {
            await api.delete(`/gm/dgms/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            setSuccess("DGM deleted"); fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to delete")
        }
    }

    const toggleRegion = (id: string) => setForm(f => ({
        ...f, regionIds: f.regionIds.includes(id) ? f.regionIds.filter(r => r !== id) : [...f.regionIds, id]
    }))

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-violet-600" />Manage DGMs</h1>
                    <p className="text-sm text-gray-500 mt-1">Create Deputy General Managers and assign them to regions.</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
                    <Plus className="w-4 h-4" /> Add DGM
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><X className="w-4 h-4" /></button>
                        <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? "Edit DGM" : "Create New DGM"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="e.g. Nimal Perera" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                                <input type="tel" value={form.mobileNumber} onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="e.g. 0771234567" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="e.g. nimal@slt.lk" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Regions</label>
                                <div className="border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                                    {regions.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No regions available</p>}
                                    {regions.map(r => {
                                        // The region carries global assignedDgm info from the backend
                                        const isTakenGlobally = r.assignedDgm && r.assignedDgm.id !== editing?.id
                                        const isTaken = !!isTakenGlobally
                                        const ownerName = r.assignedDgm?.name || "Unknown DGM"
                                        const isChecked = form.regionIds.includes(r.id)

                                        return (
                                            <label key={r.id} title={isTaken ? `Already assigned to ${ownerName}` : undefined}
                                                className={`flex items-center gap-2 rounded-lg p-1.5 ${isTaken ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
                                                <input type="checkbox" checked={isChecked} disabled={isTaken}
                                                    onChange={() => !isTaken && toggleRegion(r.id)} className="w-4 h-4 text-violet-600" />
                                                <span className="text-sm text-gray-700 flex items-center gap-1.5 flex-1">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />{r.name}
                                                </span>
                                                {isTaken && (
                                                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                                                        {ownerName}
                                                    </span>
                                                )}
                                            </label>
                                        )
                                    })}
                                </div>
                                {form.regionIds.length > 0 && <p className="text-xs text-violet-600 mt-1">{form.regionIds.length} region{form.regionIds.length > 1 ? "s" : ""} selected</p>}
                            </div>
                            {editing && (
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="dgmActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 text-violet-600" />
                                    <label htmlFor="dgmActive" className="text-sm font-medium text-gray-700">Active</label>
                                </div>
                            )}
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
                                    {submitting ? "Saving…" : editing ? "Update DGM" : "Create DGM"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-gray-400">Loading…</div>
            ) : dgms.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3" /><p>No DGMs yet. Create the first one.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Mobile</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Regions</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {dgms.map(d => (
                                <tr key={d.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{d.mobileNumber}</td>
                                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                                        {d.regionNames?.join(", ") || `${d.regionIds.length} region${d.regionIds.length !== 1 ? "s" : ""}`}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                            {d.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(d.id, d.name)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
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
