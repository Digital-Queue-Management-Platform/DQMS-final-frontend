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
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Track authentication state

  const fetchOutlets = async () => {
    // Check if admin is still authenticated before making API call
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      console.log('No admin token found, skipping outlets fetch')
      return
    }

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

  // Monitor authentication state changes
  useEffect(() => {
    const checkAuthStatus = () => {
      const adminToken = localStorage.getItem('adminToken')
      const isCurrentlyAuth = !!adminToken
      
      if (isAuthenticated !== isCurrentlyAuth) {
        setIsAuthenticated(isCurrentlyAuth)
        if (!isCurrentlyAuth) {
          console.log('Admin token removed, stopping dashboard activities')
          // Clear all state when unauthenticated
          setAnalytics(null)
          setRealtimeStats(null)
          setAlerts([])
        }
      }
    }

    // Check initially
    checkAuthStatus()

    // Set up interval to periodically check auth status
    const authCheckInterval = setInterval(checkAuthStatus, 1000)

    return () => {
      clearInterval(authCheckInterval)
    }
  }, [isAuthenticated])

  useEffect(() => {
    // Only proceed if authenticated
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping dashboard initialization')
      return
    }

    fetchAnalytics()
    fetchRealtimeStats()
    fetchAlerts()

    // Enhanced auto-refresh every 30 seconds for comprehensive analytics monitoring
    const interval = setInterval(() => {
      fetchRealtimeStats()
      fetchAlerts()
    }, 30000)

    // WebSocket for real-time comprehensive monitoring
    const ws = new WebSocket(WS_URL)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "NEGATIVE_FEEDBACK" || data.type === "LONG_WAIT" || data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED" || data.type === "OFFICER_STATUS_CHANGE" || data.type === "CRITICAL_FEEDBACK_ALERT") {
          fetchAlerts()
          fetchRealtimeStats()
          
          // Show immediate notification for critical 1-star feedback
          if (data.type === "CRITICAL_FEEDBACK_ALERT") {
            console.log('CRITICAL FEEDBACK ALERT:', data.data)
            // You could add a toast notification here
          }
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error)
      }
    }

    ws.onopen = () => {
      console.log('AdminDashboard WebSocket connected')
    }

    ws.onerror = (error) => {
      console.error('AdminDashboard WebSocket error:', error)
    }

    return () => {
      clearInterval(interval)
      ws.close()
    }
  }, [isAuthenticated]) // Re-run when authentication state changes

  const fetchAnalytics = async () => {
    // Check if admin is still authenticated before making API call
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      console.log('No admin token found, skipping analytics fetch')
      return
    }

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
    // Check if admin is still authenticated before making API call
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      console.log('No admin token found, skipping realtime stats fetch')
      return
    }

    try {
      setDashboardLoading(true)
      const response = await api.get("/admin/dashboard/realtime")
      setRealtimeStats(response.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch realtime stats:", err)
    } finally {
      setDashboardLoading(false)
    }
  }

  const fetchAlerts = async () => {
    // Check if admin is still authenticated before making API call
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      console.log('No admin token found, skipping alerts fetch')
      return
    }

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
    // Check if admin is still authenticated before making API call
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      console.log('No admin token found, skipping mark alert as read')
      return
    }

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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Admin Dashboard</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <p className="text-[10px] sm:text-sm text-gray-600">Digital Queue Management System</p>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  {dashboardLoading && <span className="flex items-center gap-1">Refreshing...</span>}
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Alerts Button */}
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
                {unreadAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center text-[10px] sm:text-xs">
                    {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts Panel */}
      {showAlerts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-start justify-center sm:justify-end p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Alerts</h2>
                <button onClick={() => setShowAlerts(false)} className="text-gray-500 hover:text-gray-700 p-1">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-b">
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={alertFilter.type}
                  onChange={(e) => setAlertFilter({ ...alertFilter, type: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All Types</option>
                  <option value="negative_feedback">Negative Feedback (Legacy)</option>
                  <option value="critical_feedback">Critical Feedback (1-star)</option>
                  <option value="high_priority_feedback">High Priority Feedback (2-star)</option>
                  <option value="moderate_feedback">Moderate Feedback (3-star)</option>
                  <option value="long_wait">Long Wait</option>
                </select>

                <select
                  value={alertFilter.severity}
                  onChange={(e) => setAlertFilter({ ...alertFilter, severity: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={alertFilter.outletId}
                  onChange={(e) => setAlertFilter({ ...alertFilter, outletId: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All Outlets</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={alertFilter.importantOnly}
                    onChange={(e) => setAlertFilter({ ...alertFilter, importantOnly: e.target.checked })}
                  />
                  <span>Important only</span>
                </label>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={fetchAlerts}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setAlertFilter({ type: "", severity: "", outletId: "", importantOnly: false })
                    fetchAlerts()
                  }}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-3">
              {alerts.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">No alerts</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 sm:p-4 rounded-lg border ${
                      alert.severity === "critical"
                        ? "bg-red-100 border-red-300 ring-1 ring-red-400"
                        : alert.severity === "high"
                          ? "bg-red-50 border-red-200"
                          : alert.severity === "medium"
                            ? "bg-yellow-50 border-yellow-200"
                            : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 ${
                          alert.severity === "critical"
                            ? "text-red-700 animate-pulse"
                            : alert.severity === "high"
                              ? "text-red-600"
                              : alert.severity === "medium"
                                ? "text-yellow-600"
                                : "text-blue-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-words">{alert.message}</p>
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
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Real-time Stats */}
        {realtimeStats && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              Real-time Overview
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Active Tokens</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{realtimeStats.activeTokens}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Completed Today</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{realtimeStats.completedToday}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Active Officers</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-600">{realtimeStats.activeOfficers}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Avg Rating Today</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">{realtimeStats.avgRating.toFixed(1)}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Analytics Filters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Outlet (Optional)</label>
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="">All Outlets</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name} - {outlet.location}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
              <button
                onClick={fetchAnalytics}
                className="w-full px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Total Tokens</h3>
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{analytics.totalTokens}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Avg Wait Time</h3>
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{analytics.avgWaitTime}</p>
                <p className="text-sm text-gray-600">minutes</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Avg Service Time</h3>
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{analytics.avgServiceTime}</p>
                <p className="text-sm text-gray-600">minutes</p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Customer Satisfaction</h3>
              <div className="space-y-3 sm:space-y-4">
                {calculateRatingDistribution().map((item) => (
                  <div key={item.rating} className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1 w-12 sm:w-20 flex-shrink-0">
                      <span className="text-sm font-medium text-gray-700">{item.rating}</span>
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-5 sm:h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full flex items-center justify-end pr-1 sm:pr-2"
                        style={{ width: `${item.percentage}%` }}
                      >
                        {item.percentage > 15 && <span className="text-xs font-medium text-white">{item.count}</span>}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-600 w-12 sm:w-16 text-right flex-shrink-0">{item.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Officer Performance */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Officer Performance</h3>
                <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Officer</th>
                        <th className="text-left py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">Outlet</th>
                        <th className="text-center py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Tokens</th>
                        <th className="text-center py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Rating</th>
                        <th className="text-center py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.officerPerformance.map((perf, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 sm:px-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs sm:text-sm font-medium text-indigo-600">
                                  {perf.officer?.name?.charAt(0) || "?"}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-gray-900 block truncate">{perf.officer?.name || "Unknown"}</span>
                                <span className="text-xs text-gray-500 sm:hidden block truncate">{perf.officer?.outlet?.name || "N/A"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-gray-600 text-sm hidden sm:table-cell">{perf.officer?.outlet?.name || "N/A"}</td>
                          <td className="py-3 px-3 sm:px-4 text-center font-semibold text-gray-900 text-sm">{perf.tokensHandled}</td>
                          <td className="py-3 px-3 sm:px-4">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-semibold text-gray-900 text-sm">{perf.avgRating.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center text-gray-600 text-sm hidden md:table-cell">{perf.feedbackCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}
