"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Clock, Star, Users, Building2, TrendingUp, TrendingDown, Bell, X, Activity, Building, Calendar, MessageSquare, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { motion } from "framer-motion"
// ManagerTopBar is provided globally from Layout for manager routes
import api, { WS_URL } from "../config/api"
import type { Alert } from "../types"
import BranchDashboardPage from "../admin/adminPages/BranchDashboardPage"
import { Eye, ArrowLeft } from "lucide-react"

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
  const location = useLocation()
  const [branchData, setBranchData] = useState<BranchData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date())
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [_lastUpdated, setLastUpdated] = useState<Date>(new Date())
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
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertFilter, setAlertFilter] = useState({ 
    outletId: "", 
    importantOnly: false 
  })

  // Branch Drill-down State
  const [showBranchDashboard, setShowBranchDashboard] = useState(false);
  const [selectedBranchIdForDetails, setSelectedBranchIdForDetails] = useState<string | null>(null);
  const [selectedBranchNameForDetails, setSelectedBranchNameForDetails] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('Today');

  // Deep-link to branch dashboard if branchId is in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const bid = params.get('branchId')
    if (bid && branchData.length > 0) {
      const b = branchData.find(x => x.id === bid)
      if (b) {
        setSelectedBranchIdForDetails(b.id)
        setSelectedBranchNameForDetails(b.name)
        setShowBranchDashboard(true)
      }
    }
  }, [location.search, branchData])

  // Calculate unread alert count for notification badge
  const unreadAlertCount = alerts.filter((a) => !a.isRead).length
  
  // Debug: Log when unread count changes
  useEffect(() => {
    console.log('RTOM Dashboard - Unread alert count changed:', unreadAlertCount, 'total alerts:', alerts.length)
  }, [unreadAlertCount, alerts.length])

  useEffect(() => {
    // Manager authentication is handled globally by Layout
    fetchRegionalData()
    fetchAlerts(false) // Fetch 2-star feedback alerts for RTOM (no filters initially)

    // Enhanced auto-refresh every 30 seconds for regional management overview
    const dataRefreshInterval = setInterval(() => {
      fetchRegionalData()
      fetchAlerts(false) // Also refresh alerts (no filters)
    }, 30000)

    // More frequent auto-refresh for notification bell alerts (every 10 seconds)
    const alertRefreshInterval = setInterval(() => {
      console.log('Auto-refreshing notification alerts...')
      fetchAlerts(false) // Refresh alerts more frequently for better responsiveness
    }, 10000)

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
            console.log('ManagerDashboard received WebSocket message:', data.type, data)
            
            if (data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED" || data.type === "OFFICER_STATUS_CHANGE" || data.type === "BRANCH_UPDATED" || data.type === "RTOM_FEEDBACK_ALERT") {
              fetchRegionalData()
              
              // Show immediate notification for RTOM 2-star feedback alerts
              if (data.type === "RTOM_FEEDBACK_ALERT") {
                console.log('âš ï¸ RTOM FEEDBACK ALERT (2-star):', data.data)
                fetchAlerts(false) // Refresh alerts when new 2-star feedback arrives (without filters)
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
      clearInterval(dataRefreshInterval)
      clearInterval(alertRefreshInterval)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [navigate, timeframe])

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

            // Get analytics based on timeframe
            const start = new Date()
            const end = new Date()
            end.setHours(23, 59, 59, 999)

            if (timeframe === 'Today') {
              start.setHours(0, 0, 0, 0)
            } else if (timeframe === 'Weekly') {
              start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0)
            } else if (timeframe === 'Monthly') {
              start.setMonth(start.getMonth() - 1); start.setHours(0, 0, 0, 0)
            } else if (timeframe === 'Annual') {
              start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0)
            }

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
  const fetchAlerts = async (applyFilters = true) => {
    try {
      setAlertsLoading(true)
      const params: any = { isRead: false }
      // Only apply outlet filter if explicitly requested (not for WebSocket triggers)
      if (applyFilters && alertFilter.outletId) {
        params.outletId = alertFilter.outletId
      }

      console.log('Fetching RTOM alerts with params:', params)
      const response = await api.get("/manager/alerts", { params })
      console.log('Received RTOM alerts:', response.data?.length || 0, 'alerts')
      setAlerts(response.data)
    } catch (err) {
      console.error("Failed to fetch RTOM alerts:", err)
    } finally {
      setAlertsLoading(false)
    }
  }

  // Mark alert as read
  const markAlertAsRead = async (alertId: string) => {
    try {
      await api.patch(`/manager/alerts/${alertId}/read`)
      fetchAlerts(false) // Refresh alerts after marking as read (no filters)
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">RTOM Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-slate-500">{formatDate(currentDateTime)} &bull; {formatTime(currentDateTime)}</p>
                {dashboardLoading && <span className="text-xs text-emerald-600 font-medium">Refreshing...</span>}
              </div>
            </div>

            {/* RTOM Alerts Notification Bell */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={`relative p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-slate-200 shadow-sm ${
                  alertsLoading ? 'animate-pulse' : ''
                }`}
                title="2-Star Feedback Alerts"
              >
                <Bell className={`w-5 h-5 ${alertsLoading ? 'text-blue-600' : 'text-gray-700'}`} />
                {unreadAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-xl flex items-center justify-center text-[10px]">
                    {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                  </span>
                )}
                {alertsLoading && (
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Regional Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Customers Served Today</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{regionStats.totalCustomersServed}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Avg Regional Wait</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{regionStats.avgRegionalWaitTime}m</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Regional Rating</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{regionStats.avgRegionalRating}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Active Branches</p>
                <p className="text-3xl font-bold text-gray-900">{regionStats.totalActiveBranches}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Active Officers</p>
                <p className="text-3xl font-bold text-gray-900">{regionStats.totalActiveOfficers}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Currently Waiting</p>
                <p className="text-3xl font-bold text-gray-900">{regionStats.totalCustomersWaiting}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Branch Performance Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Branch Performance Overview</h2>
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['Today', 'Weekly', 'Monthly', 'Annual'].map((tf) => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${timeframe === tf ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Served Today
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Avg Wait Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Officers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Waiting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedBranchIdForDetails(branch.id);
                          setSelectedBranchNameForDetails(branch.name);
                          setShowBranchDashboard(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => navigate("/manager/feedback")}
                className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 flex items-center justify-center transition-colors"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Manage Feedback (2-Star)
              </button>
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
                className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 flex items-center justify-center transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-start justify-center sm:justify-end p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-3 sm:p-4">
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
                  onClick={() => fetchAlerts(true)}
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
                      className={`p-3 rounded-lg border-b border-slate-100 transition-colors ${
                        alert.severity === 'high' ? 'bg-orange-50 hover:bg-orange-100' :
                        alert.severity === 'critical' ? 'bg-red-50 hover:bg-red-100' :
                        alert.severity === 'medium' ? 'bg-blue-50 hover:bg-blue-100' :
                        'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`mt-1 flex-shrink-0 p-1.5 rounded-full ${
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-600 animate-pulse' :
                          alert.severity === 'critical' ? 'bg-red-100 text-red-600 animate-pulse' :
                          alert.severity === 'medium' ? 'bg-blue-100 text-blue-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {alert.severity === 'critical' ? <AlertCircle className="w-4 h-4" /> :
                           alert.severity === 'high' ? <AlertTriangle className="w-4 h-4" /> :
                           alert.severity === 'medium' ? <Info className="w-4 h-4" /> :
                           <Info className="w-4 h-4" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              alert.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                              alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                              alert.severity === 'medium' ? 'bg-blue-200 text-blue-800' :
                              'bg-slate-200 text-slate-800'
                            }`}>
                              {alert.severity === 'high' ? '2-Star Feedback' : 
                               alert.severity === 'critical' ? '1-Star Feedback' : 
                               alert.severity === 'medium' ? '3-Star Feedback' : 'System Alert'}
                            </span>
                            <span className="text-xs font-semibold text-slate-600 truncate">
                              {(alert as any).outletInfo?.outletName || 'System Alert'}
                            </span>
                          </div>
                          <p className={`text-sm mb-2 break-words ${
                            alert.severity === 'high' ? 'text-orange-900 font-medium' :
                            alert.severity === 'critical' ? 'text-red-900 font-medium' :
                            'text-slate-700'
                          }`}>{alert.message}</p>
                          <div className="flex items-center justify-between mt-2">
                             <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(alert.createdAt).toLocaleString()}
                            </span>
                            {!alert.isRead && (
                              <button
                                onClick={() => markAlertAsRead(alert.id)}
                                className="px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 text-blue-600 rounded-md hover:bg-blue-50 transition-colors uppercase tracking-tight"
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

      {/* Branch Detail View Overlay */}
      {showBranchDashboard && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed inset-0 bg-slate-50 z-30 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setShowBranchDashboard(false)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Regional Dashboard
              </button>
              
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                {['Today', 'Weekly', 'Monthly', 'Annual'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      timeframe === tf 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <BranchDashboardPage 
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              initialBranchId={selectedBranchIdForDetails}
              initialBranchName={selectedBranchNameForDetails}
              outlets={branchData.map(b => ({ id: b.id, name: b.name }))}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}
