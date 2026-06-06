"use client"

import { useState } from "react"
import {
  Search, Send, CheckCircle, User, Clock, MapPin, Phone, Hash, Star,
  ArrowRight, FileText, RefreshCw, Repeat2, CreditCard
} from "lucide-react"
import api from "../config/api"

type CaseUpdate = { id: string; actorRole: string; status?: string | null; note: string; createdAt: string; actorId?: string | null }
type TransferLog = {
  id: string
  fromOfficer: { id: string; name: string; counterNumber: number | null } | null
  fromCounterNumber: number | null
  toCounterNumber: number | null
  previousServiceTypes: string[]
  newServiceTypes: string[]
  notes: string | null
  createdAt: string
}
type ServiceEntry = { code: string; title: string }
type CaseFeedback = {
  rating: number
  comment: string | null
  createdAt: string
  isResolved: boolean
  resolutionComment: string | null
}
type TokenInfo = {
  id: string
  tokenNumber: number
  isPriority: boolean
  isTransferred: boolean
  preferredLanguages: any
  accountRef: string | null
  sltTelephoneNumber: string | null
  billPaymentIntent: string | null
  billPaymentAmount: number | null
  billPaymentMethod: string | null
  createdAt: string
  calledAt: string | null
  startedAt: string | null
  completedAt: string | null
}
type TimeSpans = {
  waitDurationMs: number | null
  serviceDurationMs: number | null
  totalDurationMs: number | null
}
type CaseData = {
  refNumber: string
  status: string
  serviceTypes: string[]
  services: ServiceEntry[]
  createdAt: string
  completedAt?: string | null
  lastUpdatedAt: string
  outlet: { id: string; name: string; location: string }
  customer: { id: string; name: string; mobileNumber: string; nicNumber?: string | null; email?: string | null; sltMobileNumber?: string | null }
  officer: { id: string; name: string; mobileNumber: string; counterNumber?: number | null }
  token: TokenInfo | null
  timeSpans: TimeSpans
  transferLogs: TransferLog[]
  feedback: CaseFeedback | null
  updates: CaseUpdate[]
}

function fmtDuration(ms: number | null): string {
  if (ms === null || ms < 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

const statusColor = (s: string) =>
  s === 'completed' ? 'bg-green-100 text-green-700' :
  s === 'open' ? 'bg-blue-100 text-blue-700' :
  s === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
  'bg-gray-100 text-gray-700'

const roleLabel = (role: string) =>
  role === 'officer' ? 'Officer' :
  role === 'teleshop_manager' ? 'Teleshop Manager' :
  role === 'manager' ? 'Manager' : role

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  )
}

export default function TeleshopManagerServiceTracking() {
  const [ref, setRef] = useState('')
  const [cases, setCases] = useState<CaseData[]>([])
  const [note, setNote] = useState<Record<string, string>>({})
  const [statusText, setStatusText] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const load = async () => {
    if (!ref.trim()) return
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('teleshopManagerToken')
      const res = await api.get(
        `/teleshop-manager/service-case/${encodeURIComponent(ref.trim())}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      )
      setCases(Array.isArray(res.data) ? res.data : [res.data])
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Reference not found')
      setCases([])
    } finally {
      setLoading(false)
    }
  }

  const addUpdate = async (caseRef: string) => {
    const caseNote = note[caseRef]
    if (!caseRef || !caseNote?.trim()) return
    setSaving(s => ({ ...s, [caseRef]: true }))
    try {
      const token = localStorage.getItem('teleshopManagerToken')
      await api.post('/teleshop-manager/service-case/update', {
        refNumber: caseRef,
        note: caseNote.trim(),
        status: statusText[caseRef] || undefined,
      }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      setNote(n => ({ ...n, [caseRef]: '' }))
      setStatusText(s => ({ ...s, [caseRef]: '' }))
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to add update')
    } finally { setSaving(s => ({ ...s, [caseRef]: false })) }
  }

  const markComplete = async (caseRef: string) => {
    if (!caseRef) return
    if (!confirm('Mark this service case as completed?')) return
    setSaving(s => ({ ...s, [caseRef]: true }))
    try {
      const token = localStorage.getItem('teleshopManagerToken')
      await api.post('/teleshop-manager/service-case/complete', {
        refNumber: caseRef,
        note: note[caseRef]?.trim() || undefined,
      }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      setNote(n => ({ ...n, [caseRef]: '' }))
      setStatusText(s => ({ ...s, [caseRef]: '' }))
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to complete case')
    } finally { setSaving(s => ({ ...s, [caseRef]: false })) }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Service Case Tracking</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ref.trim() && !loading && load()}
              placeholder="Search by Reference No, Mobile No, Email, or Name..."
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={load}
            disabled={!ref.trim() || loading}
            className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 text-sm"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Load
          </button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      )}

      {cases.length > 0 && !loading && (
        <div className="space-y-8 mt-4">
          {cases.length > 1 && (
            <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm font-medium border border-blue-200">
              Found {cases.length} service records for this search.
            </div>
          )}
          {cases.map((data, index) => {
            const langs: string[] = data?.token?.preferredLanguages
              ? Array.isArray(data.token.preferredLanguages)
                ? data.token.preferredLanguages
                : []
              : []
            
            return (
              <div key={data.refNumber} className="space-y-4 relative">
                {cases.length > 1 && (
                  <div className="absolute -left-3 -top-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-md z-10 border-2 border-white">
                    {index + 1}
                  </div>
                )}
                {/* Case Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <div className="flex flex-wrap items-start gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded font-semibold">{data.refNumber}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor(data.status)}`}>
                          {data.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {data.token?.isPriority && (
                          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">PRIORITY</span>
                        )}
                        {data.token?.isTransferred && (
                          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-purple-100 text-purple-700">TRANSFERRED</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {data.outlet.name} — {data.outlet.location}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 space-y-1">
                      <div>Created: <span className="font-medium text-gray-700">{fmtDateTime(data.createdAt)}</span></div>
                      {data.completedAt && (
                        <div>Completed: <span className="font-medium text-green-700">{fmtDateTime(data.completedAt)}</span></div>
                      )}
                      <div>Last Updated: <span className="font-medium text-gray-700">{fmtDateTime(data.lastUpdatedAt)}</span></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.services.map(s => (
                      <span key={s.code} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                        <Hash className="w-3 h-3" />{s.code} — {s.title}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Info Grid — Customer, Officer, Token */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Customer */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">Customer</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="font-medium text-gray-900">{data.customer.name}</div>
                      <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3.5 h-3.5" />{data.customer.mobileNumber}</div>
                      {data.customer.sltMobileNumber && (
                        <div className="text-gray-500 text-xs">SLT Mobile: {data.customer.sltMobileNumber}</div>
                      )}
                      {data.customer.nicNumber && (
                        <div className="text-gray-500 text-xs">NIC: {data.customer.nicNumber}</div>
                      )}
                      {data.customer.email && (
                        <div className="text-gray-500 text-xs truncate">{data.customer.email}</div>
                      )}
                      {langs.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {langs.map((l: string) => (
                            <span key={l} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">{l}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Officer */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">Customer Service Officer</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="font-medium text-gray-900">{data.officer.name}</div>
                      <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3.5 h-3.5" />{data.officer.mobileNumber}</div>
                      {data.officer.counterNumber != null && (
                        <div className="text-gray-500 text-xs">Counter #{data.officer.counterNumber}</div>
                      )}
                    </div>
                  </div>

                  {/* Token */}
                  {data.token && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <Hash className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">Queue Token</span>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="font-bold text-2xl text-amber-600">#{data.token.tokenNumber}</div>
                        {data.token.accountRef && (
                          <div className="text-gray-500 text-xs">A/C Ref: {data.token.accountRef}</div>
                        )}
                        {data.token.sltTelephoneNumber && (
                          <div className="text-gray-500 text-xs">SLT Tel: {data.token.sltTelephoneNumber}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Service Timeline */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" /> Service Timeline
                  </h2>
                  {data.token ? (
                    <div className="space-y-0">
                      {[
                        { label: 'Token Issued', time: data.token.createdAt, color: 'bg-blue-500' },
                        { label: 'Customer Called', time: data.token.calledAt, color: 'bg-yellow-500' },
                        { label: 'Service Started', time: data.token.startedAt, color: 'bg-orange-500' },
                        { label: 'Service Completed', time: data.token.completedAt, color: 'bg-green-500' },
                      ].map((step, idx) => (
                        <div key={step.label} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full mt-0.5 ${step.time ? step.color : 'bg-gray-200'}`} />
                            {idx < 3 && <div className={`w-0.5 h-6 ${step.time ? 'bg-gray-300' : 'bg-gray-100'}`} />}
                          </div>
                          <div className="pb-2 flex-1">
                            <div className={`text-sm font-medium ${step.time ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</div>
                            <div className="text-xs text-gray-500">{step.time ? fmtDateTime(step.time) : 'Not yet'}</div>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 text-right min-w-[60px]">
                            {idx === 0 && data.timeSpans.waitDurationMs !== null && (
                              <span className="text-blue-600 font-medium">Wait: {fmtDuration(data.timeSpans.waitDurationMs)}</span>
                            )}
                            {idx === 2 && data.timeSpans.serviceDurationMs !== null && (
                              <span className="text-green-600 font-medium">Service: {fmtDuration(data.timeSpans.serviceDurationMs)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No token information available.</p>
                  )}
                  {data.timeSpans.totalDurationMs !== null && (
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-sm text-gray-500">Total Duration</span>
                      <span className="text-sm font-semibold text-gray-900">{fmtDuration(data.timeSpans.totalDurationMs)}</span>
                    </div>
                  )}
                </div>

                {/* Bill Payment Details */}
                {data.token && (data.token.billPaymentIntent || data.token.sltTelephoneNumber) && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-green-500" /> Bill Payment Details
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      {data.token.sltTelephoneNumber && (
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">SLT Telephone</div>
                          <div className="font-medium">{data.token.sltTelephoneNumber}</div>
                        </div>
                      )}
                      {data.token.billPaymentIntent && (
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">Payment Intent</div>
                          <div className="font-medium capitalize">{data.token.billPaymentIntent.replace('_', ' ')}</div>
                        </div>
                      )}
                      {data.token.billPaymentAmount != null && (
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">Amount</div>
                          <div className="font-semibold text-green-700">LKR {data.token.billPaymentAmount.toLocaleString()}</div>
                        </div>
                      )}
                      {data.token.billPaymentMethod && (
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">Method</div>
                          <div className="font-medium capitalize">{data.token.billPaymentMethod.replace('_', ' ')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transfer History */}
                {data.transferLogs.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Repeat2 className="w-4 h-4 text-purple-500" /> Transfer History ({data.transferLogs.length})
                    </h2>
                    <div className="space-y-3">
                      {data.transferLogs.map((tl, idx) => (
                        <div key={tl.id} className="border rounded-xl p-3 text-sm bg-purple-50 border-purple-100">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span className="font-medium text-purple-700">Transfer #{idx + 1}</span>
                            <span>{fmtDateTime(tl.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-xs">
                              <span className="text-gray-500">From:</span>{' '}
                              <span className="font-medium">{tl.fromOfficer?.name || 'Officer'}</span>
                              {tl.fromCounterNumber != null && <span className="text-gray-500"> (Counter #{tl.fromCounterNumber})</span>}
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                            <div className="text-xs">
                              <span className="text-gray-500">To Counter:</span>{' '}
                              <span className="font-medium">{tl.toCounterNumber != null ? `#${tl.toCounterNumber}` : 'General Queue'}</span>
                            </div>
                          </div>
                          {(tl.previousServiceTypes.join() !== tl.newServiceTypes.join()) && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs flex-wrap">
                              <span className="text-gray-500">Services changed:</span>
                              <span className="line-through text-red-500">{tl.previousServiceTypes.join(', ')}</span>
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                              <span className="text-green-600">{tl.newServiceTypes.join(', ')}</span>
                            </div>
                          )}
                          {tl.notes && <div className="mt-1.5 text-xs text-gray-600 italic">{tl.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {data.feedback && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" /> Customer Feedback
                    </h2>
                    <div className="flex items-start gap-4">
                      <div>
                        <StarRating rating={data.feedback.rating} />
                        <div className="text-2xl font-bold text-amber-600 mt-1">{data.feedback.rating}/5</div>
                      </div>
                      <div className="flex-1">
                        {data.feedback.comment && (
                          <p className="text-sm text-gray-700 italic">"{data.feedback.comment}"</p>
                        )}
                        <div className="text-xs text-gray-400 mt-1">{fmtDateTime(data.feedback.createdAt)}</div>
                        {data.feedback.isResolved && (
                          <div className="mt-2 text-xs bg-green-50 text-green-700 rounded p-2">
                            <span className="font-medium">Resolved</span>
                            {data.feedback.resolutionComment && <span>: {data.feedback.resolutionComment}</span>}
                          </div>
                        )}
                        {!data.feedback.isResolved && (
                          <span className="mt-1 inline-block text-xs bg-yellow-50 text-yellow-700 rounded px-2 py-0.5">Unresolved</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Update History */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" /> Transaction History ({data.updates.length})
                  </h2>
                  {data.updates.length === 0 ? (
                    <p className="text-sm text-gray-400">No updates recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.updates.map((u) => (
                        <div key={u.id} className="border rounded-xl p-3 text-sm bg-slate-50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                u.actorRole === 'officer' ? 'bg-emerald-100 text-emerald-700' :
                                u.actorRole === 'teleshop_manager' ? 'bg-indigo-100 text-indigo-700' :
                                u.actorRole === 'manager' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{roleLabel(u.actorRole)}</span>
                              {u.status && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(u.status)}`}>{u.status}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">{fmtDateTime(u.createdAt)}</span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap">{u.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Update / Actions */}
                {data.status !== 'completed' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Send className="w-4 h-4 text-indigo-500" /> Add Update
                    </h2>
                    <textarea
                      value={note[data.refNumber] || ''}
                      onChange={(e) => setNote(n => ({ ...n, [data.refNumber]: e.target.value }))}
                      rows={3}
                      className="w-full border rounded-lg p-3 text-sm resize-none"
                      placeholder="Enter note or update…"
                    />
                    <input
                      value={statusText[data.refNumber] || ''}
                      onChange={(e) => setStatusText(s => ({ ...s, [data.refNumber]: e.target.value }))}
                      placeholder="Optional status label (e.g. pending docs)"
                      className="mt-2 w-full border rounded-lg p-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => addUpdate(data.refNumber)}
                        disabled={saving[data.refNumber] || !(note[data.refNumber] || '').trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400 text-sm"
                      >
                        <Send className="w-4 h-4" /> Add Update
                      </button>
                      <button
                        onClick={() => markComplete(data.refNumber)}
                        disabled={saving[data.refNumber]}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400 text-sm"
                      >
                        <CheckCircle className="w-4 h-4" /> Mark Completed
                      </button>
                    </div>
                  </div>
                )}

                {data.status === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-sm text-green-800 font-medium">This service case has been completed.</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
