import { useState, useEffect } from "react"
import { AlertTriangle, Calendar, Clock, RefreshCw, Bell } from "lucide-react"
import api from "../config/api"

interface BranchNotice {
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

export default function OfficerBranchNotices() {
    const [notices, setNotices] = useState<BranchNotice[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        fetchNotices()
    }, [])

    const fetchNotices = async () => {
        try {
            setLoading(true)
            const res = await api.get("/officer/branch-notices")
            setNotices(res.data.notices || [])
            setError("")
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load notices")
        } finally {
            setLoading(false)
        }
    }

    const isActive = (notice: BranchNotice) => {
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
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Branch Notices</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        View closure and standard notices for your branch.
                    </p>
                </div>
                <button 
                    onClick={fetchNotices}
                    disabled={loading}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors hidden sm:block"
                    title="Refresh notices"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}
            {loading ? (
                <div className="py-12 text-center text-gray-500 text-sm">Loading notices…</div>
            ) : notices.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-gray-400">
                    <AlertTriangle className="w-10 h-10 mb-3" />
                    <p className="text-sm">No notices yet.</p>
                    <p className="text-xs mt-1">Branch notices created by management will appear here.</p>
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
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
