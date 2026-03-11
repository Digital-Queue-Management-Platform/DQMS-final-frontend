"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, Star, AlertCircle, Users, Coffee, RefreshCwIcon } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { motion } from "framer-motion"
// OfficerTopBar is provided by Layout for officer routes
import api, { WS_URL } from "../config/api"
import type { Officer, Token } from "../types"

export default function OfficerDashboard() {
  const navigate = useNavigate()
  const [officer, setOfficer] = useState<Officer | null>(null)
  const [stats, setStats] = useState({
    tokensHandled: 0,
    avgRating: 0,
  })
  const [queue, setQueue] = useState<{ waiting: Token[]; inService: Token[]; availableOfficers: number; totalWaiting: number } | null>(null)
  // queue moved to dedicated page; keep queue summary only for cards
  // time moved to OfficerTopBar
  const [activeTab, setActiveTab] = useState<'served' | 'breaks' | 'feedback'>('served')
  const [servedSummary, setServedSummary] = useState<{ total: number; avgHandleMinutes: number; tokens: Token[] } | null>(null)
  const [breaksSummary, setBreaksSummary] = useState<{ totalBreaks: number; totalMinutes: number; breaks: any[]; activeBreak?: any } | null>(null)
  const [feedbackSummary, setFeedbackSummary] = useState<{ total: number; avgRating: number; feedback: { tokenId: string; tokenNumber: number; rating: number; comment: string; customerName: string; createdAt: string }[] } | null>(null)
  const [feedbackView, setFeedbackView] = useState<'list' | 'chart'>('list')
  const [breaksLimit, setBreaksLimit] = useState<number>(10)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [breakLoading, setBreakLoading] = useState(false)
  const [breakError, setBreakError] = useState<string | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [_lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Helper functions for date and time formatting
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  // confirm handled inside OfficerTopBar

  useEffect(() => {
    // Fetch authoritative officer from server
    let mounted = true
    api
      .get("/officer/me")
      .then((res) => {
        if (!mounted) return
        const officerData = res.data.officer
        setOfficer(officerData)

        // Update localStorage with complete officer data for sidebar
        localStorage.setItem('dq_user', JSON.stringify(officerData))

        fetchStats(officerData.id)
        fetchQueue(officerData.outletId)
        fetchServed(officerData.id)
        fetchBreaks(officerData.id)
        fetchFeedback(officerData.id)

        // Auto-refresh every 30 seconds for officer performance monitoring
        const interval = setInterval(() => {
          fetchStats(officerData.id)
          fetchQueue(officerData.outletId)
          fetchServed(officerData.id)
          fetchBreaks(officerData.id)
          fetchFeedback(officerData.id)
        }, 30000)

        // Handle window closing/refreshing - send logout when window closes
        const handleBeforeUnload = () => {
          // Send a synchronous logout request when window is closing
          const token = localStorage.getItem("dqToken")
          if (token) {
            navigator.sendBeacon('/api/officer/logout', JSON.stringify({}))
          }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        // WebSocket for real-time updates
        const ws = new WebSocket(WS_URL)
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            // Only re-fetch what actually changed — avoids firing 5 API calls for a simple queue update
            if (data.type === "NEW_TOKEN" || data.type === 'TOKEN_CALLED' || data.type === 'TOKEN_RECALLED' || data.type === 'TOKEN_SKIPPED') {
              fetchQueue(officerData.outletId)
            } else if (data.type === "TOKEN_COMPLETED") {
              fetchQueue(officerData.outletId)
              fetchStats(officerData.id)
              fetchServed(officerData.id)
            } else if (data.type === 'FEEDBACK_SUBMITTED') {
              fetchStats(officerData.id)
              fetchFeedback(officerData.id)
            } else if (data.type === 'BREAK_STATUS_CHANGE') {
              fetchBreaks(officerData.id)
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        ws.onopen = () => {
          console.log('OfficerDashboard WebSocket connected')
        }

        ws.onerror = (error) => {
          console.error('OfficerDashboard WebSocket error:', error)
        }

          ; (window as any).__dq_ws = ws

        return () => {
          clearInterval(interval)
          window.removeEventListener('beforeunload', handleBeforeUnload)
          try {
            ws.close()
          } catch (error) {
            console.error('Error closing WebSocket:', error)
          }
        }
      })
      .catch(() => {
        navigate("/officer/login")
      })

    return () => {
      mounted = false
      const ws = (window as any).__dq_ws
      if (ws) ws.close()
    }
  }, [navigate])

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Update break timer when officer is on break
  useEffect(() => {
    if (officer?.status === 'on_break' && officer?.id) {
      const interval = setInterval(() => {
        fetchBreaks(officer.id)
      }, 30000) // Update every 30 seconds when on break

      return () => clearInterval(interval)
    }
  }, [officer?.status, officer?.id])

  // time managed in OfficerTopBar

  const fetchStats = async (officerId: string) => {
    try {
      setDashboardLoading(true)
      const response = await api.get(`/officer/stats/${officerId}`)
      setStats({
        tokensHandled: response.data.tokensHandled,
        avgRating: response.data.avgRating,
      })
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    } finally {
      setDashboardLoading(false)
    }
  }

  const fetchQueue = async (outletId?: string) => {
    if (!outletId) return
    try {
      const res = await api.get(`/queue/outlet/${outletId}`)
      setQueue(res.data)
    } catch (err) {
      console.error('Failed to fetch queue', err)
    }
  }

  const fetchServed = async (officerId: string) => {
    try {
      const res = await api.get(`/officer/summary/served/${officerId}`)
      setServedSummary(res.data)
    } catch (e) {
      console.error('failed to load served summary', e)
    }
  }

  const fetchBreaks = async (officerId: string) => {
    try {
      const res = await api.get(`/officer/summary/breaks/${officerId}`)
      setBreaksSummary(res.data)
    } catch (e) {
      console.error('failed to load breaks summary', e)
    }
  }

  const fetchFeedback = async (officerId: string) => {
    try {
      const res = await api.get(`/officer/summary/feedback/${officerId}`)
      const fb = (res.data?.feedback || []).map((f: any) => ({ ...f, createdAt: new Date(f.createdAt).toISOString() }))
      setFeedbackSummary({ total: res.data?.total || 0, avgRating: res.data?.avgRating || 0, feedback: fb })
    } catch (e) {
      console.error('failed to load feedback summary', e)
    }
  }

  // Reset breaks view when switching to the Breaks tab
  useEffect(() => {
    if (activeTab === 'breaks') {
      setBreaksLimit(10)
    }
  }, [activeTab])

  // queue interaction handlers removed; use dedicated queue page

  // Handle status changes with improved break management
  const handleStatusChange = async (status: string) => {
    if (!officer) return

    setBreakLoading(true)
    setBreakError(null)

    try {
      if (status === 'on_break') {
        // Use dedicated break start endpoint
        await api.post('/officer/break/start', { officerId: officer.id })
      } else if (status === 'available' && officer.status === 'on_break') {
        // Use dedicated break end endpoint
        await api.post('/officer/break/end', { officerId: officer.id })
      } else {
        // Use general status endpoint for other status changes
        await api.post('/officer/status', { officerId: officer.id, status })
      }

      setOfficer(prev => prev ? { ...prev, status } : prev)

      // Refresh break data after status change
      await fetchBreaks(officer.id)

      // Broadcast status change event
      const evt: any = new CustomEvent('officer:status-changed', { detail: { status } })
      window.dispatchEvent(evt)

      if (status === 'offline') {
        try { await api.post('/officer/logout') } catch { }
        navigate('/officer/login')
      }
    } catch (err: any) {
      console.error('Failed to update status:', err)
      const errorMessage = err.response?.data?.error || 'Failed to update status'
      setBreakError(errorMessage)
      alert(errorMessage)
    } finally {
      setBreakLoading(false)
    }
  }

  // React to status changes broadcast by Layout's top bar
  useEffect(() => {
    const onStatus = async (e: any) => {
      const status = e?.detail?.status
      if (!officer || !status) return
      // Sync local officer status so UI reflects immediately
      setOfficer((prev) => (prev ? { ...prev, status } as any : prev))
      try { await fetchBreaks(officer.id) } catch { }
      if (status === 'offline') {
        alert(
          `Great work today!\n\nTokens Handled: ${stats.tokensHandled}\nAverage Rating: ${stats.avgRating.toFixed(1)}/5\n\nThank you for your service!`,
        )
      }
    }
    window.addEventListener('officer:status-changed', onStatus)
    return () => window.removeEventListener('officer:status-changed', onStatus)
  }, [officer, stats.tokensHandled, stats.avgRating])

  if (!officer) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Officer Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-slate-500">{formatDate(currentDateTime)} &bull; {formatTime(currentDateTime)}</p>
                {dashboardLoading && <span className="text-xs text-amber-600 font-medium">Refreshing...</span>}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Enhanced Break Controls */}
              {officer && (
                <div className="flex items-center space-x-2">
                  {/* Break Error Display */}
                  {breakError && (
                    <div className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs">
                      {breakError}
                    </div>
                  )}

                  {officer.status === 'available' && (
                    <button
                      onClick={() => handleStatusChange('on_break')}
                      disabled={breakLoading}
                      className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Coffee className="w-4 h-4" />
                      {breakLoading ? 'Starting...' : 'Take Break'}
                    </button>
                  )}

                  {officer.status === 'on_break' && (
                    <div className="flex items-center gap-2">
                      {/* Active break timer */}
                      {breaksSummary?.activeBreak && (
                        <div className="px-3 py-1 bg-yellow-50 text-yellow-800 rounded-lg text-sm font-mono">
                          Break: {Math.floor((Date.now() - new Date(breaksSummary.activeBreak.startedAt).getTime()) / (1000 * 60))}min
                        </div>
                      )}
                      <button
                        onClick={() => handleStatusChange('available')}
                        disabled={breakLoading}
                        className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCwIcon className="w-4 h-4" />
                        {breakLoading ? 'Ending...' : 'End Break'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="flex items-center px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>

            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="space-y-6">

          {/* Counter Status Section */}
          {officer && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {officer.counterNumber || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Counter {officer.counterNumber || 'N/A'} • {officer.outlet?.name || 'Unknown Branch'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {officer.outlet?.location || 'Unknown Location'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${officer.status === 'available' ? 'bg-green-400' :
                      officer.status === 'on_break' ? 'bg-yellow-400' :
                        officer.status === 'serving' ? 'bg-blue-400' :
                          'bg-gray-400'
                      }`}></div>
                    <span className={`text-sm font-medium capitalize ${officer.status === 'available' ? 'text-green-700' :
                      officer.status === 'on_break' ? 'text-yellow-700' :
                        officer.status === 'serving' ? 'text-blue-700' :
                          'text-gray-700'
                      }`}>
                      {officer.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 mb-1 truncate">Tokens Handled</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.tokensHandled}</p>
                </div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 mb-1 truncate">Average Rating</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.avgRating.toFixed(1)}</p>
                </div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 mb-1 truncate">Current Status</p>
                  <p className="text-sm sm:text-base font-bold text-slate-900 capitalize">{officer.status.replace('_', ' ')}</p>
                </div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 mb-1 truncate">Customers Waiting</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{queue ? (queue.totalWaiting ?? queue.waiting.length) : 0}</p>
                </div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                  <Users className="w-5 h-5 text-rose-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 mb-1 truncate">Breaks Taken</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{breaksSummary ? breaksSummary.totalBreaks : 0}</p>
                </div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                  <Coffee className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="mb-5">
            <nav className="flex gap-2" aria-label="Tabs">
              {[
                { id: 'served', label: 'Served Today' },
                { id: 'breaks', label: 'Breaks Today' },
                { id: 'feedback', label: 'Feedback' },
              ].map((t: any) => (
                <button key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeTab === t.id
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                      : 'bg-white text-slate-600 hover:bg-amber-50 border border-slate-200'
                  }`}>{t.label}</button>
              ))}
            </nav>
          </div>

          {/* Queue tab removed; use dedicated page at /officer/queue */}

          {activeTab === 'served' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Served Today</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">Avg handle: {servedSummary ? servedSummary.avgHandleMinutes : 0} min</div>
                  <button
                    onClick={() => navigate('/officer/served-customers')}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    View All
                  </button>
                </div>
              </div>
              {!servedSummary ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : servedSummary.tokens.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No customers served yet today.</div>
              ) : (
                <div className="space-y-3">
                  {servedSummary.tokens.map(t => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/officer/served-customers?tokenId=${t.id}`)}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-xl font-bold text-blue-600 w-12 text-center">{t.tokenNumber}</div>
                        <div>
                          <div className="font-medium text-gray-900">{t.customer.name}</div>
                          <div className="text-sm text-gray-600">{t.customer.mobileNumber}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(t.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'breaks' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Breaks Today</h2>
                <div className="text-sm text-gray-600">Total: {breaksSummary ? breaksSummary.totalMinutes : 0} min</div>
              </div>
              {!breaksSummary ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : breaksSummary.breaks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No breaks recorded today.</div>
              ) : (
                <div className="space-y-3">
                  {(breaksSummary.breaks.slice(0, breaksLimit)).map((b, idx) => {
                    const started = new Date(b.startedAt)
                    const backendActive = !!breaksSummary?.activeBreak && (b.id === breaksSummary.activeBreak.id)
                    const inferredActive = !b.endedAt || (!breaksSummary?.activeBreak && officer.status === 'on_break' && idx === 0)
                    const isActive = backendActive || inferredActive
                    const endLabel = isActive ? 'ongoing' : (b.endedAt ? new Date(b.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'ongoing')
                    const duration = isActive
                      ? Math.floor((currentDateTime.getTime() - started.getTime()) / (1000 * 60))
                      : (b.durationMinutes ?? 0)
                    return (
                      <div key={b.id || idx} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{started.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {endLabel}</div>
                          <div className="text-sm text-gray-600">Duration: {duration} min</div>
                        </div>
                      </div>
                    )
                  })}
                  {/* Controls */}
                  {breaksSummary.breaks.length > breaksLimit && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => setBreaksLimit((n) => n + 10)}
                        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        Show more
                      </button>
                    </div>
                  )}
                  {breaksLimit > 10 && (
                    <div className="flex justify-center pt-1">
                      <button
                        onClick={() => setBreaksLimit(10)}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Show less
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Customer Feedback (Today)</h2>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">Avg: {feedbackSummary ? feedbackSummary.avgRating.toFixed(1) : '0.0'} â˜…</div>
                  <div className="inline-flex gap-2" role="group">
                    <button
                      type="button"
                      onClick={() => setFeedbackView('list')}
                      className={`px-3 py-1.5 text-sm rounded-xl font-medium border ${feedbackView === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      List View
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackView('chart')}
                      className={`px-3 py-1.5 text-sm rounded-xl font-medium border -ml-px ${feedbackView === 'chart' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Pie Chart
                    </button>
                  </div>
                </div>
              </div>

              {!feedbackSummary ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : feedbackSummary.feedback.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No feedback yet today.</div>
              ) : feedbackView === 'list' ? (
                <div className="space-y-3">
                  {feedbackSummary.feedback.map((f) => (
                    <div key={f.tokenId} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">Token #{f.tokenNumber} • {f.customerName}</div>
                          <div className="text-sm text-yellow-600 flex items-center gap-2">Rating: {f.rating} <Star className="w-4 h-4" /></div>
                          {f.comment && <div className="text-sm text-gray-700 mt-1">“{f.comment}”</div>}
                        </div>
                        <div className="text-xs text-gray-500">{new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-[340px]">
                  {(() => {
                    const counts = [1, 2, 3, 4, 5].map(r => ({ name: `${r} â˜…`, value: feedbackSummary.feedback.filter(f => f.rating === r).length }))
                    const data = counts.filter(c => c.value > 0)
                    const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6']
                    if (data.length === 0) {
                      return <div className="text-center py-12 text-gray-500">No feedback data for chart.</div>
                    }
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name" outerRadius={110} label>
                            {data.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Training Mode Notice */}
          {officer.isTraining && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Training Mode Active</p>
                <p className="text-sm text-yellow-700">
                  You are currently in training mode. Your performance ratings will not be tracked until training is
                  completed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
