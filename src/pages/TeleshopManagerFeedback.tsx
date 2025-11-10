"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft, 
  Filter, 
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Bell,
  X
} from "lucide-react"
import FeedbackCard from "../components/FeedbackCard"
import api, { WS_URL } from "../config/api"
import type { Alert } from "../types"

interface Feedback {
  id: string
  rating: number
  comment?: string
  isResolved: boolean
  createdAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionComment?: string
  token: {
    tokenNumber: number
    officer: {
      id: string
      name: string
      mobileNumber: string
      counterNumber?: number
    }
    outlet: {
      id: string
      name: string
      location: string
    }
  }
  customer: {
    id: string
    name: string
    mobileNumber: string
  }
}

interface Stats {
  totalFeedback: number
  unresolvedFeedback: number
  resolvedFeedback: number
  todayFeedback: number
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
}

export default function TeleshopManagerFeedback() {
  const navigate = useNavigate()
  const [teleshopManager, setTeleshopManager] = useState<TeleshopManager | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)

  // Alert notification states
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [alertFilter, setAlertFilter] = useState({ 
    type: "", 
    severity: "", 
    outletId: "", 
    importantOnly: false 
  })
  const [error, setError] = useState("")

  // Filters
  const [filters, setFilters] = useState({
    resolved: "false", // Show unresolved by default
    startDate: "",
    endDate: ""
  })
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchTeleshopManagerData()
    fetchFeedback()
    fetchAlerts() // Fetch 3-star feedback alerts for Teleshop Manager

    // Enhanced auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchFeedback()
      fetchAlerts() // Also refresh alerts
    }, 30000)

    // WebSocket for real-time monitoring with better error handling
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isComponentMounted = true
    
    const connectWebSocket = () => {
      if (!isComponentMounted) return
      
      try {
        ws = new WebSocket(WS_URL)
        
        ws.onopen = () => {
          console.log('TeleshopManagerFeedback WebSocket connected')
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "TELESHOP_MANAGER_FEEDBACK_ALERT" || data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED") {
              fetchFeedback()
              fetchAlerts() // Refresh alerts when new 3-star feedback arrives
              
              // Show immediate notification for 3-star feedback alerts
              if (data.type === "TELESHOP_MANAGER_FEEDBACK_ALERT") {
                console.log('⭐ TELESHOP MANAGER FEEDBACK ALERT (3-star):', data.data)
              }
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('TeleshopManagerFeedback WebSocket error:', error)
        }

        ws.onclose = (event) => {
          console.log('TeleshopManagerFeedback WebSocket disconnected:', event.reason)
          if (isComponentMounted) {
            reconnectTimer = window.setTimeout(() => connectWebSocket(), 5000)
          }
        }
      } catch (error) {
        console.error('Failed to create TeleshopManagerFeedback WebSocket:', error)
        if (isComponentMounted) {
          reconnectTimer = window.setTimeout(() => connectWebSocket(), 5000)
        }
      }
    }

    connectWebSocket()

    return () => {
      isComponentMounted = false
      clearInterval(interval)
      if (ws) ws.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [currentPage, filters])

  const fetchTeleshopManagerData = async () => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const response = await api.get("/teleshop-manager/me", {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data?.teleshopManager) {
        setTeleshopManager({
          id: response.data.teleshopManager.id,
          name: response.data.teleshopManager.name,
          mobileNumber: response.data.teleshopManager.mobileNumber,
          regionName: response.data.teleshopManager.region?.name || 'Unknown Region'
        })
      }
    } catch (error) {
      console.error("Failed to fetch teleshop manager data:", error)
      navigate("/teleshop-manager/login")
    }
  }

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...filters
      })

      const response = await api.get(`/teleshop-manager/feedback?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data) {
        setFeedback(response.data.feedback || [])
        setStats(response.data.stats || null)
        setPagination(response.data.pagination || null)
      }
    } catch (error: any) {
      console.error("Failed to fetch feedback:", error)
      if (error.response?.status === 401) {
        navigate("/teleshop-manager/login")
      } else {
        setError("Failed to load feedback")
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch alerts for Teleshop Manager (3-star feedback alerts)
  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) return
      
      const params: any = { isRead: false }
      if (alertFilter.outletId) params.outletId = alertFilter.outletId

      const response = await api.get("/teleshop-manager/alerts", { 
        params,
        headers: { Authorization: `Bearer ${token}` }
      })
      setAlerts(response.data)
    } catch (err) {
      console.error("Failed to fetch Teleshop Manager alerts:", err)
    }
  }

  // Mark alert as read
  const markAlertAsRead = async (alertId: string) => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) return
      
      await api.patch(`/teleshop-manager/alerts/${alertId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchAlerts() // Refresh alerts after marking as read
    } catch (err) {
      console.error("Failed to mark alert as read:", err)
    }
  }

  const handleResolveFeedback = async (feedbackId: string, resolutionComment: string) => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      await api.patch(`/teleshop-manager/feedback/${feedbackId}/resolve`, {
        resolutionComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Refresh feedback list
      fetchFeedback()
    } catch (error: any) {
      console.error("Failed to resolve feedback:", error)
      alert("Failed to resolve feedback. Please try again.")
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      resolved: "false",
      startDate: "",
      endDate: ""
    })
    setCurrentPage(1)
  }

  if (loading || !teleshopManager) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading feedback...</div>
        </div>
      </div>
    )
  }

  // Calculate unread alert count for notification badge
  const unreadAlertCount = alerts.filter((a) => !a.isRead).length

  return (
    <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/teleshop-manager/dashboard")}
              className="flex items-center text-purple-600 hover:text-purple-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">3-Star Feedback</h1>
          </div>

          {/* 3-Star Feedback Alerts Notification Bell */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
              title="3-Star Feedback Alerts"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center text-[10px]">
                  {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex items-center">
                <MessageSquare className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Total Feedback</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFeedback}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Unresolved</h3>
                  <p className="text-2xl font-bold text-red-600">{stats.unresolvedFeedback}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Resolved</h3>
                  <p className="text-2xl font-bold text-green-600">{stats.resolvedFeedback}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Today</h3>
                  <p className="text-2xl font-bold text-blue-600">{stats.todayFeedback}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.resolved}
                onChange={(e) => handleFilterChange("resolved", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="false">Unresolved Only</option>
                <option value="true">Resolved Only</option>
                <option value="">All Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={fetchFeedback}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Feedback List */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : feedback.length > 0 ? (
          <>
            <div className="space-y-4 mb-6">
              {feedback.map((item) => (
                <FeedbackCard
                  key={item.id}
                  feedback={item}
                  onResolve={!item.isResolved ? handleResolveFeedback : undefined}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  Showing page {pagination.page} of {pagination.totalPages} 
                  ({pagination.total} total feedback)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {currentPage}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-100">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 mb-2">No feedback found</div>
            <p className="text-sm text-gray-400">
              3-star customer feedback will appear here for your review and resolution
            </p>
          </div>
        )}

        {/* Teleshop Manager Alerts Panel */}
        {showAlerts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-start justify-center sm:justify-end p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">3-Star Feedback Alerts</h2>
                  <button onClick={() => setShowAlerts(false)} className="text-gray-500 hover:text-gray-700 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter Section */}
              <div className="p-3 sm:p-4 border-b">
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={alertFilter.outletId}
                    onChange={(e) => setAlertFilter({ ...alertFilter, outletId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Outlets</option>
                    {/* Outlets would be populated from teleshop manager data */}
                  </select>
                  <button
                    onClick={fetchAlerts}
                    className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>

              {/* Alerts List */}
              <div className="p-3 sm:p-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No 3-star feedback alerts</p>
                    <p className="text-sm">Great job maintaining customer satisfaction!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border-l-4 ${
                          !alert.isRead
                            ? 'bg-orange-50 border-orange-400'
                            : 'bg-gray-50 border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                                alert.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                3-Star Feedback
                              </span>
                              <span className="text-xs text-gray-500">
                                {(alert as any).outletInfo?.outletName || 'Unknown Outlet'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                            {(alert as any).outletInfo?.customerName && (
                              <p className="text-xs text-gray-600 mb-1">
                                Customer: {(alert as any).outletInfo.customerName}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {new Date(alert.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!alert.isRead && (
                            <button
                              onClick={() => markAlertAsRead(alert.id)}
                              className="ml-2 px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}