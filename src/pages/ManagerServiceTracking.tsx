"use client"

import { useState } from "react"
import { Search, Send, CheckCircle } from "lucide-react"
import api from "../config/api"

type CaseUpdate = { id: string; actorRole: string; status?: string | null; note: string; createdAt: string }
type CaseData = {
  refNumber: string
  status: string
  outlet: { id: string; name: string; location: string }
  serviceTypes: string[]
  createdAt: string
  completedAt?: string | null
  preferredLanguage?: string | null
  updates: CaseUpdate[]
}

export default function ManagerServiceTracking() {
  const [ref, setRef] = useState('')
  const [data, setData] = useState<CaseData | null>(null)
  const [note, setNote] = useState('')
  const [statusText, setStatusText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [lang, setLang] = useState<'en' | 'si' | 'ta'>('en')
  const load = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await api.get(`/service-case/${ref.trim()}`)
      setData(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Reference not found')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const addUpdate = async () => {
    if (!ref.trim() || !note.trim()) return
    setSaving(true)
    try {
      const token = localStorage.getItem('managerToken')
      await api.post('/manager/service-case/update', {
        refNumber: ref.trim(),
        note: note.trim(),
        status: statusText || undefined,
      }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      setNote(''); setStatusText('')
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to add update')
    } finally { setSaving(false) }
  }

  const markComplete = async () => {
    if (!ref.trim()) return
    if (!confirm('Mark this service as completed?')) return
    setSaving(true)
    try {
      const token = localStorage.getItem('managerToken')
      await api.post('/manager/service-case/complete', {
        refNumber: ref.trim(),
        note: note.trim() || undefined,
      }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      setNote(''); setStatusText('')
      await load()
    } catch (e: any) {
      console.error('Failed to complete case:', e?.response?.data?.error || 'Unknown error')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Service Tracking</h1>
        <div className="flex gap-2 mb-2">
          {['en', 'si', 'ta'].map(l => (
            <button
              key={l}
              onClick={() => setLang(l as any)}
              type="button"
              className={`px-2 py-1 rounded text-xs font-medium ${lang === l ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >{l.toUpperCase()}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Enter reference" className="w-full border rounded-lg pl-9 pr-3 py-2" />
          </div>
          <button onClick={load} disabled={!ref.trim() || loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400">Load</button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      </div>

      {loading && <div className="text-gray-600">Loading…</div>}

      {data && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-gray-100 rounded font-mono text-sm">{data.refNumber}</span>
            <span className={`ml-auto text-xs px-2 py-1 rounded-full font-semibold ${data.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{data.status.toUpperCase()}</span>
          </div>
          {data.preferredLanguage && (
            <div className="text-xs text-gray-500">Customer Prefers: {data.preferredLanguage.toUpperCase()}</div>
          )}
          <div className="text-sm text-gray-700">{data.outlet.name} — {data.outlet.location} • Services: {(data.serviceTypes || []).join(', ')}</div>
          <div className="space-y-3">
            {(data.updates || []).map(u => (
              <div key={u.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span className="capitalize">{u.actorRole.replace('_', ' ')}</span>
                  <span>{new Date(u.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-gray-800 whitespace-pre-wrap">{u.note}</div>
                {u.status && <div className="mt-1 text-xs">Status: <span className="font-medium">{u.status}</span></div>}
              </div>
            ))}
          </div>

          {/* Update form */}
          <div className="border-t pt-4">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Add Update</h2>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full border rounded-lg p-3" placeholder="Enter note"></textarea>
            <input value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="Optional status (e.g., pending docs)" className="mt-2 w-full border rounded-lg p-2" />
            <div className="flex gap-2 mt-3">
              <button onClick={addUpdate} disabled={saving || !note.trim()} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400"><Send className="w-4 h-4" /> Add Update</button>
              <button onClick={markComplete} disabled={saving || data.status === 'completed'} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400"><CheckCircle className="w-4 h-4" /> Mark Completed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
