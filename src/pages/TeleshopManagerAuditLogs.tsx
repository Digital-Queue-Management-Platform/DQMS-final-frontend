"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  RefreshCw,
  Filter,
  Calendar,
  User,
  CheckCircle2,
  ArrowRightLeft,
  Coffee,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  ClipboardList,
  MapPin,
  Phone,
  Hash,
  Clock,
  CreditCard,
} from "lucide-react"
import api from "../config/api"

// ─── Types ────────────────────────────────────────────────────────────────────
type LogType = "all" | "completed_services" | "transfers" | "breaks" | "service_cases"
type Period = "today" | "week" | "month" | "year" | "custom"

interface Officer {
  id: string
  name: string
  counterNumber?: number | null
  mobileNumber?: string
}

interface ServiceCaseUpdate {
  id: string
  actorRole: string
  status?: string | null
  note: string
  createdAt: string
}

interface AuditEntry {
  id: string
  type: "completed_service" | "transfer" | "break" | "service_case"
  timestamp: string
  officer: Officer | null
  description: string
  meta: Record<string, any>
}

interface Summary {
  completedServices: number
  transfers: number
  breaks: number
  serviceCases: number
  total: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface TeleshopManager {
  id: string
  name: string
  mobileNumber: string
  regionName: string
  officers?: any[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  AuditEntry["type"],
  { label: string; icon: typeof CheckCircle2; bg: string; text: string; border: string; dot: string }
> = {
  completed_service: {
    label: "Completed Service",
    icon: CheckCircle2,
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  transfer: {
    label: "Token Transfer",
    icon: ArrowRightLeft,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  break: {
    label: "Break",
    icon: Coffee,
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  service_case: {
    label: "Service Case",
    icon: FileText,
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "year", label: "Last 12 Months" },
  { value: "custom", label: "Custom Range" },
]

const LOG_TYPE_OPTIONS: { value: LogType; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "completed_services", label: "Completed Services" },
  { value: "transfers", label: "Token Transfers" },
  { value: "breaks", label: "Officer Breaks" },
  { value: "service_cases", label: "Service Cases" },
]

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

function fmtDuration(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "—"
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function methodLabel(method: string | null): string {
  if (!method) return "—"
  return { cash: "Cash", card: "Card", cheque: "Cheque", bank_transfer: "Bank Transfer" }[method] ?? method
}

const roleLabel = (role: string) =>
  role === "officer" ? "Officer" :
  role === "teleshop_manager" ? "Teleshop Manager" :
  role === "manager" ? "Manager" : role

const statusColor = (s: string) =>
  s === "completed" ? "bg-green-100 text-green-700" :
  s === "open" ? "bg-blue-100 text-blue-700" :
  s === "in_progress" ? "bg-yellow-100 text-yellow-700" :
  "bg-gray-100 text-gray-700"

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TeleshopManagerAuditLogs() {
  const navigate = useNavigate()

  const [teleshopManager, setTeleshopManager] = useState<TeleshopManager | null>(null)
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filters
  const [period, setPeriod] = useState<Period>("today")
  const [logType, setLogType] = useState<LogType>("all")
  const [officerId, setOfficerId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Expanded log entry
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Auth helper ─────────────────────────────────────────────────────────────
  const getToken = useCallback(() => {
    const t = localStorage.getItem("teleshopManagerToken")
    if (!t) { navigate("/teleshop-manager/login"); return null }
    return t
  }, [navigate])

  // ── Fetch profile ───────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await api.get("/teleshop-manager/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.data?.teleshopManager) {
        const tm = res.data.teleshopManager
        setTeleshopManager({
          id: tm.id,
          name: tm.name,
          mobileNumber: tm.mobileNumber,
          regionName: tm.region?.name || "Unknown Region",
          officers: [],
        })
      }
    } catch {
      navigate("/teleshop-manager/login")
    }
  }, [getToken, navigate])

  // ── Fetch audit logs ────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    const token = getToken()
    if (!token) return

    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        period,
        logType,
        page: currentPage.toString(),
        limit: "50",
      })
      if (officerId) params.set("officerId", officerId)
      if (period === "custom") {
        if (startDate) params.set("startDate", startDate)
        if (endDate) params.set("endDate", endDate)
      }

      const res = await api.get(`/teleshop-manager/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.data) {
        setLogs(res.data.logs || [])
        setSummary(res.data.summary || null)
        setPagination(res.data.pagination || null)
        if (res.data.officers?.length) setOfficers(res.data.officers)
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate("/teleshop-manager/login")
      } else {
        setError("Failed to load audit logs. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, navigate, period, logType, officerId, startDate, endDate, currentPage])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // ── Reset page when filters change ─────────────────────────────────────────
  const applyFilters = () => {
    setCurrentPage(1)
    fetchLogs()
  }

  // ── Export to CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!logs.length) return
    const header = "Timestamp,Type,Officer,Counter,Description,Notes/Ref"
    const rows = logs.map((l) => {
      const ts = `"${formatTimestamp(l.timestamp)}"`
      const type = `"${TYPE_CONFIG[l.type].label}"`
      const officer = `"${l.officer?.name ?? "—"}"`
      const counter = l.officer?.counterNumber ? `Counter ${l.officer.counterNumber}` : "—"
      const desc = `"${l.description.replace(/"/g, '""')}"`
      const notes = `"${l.meta.notes ?? l.meta.refNumber ?? ""}"`
      return [ts, type, officer, counter, desc, notes].join(",")
    })
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (!teleshopManager) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading audit logs…
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center shadow-sm">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500">Complete event history for your branch</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 bg-sky-600 text-white px-3 py-2 rounded-lg hover:bg-sky-700 disabled:bg-gray-400 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={!logs.length}
            className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

        {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Total Events", value: summary.total, color: "text-gray-900" },
            { label: "Completed Services", value: summary.completedServices, color: "text-green-600" },
            { label: "Transfers", value: summary.transfers, color: "text-blue-600" },
            { label: "Breaks", value: summary.breaks, color: "text-orange-600" },
            { label: "Service Cases", value: summary.serviceCases, color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
            <Filter className="w-4 h-4" />
            Filters
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Period preset */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Period
              </label>
              <select
                value={period}
                onChange={(e) => { setPeriod(e.target.value as Period); setCurrentPage(1) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Log type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <ClipboardList className="w-3.5 h-3.5 inline mr-1" />
                Event Type
              </label>
              <select
                value={logType}
                onChange={(e) => { setLogType(e.target.value as LogType); setCurrentPage(1) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {LOG_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Officer */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <User className="w-3.5 h-3.5 inline mr-1" />
                Officer
              </label>
              <select
                value={officerId}
                onChange={(e) => { setOfficerId(e.target.value); setCurrentPage(1) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="">All Officers</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}{o.counterNumber ? ` (C${o.counterNumber})` : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom date range — only shown when period === "custom" */}
          {period === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          <button
            onClick={applyFilters}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 text-sm font-medium"
          >
            Apply Filters
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Log entries */}
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading logs…
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No events found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different period or filter.</p>
            </div>
          )}

          {!loading && logs.map((entry) => {
            const cfg = TYPE_CONFIG[entry.type]
            const Icon = cfg.icon
            const isExpanded = expandedId === entry.id

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-xl border ${cfg.border} shadow-sm overflow-hidden`}
              >
                {/* Row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Type icon */}
                  <div className={`mt-0.5 w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {entry.officer && (
                        <span className="text-xs text-gray-600">
                          {entry.officer.name}
                          {entry.officer.counterNumber
                            ? ` · Counter ${entry.officer.counterNumber}`
                            : ""}
                        </span>
                      )}
                      {entry.type === "completed_service" && entry.meta.isPriority && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          Priority
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 font-medium mt-0.5 truncate">
                      {entry.description}
                    </p>
                    {entry.meta.customer && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        Customer: {entry.meta.customer.name} · {entry.meta.customer.mobileNumber}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </p>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className={`border-t ${cfg.border}`}>
                    {/* ── Completed Service — comprehensive view ───────────────── */}
                    {entry.type === "completed_service" && (
                      <CompletedServiceDetail entry={entry} cfg={cfg} />
                    )}

                    {/* ── Transfer detail ──────────────────────────────────────── */}
                    {entry.type === "transfer" && (
                      <div className={`px-4 pb-4 pt-3 ${cfg.bg}`}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                          <Detail label="Token #" value={entry.meta.tokenNumber} />
                          <Detail label="From Counter" value={entry.meta.fromCounterNumber ?? "—"} />
                          <Detail label="To Counter" value={entry.meta.toCounterNumber ?? "—"} />
                          <Detail label="Prev. Services" value={(entry.meta.previousServiceTypes ?? []).join(", ") || "—"} />
                          <Detail label="New Services" value={(entry.meta.newServiceTypes ?? []).join(", ") || "—"} />
                          {entry.meta.notes && <Detail label="Notes" value={entry.meta.notes} span />}
                        </div>
                      </div>
                    )}

                    {/* ── Break detail ─────────────────────────────────────────── */}
                    {entry.type === "break" && (
                      <div className={`px-4 pb-4 pt-3 ${cfg.bg}`}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <Detail label="Started" value={formatTimestamp(entry.meta.startedAt)} />
                          <Detail label="Ended" value={entry.meta.endedAt ? formatTimestamp(entry.meta.endedAt) : "In progress"} />
                          <Detail label="Duration" value={entry.meta.durationMinutes !== null ? `${entry.meta.durationMinutes} min` : "—"} />
                        </div>
                      </div>
                    )}

                    {/* ── Service case detail ───────────────────────────────────── */}
                    {entry.type === "service_case" && (
                      <div className={`px-4 pb-4 pt-3 ${cfg.bg}`}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                          <Detail label="Ref #" value={entry.meta.refNumber} />
                          <Detail label="Services" value={(entry.meta.serviceTypes ?? []).join(", ") || "—"} />
                          <Detail label="Status" value={entry.meta.status} />
                          {entry.meta.completedAt && (
                            <Detail label="Completed" value={formatTimestamp(entry.meta.completedAt)} />
                          )}
                          {entry.meta.latestUpdate && (
                            <Detail
                              label="Latest Note"
                              value={`[${entry.meta.latestUpdate.actorRole}] ${entry.meta.latestUpdate.note || entry.meta.latestUpdate.status}`}
                              span
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} events
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={!pagination.hasNext}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
  )
}

// ── Comprehensive expanded view for completed_service entries ─────────────────
function CompletedServiceDetail({
  entry,
  cfg,
}: {
  entry: AuditEntry
  cfg: { label: string; icon: any; bg: string; text: string; border: string; dot: string }
}) {
  const m = entry.meta
  const sc = m.serviceCase
  const langs: string[] = Array.isArray(m.customer?.preferredLanguages)
    ? m.customer.preferredLanguages
    : []

  const timelineSteps = [
    { label: "Token Issued", time: m.tokenIssuedAt, color: "bg-blue-500", durationLabel: m.waitDurationMs != null ? `Wait: ${fmtDuration(m.waitDurationMs)}` : null, durationColor: "text-blue-600" },
    { label: "Customer Called", time: m.calledAt, color: "bg-yellow-500", durationLabel: null, durationColor: "" },
    { label: "Service Started", time: m.startedAt, color: "bg-orange-500", durationLabel: m.serviceDurationMs != null ? `Service: ${fmtDuration(m.serviceDurationMs)}` : null, durationColor: "text-green-600" },
    { label: "Service Completed", time: m.completedAt, color: "bg-green-500", durationLabel: null, durationColor: "" },
  ]

  return (
    <div className={`px-4 pb-5 pt-3 space-y-4 ${cfg.bg}`}>
      {/* Case header — ref + outlet + timestamps */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {sc?.refNumber && (
                <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded font-semibold">{sc.refNumber}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor(sc?.status ?? "completed")}`}>
                {(sc?.status ?? "completed").replace("_", " ").toUpperCase()}
              </span>
              {m.isPriority && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700">PRIORITY</span>
              )}
              {m.isTransferred && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">TRANSFERRED</span>
              )}
            </div>
            {m.outlet && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5" />
                {m.outlet.name} — {m.outlet.location}
              </div>
            )}
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5 flex-shrink-0">
            {sc?.createdAt && <div>Created: <span className="font-medium text-gray-700">{fmtDateTime(sc.createdAt)}</span></div>}
            {sc?.completedAt && <div>Completed: <span className="font-medium text-green-700">{fmtDateTime(sc.completedAt)}</span></div>}
            {sc?.lastUpdatedAt && <div>Last Updated: <span className="font-medium text-gray-700">{fmtDateTime(sc.lastUpdatedAt)}</span></div>}
          </div>
        </div>
        {/* Service badge */}
        {m.service && (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
            <Hash className="w-3 h-3" />{m.service.code} — {m.service.title}
          </span>
        )}
      </div>

      {/* Customer / Officer / Token cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Customer */}
        {m.customer && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Customer</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="font-medium text-gray-900">{m.customer.name}</div>
              <div className="flex items-center gap-1 text-gray-600 text-xs">
                <Phone className="w-3 h-3" />{m.customer.mobileNumber}
              </div>
              {m.customer.nicNumber && (
                <div className="text-gray-500 text-xs">NIC: {m.customer.nicNumber}</div>
              )}
              {m.customer.email && (
                <div className="text-gray-500 text-xs truncate">{m.customer.email}</div>
              )}
              {langs.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {langs.map((l: string) => (
                    <span key={l} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">{l}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Officer */}
        {entry.officer && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Customer Service Officer</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="font-medium text-gray-900">{entry.officer.name}</div>
              {m.officerMobile && (
                <div className="flex items-center gap-1 text-gray-600 text-xs">
                  <Phone className="w-3 h-3" />{m.officerMobile}
                </div>
              )}
              {entry.officer.counterNumber != null && (
                <div className="text-gray-500 text-xs">Counter #{entry.officer.counterNumber}</div>
              )}
            </div>
          </div>
        )}

        {/* Token */}
        {m.tokenNumber != null && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                <Hash className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Queue Token</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="font-bold text-2xl text-amber-600">#{m.tokenNumber}</div>
              {m.accountRef && <div className="text-gray-500 text-xs">A/C Ref: {m.accountRef}</div>}
              {m.sltTelephoneNumber && <div className="text-gray-500 text-xs">SLT Tel: {m.sltTelephoneNumber}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Service Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-blue-500" /> Service Timeline
        </h3>
        <div className="space-y-0">
          {timelineSteps.map((step, idx) => (
            <div key={step.label} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full mt-0.5 ${step.time ? step.color : "bg-gray-200"}`} />
                {idx < timelineSteps.length - 1 && (
                  <div className={`w-0.5 h-6 ${step.time ? "bg-gray-300" : "bg-gray-100"}`} />
                )}
              </div>
              <div className="pb-2 flex-1">
                <div className={`text-sm font-medium ${step.time ? "text-gray-900" : "text-gray-400"}`}>{step.label}</div>
                <div className="text-xs text-gray-500">{step.time ? fmtDateTime(step.time) : "Not recorded"}</div>
              </div>
              {step.durationLabel && (
                <div className={`text-xs font-medium mt-0.5 ${step.durationColor}`}>{step.durationLabel}</div>
              )}
            </div>
          ))}
        </div>
        {m.totalDurationMs != null && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Duration</span>
            <span className="text-sm font-semibold text-gray-900">{fmtDuration(m.totalDurationMs)}</span>
          </div>
        )}
      </div>

      {/* Bill Payment Details */}
      {(m.billPaymentIntent != null || m.sltTelephoneNumber != null ||
        m.billPaymentMethod != null || m.billPaymentAmount != null ||
        m.accountRef != null) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-green-500" /> Bill Payment Details
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {m.sltTelephoneNumber != null && (
              <div>
                <div className="text-xs text-gray-500 mb-0.5">SLT Telephone</div>
                <div className="font-medium">{m.sltTelephoneNumber}</div>
              </div>
            )}
            {m.billPaymentIntent != null && (
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Payment Intent</div>
                <div className="font-medium capitalize">{m.billPaymentIntent.replace("_", " ")}</div>
              </div>
            )}
            {m.billPaymentMethod != null && (
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Method</div>
                <div className="font-medium">{methodLabel(m.billPaymentMethod)}</div>
              </div>
            )}
            {m.billPaymentAmount != null && (
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Amount</div>
                <div className="font-semibold text-green-700">LKR {Number(m.billPaymentAmount).toLocaleString()}</div>
              </div>
            )}
            {m.accountRef != null && (
              <div>
                <div className="text-xs text-gray-500 mb-0.5">A/C Reference</div>
                <div className="font-medium">{m.accountRef}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction History */}
      {sc?.updates?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-slate-500" /> Transaction History ({sc.updates.length})
          </h3>
          <div className="space-y-2">
            {(sc.updates as ServiceCaseUpdate[]).map((u) => (
              <div key={u.id} className="border rounded-xl p-3 text-sm bg-slate-50">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      u.actorRole === "officer" ? "bg-emerald-100 text-emerald-700" :
                      u.actorRole === "teleshop_manager" ? "bg-indigo-100 text-indigo-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{roleLabel(u.actorRole)}</span>
                    {u.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(u.status)}`}>{u.status}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{fmtDateTime(u.createdAt)}</span>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap text-xs">{u.note}</p>
              </div>
            ))}
          </div>
          {sc.status === "completed" && (
            <p className="text-xs text-gray-400 mt-3 italic">This service case has been completed.</p>
          )}
        </div>
      )}

      {/* Notes */}
      {m.notes && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-gray-500 mb-1 font-medium">Notes</div>
          <p className="text-sm text-gray-800">{m.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Small helper component ─────────────────────────────────────────────────────
function Detail({
  label,
  value,
  span,
}: {
  label: string
  value: string | number | null | undefined
  span?: boolean
}) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-semibold break-words">{value ?? "—"}</p>
    </div>
  )
}
