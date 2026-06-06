import { useState, useEffect } from "react"
import { PlusCircle, Trash2, AlertTriangle, Calendar, Clock, RefreshCw, Bell, Pencil } from "lucide-react"
import api from "../config/api"

const DAYS_OF_WEEK = [
    { label: "Sun", value: "SUN" },
    { label: "Mon", value: "MON" },
    { label: "Tue", value: "TUE" },
    { label: "Wed", value: "WED" },
    { label: "Thu", value: "THU" },
    { label: "Fri", value: "FRI" },
    { label: "Sat", value: "SAT" },
]

interface ClosureNotice {
    id: string
    outletId: string
    title: string
    message: string
    startsAt: string
    endsAt: string
    createdBy: string
    createdAt: string
    noticeType: string
    isRecurring: boolean
    recurringDays: string[]
    recurringEndDate?: string
}

export default function TeleshopManagerClosureNotices() {
    const [notices, setNotices] = useState<ClosureNotice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [form, setForm] = useState({
        title: "",
        message: "",
        startsAt: "",
        endsAt: "",
        noticeType: "closure",
        isRecurring: false,
        recurringDays: [] as string[],
        recurringEndDate: "",
    })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchNotices()
    }, [])

    const fetchNotices = async () => {
        try {
            setLoading(true)
            const res = await api.get("/teleshop-manager/closure-notices")
            setNotices(res.data.notices || [])
            setError("")
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load closure notices")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")
        setSubmitting(true)
        try {
            const payload: any = {
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
                await api.put(`/teleshop-manager/closure-notices/${editingId}`, payload)
                setSuccess("Notice updated successfully!")
            } else {
                await api.post("/teleshop-manager/closure-notices", payload)
                setSuccess("Notice created successfully!")
            }
            setForm({ title: "", message: "", startsAt: "", endsAt: "", noticeType: "closure", isRecurring: false, recurringDays: [], recurringEndDate: "" })
            setEditingId(null)
            setShowForm(false)
            fetchNotices()
        } catch (err: any) {
            setError(err?.response?.data?.error || (editingId ? "Failed to update notice" : "Failed to create notice"))
        } finally {
            setSubmitting(false)
        }
    }

    const handleEdit = (notice: ClosureNotice) => {
        const toTime = (d: string) => new Date(d).toTimeString().slice(0, 5)
        const toLocal = (d: string) => { const dt = new Date(d); dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset()); return dt.toISOString().slice(0, 16) }
        const toDate = (d: string) => new Date(d).toISOString().slice(0, 10)
        setForm({
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

    const handleDelete = async (noticeId: string) => {
        if (!window.confirm("Are you sure you want to delete this closure notice?")) return
        try {
            await api.delete(`/teleshop-manager/closure-notices/${noticeId}`)
            setSuccess("Closure notice deleted.")
            setNotices(prev => prev.filter(n => n.id !== noticeId))
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to delete closure notice")
        }
    }

    const isActive = (notice: ClosureNotice) => {
        const now = new Date()
        if (notice.isRecurring) {
            if (notice.recurringEndDate && new Date(notice.recurringEndDate) < now) return false
            const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
            const todayName = dayNames[now.getDay()]
            const days = notice.recurringDays || []
            if (!days.includes(todayName)) return false
            const start = new Date(notice.startsAt)
            const end = new Date(notice.endsAt)
            const nowMins = now.getHours() * 60 + now.getMinutes()
            const startMins = start.getHours() * 60 + start.getMinutes()
            const endMins = end.getHours() * 60 + end.getMinutes()
            return nowMins >= startMins && nowMins <= endMins
        }
        return new Date(notice.startsAt) <= now && now <= new Date(notice.endsAt)
    }

    const formatDate = (d: string) => new Date(d).toLocaleString()

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Branch Notices</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Create closure or standard notices for your branch.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(f => !f); setEditingId(null); setForm({ title: "", message: "", startsAt: "", endsAt: "", noticeType: "closure", isRecurring: false, recurringDays: [], recurringEndDate: "" }); setError(""); setSuccess("") }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <PlusCircle className="w-4 h-4" />
                    {showForm ? "Cancel" : "New Notice"}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                    {success}
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                    <h2 className="text-base font-semibold text-blue-900">{editingId ? "Edit Notice" : "New Notice"}</h2>

                    {/* Notice Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notice Type</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="noticeType"
                                    value="closure"
                                    checked={form.noticeType === "closure"}
                                    onChange={e => setForm(f => ({ ...f, noticeType: e.target.value }))}
                                    className="text-red-600"
                                />
                                <span className="text-sm text-gray-700 flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4 text-red-500" /> Closure Notice
                                    <span className="text-xs text-gray-400">(customer cannot dismiss)</span>
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="noticeType"
                                    value="standard"
                                    checked={form.noticeType === "standard"}
                                    onChange={e => setForm(f => ({ ...f, noticeType: e.target.value }))}
                                    className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 flex items-center gap-1">
                                    <Bell className="w-4 h-4 text-blue-500" /> Standard Notice
                                    <span className="text-xs text-gray-400">(customer can dismiss)</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Recurring toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring, recurringDays: [] }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                form.isRecurring ? "bg-purple-600" : "bg-gray-300"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                form.isRecurring ? "translate-x-6" : "translate-x-1"
                            }`} />
                        </button>
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <RefreshCw className="w-4 h-4 text-purple-500" /> Recurring (weekly)
                        </span>
                    </div>

                    {form.isRecurring && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Repeat on Days</label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map(d => (
                                    <button
                                        key={d.value}
                                        type="button"
                                        onClick={() => setForm(f => ({
                                            ...f,
                                            recurringDays: f.recurringDays.includes(d.value)
                                                ? f.recurringDays.filter(x => x !== d.value)
                                                : [...f.recurringDays, d.value]
                                        }))}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                            form.recurringDays.includes(d.value)
                                                ? "bg-purple-600 text-white border-purple-600"
                                                : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"
                                        }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="e.g. Branch Closed – Public Holiday"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                            value={form.message}
                            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="We are temporarily closed. We apologize for the inconvenience."
                            required
                        />
                    </div>
                    {form.isRecurring ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                <input
                                    type="time"
                                    value={form.startsAt}
                                    onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                <input
                                    type="time"
                                    value={form.endsAt}
                                    onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Recurring End Date (optional)</label>
                                <input
                                    type="date"
                                    value={form.recurringEndDate}
                                    onChange={e => setForm(f => ({ ...f, recurringEndDate: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                                <input
                                    type="datetime-local"
                                    value={form.startsAt}
                                    onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                                <input
                                    type="datetime-local"
                                    value={form.endsAt}
                                    onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {submitting ? (editingId ? "Saving…" : "Creating…") : (editingId ? "Save Changes" : "Create Notice")}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="py-12 text-center text-gray-500 text-sm">Loading notices…</div>
            ) : notices.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-gray-400">
                    <AlertTriangle className="w-10 h-10 mb-3" />
                    <p className="text-sm">No notices yet.</p>
                    <p className="text-xs mt-1">Add a notice to inform customers.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notices.map(notice => (
                        <div
                            key={notice.id}
                            className={`rounded-xl border p-4 ${
                                    isActive(notice)
                                        ? notice.noticeType === "standard" ? "border-blue-300 bg-blue-50" : "border-red-300 bg-red-50"
                                        : "border-slate-200 bg-white"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        {notice.noticeType === "standard" ? (
                                            <Bell className="w-4 h-4 text-blue-500" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                        )}
                                        {notice.isRecurring && <RefreshCw className="w-4 h-4 text-purple-500" />}
                                        <span className="text-sm font-semibold text-gray-900">{notice.title}</span>
                                        {notice.noticeType === "standard" ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Standard</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Closure</span>
                                        )}
                                        {isActive(notice) && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                Active Now
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">{notice.message}</p>
                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                                        {notice.isRecurring ? (
                                            <>
                                                <span className="flex items-center gap-1">
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                    Every {(notice.recurringDays || []).join(", ")} · {new Date(notice.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(notice.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                                {notice.recurringEndDate && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        Until {formatDate(notice.recurringEndDate)}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    Starts: {formatDate(notice.startsAt)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Ends: {formatDate(notice.endsAt)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        onClick={() => handleEdit(notice)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit notice"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(notice.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete notice"
                                    >
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
