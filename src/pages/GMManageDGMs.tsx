import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, X, CheckCircle, AlertCircle, Users } from "lucide-react"
import api from "../config/api"

interface Region { id: string; name: string; provinces: Province[] }
interface Province { id: string; name: string; regionId: string }
interface DGM {
    id: string; name: string; mobileNumber: string; email?: string
    gmId: string; provinceId?: string; province?: { id: string; name: string; regionId: string }
    regionIds: string[]; isActive: boolean; createdAt: string
}

export default function GMManageDGMs() {
    const [dgms, setDGMs] = useState<DGM[]>([])
    const [regions, setRegions] = useState<Region[]>([])
    const [provinces, setProvinces] = useState<Province[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<DGM | null>(null)
    const [form, setForm] = useState({ 
        name: "", 
        mobileNumber: "", 
        email: "", 
        selectedRegionId: "",
        provinceId: "", 
        isActive: true 
    })
    const [submitting, setSubmitting] = useState(false)

    const token = localStorage.getItem("gmToken")

    const fetchData = async () => {
        setLoading(true)
        try {
            const [dgmsRes, regionsRes, provincesRes] = await Promise.all([
                api.get("/gm/dgms", { headers: { Authorization: `Bearer ${token}` } }),
                api.get("/gm/regions", { headers: { Authorization: `Bearer ${token}` } }),
                api.get("/gm/provinces", { headers: { Authorization: `Bearer ${token}` } })
            ])
            setDGMs(dgmsRes.data.dgms || [])
            setRegions(regionsRes.data.regions || [])
            setProvinces(provincesRes.data.provinces || [])
            setError("")
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load data")
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    // Filter provinces by selected region
    const filteredProvinces = provinces.filter(p => p.regionId === form.selectedRegionId)

    const openCreate = () => { 
        setEditing(null); 
        setForm({ 
            name: "", 
            mobileNumber: "", 
            email: "", 
            selectedRegionId: "",
            provinceId: "", 
            isActive: true 
        }); 
        setShowForm(true); 
        setError(""); 
        setSuccess("") 
    }
    const openEdit = (d: DGM) => { 
        setEditing(d); 
        setForm({ 
            name: d.name, 
            mobileNumber: d.mobileNumber, 
            email: d.email || "", 
            selectedRegionId: d.province?.regionId || "",
            provinceId: d.provinceId || "", 
            isActive: d.isActive 
        }); 
        setShowForm(true); 
        setError(""); 
        setSuccess("") 
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true)
        try {
            const submitData = {
                name: form.name,
                mobileNumber: form.mobileNumber,
                email: form.email,
                provinceId: form.provinceId,
                isActive: form.isActive
            }

            if (editing) {
                await api.put(`/gm/dgms/${editing.id}`, submitData, { headers: { Authorization: `Bearer ${token}` } })
                setSuccess("DGM updated")
            } else {
                await api.post("/gm/dgms/province-assignment", submitData, { headers: { Authorization: `Bearer ${token}` } })
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

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-violet-600" />Manage DGMs</h1>
                    <p className="text-sm text-gray-500 mt-1">Create and manage Deputy General Managers. Assign them to provinces within your region.</p>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                                <select 
                                    value={form.selectedRegionId} 
                                    onChange={e => setForm(f => ({ 
                                        ...f, 
                                        selectedRegionId: e.target.value, 
                                        provinceId: "" // Reset province when region changes
                                    }))} 
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none">
                                    <option value="">Select Region...</option>
                                    {regions.map(region => 
                                        <option key={region.id} value={region.id}>{region.name}</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
                                <select 
                                    value={form.provinceId} 
                                    onChange={e => setForm(f => ({ ...f, provinceId: e.target.value }))} 
                                    required
                                    disabled={!form.selectedRegionId}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                                    <option value="">Select Province...</option>
                                    {filteredProvinces.map(province => 
                                        <option key={province.id} value={province.id}>{province.name}</option>
                                    )}
                                </select>
                                {!form.selectedRegionId && (
                                    <p className="text-xs text-gray-500 mt-1">Select a region first to see provinces</p>
                                )}
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
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3" /><p>No DGMs yet. Create the first one.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Mobile</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Province</th>
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
                                        {d.province ? (
                                            <span className="text-violet-600 font-medium">{d.province.name}</span>
                                        ) : (
                                            <span className="text-gray-400">No Province Assigned</span>
                                        )}
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
