import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { MessageSquare, Filter, Star, ChevronLeft, ChevronRight, X, Building2 } from "lucide-react"
import api from "../config/api"

interface FeedbackItem {
    id: string; rating: number; comment?: string; isResolved: boolean; createdAt: string
    customer: { name: string; mobileNumber: string }
    token: { tokenNumber: number; outlet: { name: string; region: { name: string } } }
}

const STAR_COLORS = ["", "text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-green-500"]

interface DGMOutlet { id: string; name: string }

export default function DGMFeedback() {
    const navigate = useNavigate()
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
    const [outlets, setOutlets] = useState<DGMOutlet[]>([])
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [selected, setSelected] = useState<FeedbackItem | null>(null)

    const [rating, setRating] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [outletId, setOutletId] = useState("")
    const [applied, setApplied] = useState({ rating: "", startDate: "", endDate: "", outletId: "" })

    const token = localStorage.getItem("dgmToken")

    // Load outlets from profile
    useEffect(() => {
        api.get("/dgm/me", { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setOutlets(res.data.dgm.outlets.map((o: any) => ({ id: o.id, name: o.name }))))
            .catch(err => { if (err.response?.status === 401) navigate("/dgm/login") })
    }, [])

    const fetchFeedback = useCallback(async () => {
        setLoading(true); setError("")
        try {
            const params: any = { page, limit: 15 }
            if (applied.rating) params.rating = applied.rating
            if (applied.startDate) params.startDate = applied.startDate
            if (applied.endDate) params.endDate = applied.endDate
            if (applied.outletId) params.outletId = applied.outletId
            const res = await api.get("/dgm/feedback", { params, headers: { Authorization: `Bearer ${token}` } })
            setFeedbacks(res.data.feedbacks || [])
            setTotal(res.data.total || 0)
            setTotalPages(res.data.totalPages || 1)
        } catch (err: any) {
            if (err.response?.status === 401) navigate("/dgm/login")
            else setError("Failed to load feedback")
        } finally { setLoading(false) }
    }, [page, applied, navigate])

    useEffect(() => { fetchFeedback() }, [fetchFeedback])

    const applyFilters = () => { setApplied({ rating, startDate, endDate, outletId }); setPage(1) }
    const clearFilters = () => { setRating(""); setStartDate(""); setEndDate(""); setOutletId(""); setApplied({ rating: "", startDate: "", endDate: "", outletId: "" }); setPage(1) }

    const renderStars = (r: number) => Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < r ? STAR_COLORS[r] : "text-gray-200"} fill-current`} />
    ))

    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-50">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <MessageSquare className="w-7 h-7 text-teal-600" /> All Customer Feedback
                </h1>
                <p className="text-sm text-gray-500 mt-1">Feedback across your assigned outlets — {total} records</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Outlet</label>
                    <select value={outletId} onChange={e => setOutletId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none">
                        <option value="">All Outlets</option>
                        {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Rating</label>
                    <select value={rating} onChange={e => setRating(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none">
                        <option value="">All</option>
                        {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} ★</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <button onClick={applyFilters} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Apply
                </button>
                <button onClick={clearFilters} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">Clear</button>
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-400">Loading feedback...</div>
            ) : error ? (
                <div className="text-center py-16 text-red-500">{error}</div>
            ) : feedbacks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3" />No feedback found.
                </div>
            ) : (
                <div className="space-y-3">
                    {feedbacks.map(fb => (
                        <button key={fb.id} onClick={() => setSelected(fb)} className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="flex">{renderStars(fb.rating)}</div>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fb.isResolved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                            {fb.isResolved ? "Resolved" : "Open"}
                                        </span>
                                    </div>
                                    {fb.comment && <p className="text-sm text-gray-700 line-clamp-2 mb-2">{fb.comment}</p>}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{fb.token?.outlet?.name}</span>
                                        <span>Token #{fb.token?.tokenNumber}</span>
                                        <span>{fb.customer?.name} • {fb.customer?.mobileNumber}</span>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(fb.createdAt).toLocaleDateString()}</span>
                            </div>
                        </button>
                    ))}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 mt-4">
                            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selected && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
                        <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><X className="w-4 h-4" /></button>
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Feedback Details</h2>
                        <div className="flex mb-3">{renderStars(selected.rating)}</div>
                        <div className="space-y-3 text-sm">
                            <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500 mb-1">Comment</p><p className="text-gray-800">{selected.comment || "No comment provided"}</p></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500 mb-1">Customer</p><p className="font-medium">{selected.customer?.name}</p><p className="text-gray-500">{selected.customer?.mobileNumber}</p></div>
                                <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500 mb-1">Outlet</p><p className="font-medium">{selected.token?.outlet?.name}</p></div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500 mb-1">Date</p><p className="font-medium">{new Date(selected.createdAt).toLocaleString()}</p></div>
                            <div className={`rounded-xl p-3 ${selected.isResolved ? "bg-green-50" : "bg-orange-50"}`}><p className="text-xs text-slate-500 mb-1">Status</p><p className={`font-semibold ${selected.isResolved ? "text-green-700" : "text-orange-700"}`}>{selected.isResolved ? "Resolved" : "Open"}</p></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
