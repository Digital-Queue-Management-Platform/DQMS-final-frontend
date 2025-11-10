"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, Star, Users, Building2, TrendingUp, TrendingDown, Bell, X, Activity, Building, Calendar } from "lucide-react"
// ManagerTopBar is provided globally from Layout for manager routes
import api, { WS_URL } from "../config/api"
import type { Alert } from "../types"

interface BranchData {
  id: string;
  name: string;
  customersServed: number;
  avgWaitingTime: number;
  avgServiceTime: number;
  rating: number;
  trend: 'up' | 'down';
  activeOfficers: number;
  totalWaiting: number;
}

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const [branchData, setBranchData] = useState<BranchData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date())
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [regionStats, setRegionStats] = useState({
    totalCustomersServed: 0,
    avgRegionalWaitTime: 0,
    avgRegionalRating: 0,
    totalActiveBranches: 0,
    totalActiveOfficers: 0,
    totalCustomersWaiting: 0
  })

  // Alert notification states
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [alertFilter, setAlertFilter] = useState({ 
    type: "", 
    severity: "", 
    outletId: "", 
    importantOnly: false 
  })

  useEffect(() => {
    // Manager authentication is handled globally by Layout
    fetchRegionalData()
    fetchAlerts() // Fetch 2-star feedback alerts for RTOM

    // Enhanced auto-refresh every 30 seconds for regional management overview
    const interval = setInterval(() => {
      fetchRegionalData()
      fetchAlerts() // Also refresh alerts
    }, 30000)

    // WebSocket for real-time branch data monitoring with better error handling
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isComponentMounted = true
    
    const connectWebSocket = () => {
      if (!isComponentMounted) return
      
      try {
        ws = new WebSocket(WS_URL)
        
        ws.onopen = () => {
          console.log('ManagerDashboard WebSocket connected')
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED" || data.type === "OFFICER_STATUS_CHANGE" || data.type === "BRANCH_UPDATED" || data.type === "RTOM_FEEDBACK_ALERT") {
              fetchRegionalData()
              
              // Show immediate notification for RTOM 2-star feedback alerts
              if (data.type === "RTOM_FEEDBACK_ALERT") {
                console.log('⚠️ RTOM FEEDBACK ALERT (2-star):', data.data)
                fetchAlerts() // Refresh alerts when new 2-star feedback arrives
              }
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('ManagerDashboard WebSocket error:', error)
        }
        
        ws.onclose = (event) => {
          console.log('ManagerDashboard WebSocket disconnected:', event.reason)
          if (!event.wasClean && isComponentMounted) {
            reconnectTimer = window.setTimeout(connectWebSocket, 5000)
          }
        }
      } catch (error) {
        console.error('Failed to create ManagerDashboard WebSocket:', error)
      }
    }

    connectWebSocket()

    return () => {
      isComponentMounted = false
      clearInterval(interval)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [navigate])

  // Date/time update effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Update every second

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Date/time formatting functions
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const fetchRegionalData = async () => {
    try {
      setDashboardLoading(true)
      // Fetch only this manager's region outlets
      const storedManager = localStorage.getItem('manager')
      const managerData = storedManager ? JSON.parse(storedManager) : null
      const params: any = {}
      if (managerData?.email) params.email = managerData.email
      
      const meRes = await api.get('/manager/me', { params })
      const outlets = (meRes.data?.manager?.outlets || [])

      const branchMetrics = await Promise.all(
        outlets.map(async (outlet: any) => {
          try {
            // Get queue data for each branch
            const queueRes = await api.get(`/queue/outlet/${outlet.id}`)
            const queueData = queueRes.data || {}

            // Get today's analytics
            const start = new Date()
            start.setHours(0,0,0,0)
            const end = new Date()
            end.setHours(23,59,59,999)

            const analyticsRes = await api.get(`/manager/outlet/${outlet.id}/analytics`, {
              params: { 
                startDate: start.toISOString(), 
                endDate: end.toISOString() 
              }
            })
            const analytics = analyticsRes.data || {}

            const feedbackStats = analytics.feedbackStats || []
            const totalFeedback = feedbackStats.reduce((s: number, f: any) => s + (f._count || 0), 0)
            const avgRating = totalFeedback > 0 ? 
              feedbackStats.reduce((s: number, f: any) => s + (f.rating * (f._count || 0)), 0) / totalFeedback : 0

            return {
              id: outlet.id,
              name: outlet.name,
              customersServed: analytics.totalTokens || 0,
              avgWaitingTime: analytics.avgWaitTime || 0,
              avgServiceTime: analytics.avgServiceTime || 0,
              rating: Math.round((avgRating || 0) * 10) / 10,
              trend: (analytics.avgWaitTime || 0) > 15 ? 'up' : 'down',
              activeOfficers: queueData.availableOfficers || 0,
              totalWaiting: queueData.totalWaiting || 0
            } as BranchData
          } catch (e) {
            console.error(`Failed to fetch data for outlet ${outlet.id}`, e)
            return {
              id: outlet.id,
              name: outlet.name,
              customersServed: 0,
              avgWaitingTime: 0,
              avgServiceTime: 0,  
              rating: 0,
              trend: 'down',
              activeOfficers: 0,
              totalWaiting: 0
            } as BranchData
          }
        })
      )

      setBranchData(branchMetrics)

      // Calculate regional aggregates
      const totalServed = branchMetrics.reduce((sum, branch) => sum + branch.customersServed, 0)
      const avgWaitTime = branchMetrics.length > 0 ? 
        branchMetrics.reduce((sum, branch) => sum + branch.avgWaitingTime, 0) / branchMetrics.length : 0
      const avgRating = branchMetrics.length > 0 ? 
        branchMetrics.reduce((sum, branch) => sum + branch.rating, 0) / branchMetrics.length : 0
      const totalActiveOfficers = branchMetrics.reduce((sum, branch) => sum + branch.activeOfficers, 0)
      const totalWaiting = branchMetrics.reduce((sum, branch) => sum + branch.totalWaiting, 0)
      const activeBranches = branchMetrics.filter(branch => branch.activeOfficers > 0).length

      setRegionStats({
        totalCustomersServed: totalServed,
        avgRegionalWaitTime: Math.round(avgWaitTime * 10) / 10,
        avgRegionalRating: Math.round(avgRating * 10) / 10,
        totalActiveBranches: activeBranches,
        totalActiveOfficers: totalActiveOfficers,
        totalCustomersWaiting: totalWaiting
      })

      setLastUpdated(new Date())

    } catch (error) {
      console.error('Failed to fetch regional data:', error)
    } finally {
      setLoading(false)
      setDashboardLoading(false)
    }
  }

  // Fetch alerts for RTOM (2-star feedback alerts)
  const fetchAlerts = async () => {
    try {
      const params: any = { isRead: false }
      if (alertFilter.outletId) params.outletId = alertFilter.outletId

      const response = await api.get("/manager/alerts", { params })
      setAlerts(response.data)
    } catch (err) {
      console.error("Failed to fetch RTOM alerts:", err)
    }
  }

  // Mark alert as read
  const markAlertAsRead = async (alertId: string) => {
    try {
      await api.patch(`/manager/alerts/${alertId}/read`)
      fetchAlerts() // Refresh alerts after marking as read
    } catch (err) {
      console.error("Failed to mark alert as read:", err)
    }
  }

  // handleLogout moved to ManagerTopBar

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading regional dashboard...</p>
        </div>
      </div>
    )
  }

  // Calculate unread alert count for notification badge
  const unreadAlertCount = alerts.filter((a) => !a.isRead).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RTOM Dashboard</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-sm text-gray-500">
                  {formatDate(currentDateTime)} | {formatTime(currentDateTime)}
                </p>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  {dashboardLoading && <span className="flex items-center gap-1">Refreshing...</span>}
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* RTOM Alerts Notification Bell */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
                title="2-Star Feedback Alerts"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {unreadAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center text-[10px]">
                    {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Regional Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">{/* Existing card content */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Customers Served Today</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{regionStats.totalCustomersServed}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Avg Regional Wait</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{regionStats.avgRegionalWaitTime}m</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Regional Rating</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{regionStats.avgRegionalRating}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Branches</p>
                <p className="text-3xl font-bold text-gray-900">{regionStats.totalActiveBranches}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Officers</p>
                <p className="text-3xl font-bold text-gray-900">{regionStats.totalActiveOfficers}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Currently Waiting</p>
                <p className="text-3xl font-bold text-gray-900">{regionStats.totalCustomersWaiting}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Branch Performance Table */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Branch Performance</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Served Today
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Wait Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Officers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waiting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {branchData.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{branch.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {branch.customersServed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {branch.avgWaitingTime}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-gray-900">{branch.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {branch.activeOfficers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {branch.totalWaiting}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {branch.trend === 'up' ? (
                        <TrendingUp className="w-5 h-5 text-red-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-green-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate("/manager/service-tracking")}
                className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 flex items-center justify-center transition-colors"
              >
                <Activity className="w-5 h-5 mr-2" />
                Service Tracking
              </button>
              <button
                onClick={() => navigate("/manager/branches")}
                className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 flex items-center justify-center transition-colors"
              >
                <Building className="w-5 h-5 mr-2" />
                Manage Branches
              </button>
              <button
                onClick={() => navigate("/manager/appointments")}
                className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 flex items-center justify-center transition-colors"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Appointments
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* RTOM Alerts Panel */}
      {showAlerts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-start justify-center sm:justify-end p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">2-Star Feedback Alerts</h2>
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
                  <option value="">All Branches</option>
                  {branchData.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                <button
                  onClick={fetchAlerts}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
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
                  <p>No 2-star feedback alerts</p>
                  <p className="text-sm">Great job maintaining customer satisfaction!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        !alert.isRead
                          ? 'bg-yellow-50 border-yellow-400'
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                              alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              2-Star Feedback
                            </span>
                            <span className="text-xs text-gray-500">
                              {(alert as any).outletInfo?.outletName || 'Unknown Branch'}
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
                            className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
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
