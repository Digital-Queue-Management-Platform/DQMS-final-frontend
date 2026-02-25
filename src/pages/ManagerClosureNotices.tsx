import { useState, useEffect } from "react"
import { PlusCircle, Trash2, AlertTriangle, Calendar, Clock, MapPin } from "lucide-react"
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
    const [filterOutlet, setFilterOutlet] = useState("")
    const [noticeForm, setNoticeForm] = useState({ outletId: "", title: "", message: "", startsAt: "", endsAt: "" })
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
            await api.post("/manager/closure-notices", {
                outletId: noticeForm.outletId,
                title: noticeForm.title,
                message: noticeForm.message,
                startsAt: new Date(noticeForm.startsAt).toISOString(),
                endsAt: new Date(noticeForm.endsAt).toISOString(),
            })
            setNoticeSuccess("Closure notice created!")
            setNoticeForm({ outletId: "", title: "", message: "", startsAt: "", endsAt: "" })
            setShowNoticeForm(false)
            fetchNotices()
        } catch (err: any) {
            setNoticeError(err?.response?.data?.error || "Failed to create notice")
        } finally {
            setNoticeSubmitting(false)
        }
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
            <div className="flex gap-1 mb-6 border-b border-gray-200">
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
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="">All outlets</option>
                                {outlets.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => { setShowNoticeForm(f => !f); setNoticeError(""); setNoticeSuccess("") }}
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
                            <h2 className="text-base font-semibold text-blue-900">New Closure Notice</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
                                <select
                                    value={noticeForm.outletId}
                                    onChange={e => setNoticeForm(f => ({ ...f, outletId: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                >
                                    <option value="">Select outlet…</option>
                                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name} – {o.location}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input type="text" value={noticeForm.title} onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Branch Closed – System Maintenance" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea value={noticeForm.message} onChange={e => setNoticeForm(f => ({ ...f, message: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="We are temporarily closed…" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                                    <input type="datetime-local" value={noticeForm.startsAt} onChange={e => setNoticeForm(f => ({ ...f, startsAt: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                                    <input type="datetime-local" value={noticeForm.endsAt} onChange={e => setNoticeForm(f => ({ ...f, endsAt: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" disabled={noticeSubmitting} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {noticeSubmitting ? "Creating…" : "Create Notice"}
                                </button>
                            </div>
                        </form>
                    )}

                    {noticesLoading ? (
                        <div className="py-12 text-center text-gray-500 text-sm">Loading notices…</div>
                    ) : filteredNotices.length === 0 ? (
                        <div className="py-12 flex flex-col items-center text-gray-400">
                            <AlertTriangle className="w-10 h-10 mb-3" />
                            <p className="text-sm">No closure notices found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredNotices.map(notice => (
                                <div key={notice.id} className={`rounded-xl border p-4 ${isActive(notice) ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="text-sm font-semibold text-gray-900">{notice.title}</span>
                                                {isActive(notice) && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Active Now</span>}
                                                {notice.outlet && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{notice.outlet.name}</span>}
                                            </div>
                                            <p className="text-sm text-gray-600">{notice.message}</p>
                                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Starts: {formatDateTime(notice.startsAt)}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Ends: {formatDateTime(notice.endsAt)}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteNotice(notice.id)} className="shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
                                    <input type="date" value={holidayForm.date} onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input type="text" value={holidayForm.name} onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Sinhalese & Tamil New Year" required />
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
                                <div key={h.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 gap-3">
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
