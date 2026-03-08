import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PlusCircle, Trash2, AlertTriangle, Calendar, Clock, Bell, Building2, RefreshCw, MapPin, Pencil } from "lucide-react"
import api from "../config/api"

const DAYS_OF_WEEK = [
    { key: "MON", label: "Mon" }, { key: "TUE", label: "Tue" }, { key: "WED", label: "Wed" },
    { key: "THU", label: "Thu" }, { key: "FRI", label: "Fri" }, { key: "SAT", label: "Sat" }, { key: "SUN", label: "Sun" },
]

interface Outlet { id: string; name: string }
interface ClosureNotice {
    id: string; outletId: string; title: string; message: string
    startsAt: string; endsAt: string; createdBy: string; createdAt: string
    noticeType: string; isRecurring: boolean; recurringDays?: string[]; recurringEndDate?: string
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
    const [editingId, setEditingId] = useState<string | null>(null)
    const [filterOutlet, setFilterOutlet] = useState("")
    const [form, setForm] = useState({
        outletId: "", title: "", message: "", startsAt: "", endsAt: "",
        noticeType: "closure", isRecurring: false, recurringDays: [] as string[], recurringEndDate: "",
    })
    const [submitting, setSubmitting] = useState(false)

    const token = localStorage.getItem("dgmToken")

    const fetchData = async () => {
        setLoading(true)
        try {
            const [noticesRes, regionsRes] = await Promise.all([
                api.get("/dgm/closure-notices", { headers: { Authorization: `Bearer ${token}` } }),
                api.get("/dgm/rtoms", { headers: { Authorization: `Bearer ${token}` } })
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

    const resetForm = () => setForm({
        outletId: "", title: "", message: "", startsAt: "", endsAt: "",
        noticeType: "closure", isRecurring: false, recurringDays: [], recurringEndDate: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true)
        try {
            const payload: any = {
                outletId: form.outletId, title: form.title, message: form.message,
                noticeType: form.noticeType, isRecurring: form.isRecurring,
            }
            if (form.isRecurring) {
                payload.recurringType = "weekly"
                payload.recurringDays = form.recurringDays
                if (form.recurringEndDate) payload.recurringEndDate = new Date(form.recurringEndDate).toISOString()
                payload.startsAt = new Date(form.startsAt).toISOString()
                payload.endsAt = new Date(form.endsAt).toISOString()
            } else {
                payload.startsAt = new Date(form.startsAt).toISOString()
                payload.endsAt = new Date(form.endsAt).toISOString()
            }
            if (editingId) {
                await api.put(`/dgm/closure-notices/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } })
                setSuccess("Notice updated!")
            } else {
                await api.post("/dgm/closure-notices", payload, { headers: { Authorization: `Bearer ${token}` } })
                setSuccess("Notice created!")
            }
            resetForm(); setShowForm(false); setEditingId(null); fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to save notice")
        } finally { setSubmitting(false) }
    }

    const handleEdit = (n: ClosureNotice) => {
        const toLocal = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
        setForm({
            outletId: n.outletId, title: n.title, message: n.message,
            startsAt: toLocal(n.startsAt), endsAt: toLocal(n.endsAt),
            noticeType: n.noticeType || "closure", isRecurring: n.isRecurring || false,
            recurringDays: n.recurringDays || [],
            recurringEndDate: n.recurringEndDate ? toLocal(n.recurringEndDate) : "",
        })
        setEditingId(n.id); setShowForm(true); setError(""); setSuccess("")
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this notice?")) return
        try {
            await api.delete(`/dgm/closure-notices/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            setSuccess("Notice deleted.")
            setNotices(prev => prev.filter(n => n.id !== id))
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to delete notice")
        }
    }

    const isActive = (n: ClosureNotice) => {
        const now = new Date()
        if (n.isRecurring) {
            const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
            const todayKey = days[now.getDay()]
            if (!(n.recurringDays || []).includes(todayKey)) return false
            const start = new Date(n.startsAt); const end = new Date(n.endsAt)
            const nowMins = now.getHours() * 60 + now.getMinutes()
            const startMins = start.getHours() * 60 + start.getMinutes()
            const endMins = end.getHours() * 60 + end.getMinutes()
            return nowMins >= startMins && nowMins <= endMins
        }
        return new Date(n.startsAt) <= now && now <= new Date(n.endsAt)
    }

    const fmt = (d: string) => new Date(d).toLocaleString()
    const filteredNotices = filterOutlet ? notices.filter(n => n.outletId === filterOutlet) : notices

    const toggleDay = (day: string) => setForm(f => ({
        ...f, recurringDays: f.recurringDays.includes(day) ? f.recurringDays.filter(d => d !== day) : [...f.recurringDays, day]
    }))

    return (
        <div className="p-6 max-w-3xl mx-auto min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="w-6 h-6 text-teal-600" />Branch Notices
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage branch notices for outlets in your regions</p>
                </div>
                <button onClick={() => { if (showForm && editingId) { setEditingId(null); resetForm() } setShowForm(f => !f); setError(""); setSuccess("") }}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors">
                    <PlusCircle className="w-4 h-4" />{showForm ? "Cancel" : "New Notice"}
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{success}</div>}

            {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-4">
                    <h2 className="text-base font-semibold text-teal-900">{editingId ? "Edit Notice" : "New Branch Notice"}</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
                        <select value={form.outletId} onChange={e => setForm(f => ({ ...f, outletId: e.target.value }))} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none">
                            <option value="">Select outlet...</option>
                            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notice Type</label>
                        <div className="flex gap-3">
                            {[{ value: "closure", label: "Closure" }, { value: "standard", label: "Standard" }].map(opt => (
                                <label key={opt.value} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${form.noticeType === opt.value ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"}`}>
                                    <input type="radio" name="noticeType" value={opt.value} checked={form.noticeType === opt.value}
                                        onChange={e => setForm(f => ({ ...f, noticeType: e.target.value }))} className="hidden" />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
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
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="isRecurring" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
                            className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500" />
                        <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5 text-teal-500" /> Recurring Notice
                        </label>
                    </div>
                    {form.isRecurring && (
                        <div className="space-y-3 bg-white rounded-xl border border-teal-200 p-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Repeat on Days</label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map(d => (
                                        <button key={d.key} type="button" onClick={() => toggleDay(d.key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${form.recurringDays.includes(d.key) ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-teal-50"}`}>
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Recurring End Date (optional)</label>
                                <input type="datetime-local" value={form.recurringEndDate} onChange={e => setForm(f => ({ ...f, recurringEndDate: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{form.isRecurring ? "Daily Start Time" : "Starts At"}</label>
                            <input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{form.isRecurring ? "Daily End Time" : "Ends At"}</label>
                            <input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
                            {submitting ? "Saving…" : editingId ? "Update Notice" : "Create Notice"}
                        </button>
                    </div>
                </form>
            )}

            {outlets.length > 0 && (
                <div className="mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <select value={filterOutlet} onChange={e => setFilterOutlet(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none">
                        <option value="">All Outlets</option>
                        {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
            )}

            {loading ? (
                <div className="py-12 text-center text-gray-400 text-sm">Loading notices…</div>
            ) : filteredNotices.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-gray-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    <AlertTriangle className="w-10 h-10 mb-3" /><p className="text-sm">No notices found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotices.map(notice => (
                        <div key={notice.id} className={`rounded-2xl border p-4 ${isActive(notice) ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-sm font-semibold text-gray-900">{notice.title}</span>
                                        {isActive(notice) && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Active Now</span>}
                                        {notice.noticeType === "closure" ? (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Closure</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Standard</span>
                                        )}
                                        {notice.isRecurring && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 flex items-center gap-1">
                                                <RefreshCw className="w-3 h-3" /> Recurring
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{notice.message}</p>
                                    {notice.outlet && (
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                                            <Building2 className="w-3.5 h-3.5" /> {notice.outlet.name}
                                        </p>
                                    )}
                                    {notice.isRecurring && notice.recurringDays && notice.recurringDays.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {notice.recurringDays.map(d => (
                                                <span key={d} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium">{d}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmt(notice.startsAt)}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmt(notice.endsAt)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => handleEdit(notice)} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(notice.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
