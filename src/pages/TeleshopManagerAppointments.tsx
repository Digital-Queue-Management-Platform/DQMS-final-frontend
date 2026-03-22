"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Calendar, CalendarDays, CheckCircle, Clock, Filter,
  Globe, MapPin, Phone, RefreshCw, Search, XCircle
} from "lucide-react"
import api from "../config/api"
import { AnimatedDropdown } from "../components/AnimatedDropdown"
import ServiceName from "../components/ServiceName"

type Outlet = { id: string; name: string; location: string; region?: { id: string } }
type Appointment = {
  id: string; name: string; mobileNumber: string; outletId: string
  serviceTypes: string[]; preferredLanguage?: string | null
  appointmentAt: string; status: string; createdAt: string; queuedAt?: string | null
}
type Row = Appointment & { outletName?: string; outletLocation?: string }
type Service = { code: string; title: string }

const LANG: Record<string, string> = { en: "English", si: "Sinhala", ta: "Tamil" }

const STATUS_STYLES: Record<string, string> = {
  queued:    "bg-green-100  text-green-700",
  booked:    "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100   text-blue-700",
  cancelled: "bg-red-100    text-red-500",
}

export default function TeleshopManagerAppointments() {
  const [outlets,         setOutlets]         = useState<Outlet[]>([])
  const [startDate,       setStartDate]       = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate,         setEndDate]         = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedService, setSelectedService] = useState("all")
  const [statusFilter,    setStatusFilter]    = useState("all")
  const [languageFilter,  setLanguageFilter]  = useState("all")
  const [q,               setQ]               = useState("")
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState("")
  const [rows,            setRows]            = useState<Row[]>([])
  const [services,        setServices]        = useState<Service[]>([])
  const [page,            setPage]            = useState(1)
  const [lastUpdated,     setLastUpdated]     = useState(new Date())
  const PER_PAGE = 10

  const headerRef  = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)
  const outletsRef = useRef<Outlet[]>([])
  outletsRef.current = outlets

  const onBodyScroll = () => {
    if (headerRef.current && bodyRef.current)
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft
  }

  useEffect(() => { fetchOutlets(); fetchServices() }, [])

  async function fetchOutlets() {
    try {
      const raw = localStorage.getItem("teleshopManager")
      const tm  = raw ? JSON.parse(raw) : null
      const regionId: string | undefined = tm?.region?.id || tm?.regionId
      const res = await api.get("/queue/outlets")
      const all: Outlet[] = res.data || []
      setOutlets(
        regionId ? all.filter((o: any) => o?.region?.id === regionId || o?.regionId === regionId) : all
      )
    } catch { setError("Failed to load outlets") }
  }

  async function fetchServices() {
    try { const res = await api.get("/queue/services"); setServices(res.data || []) } catch {}
  }

  async function loadData(outletList?: Outlet[]) {
    const list = outletList ?? outletsRef.current
    setError(""); setLoading(true)
    try {
      const results: Row[] = []
      for (const o of list) {
        const res    = await api.get(`/appointment/outlet/${o.id}`)
        const mapped = (res.data || []).map((a: Appointment) => ({
          ...a, outletName: o.name, outletLocation: o.location,
        }))
        results.push(...mapped)
      }
      let filtered = results
      if (startDate) filtered = filtered.filter(a => a.appointmentAt.slice(0, 10) >= startDate)
      if (endDate)   filtered = filtered.filter(a => a.appointmentAt.slice(0, 10) <= endDate)
      setRows(filtered); setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load appointments"); setRows([])
    } finally { setLoading(false) }
  }

  useEffect(() => { if (outlets.length) loadData(outlets) }, [outlets, startDate, endDate])

  /* ── filters ── */
  const filtered = useMemo(() => {
    let d = rows.slice()
    if (statusFilter === "all") d = d.filter(r => ["booked","queued"].includes(r.status))
    else d = d.filter(r => r.status === statusFilter)
    if (selectedService !== "all") d = d.filter(r => Array.isArray(r.serviceTypes) && r.serviceTypes.includes(selectedService))
    if (languageFilter !== "all") d = d.filter(r => r.preferredLanguage === languageFilter)
    if (q.trim()) {
      const qq = q.trim().toLowerCase()
      d = d.filter(r => r.name?.toLowerCase().includes(qq) || r.mobileNumber?.includes(qq))
    }
    return d.sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime())
  }, [rows, statusFilter, selectedService, languageFilter, q])

  const stats = useMemo(() => ({
    total:     rows.length,
    booked:    rows.filter(r => r.status === "booked").length,
    queued:    rows.filter(r => r.status === "queued").length,
    cancelled: rows.filter(r => r.status === "cancelled").length,
  }), [rows])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const pageData   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => setPage(1), [startDate, endDate, selectedService, statusFilter, languageFilter, q])

  const fmtDate = (s: string) => new Date(s).toLocaleDateString([], { year:"numeric", month:"short", day:"numeric" })
  const fmtTime = (s: string) => new Date(s).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })
  const badge   = (status: string) =>
    `text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}`

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" /> Appointments
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Booked appointments across your outlet · Last synced: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={() => loadData()} disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Total",     value:stats.total,     Icon:CalendarDays, cls:"text-blue-600   bg-blue-50"   },
          { label:"Booked",    value:stats.booked,    Icon:Clock,        cls:"text-yellow-600 bg-yellow-50" },
          { label:"Queued",    value:stats.queued,    Icon:CheckCircle,  cls:"text-green-600  bg-green-50"  },
          { label:"Cancelled", value:stats.cancelled, Icon:XCircle,      cls:"text-red-500    bg-red-50"    },
        ].map(({ label, value, Icon, cls }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 flex items-center gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cls}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">

          {/* Date Range */}
          <div className="xl:col-span-2">
            <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Range</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <span className="text-gray-400 text-xs shrink-0">to</span>
              <div className="relative flex-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
            <AnimatedDropdown value={statusFilter} onChange={setStatusFilter}
              options={[
                { value:"all", label:"Active (Booked+Queued)" },
                { value:"booked", label:"Booked" }, { value:"queued", label:"Queued" },
                { value:"completed", label:"Completed" }, { value:"cancelled", label:"Cancelled" },
              ]} icon={<Filter className="w-4 h-4" />} />
          </div>

          {/* Service */}
          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Service</label>
            <AnimatedDropdown value={selectedService} onChange={setSelectedService}
              options={[{ value:"all", label:"All Services" }, ...services.map(s => ({ value:s.code, label:s.title }))]}
              icon={<Filter className="w-4 h-4" />} />
          </div>

          {/* Language */}
          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Language</label>
            <AnimatedDropdown value={languageFilter} onChange={setLanguageFilter}
              options={[
                { value:"all", label:"All Languages" }, { value:"en", label:"English" },
                { value:"si", label:"Sinhala" }, { value:"ta", label:"Tamil" },
              ]} icon={<Filter className="w-4 h-4" />} />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by name or mobile…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      {/* ── Mobile Cards (< lg) ── */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" /> Loading…
            </div>
          </div>
        ) : pageData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No appointments match your filters.</p>
          </div>
        ) : pageData.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            {/* name + badge */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900">{r.name}</p>
                <div className="flex items-center gap-1 mt-0.5 text-sm text-slate-500">
                  <Phone className="w-3 h-3" /> {r.mobileNumber}
                </div>
              </div>
              <span className={badge(r.status)}>{r.status.toUpperCase()}</span>
            </div>

            {/* time */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="font-semibold text-blue-700">
                {fmtDate(r.appointmentAt)} {fmtTime(r.appointmentAt)}
              </span>
            </div>

            {/* outlet */}
            {r.outletName && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{r.outletName}{r.outletLocation ? ` — ${r.outletLocation}` : ""}</span>
              </div>
            )}

            {/* services + language */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {Array.isArray(r.serviceTypes) && r.serviceTypes.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {r.serviceTypes.map((t, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                      <ServiceName serviceType={t} />
                    </span>
                  ))}
                </span>
              )}
              {r.preferredLanguage && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Globe className="w-3 h-3" /> {LANG[r.preferredLanguage] ?? r.preferredLanguage}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop Table (≥ lg) ── */}
      <div className="hidden lg:block">
        {/* frozen header */}
        <div ref={headerRef} className="bg-black/[0.06] rounded-xl mb-2 overflow-x-hidden px-4 py-1">
          <div className="grid grid-cols-7 text-left text-xs text-gray-500 uppercase font-semibold min-w-[900px] tracking-wide">
            <div className="px-3 py-3 col-span-2">Appointment Time</div>
            <div className="px-3 py-3">Customer</div>
            <div className="px-3 py-3">Mobile</div>
            <div className="px-3 py-3">Language</div>
            <div className="px-3 py-3">Services</div>
            <div className="px-3 py-3">Status</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div ref={bodyRef} className="overflow-x-auto" onScroll={onBodyScroll}>
            <div className="min-w-[900px] divide-y divide-slate-50">
              {loading ? (
                <div className="py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" /> Loading…
                  </div>
                </div>
              ) : pageData.length === 0 ? (
                <div className="py-12 text-center">
                  <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No appointments match your filters.</p>
                </div>
              ) : pageData.map(r => (
                <div key={r.id} className="grid grid-cols-7 text-sm hover:bg-blue-50/40 transition-colors min-w-[900px] rounded-lg">
                  <div className="px-3 py-3 col-span-2 whitespace-nowrap font-medium text-slate-700">
                    {fmtDate(r.appointmentAt)} <span className="text-blue-600">{fmtTime(r.appointmentAt)}</span>
                  </div>
                  <div className="px-3 py-3 font-semibold text-slate-900">{r.name}</div>
                  <div className="px-3 py-3 text-slate-600">{r.mobileNumber}</div>
                  <div className="px-3 py-3 text-slate-600">{LANG[r.preferredLanguage ?? ""] || r.preferredLanguage || "—"}</div>
                  <div className="px-3 py-3">
                    {Array.isArray(r.serviceTypes) ? r.serviceTypes.map((t, i) => (
                      <span key={i}><ServiceName serviceType={t} />{i < r.serviceTypes.length - 1 ? ", " : ""}</span>
                    )) : "—"}
                  </div>
                  <div className="px-3 py-3"><span className={badge(r.status)}>{r.status.toUpperCase()}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Pagination (shared) ── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-sm text-slate-500 order-2 sm:order-1">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
            <span className="text-sm text-slate-600 font-medium px-1">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
