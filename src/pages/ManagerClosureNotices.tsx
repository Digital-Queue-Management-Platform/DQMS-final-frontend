import { useState, useEffect } from "react"
import { PlusCircle, Trash2, AlertTriangle, Calendar, Clock, MapPin, RefreshCw, Bell, Pencil } from "lucide-react"
import api from "../config/api"

const DAYS_OF_WEEK = [
    { key: "MON", label: "Mon" },
    { key: "TUE", label: "Tue" },
    { key: "WED", label: "Wed" },
    { key: "THU", label: "Thu" },
    { key: "FRI", label: "Fri" },
    { key: "SAT", label: "Sat" },
    { key: "SUN", label: "Sun" },
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
    recurringType?: string
    recurringDays?: string[]
    recurringEndDate?: string
    outlet?: { id: string; name: string }
}

interface Outlet {
    id: string
    name: string
    location: string
}

interface Holiday {
    id: string
    date: string
    name: string
    isRecurring: boolean
}

type Tab = "notices" | "holidays"

export default function ManagerClosureNotices() {
    const [activeTab, setActiveTab] = useState<Tab>("notices")

    // Notices state
    const [notices, setNotices] = useState<ClosureNotice[]>([])
    const [outlets, setOutlets] = useState<Outlet[]>([])
    const [noticesLoading, setNoticesLoading] = useState(true)
    const [noticeError, setNoticeError] = useState("")
    const [noticeSuccess, setNoticeSuccess] = useState("")
    const [showNoticeForm, setShowNoticeForm] = useState(false)
    const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null)
    const [filterOutlet, setFilterOutlet] = useState("")
    const [noticeForm, setNoticeForm] = useState({
        outletId: "", title: "", message: "", startsAt: "", endsAt: "",
        noticeType: "closure",
        isRecurring: false,
        recurringDays: [] as string[],
        recurringEndDate: "",
    })
    const [noticeSubmitting, setNoticeSubmitting] = useState(false)

    // Holidays state
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [holidaysLoading, setHolidaysLoading] = useState(true)
    const [holidayError, setHolidayError] = useState("")
    const [holidaySuccess, setHolidaySuccess] = useState("")
    const [showHolidayForm, setShowHolidayForm] = useState(false)
    const [holidayForm, setHolidayForm] = useState({ date: "", name: "", isRecurring: false })
    const [holidaySubmitting, setHolidaySubmitting] = useState(false)

    useEffect(() => {
        fetchNotices()
        fetchHolidays()
    }, [])

    // ── Notices ──────────────────────────────────────

    const fetchNotices = async () => {
        try {
            setNoticesLoading(true)
            const res = await api.get("/manager/closure-notices")
            setNotices(res.data.notices || [])
            setOutlets(res.data.outlets || [])
            setNoticeError("")
        } catch (err: any) {
            setNoticeError(err?.response?.data?.error || "Failed to load notices")
        } finally {
            setNoticesLoading(false)
        }
    }

    const handleCreateNotice = async (e: React.FormEvent) => {
        e.preventDefault()
        setNoticeError("")
        setNoticeSuccess("")
        setNoticeSubmitting(true)
        try {
            const payload = {
                outletId: noticeForm.outletId,
                title: noticeForm.title,
                message: noticeForm.message,
                startsAt: noticeForm.isRecurring ? new Date(`1970-01-01T${noticeForm.startsAt}:00`).toISOString() : new Date(noticeForm.startsAt).toISOString(),
                endsAt: noticeForm.isRecurring ? new Date(`1970-01-01T${noticeForm.endsAt}:00`).toISOString() : new Date(noticeForm.endsAt).toISOString(),
                noticeType: noticeForm.noticeType,
                isRecurring: noticeForm.isRecurring,
                recurringType: noticeForm.isRecurring ? "weekly" : undefined,
                recurringDays: noticeForm.isRecurring ? noticeForm.recurringDays : undefined,
                recurringEndDate: noticeForm.isRecurring && noticeForm.recurringEndDate ? new Date(noticeForm.recurringEndDate).toISOString() : undefined,
            }
            if (editingNoticeId) {
                await api.put(`/manager/closure-notices/${editingNoticeId}`, payload)
                setNoticeSuccess("Notice updated!")
            } else {
                await api.post("/manager/closure-notices", payload)
                setNoticeSuccess("Notice created!")
            }
            setNoticeForm({ outletId: "", title: "", message: "", startsAt: "", endsAt: "", noticeType: "closure", isRecurring: false, recurringDays: [], recurringEndDate: "" })
            setEditingNoticeId(null)
            setShowNoticeForm(false)
            fetchNotices()
        } catch (err: any) {
            setNoticeError(err?.response?.data?.error || (editingNoticeId ? "Failed to update notice" : "Failed to create notice"))
        } finally {
            setNoticeSubmitting(false)
        }
    }

    const handleEditNotice = (notice: ClosureNotice) => {
        const toTime = (d: string) => new Date(d).toTimeString().slice(0, 5)
        const toLocal = (d: string) => { const dt = new Date(d); dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset()); return dt.toISOString().slice(0, 16) }
        const toDate = (d: string) => new Date(d).toISOString().slice(0, 10)
        setNoticeForm({
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
        setEditingNoticeId(notice.id)
        setShowNoticeForm(true)
        setNoticeError("")
        setNoticeSuccess("")
    }

    const handleDeleteNotice = async (noticeId: string) => {
        if (!window.confirm("Delete this closure notice?")) return
        try {
            await api.delete(`/manager/closure-notices/${noticeId}`)
            setNoticeSuccess("Notice deleted.")
            setNotices(prev => prev.filter(n => n.id !== noticeId))
        } catch (err: any) {
            setNoticeError(err?.response?.data?.error || "Failed to delete notice")
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

    const filteredNotices = filterOutlet
        ? notices.filter(n => n.outletId === filterOutlet)
        : notices

    // ── Holidays ─────────────────────────────────────

    const fetchHolidays = async () => {
        try {
            setHolidaysLoading(true)
            const res = await api.get("/manager/holidays")
            setHolidays(res.data.holidays || [])
            setHolidayError("")
        } catch (err: any) {
            setHolidayError(err?.response?.data?.error || "Failed to load holidays")
        } finally {
            setHolidaysLoading(false)
        }
    }

    const handleCreateHoliday = async (e: React.FormEvent) => {
        e.preventDefault()
        setHolidayError("")
        setHolidaySuccess("")
        setHolidaySubmitting(true)
        try {
            await api.post("/manager/holidays", {
                date: new Date(holidayForm.date).toISOString(),
                name: holidayForm.name,
                isRecurring: holidayForm.isRecurring,
            })
            setHolidaySuccess("Holiday added!")
            setHolidayForm({ date: "", name: "", isRecurring: false })
            setShowHolidayForm(false)
            fetchHolidays()
        } catch (err: any) {
            setHolidayError(err?.response?.data?.error || "Failed to add holiday")
        } finally {
            setHolidaySubmitting(false)
        }
    }

    const handleDeleteHoliday = async (holidayId: string) => {
        if (!window.confirm("Remove this holiday?")) return
        try {
            await api.delete(`/manager/holidays/${holidayId}`)
            setHolidaySuccess("Holiday removed.")
            setHolidays(prev => prev.filter(h => h.id !== holidayId))
        } catch (err: any) {
            setHolidayError(err?.response?.data?.error || "Failed to delete holiday")
        }
    }

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })

    const formatDateTime = (d: string) => new Date(d).toLocaleString()

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Branch Closures</h1>
            <p className="text-sm text-gray-500 mb-6">
                Manage closure notices for outlets in your region, and configure mercantile holidays.
            </p>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-slate-200">
                {(["notices", "holidays"] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {tab === "notices" ? "Closure Notices" : "Mercantile Holidays"}
                    </button>
                ))}
            </div>

            {/* ── NOTICES TAB ── */}
            {activeTab === "notices" && (
                <div>
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                        {/* Branch filter */}
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <select
                                value={filterOutlet}
                                onChange={e => setFilterOutlet(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="">All outlets</option>
                                {outlets.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => { setShowNoticeForm(f => !f); setEditingNoticeId(null); setNoticeForm({ outletId: "", title: "", message: "", startsAt: "", endsAt: "", noticeType: "closure", isRecurring: false, recurringDays: [], recurringEndDate: "" }); setNoticeError(""); setNoticeSuccess("") }}
                            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <PlusCircle className="w-4 h-4" />
                            {showNoticeForm ? "Cancel" : "New Notice"}
                        </button>
                    </div>

                    {noticeError && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{noticeError}</div>}
                    {noticeSuccess && <div className="mb-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{noticeSuccess}</div>}

                    {showNoticeForm && (
                        <form onSubmit={handleCreateNotice} className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                            <h2 className="text-base font-semibold text-blue-900">{editingNoticeId ? "Edit Notice" : "New Notice"}</h2>

                            {/* Notice Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notice Type</label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${noticeForm.noticeType === "closure" ? "border-red-500 bg-red-50" : "border-slate-200 bg-white"}`}>
                                        <input type="radio" name="noticeType" value="closure" checked={noticeForm.noticeType === "closure"} onChange={() => setNoticeForm(f => ({ ...f, noticeType: "closure" }))} className="accent-red-500" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">Closure Notice</p>
                                            <p className="text-xs text-gray-500">Blocks customers – they must wait until reopening</p>
                                        </div>
                                    </label>
                                    <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${noticeForm.noticeType === "standard" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
                                        <input type="radio" name="noticeType" value="standard" checked={noticeForm.noticeType === "standard"} onChange={() => setNoticeForm(f => ({ ...f, noticeType: "standard" }))} className="accent-blue-500" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">Standard Notice</p>
                                            <p className="text-xs text-gray-500">Informational – customer can dismiss and continue</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
                                <select value={noticeForm.outletId} onChange={e => setNoticeForm(f => ({ ...f, outletId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required>
                                    <option value="">Select outlet…</option>
                                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name} – {o.location}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input type="text" value={noticeForm.title} onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Branch Closed – System Maintenance" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea value={noticeForm.message} onChange={e => setNoticeForm(f => ({ ...f, message: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="We are temporarily closed…" required />
                            </div>

                            {/* Recurring toggle */}
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={noticeForm.isRecurring} onChange={e => setNoticeForm(f => ({ ...f, isRecurring: e.target.checked, recurringDays: [] }))} className="w-4 h-4 text-blue-600" />
                                Recurring (repeats weekly on selected days)
                            </label>

                            {noticeForm.isRecurring ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Repeat on days</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DAYS_OF_WEEK.map(d => (
                                                <button key={d.key} type="button"
                                                    onClick={() => setNoticeForm(f => ({ ...f, recurringDays: f.recurringDays.includes(d.key) ? f.recurringDays.filter(x => x !== d.key) : [...f.recurringDays, d.key] }))}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${noticeForm.recurringDays.includes(d.key) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
                                                >{d.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">From time (e.g. 12:30 start)</label>
                                            <input type="time" value={noticeForm.startsAt} onChange={e => setNoticeForm(f => ({ ...f, startsAt: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Until time</label>
                                            <input type="time" value={noticeForm.endsAt} onChange={e => setNoticeForm(f => ({ ...f, endsAt: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End date (optional – leave blank for indefinitely)</label>
                                        <input type="date" value={noticeForm.recurringEndDate} onChange={e => setNoticeForm(f => ({ ...f, recurringEndDate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                                        <input type="datetime-local" value={noticeForm.startsAt} onChange={e => setNoticeForm(f => ({ ...f, startsAt: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                                        <input type="datetime-local" value={noticeForm.endsAt} onChange={e => setNoticeForm(f => ({ ...f, endsAt: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button type="submit" disabled={noticeSubmitting} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {noticeSubmitting ? (editingNoticeId ? "Saving…" : "Creating…") : (editingNoticeId ? "Save Changes" : "Create Notice")}
                                </button>
                            </div>
                        </form>
                    )}

                    {noticesLoading ? (
                        <div className="py-12 text-center text-gray-500 text-sm">Loading notices…</div>
                    ) : filteredNotices.length === 0 ? (
                        <div className="py-12 flex flex-col items-center text-gray-400">
                            <AlertTriangle className="w-10 h-10 mb-3" />
                            <p className="text-sm">No notices found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredNotices.map(notice => (
                                <div key={notice.id} className={`rounded-xl border p-4 ${isActive(notice) ? (notice.noticeType === "standard" ? "border-blue-300 bg-blue-50" : "border-red-300 bg-red-50") : "border-slate-200 bg-white"}`}>
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
                                                {notice.outlet && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{notice.outlet.name}</span>}
                                            </div>
                                            <p className="text-sm text-gray-600">{notice.message}</p>
                                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                                                {notice.isRecurring ? (
                                                    <>
                                                        <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Every {(notice.recurringDays || []).join(", ")} · {new Date(notice.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(notice.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                                        {notice.recurringEndDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Until: {formatDate(notice.recurringEndDate)}</span>}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Starts: {formatDateTime(notice.startsAt)}</span>
                                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Ends: {formatDateTime(notice.endsAt)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => handleEditNotice(notice)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteNotice(notice.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── HOLIDAYS TAB ── */}
            {activeTab === "holidays" && (
                <div>
                    <div className="flex items-center gap-3 mb-5">
                        <p className="text-sm text-gray-600">Configure public holidays. Branches are treated as closed on these dates.</p>
                        <button
                            onClick={() => { setShowHolidayForm(f => !f); setHolidayError(""); setHolidaySuccess("") }}
                            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <PlusCircle className="w-4 h-4" />
                            {showHolidayForm ? "Cancel" : "Add Holiday"}
                        </button>
                    </div>

                    {holidayError && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{holidayError}</div>}
                    {holidaySuccess && <div className="mb-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{holidaySuccess}</div>}

                    {showHolidayForm && (
                        <form onSubmit={handleCreateHoliday} className="mb-5 bg-yellow-50 border border-yellow-200 rounded-xl p-5 space-y-4">
                            <h2 className="text-base font-semibold text-yellow-900">Add Mercantile Holiday</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input type="date" value={holidayForm.date} onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input type="text" value={holidayForm.name} onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Sinhalese & Tamil New Year" required />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={holidayForm.isRecurring} onChange={e => setHolidayForm(f => ({ ...f, isRecurring: e.target.checked }))} className="w-4 h-4 text-blue-600" />
                                Recurring every year (same month &amp; day)
                            </label>
                            <div className="flex justify-end">
                                <button type="submit" disabled={holidaySubmitting} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {holidaySubmitting ? "Adding…" : "Add Holiday"}
                                </button>
                            </div>
                        </form>
                    )}

                    {holidaysLoading ? (
                        <div className="py-12 text-center text-gray-500 text-sm">Loading holidays…</div>
                    ) : holidays.length === 0 ? (
                        <div className="py-12 flex flex-col items-center text-gray-400">
                            <Calendar className="w-10 h-10 mb-3" />
                            <p className="text-sm">No mercantile holidays configured.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {holidays.map(h => (
                                <div key={h.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 gap-3">
                                    <div>
                                        <span className="text-sm font-medium text-gray-900">{h.name}</span>
                                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(h.date)}
                                            {h.isRecurring && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Recurring</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteHoliday(h.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
