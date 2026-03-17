"use client"

import { useEffect, useState } from "react"
import {
  Search, CheckCircle, User, Clock, MapPin, Phone, Hash, Star,
  ArrowRight, FileText, RefreshCw, Repeat2, CreditCard, Store
} from "lucide-react"
import api from "../config/api"

type CaseUpdate = { id: string; actorRole: string; actorId?: string; status?: string | null; note: string; createdAt: string }
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
type TimeSpans = { waitDurationMs: number | null; serviceDurationMs: number | null; totalDurationMs: number | null }
type CaseData = {
  refNumber: string
  status: string
  outlet: { id: string; name: string; location: string }
  serviceTypes: string[]
  services: ServiceEntry[]
  createdAt: string
  completedAt?: string | null
  lastUpdatedAt: string
  customer: { name: string; mobileNumber: string } | null
  officer: { name: string; mobileNumber: string; counterNumber: number | null } | null
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

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  )
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

export default function ServiceStatus() {
  const [ref, setRef] = useState<string>(() => new URLSearchParams(window.location.search).get('ref') || '')
  const [data, setData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [language] = useState<'en' | 'si' | 'ta'>(() => {
    try {
      const saved = localStorage.getItem('dq_lang') as 'en' | 'si' | 'ta' | null
      if (saved) return saved
    } catch { }
    const nav = (navigator?.language || 'en').toLowerCase()
    if (nav.startsWith('si')) return 'si'
    if (nav.startsWith('ta')) return 'ta'
    return 'en'
  })

  const translations = {
    en: { title: 'Service Status', refPlaceholder: 'Enter reference e.g., 2025-10-30/Colombo/104', check: 'Check', referenceNotFound: 'Reference not found', loading: 'Loading…', english: 'English', sinhala: 'Sinhala', tamil: 'Tamil' },
    si: { title: 'සේවා තත්ත්වය', refPlaceholder: 'යොමුව ඇතුළත් කරන්න', check: 'පරික්ෂා කරන්න', referenceNotFound: 'යොමුව සොයාගත නොහැකි විය', loading: 'පූරණය වෙමින්…', english: 'English', sinhala: 'සිංහල', tamil: 'தமிழ்' },
    ta: { title: 'சேவை நிலை', refPlaceholder: 'குறிப்பை உள்ளிடவும்', check: 'சரி பார்க்கவும்', referenceNotFound: 'குறிப்பு கிடைக்கவில்லை', loading: 'ஏற்றுகிறது…', english: 'English', sinhala: 'සිංහල', tamil: 'தமிழ்' },
  } as const

  const t = translations[language]

  const fetchData = async (refOverride?: string) => {
    const lookup = (refOverride ?? ref).trim()
    if (!lookup) return
    setError('')
    setLoading(true)
    setData(null)
    try {
      const res = await api.get(`/service-case/${encodeURIComponent(lookup)}`)
      setData(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.error || t.referenceNotFound)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch when landing on the page with a ?ref= query param
  useEffect(() => {
    const qp = new URLSearchParams(window.location.search).get('ref')
    if (qp) {
      setRef(qp)
      fetchData(qp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const langs: string[] = data?.token?.preferredLanguages
    ? Array.isArray(data.token.preferredLanguages) ? data.token.preferredLanguages : []
    : []

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      {/* Search Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        {/* Top language selector removed as it's redundant */}
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{t.title}</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ref.trim() && !loading && fetchData()}
              placeholder={t.refPlaceholder}
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <button onClick={() => fetchData()} disabled={!ref.trim() || loading}
            className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 text-sm">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t.check}
          </button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> {t.loading}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Case Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex flex-wrap items-start gap-3 mb-3">
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
                  <MapPin className="w-3.5 h-3.5" /> {data.outlet.name} — {data.outlet.location}
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                <div>Created: <span className="font-medium text-gray-700">{fmtDateTime(data.createdAt)}</span></div>
                {data.completedAt && <div>Completed: <span className="font-medium text-green-700">{fmtDateTime(data.completedAt)}</span></div>}
                <div>Last updated: <span className="font-medium text-gray-700">{fmtDateTime(data.lastUpdatedAt)}</span></div>
              </div>
            </div>
            {/* Services */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 self-center">Services</span>
              {(data.services.length > 0 ? data.services : data.serviceTypes.map(c => ({ code: c, title: c }))).map(s => (
                <span key={s.code} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{s.title}</span>
              ))}
            </div>
          </div>

          {/* Customer & Officer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.customer && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">Customer</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-gray-900">{data.customer.name}</div>
                  <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3.5 h-3.5" />{data.customer.mobileNumber}</div>
                </div>
              </div>
            )}
            {data.officer && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Store className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">Handled By</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-gray-900">{data.officer.name}</div>
                  <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3.5 h-3.5" />{data.officer.mobileNumber}</div>
                  {data.officer.counterNumber != null && (
                    <div className="text-gray-500 text-xs">Counter #{data.officer.counterNumber}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Token Details */}
          {data.token && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Hash className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-semibold text-gray-900">Token Details</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Token</div>
                  <div className="font-bold text-2xl text-amber-600">#{data.token.tokenNumber}</div>
                </div>
                {langs.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Language</div>
                    <div className="flex gap-1 flex-wrap">
                      {langs.map((l: string) => (
                        <span key={l} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
                {data.token.accountRef && (
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Account Ref</div>
                    <div className="font-medium text-gray-900">{data.token.accountRef}</div>
                  </div>
                )}
                {data.token.sltTelephoneNumber && (
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">SLT Number</div>
                    <div className="font-medium text-gray-900">{data.token.sltTelephoneNumber}</div>
                  </div>
                )}
                {(data.token.billPaymentIntent || data.token.billPaymentAmount != null) && (
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Bill Payment</div>
                    <div className="font-medium text-gray-900">
                      {data.token.billPaymentAmount != null && `Rs. ${data.token.billPaymentAmount.toLocaleString()}`}
                      {data.token.billPaymentMethod && ` (${data.token.billPaymentMethod.replace('_', ' ')})`}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline within token card */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                  <Clock className="w-4 h-4 text-blue-500" /> Time Breakdown
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Called At</div>
                    <div className="font-medium text-gray-900">{fmtTime(data.token.calledAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Started At</div>
                    <div className="font-medium text-gray-900">{fmtTime(data.token.startedAt)}</div>
                  </div>
                  {data.token.completedAt && (
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Completed At</div>
                      <div className="font-medium text-gray-900">{fmtTime(data.token.completedAt)}</div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {data.timeSpans.waitDurationMs !== null && (
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="font-bold text-blue-700 text-sm">{fmtDuration(data.timeSpans.waitDurationMs)}</div>
                      <div className="text-xs text-gray-500">Wait time</div>
                    </div>
                  )}
                  {data.timeSpans.serviceDurationMs !== null && (
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <div className="font-bold text-green-700 text-sm">{fmtDuration(data.timeSpans.serviceDurationMs)}</div>
                      <div className="text-xs text-gray-500">Service time</div>
                    </div>
                  )}
                  {data.timeSpans.totalDurationMs !== null && (
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="font-bold text-gray-700 text-sm">{fmtDuration(data.timeSpans.totalDurationMs)}</div>
                      <div className="text-xs text-gray-500">Total time</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bill Payment Details — standalone card when relevant */}
          {data.token && data.token.billPaymentIntent && data.token.billPaymentIntent !== 'not_specified' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-500" /> Bill Payment
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {data.token.sltTelephoneNumber && (
                  <div><div className="text-xs text-gray-500 mb-0.5">SLT Telephone</div><div className="font-medium">{data.token.sltTelephoneNumber}</div></div>
                )}
                {data.token.billPaymentIntent && (
                  <div><div className="text-xs text-gray-500 mb-0.5">Payment Type</div><div className="font-medium capitalize">{data.token.billPaymentIntent.replace('_', ' ')}</div></div>
                )}
                {data.token.billPaymentAmount != null && (
                  <div><div className="text-xs text-gray-500 mb-0.5">Amount</div><div className="font-semibold text-green-700">Rs. {data.token.billPaymentAmount.toLocaleString()}</div></div>
                )}
                {data.token.billPaymentMethod && (
                  <div><div className="text-xs text-gray-500 mb-0.5">Method</div><div className="font-medium capitalize">{data.token.billPaymentMethod.replace('_', ' ')}</div></div>
                )}
                {data.token.accountRef && (
                  <div><div className="text-xs text-gray-500 mb-0.5">Account Ref</div><div className="font-medium">{data.token.accountRef}</div></div>
                )}
              </div>
            </div>
          )}

          {/* Transfer History */}
          {data.transferLogs && data.transferLogs.length > 0 && (
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
                    {tl.notes && <div className="mt-1.5 text-xs text-gray-600 italic">{tl.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Feedback */}
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
                  {data.feedback.comment && <p className="text-sm text-gray-700 italic">"{data.feedback.comment}"</p>}
                  <div className="text-xs text-gray-400 mt-1">{fmtDateTime(data.feedback.createdAt)}</div>
                  {data.feedback.isResolved
                    ? <div className="mt-2 text-xs bg-green-50 text-green-700 rounded p-2"><span className="font-medium">Resolved</span>{data.feedback.resolutionComment && <span>: {data.feedback.resolutionComment}</span>}</div>
                    : <span className="mt-1 inline-block text-xs bg-yellow-50 text-yellow-700 rounded px-2 py-0.5">Unresolved</span>
                  }
                </div>
              </div>
            </div>
          )}

          {/* Case Updates */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" /> Case Updates ({data.updates.length})
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
                        {u.status && <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(u.status)}`}>{u.status}</span>}
                      </div>
                      <span className="text-xs text-gray-400">{fmtDateTime(u.createdAt)}</span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{u.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <span className="text-sm text-green-800 font-medium">This service has been completed. Thank you for visiting SLT Mobitel.</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}


