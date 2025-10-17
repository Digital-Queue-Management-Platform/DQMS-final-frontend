"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, Star, AlertCircle, Users, Coffee, RefreshCwIcon, DownloadIcon } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
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
  const [activeTab, setActiveTab] = useState<'served'|'breaks'|'feedback'>('served')
  const [servedSummary, setServedSummary] = useState<{ total: number; avgHandleMinutes: number; tokens: Token[] }|null>(null)
  const [breaksSummary, setBreaksSummary] = useState<{ totalBreaks: number; totalMinutes: number; breaks: any[] }|null>(null)
  const [feedbackSummary, setFeedbackSummary] = useState<{ total: number; avgRating: number; feedback: { tokenId: string; tokenNumber: number; rating: number; comment: string; customerName: string; createdAt: string }[] }|null>(null)
  const [feedbackView, setFeedbackView] = useState<'list'|'chart'>('list')
  const [breaksLimit, setBreaksLimit] = useState<number>(10)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  
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

        // WebSocket for real-time updates
        const ws = new WebSocket(WS_URL)
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          // refresh stats and queue on relevant events
          if (data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED" || data.type === 'TOKEN_SKIPPED' || data.type === 'TOKEN_CALLED' || data.type === 'TOKEN_RECALLED') {
            fetchStats(res.data.officer.id)
            fetchQueue(res.data.officer.outletId)
            fetchServed(res.data.officer.id)
          }
        }
        ;(window as any).__dq_ws = ws
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

  // time managed in OfficerTopBar

  const fetchStats = async (officerId: string) => {
    try {
      const response = await api.get(`/officer/stats/${officerId}`)
      setStats({
        tokensHandled: response.data.tokensHandled,
        avgRating: response.data.avgRating,
      })
    } catch (err) {
      console.error("Failed to fetch stats:", err)
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
    } catch(e) {
      console.error('failed to load served summary', e)
    }
  }

  const fetchBreaks = async (officerId: string) => {
    try {
      const res = await api.get(`/officer/summary/breaks/${officerId}`)
      setBreaksSummary(res.data)
    } catch(e) {
      console.error('failed to load breaks summary', e)
    }
  }

  const fetchFeedback = async (officerId: string) => {
    try {
      const res = await api.get(`/officer/summary/feedback/${officerId}`)
      const fb = (res.data?.feedback || []).map((f: any) => ({ ...f, createdAt: new Date(f.createdAt).toISOString() }))
      setFeedbackSummary({ total: res.data?.total || 0, avgRating: res.data?.avgRating || 0, feedback: fb })
    } catch(e) {
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

  // Handle status changes
  const handleStatusChange = async (status: string) => {
    if (!officer) return
    
    try {
      await api.post('/officer/status', { officerId: officer.id, status })
      setOfficer(prev => prev ? { ...prev, status } : prev)
      
      // Broadcast status change event
      const evt: any = new CustomEvent('officer:status-changed', { detail: { status } })
      window.dispatchEvent(evt)
      
      if (status === 'offline') {
        try { await api.post('/officer/logout') } catch {}
        navigate('/officer/login')
      }
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('Failed to update status')
    }
  }

  // React to status changes broadcast by Layout's top bar
  useEffect(() => {
    const onStatus = async (e: any) => {
      const status = e?.detail?.status
      if (!officer || !status) return
      // Sync local officer status so UI reflects immediately
      setOfficer((prev) => (prev ? { ...prev, status } as any : prev))
      try { await fetchBreaks(officer.id) } catch {}
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Service Officer Dashboard</h1>
              <p className="text-sm text-gray-500">
                {formatDate(currentDateTime)} | {formatTime(currentDateTime)}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Status Controls */}
              {officer && (
                <div className="flex items-center space-x-2">
                  {officer.status === 'available' && (
                    <button
                      onClick={() => handleStatusChange('on_break')}
                      className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
                    >
                      <Coffee className="w-4 h-4" />
                      Break
                    </button>
                  )}

                  {officer.status === 'on_break' && (
                    <button
                      onClick={() => handleStatusChange('available')}
                      className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                    >
                      <RefreshCwIcon className="w-4 h-4" />
                      Resume
                    </button>
                  )}
                </div>
              )}
              
              <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          
          {/* Counter Status Section */}
          {officer && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
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
                    <div className={`w-3 h-3 rounded-full ${
                      officer.status === 'available' ? 'bg-green-400' :
                      officer.status === 'on_break' ? 'bg-yellow-400' :
                      officer.status === 'serving' ? 'bg-blue-400' :
                      'bg-gray-400'
                    }`}></div>
                    <span className={`text-sm font-medium capitalize ${
                      officer.status === 'available' ? 'text-green-700' :
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Tokens Handled Today</p>
                <p className="text-xl sm:text-2xl lg:text-3xl text-gray-900">{stats.tokensHandled}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Average Rating</p>
                <p className="text-xl sm:text-2xl lg:text-3xl text-gray-900">{stats.avgRating.toFixed(1)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Current Status</p>
                <p className="text-base sm:text-lg lg:text-xl text-gray-900 capitalize">{officer.status.replace("_", " ")}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Customers Waiting</p>
                <p className="text-xl sm:text-2xl lg:text-3xl text-gray-900">{queue ? (queue.totalWaiting ?? queue.waiting.length) : 0}</p>
              </div>
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Breaks Taken */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Breaks Taken</p>
                <p className="text-3xl text-gray-900">{breaksSummary ? breaksSummary.totalBreaks : 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Coffee className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs (Queue tab removed) */}
        <div className="mb-6">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {[
              { id: 'served', label: 'Served Today' },
              { id: 'breaks', label: 'Breaks Today' },
              { id: 'feedback', label: 'Feedback' },
            ].map((t:any) => (
              <button key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`whitespace-nowrap bg-black rounded-xl py-2 px-4 border-b-2 font-medium text-sm ${activeTab===t.id? ' bg-white' : 'border-transparent text-white hover:translate-y-[-5px] transition-all'}`}
              >{t.label}</button>
            ))}
          </nav>
        </div>

        {/* Queue tab removed; use dedicated page at /officer/queue */}

        {activeTab === 'served' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Served Today</h2>
              <div className="text-sm text-gray-600">Avg handle: {servedSummary ? servedSummary.avgHandleMinutes : 0} min</div>
            </div>
            {!servedSummary ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : servedSummary.tokens.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No customers served yet today.</div>
            ) : (
              <div className="space-y-3">
                {servedSummary.tokens.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg">
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
          <div className="bg-white rounded-xl shadow-sm p-6">
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
                {(breaksSummary.breaks.slice(0, breaksLimit)).map((b, idx) => (
                  <div key={b.id || idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{new Date(b.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {b.endedAt ? new Date(b.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'ongoing'}</div>
                      <div className="text-sm text-gray-600">Duration: {b.durationMinutes} min</div>
                    </div>
                  </div>
                ))}
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
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Customer Feedback (Today)</h2>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">Avg: {feedbackSummary ? feedbackSummary.avgRating.toFixed(1) : '0.0'} ★</div>
                <div className="inline-flex gap-2" role="group">
                  <button
                    type="button"
                    onClick={() => setFeedbackView('list')}
                    className={`px-3 py-1.5 text-sm rounded-xl font-medium border ${feedbackView==='list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    List View
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackView('chart')}
                    className={`px-3 py-1.5 text-sm rounded-xl font-medium border -ml-px ${feedbackView==='chart' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
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
                  const counts = [1,2,3,4,5].map(r => ({ name: `${r} ★`, value: feedbackSummary.feedback.filter(f => f.rating === r).length }))
                  const data = counts.filter(c => c.value > 0)
                  const COLORS = ['#ef4444','#f59e0b','#eab308','#22c55e','#3b82f6']
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
