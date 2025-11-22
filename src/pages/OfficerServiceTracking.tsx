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
      const res = await api.get(`/officer/service-case/${encodeURIComponent(ref.trim())}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      setData(res.data)
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 401) setError('Please login again to view this case')
      else if (status === 403) setError('Not authorized to view or update this service case')
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
      console.error('Complete failed:', e?.response?.data?.error || e.message)
      alert(e?.response?.data?.error || 'Failed to complete case')
    } finally { setCompleting(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Service Tracking</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              value={ref} 
              onChange={(e) => setRef(e.target.value)} 
              placeholder="Enter reference number" 
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
            />
          </div>
          <button 
            onClick={load} 
            disabled={!ref.trim() || loading} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-indigo-700 transition-colors font-semibold"
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      </div>

      {data && !error && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-100 rounded-lg font-mono text-sm font-medium">{data.refNumber}</span>
            <span className={`ml-auto text-xs px-3 py-1 rounded-full font-semibold uppercase ${
              data.status === 'completed' ? 'bg-green-100 text-green-700' : 
              data.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 
              'bg-gray-100 text-gray-700'
            }`}>
              {data.status}
            </span>
          </div>
          {data.preferredLanguage && (
            <div className="text-xs text-gray-500">Customer Prefers: <span className="font-medium uppercase">{data.preferredLanguage}</span></div>
          )}
          <div className="text-sm text-gray-700">
            <span className="font-medium">{data.outlet.name}</span> — {data.outlet.location}
            <div className="mt-1">Services: <span className="font-medium">{(data.serviceTypes || []).join(', ')}</span></div>
            <div className="mt-1 text-xs text-gray-500">Created: {new Date(data.createdAt).toLocaleString()}</div>
          </div>
          
          <div className="border-t pt-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Case Updates</h2>
            <div className="space-y-3">
              {(data.updates || []).length === 0 ? (
                <div className="text-sm text-gray-500 italic">No updates yet</div>
              ) : (
                (data.updates || []).map(u => (
                  <div key={u.id} className="border border-gray-200 rounded-lg p-3 text-sm bg-gray-50">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span className="capitalize font-medium">{u.actorRole.replace('_', ' ')}</span>
                      <span>{new Date(u.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-800 whitespace-pre-wrap">{u.note}</div>
                    {u.status && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          u.status === 'completed' ? 'bg-green-100 text-green-700' :
                          u.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          u.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {u.status}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Update form */}
          <div className="border-t pt-4">
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
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-indigo-700 transition-colors font-semibold inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {saving ? 'Sending...' : 'Send Update'}
            </button>
            <button 
              onClick={markComplete} 
              disabled={data.status === 'completed' || completing}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-green-700 transition-colors font-semibold inline-flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {completing ? 'Completing...' : 'Mark Completed'}
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
