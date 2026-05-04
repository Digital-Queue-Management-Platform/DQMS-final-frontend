"use client"

import { useState } from "react"
import { Search, Send, CheckCircle, User, MapPin, Clock, Star, ArrowLeftRight, FileText } from "lucide-react"
import api from "../config/api"

type CaseUpdate = { id: string; actorRole: string; status?: string | null; note: string; createdAt: string }
type TransferLog = {
  id: string
  fromOfficer?: { id: string; name: string; counterNumber?: number | null } | null
  fromCounterNumber?: number | null
  toCounterNumber?: number | null
  previousServiceTypes?: string[]
  newServiceTypes?: string[]
  notes?: string | null
  createdAt: string
}
type CaseData = {
  refNumber: string
  status: string
  isOwnCase: boolean
  serviceTypes: string[]
  services: { code: string; title: string }[]
  createdAt: string
  completedAt?: string | null
  lastUpdatedAt?: string | null
  outlet: { id: string; name: string; location: string }
  customer: {
    id: string
    name: string
    mobileNumber: string
    nicNumber?: string | null
    email?: string | null
    sltMobileNumber?: string | null
  }
  officer: { id: string; name: string; mobileNumber: string; counterNumber?: number | null }
  token?: {
    id: string
    tokenNumber: number
    isPriority: boolean
    isTransferred: boolean
    preferredLanguages?: string[]
    accountRef?: string | null
    sltTelephoneNumber?: string | null
    billPaymentIntent?: string | null
    billPaymentAmount?: number | null
    billPaymentMethod?: string | null
    createdAt: string
    calledAt?: string | null
    startedAt?: string | null
    completedAt?: string | null
  } | null
  timeSpans: { waitDurationMs?: number | null; serviceDurationMs?: number | null; totalDurationMs?: number | null }
  transferLogs: TransferLog[]
  feedback?: { rating: number; comment?: string | null; createdAt: string; isResolved: boolean; resolutionComment?: string | null } | null
  updates: CaseUpdate[]
}

function fmtDuration(ms: number | null | undefined) {
  if (!ms || ms < 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    open: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    submitted: 'bg-indigo-100 text-indigo-700',
  }
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
      ))}
    </span>
  )
}

export default function OfficerServiceTracking() {
  const [ref, setRef] = useState('')
  const [data, setData] = useState<CaseData | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  const load = async () => {
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('officerToken')
      const res = await api.get(`/officer/service-case/${ref.trim()}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      setData(res.data)
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 401) setError('Please login again to view this case')
      else if (status === 403) setError('Not authorized to view this service case')
      else setError(e?.response?.data?.error || 'Reference not found')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const addUpdate = async () => {
    if (!ref.trim() || !note.trim()) return
    setSaving(true)
    try {
      const token = localStorage.getItem('officerToken')
      await api.post('/officer/service-case/update', {
        refNumber: ref.trim(),
        note: note.trim(),
      }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      setNote('')
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to add update')
    } finally { setSaving(false) }
  }

  const markComplete = async () => {
    if (!ref.trim() || !data || data.status === 'completed') return
    if (!confirm('Mark this service case as completed?')) return
    setCompleting(true)
    try {
      const token = localStorage.getItem('officerToken')
      await api.post('/officer/service-case/complete', { refNumber: ref.trim() }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to complete case')
    } finally { setCompleting(false) }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Service Tracking</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ref.trim() && !loading && load()}
              placeholder="Enter reference number"
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>
          <button
            onClick={load}
            disabled={!ref.trim() || loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-indigo-700 transition-colors font-semibold shadow-sm"
          >
            {loading ? 'Loading...' : 'Load Case'}
          </button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      </div>

      {data && (
        <>
          {/* Header: ref number, status, priority */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-gray-100 rounded-lg font-mono text-sm font-medium">{data.refNumber}</span>
              <StatusBadge status={data.status} />
              {data.token?.isPriority && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">Priority</span>
              )}
              {data.token?.isTransferred && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-purple-100 text-purple-700">Transferred</span>
              )}
            </div>

            {/* Outlet & Services */}
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">{data.outlet.name}</span>
                <span className="text-gray-500"> — {data.outlet.location}</span>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Services</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(data.services.length > 0 ? data.services : data.serviceTypes.map(c => ({ code: c, title: c }))).map(s => (
                  <span key={s.code} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{s.title}</span>
                ))}
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span><Clock className="w-3 h-3 inline mr-1" />Created: {new Date(data.createdAt).toLocaleString()}</span>
              {data.completedAt && <span>Completed: {new Date(data.completedAt).toLocaleString()}</span>}
              {data.lastUpdatedAt && <span>Last updated: {new Date(data.lastUpdatedAt).toLocaleString()}</span>}
            </div>
          </div>

          {/* Customer & Officer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-800">Customer</span>
              </div>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="font-medium">{data.customer.name}</div>
                <div className="text-gray-500">{data.customer.mobileNumber}</div>
                {data.customer.nicNumber && <div className="text-gray-500">NIC: {data.customer.nicNumber}</div>}
                {data.customer.email && <div className="text-gray-500">{data.customer.email}</div>}
                {data.customer.sltMobileNumber && <div className="text-gray-500">SLT: {data.customer.sltMobileNumber}</div>}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-gray-800">Handled By</span>
              </div>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="font-medium">{data.officer.name}</div>
                <div className="text-gray-500">{data.officer.mobileNumber}</div>
                {data.officer.counterNumber && <div className="text-gray-500">Counter #{data.officer.counterNumber}</div>}
              </div>
            </div>
          </div>

          {/* Token Details */}
          {data.token && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-800">Token Details</span>
                <span className="ml-auto text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">#{data.token.tokenNumber}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                {data.token.preferredLanguages && data.token.preferredLanguages.length > 0 && (
                  <div><span className="text-gray-400 block">Language</span>{data.token.preferredLanguages.join(', ').toUpperCase()}</div>
                )}
                {data.token.accountRef && (
                  <div><span className="text-gray-400 block">Account Ref</span>{data.token.accountRef}</div>
                )}
                {data.token.sltTelephoneNumber && (
                  <div><span className="text-gray-400 block">SLT Number</span>{data.token.sltTelephoneNumber}</div>
                )}
                {data.token.billPaymentIntent && (
                  <div><span className="text-gray-400 block">Payment Intent</span>
                    <span className="font-semibold text-blue-600 uppercase">
                      {data.token.billPaymentIntent === 'full' ? 'Full Payment' : 'Partial Payment'}
                    </span>
                  </div>
                )}
                {data.token.billPaymentAmount != null && (
                  <div><span className="text-gray-400 block">Planned Amount</span>
                    <span className="font-semibold text-green-700">LKR {data.token.billPaymentAmount.toLocaleString()}</span>
                  </div>
                )}
                {data.token.billPaymentMethod && (
                  <div><span className="text-gray-400 block">Payment Method</span>
                    <span className="font-semibold text-slate-700 uppercase">{data.token.billPaymentMethod.replace('_', ' ')}</span>
                  </div>
                )}
                {data.token.calledAt && (
                  <div><span className="text-gray-400 block">Called At</span>{new Date(data.token.calledAt).toLocaleTimeString()}</div>
                )}
                {data.token.startedAt && (
                  <div><span className="text-gray-400 block">Started At</span>{new Date(data.token.startedAt).toLocaleTimeString()}</div>
                )}
              </div>
            </div>
          )}

          {/* Time Spans */}
          {(data.timeSpans.waitDurationMs || data.timeSpans.serviceDurationMs || data.timeSpans.totalDurationMs) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-gray-800">Time Breakdown</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-semibold text-gray-800">{fmtDuration(data.timeSpans.waitDurationMs)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Wait time</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-semibold text-gray-800">{fmtDuration(data.timeSpans.serviceDurationMs)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Service time</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-semibold text-gray-800">{fmtDuration(data.timeSpans.totalDurationMs)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total time</div>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Logs */}
          {data.transferLogs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowLeftRight className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-gray-800">Transfer History</span>
              </div>
              <div className="space-y-2">
                {data.transferLogs.map(tl => (
                  <div key={tl.id} className="border border-slate-200 rounded-lg p-3 text-xs bg-gray-50">
                    <div className="flex justify-between text-gray-500 mb-1">
                      <span>
                        Counter {tl.fromCounterNumber ?? '?'} → Counter {tl.toCounterNumber ?? '?'}
                        {tl.fromOfficer && <span className="ml-1 text-gray-400">({tl.fromOfficer.name})</span>}
                      </span>
                      <span>{new Date(tl.createdAt).toLocaleString()}</span>
                    </div>
                    {tl.newServiceTypes && tl.newServiceTypes.length > 0 && (
                      <div className="text-gray-600">Services: {tl.newServiceTypes.join(', ')}</div>
                    )}
                    {tl.notes && <div className="text-gray-500 italic mt-1">{tl.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {data.feedback && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-gray-800">Customer Feedback</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${data.feedback.isResolved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {data.feedback.isResolved ? 'Resolved' : 'Unresolved'}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <StarRating rating={data.feedback.rating} />
                <span className="text-xs text-gray-500">{new Date(data.feedback.createdAt).toLocaleString()}</span>
              </div>
              {data.feedback.comment && <div className="text-sm text-gray-700 mt-1">{data.feedback.comment}</div>}
              {data.feedback.resolutionComment && (
                <div className="mt-2 text-xs text-green-700 bg-green-50 rounded p-2">{data.feedback.resolutionComment}</div>
              )}
            </div>
          )}

          {/* Case Updates */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Case Updates</h2>
            <div className="space-y-3">
              {data.updates.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No updates yet</div>
              ) : (
                data.updates.map(u => (
                  <div key={u.id} className="border border-slate-200 rounded-lg p-3 text-sm bg-gray-50">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span className="capitalize font-medium">{u.actorRole.replace(/_/g, ' ')}</span>
                      <span>{new Date(u.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-800 whitespace-pre-wrap">{u.note}</div>
                    {u.status && (
                      <div className="mt-1.5"><StatusBadge status={u.status} /></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Update & Mark Complete — only for the officer who owns this case */}
          {data.isOwnCase && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-2">Add Update</h2>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note or update..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={3}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={addUpdate}
                  disabled={!note.trim() || saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-indigo-700 transition-colors font-semibold inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {saving ? 'Sending...' : 'Send Update'}
                </button>
                <button
                  onClick={markComplete}
                  disabled={data.status === 'completed' || completing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-green-700 transition-colors font-semibold inline-flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {completing ? 'Completing...' : 'Mark Completed'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

