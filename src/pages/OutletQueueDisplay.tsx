import { useEffect, useMemo, useState } from "react"
import logo from "../assets/logo.png"
import { useParams, useSearchParams } from "react-router-dom"
import { Clock3, Users, Ticket, Layers, AlertTriangle, Sparkles, CalendarDays } from "lucide-react"
import api, { WS_URL } from "../config/api"
import type { Token } from "../types"
import ServiceName from "../components/ServiceName"

type QueuePayload = {
  waiting: Token[]
  inService: Token[]
  availableOfficers: number
  totalWaiting: number
}

type CounterRow = {
  number: number | null
  isStaffed: boolean
  officer: {
    id: string
    name: string
    status: "available" | "serving" | "on_break" | string
    services?: string[]
  } | null
}

type CalledRecord = {
  id: string
  tokenNumber: number
  counterNumber?: number | null
  calledAt?: string
  serviceTypes?: string[]
}

const toInt = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

const toBool = (value: string | null, fallback: boolean) => {
  if (!value) return fallback
  return value === "1" || value === "true"
}

export default function OutletQueueDisplay() {
  const { outletId } = useParams()
  const [query] = useSearchParams()

  const refreshSeconds = Math.max(5, Math.min(60, toInt(query.get("refresh"), 10)))
  const nextLimit = Math.max(3, Math.min(20, toInt(query.get("next"), 8)))
  const showService = toBool(query.get("services"), true)
  const showCounters = toBool(query.get("counters"), true)
  const showRecent = toBool(query.get("recent"), true)

  const [queue, setQueue] = useState<QueuePayload | null>(null)
  const [counters, setCounters] = useState<CounterRow[]>([])
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [outletMeta, setOutletMeta] = useState<{ name: string; location: string } | null>(null)
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)
  const [recentCalled, setRecentCalled] = useState<CalledRecord[]>([])

  const fetchAll = async () => {
    if (!outletId) return

    try {
      const [queueRes, counterRes, statusRes, outletsRes] = await Promise.all([
        api.get(`/queue/outlet/${outletId}`),
        api.get(`/queue/outlet/${outletId}/counters`),
        api.get(`/branch-status/${outletId}`),
        api.get('/queue/outlets'),
      ])

      const queueData: QueuePayload = queueRes.data
      setQueue(queueData)
      setCounters(Array.isArray(counterRes.data) ? counterRes.data : [])

      const matchedOutlet = Array.isArray(outletsRes.data)
        ? outletsRes.data.find((o: any) => o.id === outletId)
        : null

      if (matchedOutlet?.name) {
        setOutletMeta({
          name: matchedOutlet.name,
          location: matchedOutlet.location || "",
        })
      }

      if (queueData?.inService?.length > 0) {
        const seed = queueData.inService
          .slice()
          .sort((a, b) => {
            const aTime = a.calledAt ? new Date(a.calledAt).getTime() : 0
            const bTime = b.calledAt ? new Date(b.calledAt).getTime() : 0
            return bTime - aTime
          })
          .slice(0, 8)
          .map((t) => ({
            id: t.id,
            tokenNumber: t.tokenNumber,
            counterNumber: t.counterNumber,
            calledAt: t.calledAt,
            serviceTypes: t.serviceTypes,
          }))
        setRecentCalled((prev) => {
          if (prev.length > 0) return prev
          return seed
        })
      }

      const waiting = queueData.waiting || []
      const inService = queueData.inService || []
      const sample = waiting[0] || inService[0]
      if (sample?.outlet?.name) {
        setOutletMeta({
          name: sample.outlet.name,
          location: sample.outlet.location || "",
        })
      }

      const activeNotice = statusRes.data?.activeNotice || statusRes.data?.standardNotice
      if (activeNotice?.title) {
        setNotice({ title: activeNotice.title, message: activeNotice.message || "" })
      } else {
        setNotice(null)
      }

      setError("")
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load outlet display")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [outletId])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const poll = setInterval(fetchAll, refreshSeconds * 1000)
    return () => clearInterval(poll)
  }, [outletId, refreshSeconds])

  useEffect(() => {
    const ws = new WebSocket(WS_URL)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const type = msg?.type
        const data = msg?.data
        if (!data || !outletId) return

        if (["NEW_TOKEN", "TOKEN_COMPLETED", "TOKEN_SKIPPED", "TOKEN_RECALLED", "TOKEN_UPDATED", "TOKEN_CANCELLED", "TOKEN_PRIORITY_UPDATED"].includes(type)) {
          if (!data.outletId || data.outletId === outletId) fetchAll()
        }

        if (type === "TOKEN_CALLED" && data.outletId === outletId) {
          setRecentCalled((prev) => {
            const item: CalledRecord = {
              id: data.id,
              tokenNumber: data.tokenNumber,
              counterNumber: data.counterNumber,
              calledAt: data.calledAt,
              serviceTypes: data.serviceTypes,
            }
            const merged = [item, ...prev.filter((p) => p.id !== data.id)]
            return merged.slice(0, 8)
          })
          fetchAll()
        }
      } catch {
        // ignore malformed ws message
      }
    }

    return () => ws.close()
  }, [outletId])

  const servingByCounter = useMemo(() => {
    const serving = (queue?.inService || []).slice()
    return serving.sort((a, b) => (a.counterNumber || 999) - (b.counterNumber || 999))
  }, [queue])

  const upNext = useMemo(() => {
    return (queue?.waiting || []).slice(0, nextLimit)
  }, [queue, nextLimit])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-lg">Loading outlet queue display...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-5 md:p-8"
      style={{
        backgroundImage: "radial-gradient(circle at 20% 10%, rgba(16,185,129,0.08), transparent 35%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.08), transparent 40%)",
      }}
    >
      <div className="max-w-7xl mx-auto">
        <header className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              {outletMeta?.name || "Outlet Queue Display"}
            </h1>
            <p className="text-slate-600 mt-1 text-sm md:text-base">{outletMeta?.location || "Customer queue information"}</p>
          </div>

          <div className="flex lg:justify-center">
            <div className="inline-flex items-center gap-4 px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="inline-flex items-center gap-2 text-slate-700">
                <CalendarDays className="w-5 h-5 text-sky-600" />
                <span className="font-semibold text-sm md:text-base">{now.toLocaleDateString()}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-slate-700 border-l border-slate-200 pl-4">
                <Clock3 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-lg tabular-nums">{now.toLocaleTimeString()}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
              <p className="text-xs text-emerald-700">Waiting</p>
              <p className="text-2xl font-black text-emerald-900">{queue?.totalWaiting || 0}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3 text-center">
              <p className="text-xs text-sky-700">Serving</p>
              <p className="text-2xl font-black text-sky-900">{queue?.inService?.length || 0}</p>
            </div>
            <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-3 text-center">
              <p className="text-xs text-indigo-700">Active Counters</p>
              <p className="text-2xl font-black text-indigo-900">{queue?.availableOfficers || 0}</p>
            </div>
          </div>
        </header>

        {notice && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600" />
            <div>
              <p className="font-bold text-amber-800">{notice.title}</p>
              {notice.message && <p className="text-sm text-amber-700 mt-1">{notice.message}</p>}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl md:text-2xl font-bold">Now Serving</h2>
            </div>

            {servingByCounter.length === 0 && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
                No token is currently in service.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servingByCounter.map((token) => (
                <div key={token.id} className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Counter</p>
                    <p className="text-lg font-bold text-emerald-700">{token.counterNumber ? `#${token.counterNumber}` : "Assigned"}</p>
                  </div>
                  <p className="text-5xl font-black tracking-wider text-slate-900">{String(token.tokenNumber).padStart(3, "0")}</p>
                  {showService && token.serviceTypes?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {token.serviceTypes.slice(0, 2).map((serviceCode) => (
                        <span key={`${token.id}-${serviceCode}`} className="text-xs rounded-full px-2 py-1 bg-white text-emerald-700 border border-emerald-200">
                          <ServiceName serviceType={serviceCode} />
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="w-5 h-5 text-sky-600" />
              <h2 className="text-xl font-bold">Up Next</h2>
            </div>

            {upNext.length === 0 && <p className="text-slate-600 text-sm">No waiting tokens right now.</p>}

            <div className="space-y-2">
              {upNext.map((token, idx) => (
                <div key={token.id} className="rounded-xl px-3 py-2 bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Queue #{idx + 1}</p>
                    <p className="text-2xl font-extrabold">{String(token.tokenNumber).padStart(3, "0")}</p>
                  </div>
                  {showService && token.serviceTypes?.[0] && (
                    <span className="text-xs px-2 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700">
                      <ServiceName serviceType={token.serviceTypes[0]} />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
          {showRecent && (
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold">Recently Called</h2>
              </div>
              {recentCalled.length === 0 && <p className="text-slate-600 text-sm">No recent calls yet.</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {recentCalled.map((item) => (
                  <div key={item.id} className="rounded-xl px-3 py-3 bg-indigo-50 border border-indigo-200 text-center">
                    <p className="text-2xl font-black">{String(item.tokenNumber).padStart(3, "0")}</p>
                    <p className="text-xs text-indigo-700 mt-1">{item.counterNumber ? `Counter #${item.counterNumber}` : "Counter assigned"}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showCounters && (
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold">Counter Status</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-auto pr-1">
                {counters.filter((c) => c.number !== null).map((counter) => (
                  <div key={String(counter.number)} className="rounded-xl px-3 py-2 border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <p className="font-semibold">Counter #{counter.number}</p>
                    {(() => {
                      const status = counter.officer?.status
                      if (!counter.isStaffed || !status)
                        return <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-600">Offline</span>
                      if (status === "on_break")
                        return <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">On Break</span>
                      if (status === "serving")
                        return <span className="text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-700">Serving</span>
                      return <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Online</span>
                    })()}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-center gap-4">
          <img src={logo} alt="SLT-Mobitel Logo" className="h-12 object-contain" />
          <div className="border-l border-slate-300 pl-4">
            <p className="text-base font-bold text-slate-800 leading-tight">
              Digital Queue<br />Management Platform
            </p>
            <p className="text-xs text-slate-500 mt-1">© 2026 SLT-Mobitel Digital Platforms Section</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
