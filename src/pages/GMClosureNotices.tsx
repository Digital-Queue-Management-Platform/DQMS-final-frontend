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

export default function GMClosureNotices() {
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

    const token = localStorage.getItem("gmToken")

    const fetchData = async () => {
        setLoading(true)
        try {
            const [noticesRes, outletsRes] = await Promise.all([
                api.get("/gm/closure-notices", { headers: { Authorization: `Bearer ${token}` } }),
                api.get("/queue/outlets")
            ])
            setNotices(noticesRes.data.notices || [])
            const allOutlets = (outletsRes.data || []).map((o: any) => ({
                id: o.id,
                name: o.region ? `${o.name} (${o.region.name})` : o.name
            }))
            setOutlets(allOutlets)
            setError("")
        } catch (err: any) {
            if (err.response?.status === 401) { navigate("/gm/login"); return }
            setError(err?.response?.data?.error || "Failed to load data")
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const resetForm = () => {
        setForm({ outletId: "", title: "", message: "", startsAt: "", endsAt: "", noticeType: "closure", isRecurring: false, recurringDays: [], recurringEndDate: "" })
        setEditingId(null)
        setShowForm(false)
        setError("")
        setSuccess("")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(""); setSuccess(""); setSubmitting(true)
        try {
            const payload: any = {
                outletId: form.outletId,
                title: form.title,
                message: form.message,
                noticeType: form.noticeType,
                isRecurring: form.isRecurring,
            }
            if (form.isRecurring) {
                payload.recurringType = "weekly"
                payload.recurringDays = form.recurringDays
                payload.startsAt = new Date(`1970-01-01T${form.startsAt}:00`).toISOString()
                payload.endsAt = new Date(`1970-01-01T${form.endsAt}:00`).toISOString()
                if (form.recurringEndDate) payload.recurringEndDate = new Date(form.recurringEndDate).toISOString()
            } else {
                payload.startsAt = new Date(form.startsAt).toISOString()
                payload.endsAt = new Date(form.endsAt).toISOString()
            }
            if (editingId) {
                await api.put(`/gm/closure-notices/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } })
                setSuccess("Notice updated successfully!")
            } else {
                await api.post("/gm/closure-notices", payload, { headers: { Authorization: `Bearer ${token}` } })
                setSuccess("Notice created successfully!")
            }
            resetForm()
            fetchData()
        } catch (err: any) {
            setError(err?.response?.data?.error || (editingId ? "Failed to update notice" : "Failed to create notice"))
        } finally { setSubmitting(false) }
    }

    const handleEdit = (notice: ClosureNotice) => {
        const toTime = (d: string) => new Date(d).toTimeString().slice(0, 5)
        const toLocal = (d: string) => { const dt = new Date(d); dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset()); return dt.toISOString().slice(0, 16) }
        const toDate = (d: string) => new Date(d).toISOString().slice(0, 10)
        setForm({
            outletId: notice.outletId,
            title: notice.title,
            message: notice.message,
            noticeType: notice.noticeType,
            isRecurring: notice.isRecurring,
            recurringDays: notice.recurringDays || [],
            recurringEndDate: notice.recurringEndDate ? toDate(notice.recurringEndDate) : "",
            startsAt: notice.isRecurring ? toTime(notice.startsAt) : toLocal(notice.startsAt),
            endsAt: notice.isRecurring ? toTime(notice.endsAt) : toLocal(notice.endsAt),
        })
        setEditingId(notice.id)
        setShowForm(true)
        setError("")
        setSuccess("")
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this notice?")) return
        try {
            await api.delete(`/gm/closure-notices/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            setSuccess("Notice deleted.")
            setNotices(prev => prev.filter(n => n.id !== id))
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to delete notice")
        }
    }

    const isActive = (n: ClosureNotice) => {
        const now = new Date()
        if (n.isRecurring) {
            if (n.recurringEndDate && new Date(n.recurringEndDate) < now) return false
            const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
            const todayName = dayNames[now.getDay()]
            if (!(n.recurringDays || []).includes(todayName)) return false
            const start = new Date(n.startsAt)
            const end = new Date(n.endsAt)
            const nowMins = now.getHours() * 60 + now.getMinutes()
            return nowMins >= start.getHours() * 60 + start.getMinutes() && nowMins <= end.getHours() * 60 + end.getMinutes()
        }
        return new Date(n.startsAt) <= now && now <= new Date(n.endsAt)
    }
    const fmt = (d: string) => new Date(d).toLocaleString()
    const fmtTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const fmtDate = (d: string) => new Date(d).toLocaleDateString()

    const filteredNotices = filterOutlet ? notices.filter(n => n.outletId === filterOutlet) : notices

    return (
        <div className="p-6 max-w-4xl mx-auto min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Branch Notices</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage branch notices for all outlets island-wide</p>
                </div>
                <button onClick={() => { setShowForm(f => !f); if (showForm) resetForm() }}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
                    <PlusCircle className="w-4 h-4" />
                    {showForm ? "Cancel" : "New Notice"}
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{success}</div>}

            {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-4">
                    <h2 className="text-base font-semibold text-violet-900">{editingId ? "Edit Notice" : "New Notice"}</h2>

                    {/* Notice Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notice Type</label>
                        <div className="flex gap-3">
                            <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${form.noticeType === "closure" ? "border-red-500 bg-red-50" : "border-slate-200 bg-white"}`}>
                                <input type="radio" name="noticeType" value="closure" checked={form.noticeType === "closure"} onChange={() => setForm(f => ({ ...f, noticeType: "closure" }))} className="accent-red-500" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Closure Notice</p>
                                    <p className="text-xs text-gray-500">Blocks customers – they must wait until reopening</p>
                                </div>
                            </label>
                            <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${form.noticeType === "standard" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
                                <input type="radio" name="noticeType" value="standard" checked={form.noticeType === "standard"} onChange={() => setForm(f => ({ ...f, noticeType: "standard" }))} className="accent-blue-500" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Standard Notice</p>
                                    <p className="text-xs text-gray-500">Informational – customer can dismiss and continue</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Outlet */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
                        <select value={form.outletId} onChange={e => setForm(f => ({ ...f, outletId: e.target.value }))} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none">
                            <option value="">Select outlet…</option>
                            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                            placeholder="e.g. Branch Closed – Public Holiday" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                            placeholder="We are temporarily closed. We apologize for the inconvenience." />
                    </div>

                    {/* Recurring toggle */}
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked, recurringDays: [] }))} className="w-4 h-4 text-violet-600" />
                        <RefreshCw className="w-4 h-4 text-violet-500" /> Recurring (repeats weekly on selected days)
                    </label>

                    {form.isRecurring ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Repeat on days</label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map(d => (
                                        <button key={d.key} type="button"
                                            onClick={() => setForm(f => ({ ...f, recurringDays: f.recurringDays.includes(d.key) ? f.recurringDays.filter(x => x !== d.key) : [...f.recurringDays, d.key] }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.recurringDays.includes(d.key) ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-300 hover:border-violet-400"}`}
                                        >{d.label}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From time</label>
                                    <input type="time" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Until time</label>
                                    <input type="time" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End date (optional – leave blank for indefinitely)</label>
                                <input type="date" value={form.recurringEndDate} onChange={e => setForm(f => ({ ...f, recurringEndDate: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                                <input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                                <input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button type="submit" disabled={submitting}
                            className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
                            {submitting ? (editingId ? "Saving…" : "Creating…") : (editingId ? "Save Changes" : "Create Notice")}
                        </button>
                    </div>
                </form>
            )}

            {/* Filter */}
            {!showForm && outlets.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <select value={filterOutlet} onChange={e => setFilterOutlet(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none">
                        <option value="">All outlets</option>
                        {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
            )}

            {loading ? (
                <div className="py-12 text-center text-gray-400 text-sm">Loading notices…</div>
            ) : filteredNotices.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-gray-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    <AlertTriangle className="w-10 h-10 mb-3" />
                    <p className="text-sm">No notices yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotices.map(notice => (
                        <div key={notice.id} className={`rounded-2xl border p-4 ${isActive(notice) ? (notice.noticeType === "standard" ? "border-blue-300 bg-blue-50" : "border-red-300 bg-red-50") : "border-slate-200 bg-white"}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        {notice.noticeType === "standard"
                                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Bell className="w-3 h-3" />Standard</span>
                                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3" />Closure</span>
                                        }
                                        {notice.isRecurring && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"><RefreshCw className="w-3 h-3" />Recurring</span>}
                                        <span className="text-sm font-semibold text-gray-900">{notice.title}</span>
                                        {isActive(notice) && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active Now</span>}
                                        {notice.outlet && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><Building2 className="w-3 h-3" />{notice.outlet.name}{notice.outlet.region && ` • ${notice.outlet.region.name}`}</span>}
                                    </div>
                                    <p className="text-sm text-gray-600">{notice.message}</p>
                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                                        {notice.isRecurring ? (
                                            <>
                                                <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Every {(notice.recurringDays || []).join(", ")} · {fmtTime(notice.startsAt)} – {fmtTime(notice.endsAt)}</span>
                                                {notice.recurringEndDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Until: {fmtDate(notice.recurringEndDate)}</span>}
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Starts: {fmt(notice.startsAt)}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Ends: {fmt(notice.endsAt)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => handleEdit(notice)} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(notice.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
