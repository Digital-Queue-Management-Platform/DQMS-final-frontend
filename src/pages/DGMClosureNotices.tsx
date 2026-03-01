import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PlusCircle, Trash2, AlertTriangle, Calendar, Clock, BellOff, Building2 } from "lucide-react"
import api from "../config/api"

interface Outlet { id: string; name: string }
interface ClosureNotice {
    id: string; outletId: string; title: string; message: string
    startsAt: string; endsAt: string; createdBy: string; createdAt: string
    outlet?: { name: string; region?: { name: string } }
}

export default function DGMClosureNotices() {
    const navigate = useNavigate()
    const [notices, setNotices] = useState<ClosureNotice[]>([])
    const [outlets, setOutlets] = useState<Outlet[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ outletId: "", title: "", message: "", startsAt: "", endsAt: "" })
    const [submitting, setSubmitting] = useState(false)

    const token = localStorage.getItem("dgmToken")

    const fetchData = async () => {
        setLoading(true)
        try {
            const [noticesRes, regionsRes] = await Promise.all([
                api.get("/dgm/closure-notices", { headers: { Authorization: `Bearer ${token}` } }),
                api.get("/dgm/rtoms", { headers: { Authorization: `Bearer ${token}` } }) // Returns regions with nested outlets
            ])
            setNotices(noticesRes.data.notices || [])

            const allOutlets = (regionsRes.data.regions || []).flatMap((r: any) =>
                r.outlets.map((o: any) => ({ id: o.id, name: `${o.name} (${r.name})` }))
            )
            setOutlets(allOutlets)
            setError("")
        } catch (err: any) {
            if (err.response?.status === 401) { navigate("/dgm/login"); return }
            setError(err?.response?.data?.error || "Failed to load data")
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true)
        try {
            await api.post("/dgm/closure-notices", {
                outletId: form.outletId, title: form.title, message: form.message,
                startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString()
            }, { headers: { Authorization: `Bearer ${token}` } })
            setSuccess("Closure notice created!")
            setForm({ outletId: "", title: "", message: "", startsAt: "", endsAt: "" })
            setShowForm(false)
            fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to create notice")
        } finally { setSubmitting(false) }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this closure notice?")) return
        try {
            await api.delete(`/dgm/closure-notices/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            setSuccess("Notice deleted.")
            setNotices(prev => prev.filter(n => n.id !== id))
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to delete notice")
        }
    }

    const isActive = (n: ClosureNotice) => { const now = new Date(); return new Date(n.startsAt) <= now && now <= new Date(n.endsAt) }
    const fmt = (d: string) => new Date(d).toLocaleString()

    return (
        <div className="p-6 max-w-3xl mx-auto min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BellOff className="w-6 h-6 text-teal-600" />Closure Notices</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage closure notices for your assigned outlets</p>
                </div>
                <button onClick={() => { setShowForm(f => !f); setError(""); setSuccess("") }}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors">
                    <PlusCircle className="w-4 h-4" />{showForm ? "Cancel" : "New Notice"}
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{success}</div>}

            {showForm && (
                <form onSubmit={handleCreate} className="mb-6 bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-4">
                    <h2 className="text-base font-semibold text-teal-900">New Closure Notice</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
                        <select value={form.outletId} onChange={e => setForm(f => ({ ...f, outletId: e.target.value }))} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none">
                            <option value="">Select outlet...</option>
                            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="e.g. Branch Closed – Public Holiday" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="We are temporarily closed..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                            <input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                            <input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
                            {submitting ? "Creating…" : "Create Notice"}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="py-12 text-center text-gray-400 text-sm">Loading notices…</div>
            ) : notices.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                    <AlertTriangle className="w-10 h-10 mb-3" /><p className="text-sm">No closure notices yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notices.map(notice => (
                        <div key={notice.id} className={`rounded-2xl border p-4 ${isActive(notice) ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-sm font-semibold text-gray-900">{notice.title}</span>
                                        {isActive(notice) && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Active Now</span>}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{notice.message}</p>
                                    {notice.outlet && (
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                                            <Building2 className="w-3.5 h-3.5" /> {notice.outlet.name}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmt(notice.startsAt)}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmt(notice.endsAt)}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(notice.id)} className="shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
