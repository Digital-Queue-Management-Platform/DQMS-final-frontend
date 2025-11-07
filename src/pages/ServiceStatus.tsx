"use client"

import { useEffect, useState } from "react"
import { Search, Clock, CheckCircle, Store, Info } from "lucide-react"
import api from "../config/api"

type CaseUpdate = { id: string; actorRole: string; actorId?: string; status?: string | null; note: string; createdAt: string }
type CaseData = {
  refNumber: string
  status: string
  outlet: { id: string; name: string; location: string }
  serviceTypes: string[]
  createdAt: string
  completedAt?: string | null
  updates: CaseUpdate[]
}

export default function ServiceStatus() {
  const [ref, setRef] = useState<string>(() => new URLSearchParams(window.location.search).get('ref') || '')
  const [data, setData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search).get('ref')
    if (qp) setRef(qp)
  }, [])

  const fetchData = async () => {
    setError('')
    setLoading(true)
    setData(null)
    try {
      const res = await api.get(`/service-case/${encodeURIComponent(ref.trim())}`)
      setData(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Reference not found')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (s: string) => new Date(s).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Service Status</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Enter reference e.g., 2025-10-30/Colombo/104" className="w-full border rounded-lg pl-9 pr-3 py-2" />
          </div>
          <button onClick={fetchData} disabled={!ref.trim() || loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400">Check</button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      </div>

      {loading && <div className="text-gray-600">Loading…</div>}

      {data && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">Reference</span>
            <span className="px-2 py-1 bg-gray-100 rounded font-mono text-sm">{data.refNumber}</span>
            <span className={`ml-auto text-xs px-2 py-1 rounded-full font-semibold ${data.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{data.status.toUpperCase()}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-2"><Store className="w-4 h-4" /> {data.outlet.name} — {data.outlet.location}</div>
            <div className="flex items-center gap-2"><Info className="w-4 h-4" /> Services: {Array.isArray(data.serviceTypes) ? data.serviceTypes.join(', ') : ''}</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Created: {formatDateTime(data.createdAt)}</div>
            {data.completedAt && <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Completed: {formatDateTime(data.completedAt)}</div>}
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Updates</h2>
            <div className="space-y-3">
              {data.updates.map((u) => (
                <div key={u.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span className="capitalize">{u.actorRole.replace('_', ' ')}</span>
                    <span>{formatDateTime(u.createdAt)}</span>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{u.note}</div>
                  {u.status && <div className="mt-1 text-xs text-gray-600">Status: <span className="font-medium">{u.status}</span></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
