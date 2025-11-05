"use client"

import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Calendar, Clock, MapPin, RefreshCwIcon } from "lucide-react"
import api from "../config/api"

type Appt = {
  id: string
  outletId: string
  outletName?: string
  outletLocation?: string
  status: string
  serviceTypes: string[]
  preferredLanguage?: string | null
  appointmentAt: string
  queuedAt?: string | null
  createdAt: string
}

export default function AppointmentMy() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNumber, setMobileNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [appts, setAppts] = useState<Appt[]>([])

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const m = q.get('mobileNumber') || ''
    if (m) {
      setMobileNumber(m)
      fetchMy(m)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const fetchMy = async (mobile: string) => {
    if (!mobile || mobile.length !== 10) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    setError("")
    setLoading(true)
    try {
      const res = await api.get(`/appointment/my`, { params: { mobileNumber: mobile } })
      setAppts(res.data?.appointments || [])
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  const formatTime = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl shadow-xl p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Appointments</h1>
          <p className="text-sm text-gray-600 mb-4">Enter your mobile number to view your upcoming and recent appointments.</p>
          <form onSubmit={(e) => { e.preventDefault(); fetchMy(mobileNumber) }} className="flex gap-2">
            <input
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              type="tel"
              placeholder="07XXXXXXXX"
              pattern="[0-9]{10}"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <RefreshCwIcon className="w-4 h-4" />
              Refresh
            </button>
          </form>
          {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6">
          {loading ? (
            <div className="text-gray-600">Loading…</div>
          ) : appts.length === 0 ? (
            <div className="text-gray-600">No appointments found.</div>
          ) : (
            <div className="space-y-3">
              {appts.map(a => (
                <div key={a.id} className="border rounded-lg p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(a.appointmentAt)} • {formatTime(a.appointmentAt)}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      a.status === 'queued' ? 'bg-green-100 text-green-700' :
                      a.status === 'booked' ? 'bg-yellow-100 text-yellow-700' :
                      a.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      a.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{a.status.toUpperCase()}</span>
                  </div>
                  <div className="text-sm text-gray-600 inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{a.outletName || a.outletId}{a.outletLocation ? ` — ${a.outletLocation}` : ''}</span>
                  </div>
                  <div className="text-sm text-gray-600 inline-flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Services: {Array.isArray(a.serviceTypes) ? a.serviceTypes.join(', ') : ''}</span>
                  </div>
                  {a.preferredLanguage && (
                    <div className="text-xs text-gray-500">Language: {a.preferredLanguage}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/appointment/book')}
            className="text-sm text-indigo-600 hover:underline"
          >
            Book another appointment
          </button>
        </div>
      </div>
    </div>
  )
}
