"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Filter, RefreshCwIcon, Search } from "lucide-react"
import api, { WS_URL } from "../config/api"
import ServiceName from "../components/ServiceName"

type Outlet = { id: string; name: string; location: string; regionId?: string }
type Appointment = {
  id: string
  name: string
  mobileNumber: string
  outletId: string
  serviceTypes: string[]
  preferredLanguage?: string | null
  appointmentAt: string
  status: string
  createdAt: string
  queuedAt?: string | null
}

const SERVICE_OPTIONS = [
  { code: 'BILL_PAYMENT', label: 'Bill Payment' },
  { code: 'OTHERS', label: 'Others' },
]

export default function ManagerAppointments() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [services, setServices] = useState<string[]>([])
  const [q, setQ] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<(Appointment & { outletName?: string; outletLocation?: string })[]>([])

  useEffect(() => {
    fetchOutlets()

    // Auto-refresh every 30 seconds
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (outlets.length) loadData()
    }, 30000)

    // WebSocket for real-time updates with better error handling
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isComponentMounted = true

    const connectWebSocket = () => {
      if (!isComponentMounted) return

      try {
        ws = new WebSocket(WS_URL)

        ws.onopen = () => {
          console.log('ManagerAppointments WebSocket connected')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "NEW_APPOINTMENT" || data.type === "APPOINTMENT_QUEUED" || data.type === "APPOINTMENT_CANCELLED") {
              if (outlets.length) loadData()
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('ManagerAppointments WebSocket error:', error)
        }

        ws.onclose = (event) => {
          console.log('ManagerAppointments WebSocket disconnected:', event.reason)
          if (!event.wasClean && isComponentMounted) {
            reconnectTimer = window.setTimeout(connectWebSocket, 5000)
          }
        }
      } catch (error) {
        console.error('Failed to create ManagerAppointments WebSocket:', error)
      }
    }

    connectWebSocket()

    return () => {
      isComponentMounted = false
      clearInterval(interval)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [])

  const fetchOutlets = async () => {
    try {
      // Get manager regionId from localStorage
      const managerRaw = localStorage.getItem('manager')
      const manager = managerRaw ? JSON.parse(managerRaw) : null
      const regionId: string | undefined = manager?.regionId

      const res = await api.get('/queue/outlets')
      const all: Outlet[] = res.data || []
      const filtered = regionId ? all.filter(o => (o as any).regionId === regionId || (o as any)?.region?.id === regionId) : all
      setOutlets(filtered)
    } catch (e) {
      setError('Failed to load outlets')
    }
  }

  const loadData = async () => {
    setError('')
    setLoading(true)
    try {
      const outletIds = selectedOutlet === 'all' ? outlets.map(o => o.id) : [selectedOutlet]
      const results: any[] = []
      for (const oid of outletIds) {
        if (!oid) continue
        const res = await api.get(`/appointment/outlet/${oid}`, { params: { date } })
        const outlet = outlets.find(o => o.id === oid)
        const mapped = (res.data || []).map((a: Appointment) => ({
          ...a,
          outletName: outlet?.name,
          outletLocation: outlet?.location,
        }))
        results.push(...mapped)
      }
      setRows(results)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load appointments')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (outlets.length) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlets, selectedOutlet, date])

  const filtered = useMemo(() => {
    let data = rows.slice()
    // Show only booked (queued disappear from pool)
    data = data.filter(r => r.status === 'booked')
    if (services.length) data = data.filter(r => Array.isArray(r.serviceTypes) && services.every(s => r.serviceTypes.includes(s)))
    if (q.trim()) {
      const qq = q.trim().toLowerCase()
      data = data.filter(r => r.name?.toLowerCase().includes(qq) || r.mobileNumber?.includes(qq))
    }
    data.sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime())
    return data
  }, [rows, services, q])

  const toggleService = (code: string) => {
    setServices(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  const formatTime = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Appointments (Region)</h1>
            <p className="text-sm text-gray-600">View booked appointments for your region. Updates automatically every 30 seconds.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <button onClick={loadData} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-400">
              <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Outlet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
            <select value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="all">All Outlets</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.name} — {o.location}</option>
              ))}
            </select>
          </div>
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-lg pl-9 pr-3 py-2" />
            </div>
          </div>
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or Mobile" className="w-full border rounded-lg pl-9 pr-3 py-2" />
            </div>
          </div>
        </div>
        {/* Services */}
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_OPTIONS.map(s => (
              <label key={s.code} className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm cursor-pointer ${services.includes(s.code) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                <input type="checkbox" checked={services.includes(s.code)} onChange={() => toggleService(s.code)} className="hidden" />
                <Filter className="w-3 h-3" /> {s.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-600">No appointments match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Outlet</th>
                  <th className="px-3 py-2">Services</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="text-sm">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.appointmentAt)} {formatTime(r.appointmentAt)}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.mobileNumber}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.outletName || r.outletId}{r.outletLocation ? ` — ${r.outletLocation}` : ''}</td>
                    <td className="px-3 py-2">
                      {Array.isArray(r.serviceTypes) ? r.serviceTypes.map((type, i) => (
                        <span key={i}>
                          <ServiceName serviceType={type} />
                          {i < r.serviceTypes.length - 1 ? ', ' : ''}
                        </span>
                      )) : ''}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.status === 'queued' ? 'bg-green-100 text-green-700' :
                        r.status === 'booked' ? 'bg-yellow-100 text-yellow-700' :
                          r.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                        }`}>{r.status.toUpperCase()}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.createdAt)} {formatTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
