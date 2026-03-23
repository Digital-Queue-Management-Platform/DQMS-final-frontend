"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Filter,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Bell,
  X,
  AlertCircle,
  Star
} from "lucide-react"
import FeedbackCard from "../components/FeedbackCard"
import { AnimatedDropdown } from "../components/AnimatedDropdown"
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
      region?: {
        id: string
        name: string
      }
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

interface Region {
  id: string
  name: string
}

interface Outlet {
  id: string
  name: string
  location: string
  regionId: string
}

export default function AdminFeedback() {
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)

  // Alert notification states
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [error, setError] = useState("")

  // Regions + outlets for filter dropdowns
  const [regions, setRegions] = useState<Region[]>([])
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [filteredOutlets, setFilteredOutlets] = useState<Outlet[]>([])

  // Filters - separate pending and applied filters
  const [pendingFilters, setPendingFilters] = useState({
    resolved: "",
    startDate: "",
    endDate: "",
    rating: "",
    regionId: "",
    outletId: ""
  })
  const [appliedFilters, setAppliedFilters] = useState({
    resolved: "",
    startDate: "",
    endDate: "",
    rating: "",
    regionId: "",
    outletId: ""
  })
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch regions and all outlets on mount
  useEffect(() => {
    fetchRegions()
    fetchAllOutlets()
  }, [])

  // When pending regionId changes, filter outlets list
  useEffect(() => {
    if (pendingFilters.regionId) {
      setFilteredOutlets(outlets.filter(o => o.regionId === pendingFilters.regionId))
      // Reset outlet selection if the outlet no longer belongs to this region
      setPendingFilters(prev => ({ ...prev, outletId: "" }))
    } else {
      setFilteredOutlets(outlets)
    }
  }, [pendingFilters.regionId, outlets])

  useEffect(() => {
    fetchFeedback()
    fetchAlerts()

    const interval = setInterval(() => {
      fetchFeedback()
      fetchAlerts()
    }, 30000)

    // WebSocket for real-time monitoring with better error handling
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isComponentMounted = true
    let connectionAttempts = 0
    const maxReconnectAttempts = 5

    const connectWebSocket = () => {
      if (!isComponentMounted || connectionAttempts >= maxReconnectAttempts) return

      try {
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
          return
        }

        connectionAttempts++
        ws = new WebSocket(WS_URL)

        ws.onopen = () => {
          console.log('AdminFeedback WebSocket connected')
          connectionAttempts = 0
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "CRITICAL_FEEDBACK_ALERT" || data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED") {
              fetchFeedback()
              fetchAlerts()

              if (data.type === "CRITICAL_FEEDBACK_ALERT") {
                console.log('🚨 CRITICAL FEEDBACK ALERT (1-star):', data.data)
              }
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('AdminFeedback WebSocket error:', error)
        }

        ws.onclose = (event) => {
          console.log('AdminFeedback WebSocket disconnected:', event.reason)
          if (isComponentMounted && connectionAttempts < maxReconnectAttempts) {
            const reconnectDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000)
            reconnectTimer = window.setTimeout(() => connectWebSocket(), reconnectDelay)
          }
        }
      } catch (error) {
        console.error('Failed to create AdminFeedback WebSocket:', error)
        if (isComponentMounted && connectionAttempts < maxReconnectAttempts) {
          const reconnectDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000)
          reconnectTimer = window.setTimeout(() => connectWebSocket(), reconnectDelay)
        }
      }
    }

    const initialConnectionTimer = setTimeout(() => connectWebSocket(), 1000)

    return () => {
      isComponentMounted = false
      clearInterval(interval)
      clearTimeout(initialConnectionTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      }
    }
  }, [currentPage, appliedFilters])

  const fetchRegions = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return
      const response = await api.get("/admin/managers", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data?.managers) {
        setRegions(response.data.managers.map((r: any) => ({ id: r.id, name: r.name })))
      }
    } catch (err) {
      console.error("Failed to fetch regions:", err)
    }
  }

  const fetchAllOutlets = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return
      const response = await api.get("/admin/outlets", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (Array.isArray(response.data)) {
        setOutlets(response.data.map((o: any) => ({
          id: o.id,
          name: o.name,
          location: o.location,
          regionId: o.regionId
        })))
        setFilteredOutlets(response.data.map((o: any) => ({
          id: o.id,
          name: o.name,
          location: o.location,
          regionId: o.regionId
        })))
      }
    } catch (err) {
      console.error("Failed to fetch outlets:", err)
    }
  }

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        navigate("/admin/login")
        return
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      })

      // Only add non-empty filters
      if (appliedFilters.resolved) params.append("resolved", appliedFilters.resolved)
      if (appliedFilters.startDate) params.append("startDate", appliedFilters.startDate)
      if (appliedFilters.endDate) params.append("endDate", appliedFilters.endDate)
      if (appliedFilters.rating) params.append("rating", appliedFilters.rating)
      if (appliedFilters.regionId) params.append("regionId", appliedFilters.regionId)
      if (appliedFilters.outletId) params.append("outletId", appliedFilters.outletId)

      const response = await api.get(`/admin/feedback?${params}`, {
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
        navigate("/admin/login")
      } else {
        setError("Failed to load feedback. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch alerts for Admin (1-star feedback alerts) — UNCHANGED
  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return

      const params: any = {
        isRead: false,
        type: "critical_feedback"
      }

      const response = await api.get("/admin/alerts", {
        params,
        headers: { Authorization: `Bearer ${token}` }
      })
      setAlerts(response.data)
    } catch (err) {
      console.error("Failed to fetch Admin alerts:", err)
    }
  }

  // Mark alert as read — UNCHANGED
  const markAlertAsRead = async (alertId: string) => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) return

      await api.patch(`/admin/alerts/${alertId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchAlerts()
    } catch (err) {
      console.error("Failed to mark alert as read:", err)
    }
  }

  const handleResolveFeedback = async (feedbackId: string, resolutionComment: string) => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        navigate("/admin/login")
        return
      }

      await api.patch(`/admin/feedback/${feedbackId}/resolve`, {
        resolutionComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      fetchFeedback()
    } catch (error: any) {
      console.error("Failed to resolve feedback:", error)
      alert("Failed to resolve feedback. Please try again.")
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setAppliedFilters(pendingFilters)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    const defaultFilters = {
      resolved: "",
      startDate: "",
      endDate: "",
      rating: "",
      regionId: "",
      outletId: ""
    }
    setPendingFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setCurrentPage(1)
  }

  // Render star display
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 inline ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
      />
    ))
  }

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Customer Feedback</h1>
        </div>

        {/* 1-Star Feedback Alerts Notification Bell — UNCHANGED */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-slate-200 shadow-sm"
            title="Critical Feedback Alerts (1-Star)"
          >
            <Bell className="w-5 h-5 text-gray-700" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-xl flex items-center justify-center text-[10px]">
                {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center">
            <MessageSquare className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Feedback</h3>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalFeedback || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Unresolved</h3>
              <p className="text-2xl font-bold text-red-600">{stats?.unresolvedFeedback || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Resolved</h3>
              <p className="text-2xl font-bold text-green-600">{stats?.resolvedFeedback || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Today</h3>
              <p className="text-2xl font-bold text-red-600">{stats?.todayFeedback || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="p-3 rounded-lg mb-6 border border-slate-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-3">

          {/* Rating Filter */}
          <div className="w-44">
            <AnimatedDropdown
              value={pendingFilters.rating}
              onChange={(value) => handleFilterChange("rating", value)}
              options={[
                { value: "", label: "All Ratings" },
                { value: "1", label: "1 Star" },
                { value: "2", label: "2 Stars" },
                { value: "3", label: "3 Stars" },
                { value: "4", label: "4 Stars" },
                { value: "5", label: "5 Stars" }
              ]}
              placeholder="All Ratings"
              icon={<Star className="w-4 h-4" />}
            />
          </div>

          {/* Status Filter */}
          <div className="w-44">
            <AnimatedDropdown
              value={pendingFilters.resolved}
              onChange={(value) => handleFilterChange("resolved", value)}
              options={[
                { value: "", label: "All Status" },
                { value: "false", label: "Unresolved Only" },
                { value: "true", label: "Resolved Only" }
              ]}
              placeholder="All Status"
              icon={<Filter className="w-4 h-4" />}
            />
          </div>

          {/* RTOM (Region) Filter */}
          <div className="w-48">
            <AnimatedDropdown
              value={pendingFilters.regionId}
              onChange={(value) => handleFilterChange("regionId", value)}
              options={[
                { value: "", label: "All RTOMs" },
                ...regions.map(r => ({ value: r.id, label: r.name }))
              ]}
              placeholder="All RTOMs"
              icon={<Filter className="w-4 h-4" />}
            />
          </div>

          {/* Teleshop (Branch/Outlet) Filter */}
          <div className="w-48">
            <AnimatedDropdown
              value={pendingFilters.outletId}
              onChange={(value) => handleFilterChange("outletId", value)}
              options={[
                { value: "", label: "All Branches" },
                ...filteredOutlets.map(o => ({ value: o.id, label: o.name }))
              ]}
              placeholder="All Branches"
              icon={<Filter className="w-4 h-4" />}
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">from</span>
            <input
              type="date"
              value={pendingFilters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">to</span>
            <input
              type="date"
              value={pendingFilters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={applyFilters}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Active filter pills */}
        {(appliedFilters.rating || appliedFilters.regionId || appliedFilters.outletId || appliedFilters.resolved) && (
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-200">
            <span className="text-xs text-gray-500 self-center">Active filters:</span>
            {appliedFilters.rating && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                {appliedFilters.rating}★ only
              </span>
            )}
            {appliedFilters.regionId && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                RTOM: {regions.find(r => r.id === appliedFilters.regionId)?.name || appliedFilters.regionId}
              </span>
            )}
            {appliedFilters.outletId && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Branch: {outlets.find(o => o.id === appliedFilters.outletId)?.name || appliedFilters.outletId}
              </span>
            )}
            {appliedFilters.resolved === "false" && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Unresolved</span>
            )}
            {appliedFilters.resolved === "true" && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Resolved</span>
            )}
          </div>
        )}
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading feedback...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={() => fetchFeedback()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      ) : feedback.length > 0 ? (
        <>
          {/* Results summary */}
          <div className="text-sm text-gray-500 mb-3">
            Showing {feedback.length} of {pagination?.total || 0} feedback entries
          </div>
          <div className="space-y-4 mb-6">
            {feedback.map((item) => (
              <div key={item.id} className="relative">
                {/* Star rating badge */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-sm">
                  {renderStars(item.rating)}
                  <span className="text-xs text-gray-600 ml-1 font-medium">{item.rating}/5</span>
                </div>
                <FeedbackCard
                  feedback={item}
                  onResolve={!item.isResolved ? handleResolveFeedback : undefined}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4">
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
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 mb-2">No feedback found</div>
          <p className="text-sm text-gray-400">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}

      {/* Admin Alerts Panel — UNCHANGED */}
      {showAlerts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-start justify-center sm:justify-end p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Critical Feedback Alerts (1★)</h2>
                <button onClick={() => setShowAlerts(false)} className="text-gray-500 hover:text-gray-700 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Alerts List */}
            <div className="p-3 sm:p-4">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No critical feedback alerts</p>
                  <p className="text-sm">Excellent! No 1-star feedback to address.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border-b border-slate-100 transition-colors bg-red-50 hover:bg-red-100`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="mt-1 flex-shrink-0 p-1.5 bg-red-100 text-red-600 rounded-full animate-pulse">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-200 text-red-800 uppercase tracking-wider flex items-center gap-1">
                              CRITICAL
                            </span>
                            <span className="text-xs font-semibold text-slate-600 truncate">
                              {(alert as any).outletInfo?.outletName || 'System Alert'}
                            </span>
                          </div>
                          <p className="text-sm text-red-900 font-medium mb-2 break-words">{alert.message}</p>
                          <div className="flex items-center justify-between mt-2">
                             <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(alert.createdAt).toLocaleString()}
                            </span>
                            {!alert.isRead && (
                              <button
                                onClick={() => markAlertAsRead(alert.id)}
                                className="px-2 py-1 text-[10px] font-bold bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors uppercase tracking-tight"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                        </div>
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
