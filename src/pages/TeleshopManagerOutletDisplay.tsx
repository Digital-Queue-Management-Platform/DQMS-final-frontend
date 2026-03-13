import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ExternalLink, Copy, Monitor, SlidersHorizontal, CheckCircle2 } from "lucide-react"
import api from "../config/api"

type TeleshopManagerMe = {
  id: string
  name: string
  branchId?: string | null
  branch?: {
    id: string
    name: string
    location: string
  } | null
}

export default function TeleshopManagerOutletDisplay() {
  const navigate = useNavigate()
  const [manager, setManager] = useState<TeleshopManagerMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const [refresh, setRefresh] = useState(10)
  const [next, setNext] = useState(8)
  const [services, setServices] = useState(true)
  const [counters, setCounters] = useState(true)
  const [recent, setRecent] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("teleshopManagerToken")
        if (!token) {
          navigate("/teleshop-manager/login")
          return
        }

        const res = await api.get("/teleshop-manager/me", {
          headers: { Authorization: `Bearer ${token}` },
        })

        const profile = res.data?.teleshopManager
        setManager(profile)

        if (!profile?.branchId) {
          setError("You are not assigned to an outlet. Please contact your RTOM manager.")
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || "Failed to load teleshop manager profile")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate])

  const displayUrl = useMemo(() => {
    if (!manager?.branchId) return ""
    const params = new URLSearchParams({
      refresh: String(refresh),
      next: String(next),
      services: services ? "1" : "0",
      counters: counters ? "1" : "0",
      recent: recent ? "1" : "0",
    })
    return `${window.location.origin}/display/outlet/${manager.branchId}?${params.toString()}`
  }, [manager?.branchId, refresh, next, services, counters, recent])

  const openDisplay = () => {
    if (!displayUrl) return
    window.open(displayUrl, "_blank", "noopener,noreferrer")
  }

  const copyLink = async () => {
    if (!displayUrl) return
    try {
      await navigator.clipboard.writeText(displayUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError("Failed to copy URL. Please copy it manually.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading outlet display settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-sky-700 to-indigo-700 text-white p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sky-100 text-sm">Customer-Facing Screen</p>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">Outlet Queue Display Management</h1>
              <p className="text-sky-100 mt-2 text-sm md:text-base">
                Configure and launch the public queue dashboard customers see in your outlet.
              </p>
            </div>
            <div className="hidden md:flex w-14 h-14 rounded-2xl bg-white/15 items-center justify-center">
              <Monitor className="w-7 h-7" />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 rounded-3xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">Display Options</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Refresh interval (seconds)</span>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={refresh}
                  onChange={(e) => setRefresh(Math.max(5, Math.min(60, Number(e.target.value) || 10)))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Up-next token count</span>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={next}
                  onChange={(e) => setNext(Math.max(3, Math.min(20, Number(e.target.value) || 8)))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </label>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-800">Show service names</span>
                <input type="checkbox" checked={services} onChange={(e) => setServices(e.target.checked)} />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-800">Show counter status panel</span>
                <input type="checkbox" checked={counters} onChange={(e) => setCounters(e.target.checked)} />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-800">Show recently called tokens</span>
                <input type="checkbox" checked={recent} onChange={(e) => setRecent(e.target.checked)} />
              </label>
            </div>
          </section>

          <section className="lg:col-span-2 rounded-3xl bg-white border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Assigned Outlet</h2>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Outlet</p>
              <p className="font-semibold text-slate-900">{manager?.branch?.name || "Not assigned"}</p>
              <p className="text-sm text-slate-600 mt-1">{manager?.branch?.location || ""}</p>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-950 text-slate-100 p-3 text-xs break-all">
              {displayUrl || "Display URL unavailable"}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={openDisplay}
                disabled={!displayUrl}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" />
                Open Outlet Display
              </button>

              <button
                onClick={copyLink}
                disabled={!displayUrl}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy Display Link"}
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Tip: Open this URL on a TV browser and switch the browser to full screen for a clean customer display.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
