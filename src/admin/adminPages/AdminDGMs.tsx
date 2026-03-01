import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, X, CheckCircle, AlertCircle, UserCheck, MapPin } from "lucide-react"
import api from "../../config/api"

interface GM { id: string; name: string }
interface Region { id: string; name: string }
interface DGM {
    id: string; name: string; mobileNumber: string; email?: string
    gmId: string; gm?: { id: string; name: string }
    regionIds: string[]; isActive: boolean; createdAt: string
}

export default function AdminDGMs() {
    const [dgms, setDGMs] = useState<DGM[]>([])
    const [gms, setGMs] = useState<GM[]>([])
    const [regions, setRegions] = useState<Region[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editingDGM, setEditingDGM] = useState<DGM | null>(null)
    const [form, setForm] = useState({ name: "", mobileNumber: "", email: "", gmId: "", regionIds: [] as string[], isActive: true })
    const [submitting, setSubmitting] = useState(false)

    const adminToken = localStorage.getItem("adminToken") || localStorage.getItem("dq_jwt")

    const fetchData = async () => {
        setLoading(true)
        try {
            const [dgmsRes, gmsRes, regionsRes] = await Promise.all([
                api.get("/admin/dgms", { headers: { Authorization: `Bearer ${adminToken}` } }),
                api.get("/admin/gms", { headers: { Authorization: `Bearer ${adminToken}` } }),
                api.get("/admin/managers", { headers: { Authorization: `Bearer ${adminToken}` } })
            ])
            setDGMs(dgmsRes.data.dgms || [])
            setGMs(gmsRes.data.gms || [])
            // /admin/managers returns { managers: [...] } where each item is a Region with id + name
            const rawRegions = regionsRes.data.managers || []
            setRegions(rawRegions.map((r: any) => ({ id: r.id, name: r.name })))
            setError("")
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load data")
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const openCreate = () => { setEditingDGM(null); setForm({ name: "", mobileNumber: "", email: "", gmId: "", regionIds: [], isActive: true }); setShowForm(true); setError(""); setSuccess("") }
    const openEdit = (dgm: DGM) => { setEditingDGM(dgm); setForm({ name: dgm.name, mobileNumber: dgm.mobileNumber, email: dgm.email || "", gmId: dgm.gmId, regionIds: dgm.regionIds, isActive: dgm.isActive }); setShowForm(true); setError(""); setSuccess("") }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true)
        try {
            if (editingDGM) {
                await api.put(`/admin/dgms/${editingDGM.id}`, form, { headers: { Authorization: `Bearer ${adminToken}` } })
                setSuccess("DGM updated successfully")
            } else {
                await api.post("/admin/dgms", form, { headers: { Authorization: `Bearer ${adminToken}` } })
                setSuccess("DGM created successfully")
            }
            setShowForm(false); fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Operation failed")
        } finally { setSubmitting(false) }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete DGM "${name}"? This cannot be undone.`)) return
        try {
            await api.delete(`/admin/dgms/${id}`, { headers: { Authorization: `Bearer ${adminToken}` } })
            setSuccess("DGM deleted"); fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to delete DGM")
        }
    }

    const toggleRegion = (id: string) => {
        setForm(f => ({ ...f, regionIds: f.regionIds.includes(id) ? f.regionIds.filter(r => r !== id) : [...f.regionIds, id] }))
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UserCheck className="w-6 h-6 text-teal-600" />Deputy General Managers</h1>
                    <p className="text-sm text-gray-500 mt-1">Create DGM accounts, assign them to a GM and their regions. DGMs manage RTOMs within their regions.</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors">
                    <Plus className="w-4 h-4" /> Add DGM
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

            {/* Form modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><X className="w-4 h-4" /></button>
                        <h2 className="text-lg font-bold text-gray-900 mb-5">{editingDGM ? "Edit DGM" : "Create New DGM"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="e.g. Nimal Silva" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                                <input type="tel" value={form.mobileNumber} onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="e.g. 0779876543" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="e.g. nimal@slt.lk" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Parent GM *</label>
                                <select value={form.gmId} onChange={e => setForm(f => ({ ...f, gmId: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none">
                                    <option value="">Select GM...</option>
                                    {gms.map(gm => <option key={gm.id} value={gm.id}>{gm.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Regions</label>
                                <div className="border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                                    {regions.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No regions available yet</p>}
                                    {regions.map((r: any) => {
                                        const isTakenGlobally = r.assignedDgm && r.assignedDgm.id !== editingDGM?.id
                                        const isTaken = !!isTakenGlobally
                                        const ownerName = r.assignedDgm?.name || "Unknown DGM"
                                        const isChecked = form.regionIds.includes(r.id)

                                        return (
                                            <label key={r.id} title={isTaken ? `Already assigned to ${ownerName}` : undefined} className={`flex items-center gap-2 rounded-lg p-1.5 ${isTaken ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
                                                <input type="checkbox" checked={isChecked} disabled={isTaken} onChange={() => !isTaken && toggleRegion(r.id)} className="w-4 h-4 text-teal-600" />
                                                <span className="text-sm text-gray-700 flex items-center gap-1.5 flex-1"><MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />{r.name}</span>
                                                {isTaken && (
                                                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                                                        {ownerName}
                                                    </span>
                                                )}
                                            </label>
                                        )
                                    })}
                                </div>
                                {form.regionIds.length > 0 && <p className="text-xs text-teal-600 mt-1">{form.regionIds.length} region{form.regionIds.length > 1 ? "s" : ""} selected</p>}
                            </div>
                            {editingDGM && (
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="dgmActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 text-teal-600" />
                                    <label htmlFor="dgmActive" className="text-sm font-medium text-gray-700">Active</label>
                                </div>
                            )}
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
                                    {submitting ? "Saving…" : editingDGM ? "Update DGM" : "Create DGM"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DGM table */}
            {loading ? (
                <div className="py-16 text-center text-gray-400">Loading DGMs…</div>
            ) : dgms.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
                    <UserCheck className="w-12 h-12 mx-auto mb-3" /><p>No DGMs yet. Create the first one.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Mobile</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">GM</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Regions</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {dgms.map(dgm => (
                                <tr key={dgm.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{dgm.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{dgm.mobileNumber}</td>
                                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{dgm.gm?.name || "—"}</td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <span className="text-teal-600 font-medium">{dgm.regionIds.length}</span> region{dgm.regionIds.length !== 1 ? "s" : ""}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dgm.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                            {dgm.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            <button onClick={() => openEdit(dgm)} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(dgm.id, dgm.name)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
