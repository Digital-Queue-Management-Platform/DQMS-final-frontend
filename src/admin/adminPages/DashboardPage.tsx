import React, { useState, useEffect } from 'react';
import MetricCard from '../adminComponents/dashboardComponents/MetricCard';
import {BranchComparisonChart} from '../adminComponents/dashboardComponents/BranchComparisonChart';
import WaitingTimeChart from '../adminComponents/dashboardComponents/WaitingTimeChart';
import { BranchTable } from '../adminComponents/dashboardComponents/BranchTable';
import SriLankaMap from '../adminComponents/dashboardComponents/SriLankaMap';
import SystemHealthStatus from '../adminComponents/dashboardComponents/SystemHealthStatus';
import BranchDashboardPage from './BranchDashboardPage';
import { UsersIcon, ClockIcon, StarIcon, Ticket, BellIcon, Eye, ArrowLeft, Trash2, Clock } from 'lucide-react';
import api, { WS_URL } from '../../config/api'
import type { Alert } from '../../types'

interface BranchData {
  id: number;
  name: string;
  customersServed: number;
  avgWaitingTime: number;
  avgServiceTime: number;
  rating: number;
  trend: 'up' | 'down';
}

interface WaitingTimeData {
  day: string;
  [outletName: string]: string | number;
}


const DashboardPage: React.FC = () => {
  // Real data states (populated from API)
  const [branchData, setBranchData] = useState<BranchData[]>([])
  const [waitingTimeData, setWaitingTimeData] = useState<WaitingTimeData[]>([])
  
  // derived metrics (safely computed from branchData)
  const totalCustomers: number = branchData.reduce((sum, branch) => sum + (branch.customersServed || 0), 0);
  const avgWaitingTime: string = branchData.length > 0 ? (branchData.reduce((sum, branch) => sum + (branch.avgWaitingTime || 0), 0) / branchData.length).toFixed(1) : '0.0';
  const avgRating: string = branchData.length > 0 ? (branchData.reduce((sum, branch) => sum + (branch.rating || 0), 0) / branchData.length).toFixed(1) : '0.0';
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showBranchDashboard, setShowBranchDashboard] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Notification system state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [lastAlertCount, setLastAlertCount] = useState(0)

  // Admin data states
  // removed unused selectedOutlet and analytics state
  const [realtimeStats, setRealtimeStats] = useState<any | null>(null)
  // removed unused loading state
  const [outlets, setOutlets] = useState<any[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Computed unread notifications count
  const unreadNotifications = alerts.filter(alert => !alert.isRead).length;

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [])

  // Notification functions - always enabled
  const playNotificationSound = () => {
    try {
      // Always use device's default notification sound (Web Audio API)
      createBeepSound()
    } catch (error) {
      console.log('Notification sound error:', error)
    }
  }

  // Device notification beep sound - always enabled
  const createBeepSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Create a pleasant notification sound that mimics device notification tone
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.log('Web Audio API not supported:', error)
    }
  }

  const showBrowserNotification = (alert: Alert) => {
    if (notificationPermission !== 'granted') return

    try {
      const notification = new Notification('DQMS Alert', {
        body: alert.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `alert-${alert.id}`,
        requireInteraction: alert.severity === 'critical',
        silent: false
      })

      // Auto close notification after 5 seconds for non-critical alerts
      if (alert.severity !== 'critical') {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }

      // Handle notification click
      notification.onclick = () => {
        window.focus()
        setShowNotifications(true)
        notification.close()
      }
    } catch (error) {
      console.log('Browser notification error:', error)
    }
  }

  const handleNewAlerts = (newAlerts: Alert[]) => {
    // Check if there are new unread alerts
    const newUnreadCount = newAlerts.filter(a => !a.isRead).length
    
    if (newUnreadCount > lastAlertCount && lastAlertCount > 0) {
      // There are new alerts
      const newestAlerts = newAlerts
        .filter(a => !a.isRead)
        .slice(0, newUnreadCount - lastAlertCount)
      
      // Play sound for any new alert
      playNotificationSound()
      
      // Show browser notification for critical/high priority alerts
      newestAlerts.forEach(alert => {
        if (alert.severity === 'critical' || alert.severity === 'high') {
          showBrowserNotification(alert)
        }
      })
    }
    
    setLastAlertCount(newUnreadCount)
  }

  useEffect(() => {
    fetchOutlets()
    fetchRealtimeStats()
    fetchAlerts()

    // Enhanced auto-refresh every 30 seconds for comprehensive dashboard monitoring
    const interval = setInterval(() => {
      fetchRealtimeStats()
      fetchAlerts()
    }, 30000)

    // WebSocket connection with better error handling
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isComponentMounted = true
    
    const connectWebSocket = () => {
      if (!isComponentMounted) return
      
      try {
        ws = new WebSocket(WS_URL)
        
        ws.onopen = () => {
          console.log('AdminDashboard WebSocket connected')
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            // Refresh alerts on certain types of events
            if (data.type === "NEGATIVE_FEEDBACK" || data.type === "LONG_WAIT" || data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED" || data.type === "OFFICER_STATUS_CHANGE" || data.type === "CRITICAL_FEEDBACK_ALERT") {
              fetchAlerts()
              fetchRealtimeStats()
              
              // Immediate notification for critical alerts
              if (data.type === "CRITICAL_FEEDBACK_ALERT") {
                console.log('🚨 CRITICAL FEEDBACK ALERT:', data.data)
                
                // Play sound immediately for critical alerts
                playNotificationSound()
                
                // Show browser notification immediately
                if (notificationPermission === 'granted') {
                  const criticalAlert: Alert = {
                    id: `critical-${Date.now()}`,
                    message: data.data?.message || 'Critical feedback received',
                    severity: 'critical',
                    type: 'critical_feedback',
                    isRead: false,
                    createdAt: new Date().toISOString()
                  }
                  showBrowserNotification(criticalAlert)
                }
              }

              // Sound notification for other important events
              if (data.type === "NEGATIVE_FEEDBACK" || data.type === "LONG_WAIT") {
                playNotificationSound()
              }
            }
          } catch (e) {
            console.error('WebSocket message parsing error:', e)
          }
        }

        ws.onerror = (error) => {
          console.error('AdminDashboard WebSocket error:', error)
        }
        
        ws.onclose = (event) => {
          console.log('AdminDashboard WebSocket disconnected:', event.reason)
          // Don't attempt to reconnect if component is unmounted or connection was closed intentionally
          if (!event.wasClean && isComponentMounted) {
            reconnectTimer = window.setTimeout(connectWebSocket, 5000) // Reconnect after 5 seconds
          }
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
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
  }, [])

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

  const handleBranchDashboardToggle = (): void => {
    setShowBranchDashboard(!showBranchDashboard);
  };

  const fetchOutlets = async () => {
    try {
      const res = await api.get('/queue/outlets')
      setOutlets(res.data)
      // populate branch-level metrics once outlets are loaded
      buildBranchMetrics(res.data)
    } catch (err) {
      console.error('Failed to fetch outlets', err)
    }
  }

  // Build branch-level aggregated metrics by calling admin analytics per outlet
  const buildBranchMetrics = async (availableOutlets?: any[]) => {
    const outs = availableOutlets || outlets
    if (!outs || outs.length === 0) return

    // use today's full day range by default
    const start = new Date()
    start.setHours(0,0,0,0)
    const end = new Date()
    end.setHours(23,59,59,999)

    try {
      const metrics = await Promise.all(
        outs.map(async (o: any) => {
          try {
            const res = await api.get('/admin/analytics', {
              params: { outletId: o.id, startDate: start.toISOString(), endDate: end.toISOString() }
            })
            const a = res.data || {}
            const feedbackStats = a.feedbackStats || []
            const totalFeedback = feedbackStats.reduce((s: number, f: any) => s + (f._count || 0), 0)
            const avgRating = totalFeedback > 0 ? feedbackStats.reduce((s: number, f: any) => s + (f.rating * (f._count || 0)), 0) / totalFeedback : 0

            return {
              id: o.id,
              name: o.name,
              customersServed: a.totalTokens || 0,
              avgWaitingTime: a.avgWaitTime || 0,
              avgServiceTime: a.avgServiceTime || 0,
              rating: Math.round((avgRating || 0) * 10) / 10,
              trend: (a.avgWaitTime || 0) > 15 ? 'up' : 'down'
            }
          } catch (e) {
            console.error('Failed to fetch analytics for outlet', o.id, e)
            return {
              id: o.id,
              name: o.name,
              customersServed: 0,
              avgWaitingTime: 0,
              avgServiceTime: 0,
              rating: 0,
              trend: 'down'
            }
          }
        })
      )

  setBranchData(metrics as BranchData[])

      // build waiting time series for top 4 outlets (or first 4)
      buildWaitingTimeSeries(metrics)
    } catch (err) {
      console.error('Failed to build branch metrics', err)
    }
  }

  // Build last-7-days waiting time per branch for the chart
  const buildWaitingTimeSeries = async (metrics: any[]) => {
    if (!metrics || metrics.length === 0) return

    // Use actual outlet names from the database (up to 4 outlets)
    const names: string[] = metrics.slice(0, 4).map((m: any) => m.name)

    const days: WaitingTimeData[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString(undefined, { weekday: 'short' })
      const dayStart = new Date(d)
      dayStart.setHours(0,0,0,0)
      const dayEnd = new Date(d)
      dayEnd.setHours(23,59,59,999)

      const point: any = { day: label }

      // fetch average wait per chosen outlet for that day
      await Promise.all(names.map(async (name) => {
        const outlet = metrics.find((m: any) => m.name === name)
        if (!outlet) {
          point[name] = 0
          return
        }
        try {
          const res = await api.get('/admin/analytics', { params: { outletId: outlet.id, startDate: dayStart.toISOString(), endDate: dayEnd.toISOString() } })
          point[name] = res.data.avgWaitTime || 0
        } catch (e) {
          console.error('Failed to fetch daily analytics for', name, e)
          point[name] = 0
        }
      }))

      // ensure all chosen names exist as keys
      for (const n of names) if (point[n] === undefined) point[n] = 0

      days.push(point as WaitingTimeData)
    }

    setWaitingTimeData(days)
  }

  // fetchAnalytics removed (not needed)

  const fetchRealtimeStats = async () => {
    try {
      setDashboardLoading(true)
      const res = await api.get('/admin/dashboard/realtime')
      setRealtimeStats(res.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch realtime stats', err)
    } finally {
      setDashboardLoading(false)
    }
  }

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/admin/alerts', {
        params: { isRead: false }
      })
      const newAlerts = response.data
      
      // Handle notifications for new alerts
      handleNewAlerts(newAlerts)
      
      setAlerts(newAlerts)
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    }
  }

  const markAlertAsRead = async (alertId: string) => {
    try {
      await api.patch(`/admin/alerts/${alertId}/read`)
      fetchAlerts() // Refresh alerts after marking as read
    } catch (err) {
      console.error('Failed to mark alert as read:', err)
    }
  }

  const markAllAlertsAsRead = async () => {
    try {
      // Mark all unread alerts as read
      await Promise.all(
        alerts
          .filter(alert => !alert.isRead)
          .map(alert => api.patch(`/admin/alerts/${alert.id}/read`))
      )
      fetchAlerts() // Refresh alerts after marking all as read
    } catch (err) {
      console.error('Failed to mark all alerts as read:', err)
    }
  }

  const deleteAlert = async (alertId: string) => {
    try {
      await api.delete(`/admin/alerts/${alertId}`)
      fetchAlerts() // Refresh alerts after deletion
    } catch (err) {
      console.error('Failed to delete alert:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {showBranchDashboard ? 'Branch Dashboard' : 'Admin Dashboard'}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex text-sm items-center text-gray-500">
                  <Clock size={16} className="mr-1" />
                  <span>
                    {formatDate(currentDateTime)} | {formatTime(currentDateTime)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  {dashboardLoading && <span className="flex items-center gap-1">🔄 Refreshing...</span>}
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Controls */}
              <div className="flex items-center gap-2">
                {/* Browser Notification Status */}
                {notificationPermission === 'granted' && (
                  <div className="text-xs text-green-600" title="Browser notifications enabled">
                    
                  </div>
                )}
                {notificationPermission === 'denied' && (
                  <button
                    onClick={() => {
                      alert('Please enable notifications in your browser settings for this site to receive alerts.')
                    }}
                    className="text-xs text-red-600 hover:text-red-700"
                    title="Browser notifications disabled - click to learn how to enable"
                  >
                    
                  </button>
                )}
                {notificationPermission === 'default' && (
                  <button
                    onClick={() => {
                      Notification.requestPermission().then((permission) => {
                        setNotificationPermission(permission)
                      })
                    }}
                    className="text-xs text-yellow-600 hover:text-yellow-700"
                    title="Click to enable browser notifications"
                  >
                    
                  </button>
                )}
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative flex items-center justify-center p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <BellIcon className="w-5 h-5 text-gray-600" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <>
                    {/* Mobile Overlay */}
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setShowNotifications(false)}></div>
                    
                    {/* Notification Panel */}
                    <div className="fixed inset-x-4 top-20 md:absolute md:right-0 md:inset-x-auto md:top-auto md:mt-2 w-auto md:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[70vh] md:max-h-96 flex flex-col">
                      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        <button 
                          onClick={() => setShowNotifications(false)}
                          className="md:hidden p-1 hover:bg-gray-100 rounded-full"
                        >
                          <span className="text-gray-500 text-xl">✕</span>
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <p>No new notifications</p>
                        </div>
                      ) : (
                        alerts.slice(0, 10).map((alert) => (
                          <div key={alert.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                alert.severity === 'critical' ? 'bg-red-600 animate-pulse' :
                                alert.severity === 'high' ? 'bg-red-500' :
                                alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 break-words">{alert.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(alert.createdAt).toLocaleString()}
                                </p>
                                <div className="flex items-center space-x-2 mt-2">
                                  {!alert.isRead && (
                                    <button
                                      onClick={() => markAlertAsRead(alert.id)}
                                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 bg-blue-50 rounded"
                                    >
                                      Mark as read
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteAlert(alert.id)}
                                    className="flex items-center text-xs text-red-600 hover:text-red-700 px-2 py-1 bg-red-50 rounded"
                                    title="Delete notification"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      </div>
                      <div className="p-3 border-t border-gray-200">
                        <button
                          onClick={markAllAlertsAsRead}
                          className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-2 px-4 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {showBranchDashboard ? (
                <button 
                  className="flex items-center px-4 py-2 bg-gray-900 border border-gray-300 rounded-md text-md font-medium text-white hover:text-black hover:bg-gray-50"
                  onClick={handleBranchDashboardToggle}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Admin Dashboard
                </button>
              ) : (
                <button 
                  className="flex items-center px-4 py-2 bg-black border border-gray-300 rounded-md text-md font-medium text-white hover:text-black hover:bg-gray-50"
                  onClick={handleBranchDashboardToggle}
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Location wise Dashboard
                </button>
              )}
              {/*<button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export
              </button>
              <button className="flex items-center px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700">
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>*/}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Branch dashboard panel (shown when toggled) */}
          <div className={`${showBranchDashboard ? 'block' : 'hidden'} flex-1 overflow-y-auto transition-all duration-300`}>
            <BranchDashboardPage outlets={outlets} />
          </div>

          {/* Main admin content (hidden when branch dashboard is shown) */}
          <div className={`${showBranchDashboard ? 'hidden' : 'block'} flex-1 overflow-y-auto transition-all duration-300`}>
                          {/* filters removed per request */}

            {/* Main content area */}
          
              {/* Metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <MetricCard title="Total Customers Served Today" value={totalCustomers.toString()} icon={<UsersIcon className="h-7 w-7 text-blue-500" />} detail={branchData.length >= 3 ? `${branchData[0].name}: ${branchData[0].customersServed}, ${branchData[1].name}: ${branchData[1].customersServed}, ${branchData[2].name}: ${branchData[2].customersServed}` : undefined} />
              <MetricCard title="Average Waiting Time" value={`${avgWaitingTime} min`} icon={<ClockIcon className="h-7 w-7 text-blue-500" />} trend={Number(avgWaitingTime) < 15 ? 'down' : 'up'} trendLabel={Number(avgWaitingTime) < 15 ? 'Better than target' : 'Above target'} />
              <MetricCard title="Customer Satisfaction Rating" value={avgRating} icon={<StarIcon className="h-7 w-7 text-blue-500" />} trend={Number(avgRating) > 4.0 ? 'up' : 'down'} trendLabel={Number(avgRating) > 4.0 ? 'Above average' : 'Below average'} />
              <MetricCard title="Currently Active Queues" value={realtimeStats ? String(realtimeStats.activeTokens) : '0'} icon={<Ticket className="h-7 w-7 text-green-500"/>} trend={Number(avgRating) > 4.0 ? 'up' : 'down'} trendLabel={Number(avgRating) > 4.0 ? 'Above average' : 'Below average'}/>
            </div>
            
            {/* Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">
                  Customer Volume by Branch
                </h3>
                <BranchComparisonChart data={branchData} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">
                  Waiting Time Trends (Last 7 Days)
                </h3>
                <WaitingTimeChart data={waitingTimeData} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="p-2 rounded-lg shadow mb-6">
                <SystemHealthStatus/>
              </div>
            </div>
            
            {/* Map section */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h3 className="text-lg font-medium mb-4">
                Branch Locations & Performance
              </h3>
              <div className="h-135">
                <SriLankaMap branchData={branchData} />
              </div> 
            </div>

            {/* Table section */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">
                Branch Performance Details
              </h3>
                <BranchTable 
                  data={branchData} 
                  currentPage={currentPage} 
                  setCurrentPage={setCurrentPage} 
                  sortColumn={sortColumn} 
                  setSortColumn={setSortColumn} 
                  sortDirection={sortDirection} 
                  setSortDirection={setSortDirection} 
                />
            </div>           
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;