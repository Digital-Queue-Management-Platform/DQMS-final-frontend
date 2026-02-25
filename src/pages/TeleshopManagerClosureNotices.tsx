import { useState, useEffect } from "react"
import { PlusCircle, Trash2, AlertTriangle, Calendar, Clock } from "lucide-react"
import api from "../config/api"

interface ClosureNotice {
    id: string
    outletId: string
    title: string
    message: string
    startsAt: string
    endsAt: string
    createdBy: string
    createdAt: string
}

export default function TeleshopManagerClosureNotices() {
    const [notices, setNotices] = useState<ClosureNotice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showForm, setShowForm] = useState(false)

    // Form state
    const [form, setForm] = useState({ title: "", message: "", startsAt: "", endsAt: "" })
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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")
        setSubmitting(true)
        try {
            await api.post("/teleshop-manager/closure-notices", {
                title: form.title,
                message: form.message,
                startsAt: new Date(form.startsAt).toISOString(),
                endsAt: new Date(form.endsAt).toISOString(),
            })
            setSuccess("Closure notice created successfully!")
            setForm({ title: "", message: "", startsAt: "", endsAt: "" })
            setShowForm(false)
            fetchNotices()
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to create closure notice")
        } finally {
            setSubmitting(false)
        }
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
        return new Date(notice.startsAt) <= now && now <= new Date(notice.endsAt)
    }

    const formatDate = (d: string) => new Date(d).toLocaleString()

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Closure Notices</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Create notices to inform customers when your branch is closed.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(f => !f); setError(""); setSuccess("") }}
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
                <form onSubmit={handleCreate} className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                    <h2 className="text-base font-semibold text-blue-900">New Closure Notice</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="We are temporarily closed. We apologize for the inconvenience."
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                            <input
                                type="datetime-local"
                                value={form.startsAt}
                                onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                            <input
                                type="datetime-local"
                                value={form.endsAt}
                                onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {submitting ? "Creating…" : "Create Notice"}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="py-12 text-center text-gray-500 text-sm">Loading notices…</div>
            ) : notices.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-gray-400">
                    <AlertTriangle className="w-10 h-10 mb-3" />
                    <p className="text-sm">No closure notices yet.</p>
                    <p className="text-xs mt-1">Add a notice to inform customers when your branch is closed.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notices.map(notice => (
                        <div
                            key={notice.id}
                            className={`rounded-xl border p-4 ${isActive(notice) ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-gray-900">{notice.title}</span>
                                        {isActive(notice) && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                Active Now
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">{notice.message}</p>
                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Starts: {formatDate(notice.startsAt)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            Ends: {formatDate(notice.endsAt)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(notice.id)}
                                    className="shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete notice"
                                >
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
