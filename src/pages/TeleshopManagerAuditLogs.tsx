"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
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
} from "lucide-react"
import TeleshopManagerTopBar from "../components/TeleshopManagerTopBar"
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

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function methodLabel(method: string | null): string {
  if (!method) return "—"
  return { cash: "Cash", card: "Card", cheque: "Cheque", bank_transfer: "Bank Transfer" }[method] ?? method
}

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
    <div className="min-h-screen bg-gray-50">
      <TeleshopManagerTopBar teleshopManager={teleshopManager} title="Audit Logs" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/teleshop-manager/dashboard")}
              className="flex items-center text-sky-600 hover:text-sky-800 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-sky-600" />
                Audit Logs
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Complete event history for your branch
              </p>
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
                  <div className={`px-4 pb-4 pt-2 border-t ${cfg.border} ${cfg.bg}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                      {/* Completed service details */}
                      {entry.type === "completed_service" && (
                        <>
                          <Detail label="Token #" value={entry.meta.tokenNumber} />
                          <Detail label="Service" value={`${entry.meta.service?.title} (${entry.meta.service?.code})`} />
                          <Detail label="Duration" value={formatDuration(entry.meta.durationSeconds)} />
                          <Detail label="Bill Payment" value={entry.meta.billPaymentIntent
                            ? `${entry.meta.billPaymentIntent === "full" ? "Full" : "Partial"}${entry.meta.billPaymentAmount ? ` · Rs. ${Number(entry.meta.billPaymentAmount).toFixed(2)}` : ""}`
                            : "—"} />
                          <Detail label="Payment Method" value={methodLabel(entry.meta.billPaymentMethod)} />
                          {entry.meta.notes && <Detail label="Notes" value={entry.meta.notes} span />}
                        </>
                      )}

                      {/* Transfer details */}
                      {entry.type === "transfer" && (
                        <>
                          <Detail label="Token #" value={entry.meta.tokenNumber} />
                          <Detail label="From Counter" value={entry.meta.fromCounterNumber ?? "—"} />
                          <Detail label="To Counter" value={entry.meta.toCounterNumber ?? "—"} />
                          <Detail label="Prev. Services" value={(entry.meta.previousServiceTypes ?? []).join(", ") || "—"} />
                          <Detail label="New Services" value={(entry.meta.newServiceTypes ?? []).join(", ") || "—"} />
                          {entry.meta.notes && <Detail label="Notes" value={entry.meta.notes} span />}
                        </>
                      )}

                      {/* Break details */}
                      {entry.type === "break" && (
                        <>
                          <Detail label="Started" value={formatTimestamp(entry.meta.startedAt)} />
                          <Detail label="Ended" value={entry.meta.endedAt ? formatTimestamp(entry.meta.endedAt) : "In progress"} />
                          <Detail label="Duration" value={entry.meta.durationMinutes !== null ? `${entry.meta.durationMinutes} min` : "—"} />
                        </>
                      )}

                      {/* Service case details */}
                      {entry.type === "service_case" && (
                        <>
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
                        </>
                      )}
                    </div>
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
