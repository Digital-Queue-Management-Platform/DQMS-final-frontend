import React, { useState, useEffect } from 'react';
import MetricCard from '../adminComponents/dashboardComponents/MetricCard';
import { BranchComparisonChart } from '../adminComponents/dashboardComponents/BranchComparisonChart';
import WaitingTimeChart from '../adminComponents/dashboardComponents/WaitingTimeChart';
import { BranchTable } from '../adminComponents/dashboardComponents/BranchTable';
import SriLankaMap from '../adminComponents/dashboardComponents/SriLankaMap';
import SystemHealthStatus from '../adminComponents/dashboardComponents/SystemHealthStatus';
import BranchDashboardPage from './BranchDashboardPage';
import { UsersIcon, ClockIcon, StarIcon, Ticket, BellIcon, Eye, ArrowLeft, Trash2, Loader2, X, BellOff, CheckCircle2, Send, Phone, AlertCircle, AlertTriangle, Info, Download } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const [timeframe, setTimeframe] = useState('Today')
  
  // Export PDF states
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')

  // derived metrics (safely computed from branchData)
  const totalCustomers: number = branchData.reduce((sum, branch) => sum + (branch.customersServed || 0), 0);
  const avgWaitingTime: string = branchData.length > 0 ? (branchData.reduce((sum, branch) => sum + (branch.avgWaitingTime || 0), 0) / branchData.length).toFixed(1) : '0.0';
  const avgRating: string = branchData.length > 0 ? (branchData.reduce((sum, branch) => sum + (branch.rating || 0), 0) / branchData.length).toFixed(1) : '0.0';

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showBranchDashboard, setShowBranchDashboard] = useState<boolean>(false);
  const [selectedBranchIdForDetails, setSelectedBranchIdForDetails] = useState<string | null>(null);
  const [selectedBranchNameForDetails, setSelectedBranchNameForDetails] = useState<string | null>(null);
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

  // SMS/Email testing controls
  const [showTestEmail, setShowTestEmail] = useState(false)
  const [showTestSms, setShowTestSms] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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
    buildBranchMetrics() // Add this to ensure metrics update on timeframe change

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
                console.log('CRITICAL FEEDBACK ALERT:', data.data)

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
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        // Avoid closing if in 'CONNECTING' state to silence browser 'failed: closed before established' warning.
        // The socket will eventually time out or connect and be naturallyGC'd without handlers.
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      }
    }
  }, [timeframe])

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
    if (showBranchDashboard) {
      setSelectedBranchIdForDetails(null);
      setSelectedBranchNameForDetails(null);
    }
    setShowBranchDashboard(!showBranchDashboard);
  };

  const handleViewBranchDetails = (branch: any) => {
    setSelectedBranchIdForDetails(String(branch.id));
    setSelectedBranchNameForDetails(branch.name);
    setShowBranchDashboard(true);
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

    // use timeframe-based range
    const start = new Date()
    const end = new Date()

    if (timeframe === 'Today') {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else if (timeframe === 'Weekly') {
      start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0)
    } else if (timeframe === 'Monthly') {
      start.setMonth(start.getMonth() - 1); start.setHours(0, 0, 0, 0)
    } else if (timeframe === 'Annual') {
      start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0)
    }

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
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(d)
      dayEnd.setHours(23, 59, 59, 999)

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

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      setTestMessage({ type: 'error', message: 'Please enter an email address' })
      return
    }

    setTestLoading(true)
    try {
      const response = await api.post('/admin/test/email', { email: testEmail })
      setTestMessage({ type: 'success', message: response.data.message })
      setTestEmail('')
      setTimeout(() => {
        setShowTestEmail(false)
        setTestMessage(null)
      }, 2000)
    } catch (err: any) {
      setTestMessage({ type: 'error', message: err.response?.data?.error || 'Failed to send test email' })
    } finally {
      setTestLoading(false)
    }
  }

  const sendTestSms = async () => {
    if (!testPhone.trim()) {
      setTestMessage({ type: 'error', message: 'Please enter a phone number' })
      return
    }

    setTestLoading(true)
    try {
      const response = await api.post('/admin/test/sms', { phoneNumber: testPhone })
      setTestMessage({ type: 'success', message: response.data.message })
      setTestPhone('')
      setTimeout(() => {
        setShowTestSms(false)
        setTestMessage(null)
      }, 2000)
    } catch (err: any) {
      setTestMessage({ type: 'error', message: err.response?.data?.error || 'Failed to send test SMS' })
    } finally {
      setTestLoading(false)
    }
  }

  const exportAnalyticsPDF = async () => {
    if (!exportStartDate || !exportEndDate) {
      setTestMessage({ type: 'error', message: 'Please select both start and end dates' })
      return
    }

    setExportLoading(true)
    try {
      // Get HTML content from backend
      const response = await api.get('/admin/analytics/export-pdf', {
        params: {
          startDate: exportStartDate,
          endDate: exportEndDate,
          scope: 'Island-wide (All Outlets)'
        }
      })

      // Create a temporary window to print/save as PDF
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(response.data)
        printWindow.document.close()
        
        // Wait for content to load then trigger print dialog
        printWindow.onload = () => {
          printWindow.print()
        }
      }

      setShowExportModal(false)
      setExportStartDate('')
      setExportEndDate('')
    } catch (err: any) {
      console.error('Export error:', err)
      setTestMessage({ type: 'error', message: err.response?.data?.error || 'Failed to generate report' })
    } finally {
      setExportLoading(false)
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
                {showBranchDashboard ? 'Branch Dashboard' : 'Super Admin Dashboard'}
              </h1>
              <div className="mt-2 flex items-center bg-white p-1 rounded-lg border border-slate-200 w-fit">
                {['Today', 'Weekly', 'Monthly', 'Annual'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeframe === tf
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4">
                <div className="flex text-sm items-center text-gray-500">
                  {/*<Clock size={16} className="mr-1" />*/}
                  <span>
                    {formatDate(currentDateTime)} | {formatTime(currentDateTime)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  {dashboardLoading && <span className="flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Refreshing...</span>}
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Export PDF Button */}
              <button
                onClick={() => {
                  setShowExportModal(true)
                  setTestMessage(null)
                }}
                className="relative flex items-center justify-center p-2 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                title="Export Analytics Report (PDF)"
              >
                <Download className="w-5 h-5 text-green-700" />
              </button>

              {/* Test SMS Button */}
              <button
                onClick={() => {
                  setShowTestSms(true)
                  setShowNotifications(false)
                  setTestMessage(null)
                }}
                className="relative flex items-center justify-center p-2 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
                title="Test SMS Service"
              >
                <Phone className="w-5 h-5 text-purple-700" />
              </button>

              {/* Test Email Button */}
              <button
                onClick={() => {
                  setShowTestEmail(true)
                  setShowNotifications(false)
                  setTestMessage(null)
                }}
                className="relative flex items-center justify-center p-2 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                title="Test Email Service"
              >
                <Send className="w-5 h-5 text-blue-700" />
              </button>

              {/* Notification Controls */}
              <div className="flex items-center gap-2">
                {/* Browser Notification Status */}
                {notificationPermission === 'granted' && (
                  <div className="flex items-center gap-1 text-xs text-green-600" title="Browser notifications enabled">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Notifications on</span>
                  </div>
                )}
                {notificationPermission === 'denied' && (
                  <button
                    onClick={() => {
                      alert('Please enable notifications in your browser settings for this site to receive alerts.')
                    }}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    title="Browser notifications disabled - click to learn how to enable"
                  >
                    <BellOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Enable alerts</span>
                  </button>
                )}
                {notificationPermission === 'default' && (
                  <button
                    onClick={() => {
                      Notification.requestPermission().then((permission) => {
                        setNotificationPermission(permission)
                      })
                    }}
                    className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 px-2 py-1 rounded-lg hover:bg-yellow-50 transition-colors"
                    title="Click to enable browser notifications"
                  >
                    <BellIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Allow alerts</span>
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setShowNotifications(false)}></div>

                    {/* Notification Panel */}
                    <div className="fixed inset-x-4 top-20 md:absolute md:right-0 md:inset-x-auto md:top-auto md:mt-2 w-auto md:w-80 bg-white rounded-2xl shadow-sm-lg border border-slate-200 z-50 max-h-[70vh] md:max-h-96 flex flex-col">
                      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="md:hidden p-1 hover:bg-slate-100 rounded-xl"
                        >
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {alerts.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">
                            <p>No new notifications</p>
                          </div>
                        ) : (
                          alerts.slice(0, 10).map((alert) => (
                            <div key={alert.id} className={`p-3 border-b border-gray-100 transition-colors ${alert.severity === 'critical' ? 'bg-red-50 hover:bg-red-100' :
                                alert.severity === 'high' ? 'bg-orange-50 hover:bg-orange-100' :
                                  alert.severity === 'medium' ? 'bg-blue-50 hover:bg-blue-100' :
                                    'hover:bg-gray-50'
                              }`}>
                                <div className="flex items-start space-x-3">
                                  <div className={`mt-1 flex-shrink-0 p-1 rounded-full ${alert.severity === 'critical' ? 'bg-red-100 text-red-600 animate-pulse' :
                                      alert.severity === 'high' ? 'bg-orange-100 text-orange-600' :
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
                                    <p className={`text-sm font-medium break-words ${alert.severity === 'critical' ? 'text-red-900' :
                                        alert.severity === 'high' ? 'text-orange-900' :
                                          alert.severity === 'medium' ? 'text-blue-900' : 'text-gray-900'
                                      }`}>{alert.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(alert.createdAt).toLocaleString()}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-2">
                                      {!alert.isRead && (
                                        <button
                                          onClick={() => markAlertAsRead(alert.id)}
                                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 bg-white border border-blue-100 rounded"
                                        >
                                          Mark as read
                                        </button>
                                      )}
                                      <button
                                        onClick={() => deleteAlert(alert.id)}
                                        className="flex items-center text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 bg-white border border-red-100 rounded"
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
                      <div className="p-3 border-t border-slate-200">
                        <button
                          onClick={markAllAlertsAsRead}
                          className="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 py-2 px-4 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
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
                  Back to Super Admin Dashboard
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
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Branch dashboard panel (shown when toggled) */}
          <div className={`${showBranchDashboard ? 'block' : 'hidden'} flex-1 overflow-y-auto transition-all duration-300`}>
            <BranchDashboardPage
              outlets={outlets}
              initialBranchId={selectedBranchIdForDetails}
              initialBranchName={selectedBranchNameForDetails}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              key={selectedBranchIdForDetails || 'empty'}
            />
          </div>

          {/* Main admin content (hidden when branch dashboard is shown) */}
          <div className={`${showBranchDashboard ? 'hidden' : 'block'} flex-1 overflow-y-auto transition-all duration-300`}>
            {/* filters removed per request */}

            {/* Main content area */}

            {/* Metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <MetricCard title={`Total Customers (${timeframe})`} value={totalCustomers.toString()} icon={<UsersIcon className="h-7 w-7 text-blue-500" />} detail={branchData.length >= 3 ? `${branchData[0].name}: ${branchData[0].customersServed}, ${branchData[1].name}: ${branchData[1].customersServed}, ${branchData[2].name}: ${branchData[2].customersServed}` : undefined} />
              <MetricCard title={`Avg Wait Time (${timeframe})`} value={`${avgWaitingTime} min`} icon={<ClockIcon className="h-7 w-7 text-blue-500" />} trend={Number(avgWaitingTime) < 15 ? 'down' : 'up'} trendLabel={Number(avgWaitingTime) < 15 ? 'Better than target' : 'Above target'} />
              <MetricCard title={`Satisfaction (${timeframe})`} value={avgRating} icon={<StarIcon className="h-7 w-7 text-blue-500" />} trend={Number(avgRating) > 4.0 ? 'up' : 'down'} trendLabel={Number(avgRating) > 4.0 ? 'Above average' : 'Below average'} />
              <MetricCard title="Currently Active Queues" value={realtimeStats ? String(realtimeStats.activeTokens) : '0'} icon={<Ticket className="h-7 w-7 text-green-500" />} trend={Number(avgRating) > 4.0 ? 'up' : 'down'} trendLabel={Number(avgRating) > 4.0 ? 'Above average' : 'Below average'} />
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

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-4">
              <div className="mb-2">
                <div className="max-w-5xl mx-auto">
                  <SystemHealthStatus />
                </div>
              </div>
            </div>

            {/* Map section */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h3 className="text-lg font-medium mb-4">
                Branch Locations & Performance
              </h3>
              <div className="h-135">
                <SriLankaMap branchData={branchData} onViewDetails={handleViewBranchDetails} />
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

      {/* Test Email Modal */}
      {showTestEmail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          >
            <div className="border-b border-slate-200 p-4 sm:p-6 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Test Email Service
              </h2>
              <button
                onClick={() => {
                  setShowTestEmail(false)
                  setTestMessage(null)
                  setTestEmail('')
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {testMessage && (
                <div
                  className={`p-4 rounded-lg ${testMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                    }`}
                >
                  {testMessage.message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={testLoading}
                />
              </div>

              <p className="text-sm text-gray-600">
                A test email will be sent to the provided email address to verify that the email service is working correctly.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={sendTestEmail}
                  disabled={testLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testLoading ? 'Sending...' : 'Send Test Email'}
                </button>
                <button
                  onClick={() => {
                    setShowTestEmail(false)
                    setTestMessage(null)
                    setTestEmail('')
                  }}
                  disabled={testLoading}
                  className="flex-1 px-4 py-2 border border-slate-200 text-gray-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Test SMS Modal */}
      {showTestSms && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          >
            <div className="border-b border-slate-200 p-4 sm:p-6 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-purple-600" />
                Test SMS Service
              </h2>
              <button
                onClick={() => {
                  setShowTestSms(false)
                  setTestMessage(null)
                  setTestPhone('')
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {testMessage && (
                <div
                  className={`p-4 rounded-lg ${testMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                    }`}
                >
                  {testMessage.message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+94771234567 or 0771234567"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={testLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Sri Lankan format: +94771234567 or 0771234567</p>
              </div>

              <p className="text-sm text-gray-600">
                A test SMS will be sent to the provided phone number to verify that the SMS service is working correctly.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={sendTestSms}
                  disabled={testLoading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testLoading ? 'Sending...' : 'Send Test SMS'}
                </button>
                <button
                  onClick={() => {
                    setShowTestSms(false)
                    setTestMessage(null)
                    setTestPhone('')
                  }}
                  disabled={testLoading}
                  className="flex-1 px-4 py-2 border border-slate-200 text-gray-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Export PDF Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          >
            <div className="border-b border-slate-200 p-4 sm:p-6 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" />
                Export Analytics Report
              </h2>
              <button
                onClick={() => {
                  setShowExportModal(false)
                  setTestMessage(null)
                  setExportStartDate('')
                  setExportEndDate('')
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {testMessage && (
                <div
                  className={`p-4 rounded-lg ${testMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                    }`}
                >
                  {testMessage.message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={exportLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  min={exportStartDate}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={exportLoading}
                />
              </div>

              <p className="text-sm text-gray-600">
                A comprehensive analytics report will be generated with executive summary, customer satisfaction analysis, 
                service breakdown, regional performance, and officer efficiency insights for the selected date range.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={exportAnalyticsPDF}
                  disabled={exportLoading || !exportStartDate || !exportEndDate}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exportLoading ? 'Generating...' : 'Generate Report'}
                </button>
                <button
                  onClick={() => {
                    setShowExportModal(false)
                    setTestMessage(null)
                    setExportStartDate('')
                    setExportEndDate('')
                  }}
                  disabled={exportLoading}
                  className="flex-1 px-4 py-2 border border-slate-200 text-gray-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;