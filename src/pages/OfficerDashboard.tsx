"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, Star, AlertCircle, Users, Coffee } from "lucide-react"
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
  // confirm handled inside OfficerTopBar

  useEffect(() => {
    // Fetch authoritative officer from server
    let mounted = true
    api
      .get("/officer/me")
      .then((res) => {
        if (!mounted) return
        setOfficer(res.data.officer)
        fetchStats(res.data.officer.id)
          fetchQueue(res.data.officer.outletId)
            fetchServed(res.data.officer.id)
            fetchBreaks(res.data.officer.id)
            fetchFeedback(res.data.officer.id)

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
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Confirm handled inside OfficerTopBar */}
        
  
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tokens Handled Today</p>
                <p className="text-3xl text-gray-900">{stats.tokensHandled}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                <p className="text-3xl text-gray-900">{stats.avgRating.toFixed(1)}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Status</p>
                <p className="text-xl text-gray-900 capitalize">{officer.status.replace("_", " ")}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Customers Waiting</p>
                <p className="text-3xl text-gray-900">{queue ? (queue.totalWaiting ?? queue.waiting.length) : 0}</p>
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
                      {new Date(t.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      <div className="font-medium text-gray-900">{new Date(b.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {b.endedAt ? new Date(b.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ongoing'}</div>
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
                      <div className="text-xs text-gray-500">{new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
      </main>
    </div>
  )
}
