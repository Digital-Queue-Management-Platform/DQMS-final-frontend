"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Filter, RefreshCw, Languages, Search } from "lucide-react"
import api from "../config/api"
import { AnimatedDropdown } from "../components/AnimatedDropdown"
import ServiceName from "../components/ServiceName"

type Outlet = { id: string; name: string; location: string; region?: { id: string } }
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

export default function TeleshopManagerAppointments() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [services, setServices] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<(Appointment & { outletName?: string; outletLocation?: string })[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Refs for scroll synchronization
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  // Sync header scroll with body scroll
  const handleBodyScroll = () => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft
    }
  }

  useEffect(() => { fetchOutlets() }, [])

  const fetchOutlets = async () => {
    try {
      // Get teleshop manager region id from localStorage
      const raw = localStorage.getItem('teleshopManager')
      const tm = raw ? JSON.parse(raw) : null
      const regionId: string | undefined = tm?.region?.id || tm?.regionId

      const res = await api.get('/queue/outlets')
      const all: Outlet[] = res.data || []
      const filtered = regionId ? all.filter(o => (o as any)?.region?.id === regionId || (o as any).regionId === regionId) : all
      setOutlets(filtered)
    } catch (e) {
      setError('Failed to load outlets')
    }
  }

  const handleDateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void
  ) => {
    const value = e.target.value;

    // Allow empty
    if (!value) {
      setter("");
      return;
    }

    // Enforce YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;

    setter(value);
  };

  const loadData = async () => {
    setError('')
    setLoading(true)
    try {
      const results: any[] = []
      for (const oid of outlets.map(o => o.id)) {
        if (!oid) continue
        const res = await api.get(`/appointment/outlet/${oid}`)
        console.log(res);
        const outlet = outlets.find(o => o.id === oid)
        const mapped = (res.data || []).map((a: Appointment) => ({
          ...a,
          outletName: outlet?.name,
          outletLocation: outlet?.location,
        }))
        results.push(...mapped)
      }

      // Filter by date range on the frontend
      let filteredResults = results;
      if (startDate) {
        filteredResults = filteredResults.filter(a => {
          const appointmentDate = a.appointmentAt.slice(0, 10);
          return appointmentDate >= startDate;
        });
      }
      if (endDate) {
        filteredResults = filteredResults.filter(a => {
          const appointmentDate = a.appointmentAt.slice(0, 10);
          return appointmentDate <= endDate;
        });
      }

      setRows(filteredResults)
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
  }, [outlets, startDate, endDate])

  const filtered = useMemo(() => {
    let data = rows.slice()
    data = data.filter(r => r.status === 'booked')
    if (services.length) data = data.filter(r => Array.isArray(r.serviceTypes) && services.every(s => r.serviceTypes.includes(s)))
    if (statusFilter !== 'all') data = data.filter(r => r.status === statusFilter)
    if (languageFilter !== 'all') data = data.filter(r => r.preferredLanguage === languageFilter)
    if (q.trim()) {
      const qq = q.trim().toLowerCase()
      data = data.filter(r => r.name?.toLowerCase().includes(qq) || r.mobileNumber?.includes(qq))
    }
    data.sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime())
    return data
  }, [rows, services, statusFilter, languageFilter, q])

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filtered.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [startDate, endDate, services, statusFilter, languageFilter, q])

  const toggleService = (code: string) => {
    setServices(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  const formatTime = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatLanguage = (code?: string | null) => {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'si': 'Sinhala',
      'ta': 'Tamil'
    }
    return code ? (languageMap[code] || code) : '-'
  }

  return (
    <div className="p-4">
      <div className="mb-5 flex items-center justify-between">
        <div className=" mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Appointments</h1>
          {/*<p className="text-sm text-gray-600 mt-2">Booked appointments across outlets in your region.</p>*/}
        </div>
        <button
          onClick={loadData}
          className={`px-2 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-700 flex items-center gap-2 ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 p-2.5 mb-4">
        <div className="flex gap-3">
          {/* Status Filter */}
          <div>
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
              className="w-48"
            />
          </div>

          {/* Language Filter */}
          <div>
            <AnimatedDropdown
              value={languageFilter}
              onChange={setLanguageFilter}
              options={[
                { value: "all", label: "All Languages" },
                { value: "en", label: "English" },
                { value: "si", label: "Sinhala" },
                { value: "ta", label: "Tamil" }
              ]}
              icon={<Languages className="w-4 h-4" />}
              className="w-48"
            />
          </div>

          {/* Date Range */}
          <div>
            {/*<label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>*/}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => handleDateChange(e, setStartDate)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-transparent focus:outline-none"
                placeholder="Start date"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => handleDateChange(e, setEndDate)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-transparent focus:outline-none"
                placeholder="End date"
              />
            </div>
          </div>
          {/* Search */}
          <div className="flex-1">
            {/*<label className="block text-sm font-medium text-gray-700 mb-1">Search</label>*/}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or Mobile" className="w-full border border-gray-300 rounded-lg focus:border-transparent focus:outline-none pl-9 pr-3 py-2" />
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="mt-3">
          {/*<label className="block text-sm font-medium text-gray-700 mb-2">Services</label>*/}
          <div className="flex flex-wrap gap-2">
            {SERVICE_OPTIONS.map(s => (
              <label key={s.code} className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm cursor-pointer ${services.includes(s.code) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                <input type="checkbox" checked={services.includes(s.code)} onChange={() => toggleService(s.code)} className="hidden" />
                {/*<Filter className="w-3 h-3" />*/} {s.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div ref={headerScrollRef} className="bg-black/10 rounded-xl mb-3 overflow-x-hidden px-4 py-1">
        <div className="grid grid-cols-7 text-left text-xs text-gray-500 uppercase font-medium min-w-[900px]">
          <div className="px-3 py-3 overflow-hidden whitespace-nowrap">Appointment Time</div>
          <div className="px-3 py-3">Customer</div>
          <div className="px-3 py-3">Language</div>
          <div className="px-3 py-3">Mobile</div>
          {/*<div className="px-3 py-3">Outlet</div>*/}
          <div className="px-3 py-3">Services</div>
          <div className="px-3 py-3">Status</div>
          <div className="px-3 py-3">Created On</div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

        <div ref={bodyScrollRef} className="overflow-x-auto" onScroll={handleBodyScroll}>
          <div className="min-w-[900px]">
            <div className="divide-y">
              {loading ? (
                <div className="px-3 py-8 text-center text-gray-600">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                    Loading…
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-gray-600">
                  No appointments match your filters.
                </div>
              ) : (
                paginatedData.map((r) => (
                  <div key={r.id} className="grid grid-cols-7 text-sm hover:bg-gray-50 transition-colors min-w-[900px]">
                    <div className="px-3 py-3 whitespace-nowrap overflow-hidden">{formatDate(r.appointmentAt)} {formatTime(r.appointmentAt)}</div>
                    <div className="px-3 py-3">{r.name}</div>
                    <div className="px-3 py-3">{formatLanguage(r.preferredLanguage)}</div>
                    <div className="px-3 py-3">{r.mobileNumber}</div>
                    {/*<div className="px-3 py-3 whitespace-nowrap">{r.outletName || r.outletId}{r.outletLocation ? ` — ${r.outletLocation}` : ''}</div>*/}
                    <div className="px-3 py-3">
                      {Array.isArray(r.serviceTypes) ? r.serviceTypes.map((type, i) => (
                        <span key={i}>
                          <ServiceName serviceType={type} />
                          {i < r.serviceTypes.length - 1 ? ', ' : ''}
                        </span>
                      )) : ''}
                    </div>
                    <div className="px-3 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.status === 'queued' ? 'bg-green-100 text-green-700' :
                        r.status === 'booked' ? 'bg-yellow-100 text-yellow-700' :
                          r.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                        }`}>{r.status.toUpperCase()}</span>
                    </div>
                    <div className="px-3 py-3 whitespace-nowrap">{formatDate(r.createdAt)} {formatTime(r.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} appointments
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
