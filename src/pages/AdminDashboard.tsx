"use client"

import { useState, useEffect } from "react"
import { Users, Clock, Star, TrendingUp, Filter, Download, Bell, Activity, BarChart3, AlertCircle } from "lucide-react"
import api, { WS_URL } from "../config/api"
import type { Alert } from "../types"

interface Analytics {
  totalTokens: number
  avgWaitTime: number
  avgServiceTime: number
  feedbackStats: Array<{ rating: number; _count: number }>
  officerPerformance: Array<{
    officer: any
    tokensHandled: number
    avgRating: number
    feedbackCount: number
  }>
}

interface RealtimeStats {
  activeTokens: number
  completedToday: number
  activeOfficers: number
  avgRating: number
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertFilter, setAlertFilter] = useState({ type: "", severity: "", outletId: "", importantOnly: false })
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  const [selectedOutlet, setSelectedOutlet] = useState("")
  const [showAlerts, setShowAlerts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [outlets, setOutlets] = useState<any[]>([])

  const fetchOutlets = async () => {
    try {
      const response = await api.get("/queue/outlets")
      setOutlets(response.data)
    } catch (err) {
      console.error("Failed to fetch outlets:", err)
    }
  }

  useEffect(() => {
    fetchOutlets()
  }, [])

  useEffect(() => {
    fetchAnalytics()
    fetchRealtimeStats()
    fetchAlerts()

    // Refresh realtime stats every 30 seconds
    const interval = setInterval(fetchRealtimeStats, 30000)

    // WebSocket for real-time updates
    const ws = new WebSocket(WS_URL)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "NEGATIVE_FEEDBACK" || data.type === "LONG_WAIT") {
        fetchAlerts()
      }
      fetchRealtimeStats()
    }

    return () => {
      clearInterval(interval)
      ws.close()
    }
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Ensure end date includes the full day
      const endDate = new Date(dateRange.endDate)
      endDate.setHours(23, 59, 59, 999)

      const params: any = {
        startDate: new Date(dateRange.startDate).toISOString(),
        endDate: endDate.toISOString(),
      }

      if (selectedOutlet) {
        params.outletId = selectedOutlet
      }

      console.log('Fetching analytics with params:', params)
      const response = await api.get("/admin/analytics", { params })
      console.log('Analytics response:', response.data)
      setAnalytics(response.data)
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRealtimeStats = async () => {
    try {
      const response = await api.get("/admin/dashboard/realtime")
      setRealtimeStats(response.data)
    } catch (err) {
      console.error("Failed to fetch realtime stats:", err)
    }
  }

  const fetchAlerts = async () => {
    try {
      const params: any = { isRead: false }
      if (alertFilter.type) params.type = alertFilter.type
      if (alertFilter.severity) params.severity = alertFilter.severity
      if (alertFilter.outletId) params.outletId = alertFilter.outletId
      if (alertFilter.importantOnly) params.importantOnly = true

      const response = await api.get("/admin/alerts", { params })
      setAlerts(response.data)
    } catch (err) {
      console.error("Failed to fetch alerts:", err)
    }
  }

  const markAlertAsRead = async (alertId: string) => {
    try {
      await api.patch(`/admin/alerts/${alertId}/read`)
      fetchAlerts()
    } catch (err) {
      console.error("Failed to mark alert as read:", err)
    }
  }

  const calculateRatingDistribution = () => {
    if (!analytics) return []

    const distribution = [0, 0, 0, 0, 0]
    analytics.feedbackStats.forEach((stat) => {
      distribution[stat.rating - 1] = stat._count
    })

    return distribution.map((count, index) => ({
      rating: index + 1,
      count,
      percentage:
        analytics.feedbackStats.length > 0
          ? (count / analytics.feedbackStats.reduce((sum, s) => sum + s._count, 0)) * 100
          : 0,
    }))
  }

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Digital Queue Management System</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Alerts Button */}
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Bell className="w-6 h-6 text-gray-700" />
                {unreadAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadAlertCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts Panel */}
      {showAlerts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-start justify-end p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Alerts</h2>
                <button onClick={() => setShowAlerts(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 border-b">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  value={alertFilter.type}
                  onChange={(e) => setAlertFilter({ ...alertFilter, type: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">All Types</option>
                  <option value="negative_feedback">Negative Feedback</option>
                  <option value="long_wait">Long Wait</option>
                </select>

                <select
                  value={alertFilter.severity}
                  onChange={(e) => setAlertFilter({ ...alertFilter, severity: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">All Severities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={alertFilter.outletId}
                  onChange={(e) => setAlertFilter({ ...alertFilter, outletId: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">All Outlets</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={alertFilter.importantOnly}
                    onChange={(e) => setAlertFilter({ ...alertFilter, importantOnly: e.target.checked })}
                  />
                  <span className="text-sm">Important only</span>
                </label>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={fetchAlerts}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setAlertFilter({ type: "", severity: "", outletId: "", importantOnly: false })
                    fetchAlerts()
                  }}
                  className="px-3 py-2 border rounded-lg"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {alerts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No alerts</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.severity === "high"
                        ? "bg-red-50 border-red-200"
                        : alert.severity === "medium"
                          ? "bg-yellow-50 border-yellow-200"
                          : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className={`w-5 h-5 mt-0.5 ${
                          alert.severity === "high"
                            ? "text-red-600"
                            : alert.severity === "medium"
                              ? "text-yellow-600"
                              : "text-blue-600"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                        {!alert.isRead && (
                          <button
                            onClick={() => markAlertAsRead(alert.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time Stats */}
        {realtimeStats && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Real-time Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Tokens</p>
                    <p className="text-3xl font-bold text-blue-600">{realtimeStats.activeTokens}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed Today</p>
                    <p className="text-3xl font-bold text-green-600">{realtimeStats.completedToday}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Officers</p>
                    <p className="text-3xl font-bold text-indigo-600">{realtimeStats.activeOfficers}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Rating Today</p>
                    <p className="text-3xl font-bold text-yellow-600">{realtimeStats.avgRating.toFixed(1)}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-900">Analytics Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Outlet (Optional)</label>
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Outlets</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name} - {outlet.location}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchAnalytics}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Analytics */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Total Tokens</h3>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalTokens}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Avg Wait Time</h3>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.avgWaitTime}</p>
                <p className="text-sm text-gray-600">minutes</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Avg Service Time</h3>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.avgServiceTime}</p>
                <p className="text-sm text-gray-600">minutes</p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Customer Satisfaction</h3>
              <div className="space-y-4">
                {calculateRatingDistribution().map((item) => (
                  <div key={item.rating} className="flex items-center gap-4">
                    <div className="flex items-center gap-1 w-20">
                      <span className="text-sm font-medium text-gray-700">{item.rating}</span>
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${item.percentage}%` }}
                      >
                        {item.percentage > 10 && <span className="text-xs font-medium text-white">{item.count}</span>}
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">{item.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Officer Performance */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Officer Performance</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Officer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Outlet</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Tokens Handled</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Avg Rating</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Feedback Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.officerPerformance.map((perf, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-indigo-600">
                                {perf.officer?.name?.charAt(0) || "?"}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">{perf.officer?.name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{perf.officer?.outlet?.name || "N/A"}</td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-900">{perf.tokensHandled}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold text-gray-900">{perf.avgRating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">{perf.feedbackCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}
