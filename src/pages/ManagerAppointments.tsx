"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Filter, RefreshCwIcon, Search } from "lucide-react"
import api, { WS_URL } from "../config/api"
import ServiceName from "../components/ServiceName"
import { AnimatedDropdown } from "../components/AnimatedDropdown"

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

type Service = { code: string; title: string }

export default function ManagerAppointments() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [selectedService, setSelectedService] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [q, setQ] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<(Appointment & { outletName?: string; outletLocation?: string })[]>([])
  const [availableServices, setAvailableServices] = useState<Service[]>([])

  useEffect(() => {
    fetchOutlets()
    fetchServices()

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

  const fetchServices = async () => {
    try {
      const res = await api.get('/queue/services')
      setAvailableServices(res.data || [])
    } catch (e) {
      console.error('Failed to fetch services:', e)
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
    // Show both booked and queued by default in the pool
    if (statusFilter === 'all') {
      data = data.filter(r => ['booked', 'queued'].includes(r.status))
    } else {
      data = data.filter(r => r.status === statusFilter)
    }

    if (selectedService !== 'all') {
      data = data.filter(r => Array.isArray(r.serviceTypes) && r.serviceTypes.includes(selectedService))
    }
    if (q.trim()) {
      const qq = q.trim().toLowerCase()
      data = data.filter(r => r.name?.toLowerCase().includes(qq) || r.mobileNumber?.includes(qq))
    }
    data.sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime())
    return data
  }, [rows, selectedService, statusFilter, q])


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
          <div className="sm:col-span-1 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or Mobile" className="w-full border rounded-lg pl-9 pr-3 py-2" />
            </div>
          </div>
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <AnimatedDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "booked", label: "Booked" },
                { value: "queued", label: "Queued" },
                { value: "completed", label: "Completed" },
                { value: "cancelled", label: "Cancelled" }
              ]}
              icon={<Filter className="w-4 h-4" />}
            />
          </div>
          {/* Services */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Services</label>
            <AnimatedDropdown
              value={selectedService}
              onChange={setSelectedService}
              options={[
                { value: "all", label: "All Services" },
                ...availableServices.map(s => ({ value: s.code, label: s.title }))
              ]}
              icon={<Filter className="w-4 h-4" />}
            />
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
