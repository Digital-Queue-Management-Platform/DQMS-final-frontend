"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Filter, RefreshCwIcon, Search } from "lucide-react"
import api, { WS_URL } from "../../config/api"
import ServiceName from "../../components/ServiceName"
import { AnimatedDropdown } from "../../components/AnimatedDropdown"

type Outlet = { id: string; name: string; location: string }
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

export default function AdminAppointments() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  // We only show booked appointments (queued ones will disappear from this pool)
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
          console.log('AdminAppointments WebSocket connected')
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
          console.error('AdminAppointments WebSocket error:', error)
        }

        ws.onclose = (event) => {
          console.log('AdminAppointments WebSocket disconnected:', event.reason)
          if (!event.wasClean && isComponentMounted) {
            reconnectTimer = window.setTimeout(connectWebSocket, 5000)
          }
        }
      } catch (error) {
        console.error('Failed to create AdminAppointments WebSocket:', error)
      }
    }

    connectWebSocket()

    return () => {
      isComponentMounted = false
      clearInterval(interval)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      }
    }
  }, [])

  const fetchOutlets = async () => {
    try {
      const res = await api.get('/queue/outlets')
      setOutlets(res.data || [])
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
        const res = await api.get(`/appointment/outlet/${oid}`, { 
          params: { startDate, endDate } 
        })
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
  }, [outlets, selectedOutlet, startDate, endDate])

  const filtered = useMemo(() => {
    let data = rows.slice()
    // Filter by status: if "all" shows both booked and queued to keep pool active
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
    // sort by appointmentAt ASC
    data.sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime())
    return data
  }, [rows, selectedService, statusFilter, q])


  const formatDate = (s: string) => new Date(s).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  const formatTime = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-3 sm:gap-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Appointment Pool</h1>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">View and filter all booked appointments by outlet, date, status, and service. Updates automatically every 30 seconds.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <button onClick={loadData} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex-shrink-0 disabled:bg-gray-400">
              <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 sm:hidden">View and filter all booked appointments. Updates automatically every 30 seconds.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Outlet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
            <select value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="all">All Outlets</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.name} — {o.location}</option>
              ))}
            </select>
          </div>
          {/* Date Range Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
            </div>
          </div>
          {/* Date Range End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
            </div>
          </div>
          {/* Search */}
          <div className="sm:col-span-1 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or Mobile" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
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
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2 text-sm">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-sm">No appointments match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b">
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium hidden sm:table-cell">Mobile</th>
                    <th className="px-3 py-2 font-medium hidden lg:table-cell">Outlet</th>
                    <th className="px-3 py-2 font-medium hidden md:table-cell">Services</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium hidden xl:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r) => (
                    <tr key={r.id} className="text-sm hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(r.appointmentAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(r.appointmentAt)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-500 sm:hidden">{r.mobileNumber}</div>
                        <div className="text-xs text-gray-500 lg:hidden mt-1">
                          {r.outletName || r.outletId}{r.outletLocation ? ` — ${r.outletLocation}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">{r.mobileNumber}</td>
                      <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-sm text-gray-900">{r.outletName || r.outletId}</div>
                        {r.outletLocation && <div className="text-xs text-gray-500">{r.outletLocation}</div>}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <div className="text-sm text-gray-900">
                          {Array.isArray(r.serviceTypes) ? r.serviceTypes.map((type, i) => (
                            <span key={i}>
                              <ServiceName serviceType={type} />
                              {i < r.serviceTypes.length - 1 ? ', ' : ''}
                            </span>
                          )) : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.status === 'queued' ? 'bg-green-100 text-green-700' :
                          r.status === 'booked' ? 'bg-yellow-100 text-yellow-700' :
                            r.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                          }`}>{r.status.toUpperCase()}</span>
                        <div className="md:hidden mt-1">
                          <div className="text-xs text-gray-500">
                            {Array.isArray(r.serviceTypes) ? r.serviceTypes.map((type, i) => (
                              <span key={i}>
                                <ServiceName serviceType={type} />
                                {i < r.serviceTypes.length - 1 ? ', ' : ''}
                              </span>
                            )) : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap hidden xl:table-cell">
                        <div className="text-sm text-gray-900">{formatDate(r.createdAt)}</div>
                        <div className="text-xs text-gray-500">{formatTime(r.createdAt)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
