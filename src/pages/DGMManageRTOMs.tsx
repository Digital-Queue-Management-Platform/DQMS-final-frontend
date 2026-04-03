import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, X, CheckCircle, AlertCircle, Users, MapPin, Building2, Copy } from "lucide-react"
import api from "../config/api"

interface RTOM {
    id: string
    name: string
    email?: string
    mobileNumber: string
    isActive: boolean
    lastLoginAt?: string
    createdAt: string
    teleshopManagers: { id: string; name: string; mobileNumber: string; isActive: boolean }[]
}

interface Region {
    id: string
    name: string
    outlets: { id: string; name: string; isActive: boolean }[]
    rtoms: RTOM[]
}

interface RTOMForm { regionId: string; name: string; mobileNumber: string; email: string }
interface RTOMCredentials { name: string; mobileNumber: string; email?: string; regionName: string }

export default function DGMManageRTOMs() {
    const [regions, setRegions] = useState<Region[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editingRTOM, setEditingRTOM] = useState<RTOM | null>(null)
    const [form, setForm] = useState<RTOMForm>({ regionId: "", name: "", mobileNumber: "", email: "" })
    const [submitting, setSubmitting] = useState(false)
    const [createdRTOM, setCreatedRTOM] = useState<RTOMCredentials | null>(null)

    const token = localStorage.getItem("dgmToken")

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get("/dgm/rtoms", { headers: { Authorization: `Bearer ${token}` } })
            setRegions(res.data.regions || [])
            setError("")
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load RTOMs")
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const openCreate = (regionId: string) => {
        setEditingRTOM(null)
        setForm({ regionId, name: "", mobileNumber: "", email: "" })
        setShowForm(true); setError(""); setSuccess("")
    }

    const openEdit = (rtom: RTOM, regionId: string) => {
        setEditingRTOM(rtom)
        setForm({ regionId, name: rtom.name, mobileNumber: rtom.mobileNumber, email: rtom.email || "" })
        setShowForm(true); setError(""); setSuccess("")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true)
        try {
            const regionName = regions.find(r => r.id === form.regionId)?.name || ""
            if (editingRTOM) {
                // Update existing RTOM
                await api.put(`/dgm/rtoms/${editingRTOM.id}`, { 
                    name: form.name, 
                    mobileNumber: form.mobileNumber, 
                    email: form.email 
                }, { headers: { Authorization: `Bearer ${token}` } })
                setSuccess("RTOM updated successfully")
                setShowForm(false); fetchData()
            } else {
                // Create new RTOM
                await api.post("/dgm/rtoms", form, { headers: { Authorization: `Bearer ${token}` } })
                // Show credentials popup
                setCreatedRTOM({ name: form.name, mobileNumber: form.mobileNumber, email: form.email || undefined, regionName })
                setShowForm(false); fetchData()
            }
        } catch (err: any) {
            setError(err?.response?.data?.error || "Operation failed")
        } finally { setSubmitting(false) }
    }

    const handleRemove = async (rtom: RTOM, regionName: string) => {
        if (!window.confirm(`Remove RTOM "${rtom.name}" from "${regionName}"?`)) return
        try {
            await api.delete(`/dgm/rtoms/${rtom.id}`, { headers: { Authorization: `Bearer ${token}` } })
            setSuccess("RTOM removed"); fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to remove RTOM")
        }
    }

    const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-teal-600" />Manage RTOMs</h1>
                <p className="text-sm text-gray-500 mt-1">Assign Regional Teleshop Operations Managers to your regions.</p>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

            {/* Assign / Edit form modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><X className="w-4 h-4" /></button>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">{editingRTOM ? "Edit RTOM" : "Add RTOM"}</h2>
                        <p className="text-sm text-gray-500 mb-5">
                            Region: <span className="font-medium text-gray-700">{regions.find(r => r.id === form.regionId)?.name}</span>
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">RTOM Name *</label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="e.g. Suresh Fernando" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                                <input type="tel" value={form.mobileNumber} onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="e.g. 0771234567" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(welcome email will be sent)</span></label>
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="e.g. suresh@slt.lk" />
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
                                    {submitting ? "Saving…" : editingRTOM ? "Update RTOM" : "Add RTOM"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Credentials popup — shown after a new RTOM is assigned */}
            {createdRTOM && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setCreatedRTOM(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 text-center mb-1">RTOM Assigned Successfully!</h2>
                        <p className="text-sm text-gray-500 text-center mb-5">
                            {createdRTOM.email
                                ? "A welcome email has been sent. They can log in using their mobile number."
                                : "Share these login details with the RTOM."}
                        </p>

                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-5">
                            <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">RTOM NAME</p>
                                <div className="flex items-center gap-2">
                                    <p className="flex-1 text-sm font-semibold text-gray-800">{createdRTOM.name}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">MOBILE NUMBER (Login)</p>
                                <div className="flex items-center gap-2">
                                    <p className="flex-1 text-sm font-mono font-bold text-teal-700 bg-teal-50 rounded-lg px-3 py-2">{createdRTOM.mobileNumber}</p>
                                    <button onClick={() => copyToClipboard(createdRTOM.mobileNumber)} className="p-2 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50" title="Copy">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {createdRTOM.email && (
                                <div>
                                    <p className="text-xs font-medium text-slate-500 mb-1">EMAIL</p>
                                    <div className="flex items-center gap-2">
                                        <p className="flex-1 text-sm text-gray-700 truncate">{createdRTOM.email}</p>
                                        <button onClick={() => copyToClipboard(createdRTOM.email!)} className="p-2 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50" title="Copy">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">REGION</p>
                                <p className="text-sm text-gray-700">{createdRTOM.regionName}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => copyToClipboard(`RTOM Login Info:\nName: ${createdRTOM.name}\nMobile: ${createdRTOM.mobileNumber}${createdRTOM.email ? `\nEmail: ${createdRTOM.email}` : ""}\nRegion: ${createdRTOM.regionName}\nLogin: Use mobile number only — no password required`)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
                                Copy All
                            </button>
                            <button onClick={() => setCreatedRTOM(null)}
                                className="flex-1 bg-teal-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors text-sm">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Regions list */}
            {loading ? (
                <div className="py-16 text-center text-gray-400">Loading regions…</div>
            ) : regions.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-gray-400">
                    <MapPin className="w-12 h-12 mx-auto mb-3" /><p>No regions assigned to you yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {regions.map(region => (
                        <div key={region.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            {/* Region Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-teal-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{region.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {region.rtoms.length} RTOM{region.rtoms.length !== 1 ? "s" : ""} • {region.outlets.length} outlet{region.outlets.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => openCreate(region.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Add RTOM
                                </button>
                            </div>

                            {/* RTOMs List */}
                            {region.rtoms.length > 0 ? (
                                <div className="space-y-3">
                                    {region.rtoms.map(rtom => (
                                        <div key={rtom.id} className="bg-teal-50 rounded-xl p-3 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 font-semibold text-sm">
                                                {rtom.name[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{rtom.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {rtom.mobileNumber}
                                                    {rtom.email && ` • ${rtom.email}`}
                                                    {rtom.teleshopManagers.length > 0 && ` • ${rtom.teleshopManagers.length} manager${rtom.teleshopManagers.length !== 1 ? "s" : ""}`}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${rtom.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {rtom.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(rtom, region.id)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-100 rounded-lg">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleRemove(rtom, region.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-xl p-3 text-center text-sm text-gray-400">
                                    No RTOMs assigned to this region yet
                                </div>
                            )}

                            {/* Outlets List */}
                            {region.outlets.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                    <p className="text-xs font-medium text-gray-500 mb-2">Outlets in this region:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {region.outlets.slice(0, 5).map(outlet => (
                                            <span key={outlet.id} className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl text-xs text-gray-600">
                                                <Building2 className="w-3 h-3" />{outlet.name}
                                            </span>
                                        ))}
                                        {region.outlets.length > 5 && <span className="px-2 py-1 text-xs text-gray-400">+{region.outlets.length - 5} more</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
