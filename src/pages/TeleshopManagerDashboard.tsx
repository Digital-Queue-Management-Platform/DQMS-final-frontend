"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  UserPlus,
  Coffee,
  Clock,
  AlertCircle,
  Activity,
  BarChart3,
  MessageSquare
} from "lucide-react"
import TeleshopMetricCard from "../components/TeleshopMetricCard"
import api, { WS_URL } from "../config/api"

interface Officer {
  id: string
  name: string
  mobileNumber: string
  counterNumber?: number
  status: string
  outlet: {
    id: string
    name: string
    location: string
  }
  totalBreaks: number
  totalMinutes: number
  activeBreak?: {
    id: string
    startedAt: string
    durationMinutes: number
  }
}

interface TeleshopManager {
  id: string
  name: string
  mobileNumber: string
  regionName: string
  officers: Officer[]
}

interface BreakAnalytics {
  teleshopStats: {
    totalOfficers: number
    officersOnBreak: number
    totalBreaksToday: number
    totalBreakMinutes: number
    avgBreakDuration: number
  }
  officers: Officer[]
}

export default function TeleshopManagerDashboard() {
  const navigate = useNavigate()
  const [teleshopManager, setTeleshopManager] = useState<TeleshopManager | null>(null)
  const [breakAnalytics, setBreakAnalytics] = useState<BreakAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchTeleshopManagerData()
    fetchBreakAnalytics()

    // Only create WebSocket if authenticated
    const token = localStorage.getItem("teleshopManagerToken")
    if (!token) return

    // Enhanced auto-refresh every 30 seconds for teleshop analytics
    const interval = setInterval(() => {
      fetchBreakAnalytics()
      fetchTeleshopManagerData()
    }, 30000)

    // WebSocket for real-time teleshop updates with better error handling
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isComponentMounted = true
    let connectionAttempts = 0
    const maxReconnectAttempts = 5
    
    const connectWebSocket = () => {
      if (!isComponentMounted || connectionAttempts >= maxReconnectAttempts) return
      
      try {
        // Check if WebSocket is already connected
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
          return
        }

        connectionAttempts++
        ws = new WebSocket(WS_URL)
        
        ws.onopen = () => {
          console.log('TeleshopManagerDashboard WebSocket connected')
          connectionAttempts = 0 // Reset attempts on successful connection
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "BREAK_STATUS_CHANGE" || data.type === "OFFICER_STATUS_CHANGE" || data.type === "BREAK_STARTED" || data.type === "BREAK_ENDED" || data.type === "TELESHOP_MANAGER_FEEDBACK_ALERT") {
              fetchBreakAnalytics()
              
              // Show immediate notification for teleshop manager 3-star feedback alerts
              if (data.type === "TELESHOP_MANAGER_FEEDBACK_ALERT") {
                console.log('TELESHOP MANAGER FEEDBACK ALERT (3-star):', data.data)
                // You could add a toast notification here
              }
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('TeleshopManagerDashboard WebSocket error:', error)
        }
        
        ws.onclose = (event) => {
          console.log('TeleshopManagerDashboard WebSocket disconnected:', event.reason)
          if (isComponentMounted && connectionAttempts < maxReconnectAttempts) {
            const reconnectDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000) // Exponential backoff
            reconnectTimer = window.setTimeout(() => connectWebSocket(), reconnectDelay)
          }
        }
      } catch (error) {
        console.error('Failed to create TeleshopManagerDashboard WebSocket:', error)
        if (isComponentMounted && connectionAttempts < maxReconnectAttempts) {
          const reconnectDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000)
          reconnectTimer = window.setTimeout(() => connectWebSocket(), reconnectDelay)
        }
      }
    }

    // Delay initial connection to avoid React strict mode issues
    const initialConnectionTimer = setTimeout(() => connectWebSocket(), 1000)

    return () => {
      isComponentMounted = false
      clearInterval(interval)
      clearTimeout(initialConnectionTimer)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [])



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

      setTeleshopManager(response.data.teleshopManager)
    } catch (error: any) {
      console.error("Failed to fetch teleshop manager data:", error)
      if (error.response?.status === 401) {
        localStorage.removeItem("teleshopManagerToken")
        localStorage.removeItem("teleshopManager")
        navigate("/teleshop-manager/login")
      } else {
        setError("Failed to load dashboard data")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchBreakAnalytics = async () => {
    try {
      setDashboardLoading(true)
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) return

      const response = await api.get("/teleshop-manager/breaks/analytics", {
        headers: { Authorization: `Bearer ${token}` },
        params: { timeframe: 'today' }
      })

      setBreakAnalytics(response.data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to fetch break analytics:", error)
    } finally {
      setDashboardLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case "available":
        return "Available"
      case "serving":
        return "Serving"
      case "on_break":
      case "break":
        return "On Break"
      case "offline":
        return "Offline"
      case "busy":
        return "Busy"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "serving":
        return "bg-blue-100 text-blue-800"
      case "on_break":
      case "break":
        return "bg-yellow-100 text-yellow-800"
      case "offline":
        return "bg-gray-100 text-gray-800"
      case "busy":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!teleshopManager) {
    return null
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teleshop Manager Dashboard</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-sm text-gray-500">
                Teleshop Manager: {teleshopManager.name} | {new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}
              </p>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                {dashboardLoading && <span className="flex items-center gap-1">Refreshing...</span>}
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Statistics Cards */}
        {breakAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <TeleshopMetricCard
              title="Total Officers"
              value={breakAnalytics.teleshopStats.totalOfficers}
              icon={<Users className="h-6 w-6" />}
              color="blue"
              detail="Under your management"
            />

            <TeleshopMetricCard
              title="Officers on Break"
              value={breakAnalytics.teleshopStats.officersOnBreak}
              icon={<Coffee className="h-6 w-6" />}
              color="yellow"
              detail="Currently taking breaks"
            />

            <TeleshopMetricCard
              title="Breaks Today"
              value={breakAnalytics.teleshopStats.totalBreaksToday}
              icon={<Activity className="h-6 w-6" />}
              color="green"
              detail="Total break sessions"
            />

            <TeleshopMetricCard
              title="Avg Break Duration"
              value={formatDuration(breakAnalytics.teleshopStats.avgBreakDuration)}
              icon={<Clock className="h-6 w-6" />}
              color="purple"
              detail="Average time per break"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => navigate("/teleshop-manager/officers/add")}
            className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 flex items-center justify-center"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Add New Officer
          </button>
          <button
            onClick={() => navigate("/teleshop-manager/completed-services")}
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            View Completed Services
          </button>
          <button
            onClick={() => navigate("/teleshop-manager/feedback")}
            className="bg-yellow-600 text-white p-4 rounded-lg hover:bg-yellow-700 flex items-center justify-center"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Manage Feedback
          </button>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Overview Stats */}
          <div className="xl:col-span-2 space-y-6">
            {/* Officers by Status */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Officers by Status</h3>
                <button
                  onClick={() => navigate("/teleshop-manager/officers/add")}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center text-sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Officer
                </button>
              </div>
              
              {breakAnalytics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {breakAnalytics.officers.filter(o => o.status === 'available').length}
                    </div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {breakAnalytics.officers.filter(o => o.status === 'serving').length}
                    </div>
                    <div className="text-sm text-gray-600">Serving</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {breakAnalytics.officers.filter(o => o.status === 'on_break' || o.status === 'break' || o.activeBreak).length}
                    </div>
                    <div className="text-sm text-gray-600">On Break</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {breakAnalytics.officers.filter(o => o.status === 'offline').length}
                    </div>
                    <div className="text-sm text-gray-600">Offline</div>
                  </div>
                </div>
              )}
            </div>

            {/* Officers Table */}
            <div className="bg-white rounded-lg shadow border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Your Officers</h3>
              </div>
              
              {breakAnalytics && breakAnalytics.officers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Officer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Outlet
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Today's Breaks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {breakAnalytics.officers.slice(0, 5).map((officer, index) => (
                        <tr key={`officer-${officer.id}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{officer.name}</div>
                              <div className="text-sm text-gray-500">{officer.mobileNumber}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-900">{officer.outlet.name}</div>
                              <div className="text-sm text-gray-500">Counter {officer.counterNumber || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(officer.status)}`}>
                              {formatStatus(officer.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <span className="font-medium">{officer.totalBreaks}</span> breaks
                              <br />
                              <span className="text-gray-500">{formatDuration(officer.totalMinutes)} total</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {breakAnalytics.officers.length > 5 && (
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
                      <span className="text-sm text-gray-500">
                        Showing 5 of {breakAnalytics.officers.length} officers
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No officers assigned yet</p>
                  <button
                    onClick={() => navigate("/teleshop-manager/officers/add")}
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Add your first officer
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Active Breaks */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Breaks</h3>
              
              {breakAnalytics && breakAnalytics.officers.filter(o => o.activeBreak).length > 0 ? (
                <div className="space-y-3">
                  {breakAnalytics.officers
                    .filter(officer => officer.activeBreak)
                    .slice(0, 3)
                    .map((officer, index) => (
                      <div key={`active-break-${officer.id}-${index}`} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{officer.name}</h4>
                            <p className="text-xs text-gray-600 truncate">{officer.outlet.name}</p>
                            <div className="flex items-center text-xs text-yellow-800 mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(officer.activeBreak!.durationMinutes)}
                            </div>
                          </div>
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-200 text-yellow-800 rounded-full">
                            Break
                          </span>
                        </div>
                      </div>
                    ))}
                  
                  {breakAnalytics.officers.filter(o => o.activeBreak).length > 3 && (
                    <div className="text-center text-sm text-gray-500">
                      +{breakAnalytics.officers.filter(o => o.activeBreak).length - 3} more on break
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Coffee className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No active breaks</p>
                </div>
              )}
            </div>

            {/* Today's Break Summary */}
            {breakAnalytics && (
              <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Break Time:</span>
                    <span className="font-medium">
                      {formatDuration(breakAnalytics.teleshopStats.totalBreakMinutes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Break:</span>
                    <span className="font-medium">
                      {formatDuration(breakAnalytics.teleshopStats.avgBreakDuration)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Officers:</span>
                    <span className="font-medium text-green-600">
                      {breakAnalytics.teleshopStats.totalOfficers - breakAnalytics.officers.filter(o => o.status === 'offline').length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}