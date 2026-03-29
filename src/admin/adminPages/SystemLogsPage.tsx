"use client"

import { useState, useEffect } from "react"
import { 
  Activity, 
  AlertTriangle, 
  AlertCircle, 
  WifiOff, 
  Radio,
  Volume2,
  XCircle,
  TrendingUp,
  Server,
  Monitor,
  Clock,
  BarChart3,
  Eye,
  Database,
  Gauge,
  FileText
} from "lucide-react"
import api from "../../config/api"

interface OverviewData {
  summary: {
    totalLogsToday: number
    totalErrorsToday: number
    totalWarningsToday: number
    offlineDevices: number
    websocketFailuresToday: number
    audioFailuresToday: number
    failedDeployments: number
    criticalErrors: number
  }
  errorsByHour: Array<{ hour: number; count: number }>
  logsBySeverity: Array<{ level: string; count: number }>
  mostAffectedOutlets: Array<{
    outletId: string | null
    outlet: { name: string; location: string } | null
    errorCount: number
  }>
  mostAffectedModules: Array<{ module: string | null; errorCount: number }>
  deviceStats: {
    online: number
    offline: number
    total: number
  }
  recentCriticalEvents: Array<{
    id: string
    timestamp: Date
    level: string
    service: string
    module: string | null
    event: string | null
    message: string
    outlet: { name: string; location: string } | null
  }>
}

export default function SystemLogsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'application' | 'devices' | 'websocket' | 'deployment' | 'audit' | 'health'>('overview')

  useEffect(() => {
    fetchOverview()
    const interval = setInterval(fetchOverview, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchOverview = async () => {
    try {
      const response = await api.get("/logs/overview")
      setOverview(response.data)
    } catch (error) {
      console.error("Failed to fetch logs overview:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'fatal': return 'text-red-900 bg-red-100 border-red-200'
      case 'error': return 'text-red-700 bg-red-50 border-red-200'
      case 'warn': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'info': return 'text-blue-700 bg-blue-50 border-blue-200'
      default: return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading system logs...</p>
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">Failed to load system logs</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-8 w-8 text-blue-600" />
          System Logs & Monitoring
        </h1>
        <p className="text-gray-600 mt-1">
          Centralized logging, monitoring, and diagnostics for the entire system
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-200">
        <div className="flex overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview', icon: Gauge },
            { key: 'application', label: 'Application Logs', icon: FileText, disabled: true },
            { key: 'devices', label: 'Device Logs', icon: Monitor, disabled: true },
            { key: 'websocket', label: 'WebSocket', icon: Radio, disabled: true },
            { key: 'deployment', label: 'Deployments', icon: Server, disabled: true },
            { key: 'audit', label: 'Audit Logs', icon: Database, disabled: true },
            { key: 'health', label: 'Device Health', icon: Activity, disabled: true },
          ].map((tab) => (
            <button
              key={tab.key}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && setSelectedTab(tab.key as any)}
              className={`
                flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap
                ${selectedTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : tab.disabled
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
              {tab.disabled && <span className="text-xs text-gray-400">(Coming Soon)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Logs Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{overview.summary.totalLogsToday.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Errors Today</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{overview.summary.totalErrorsToday.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Warnings Today</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{overview.summary.totalWarningsToday.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Offline Devices</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{overview.summary.offlineDevices}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <WifiOff className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">WebSocket Failures</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{overview.summary.websocketFailuresToday}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <Radio className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-pink-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Audio Failures</p>
              <p className="text-3xl font-bold text-pink-600 mt-1">{overview.summary.audioFailuresToday}</p>
            </div>
            <div className="bg-pink-50 p-3 rounded-lg">
              <Volume2 className="h-6 w-6 text-pink-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-indigo-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Failed Deployments</p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">{overview.summary.failedDeployments}</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg">
              <Server className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-red-300 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Critical Errors</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{overview.summary.criticalErrors}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Logs by Severity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Logs by Severity (Last 7 Days)
          </h2>
          <div className="space-y-3">
            {overview.logsBySeverity.map((log) => {
              const total = overview.logsBySeverity.reduce((acc, l) => acc + l.count, 0)
              const percentage = total > 0 ? (log.count / total) * 100 : 0
              
              return (
                <div key={log.level}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-medium ${
                      log.level === 'fatal' ? 'text-red-900' :
                      log.level === 'error' ? 'text-red-600' :
                      log.level === 'warn' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{log.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        log.level === 'fatal' ? 'bg-red-900' :
                        log.level === 'error' ? 'bg-red-500' :
                        log.level === 'warn' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Device Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-600" />
            Device Status
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 font-medium">Online</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{overview.deviceStats.online}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">Offline</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{overview.deviceStats.offline}</p>
            </div>
            <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 font-medium">Total Devices</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{overview.deviceStats.total}</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Availability</span>
                  <span>{overview.deviceStats.total > 0 ? ((overview.deviceStats.online / overview.deviceStats.total) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${overview.deviceStats.total > 0 ? (overview.deviceStats.online / overview.deviceStats.total) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Most Affected Outlets */}
      {overview.mostAffectedOutlets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-600" />
            Most Affected Outlets (Last 7 Days)
          </h2>
          <div className="space-y-3">
            {overview.mostAffectedOutlets.slice(0, 5).map((outlet, index) => (
              <div key={outlet.outletId || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {outlet.outlet?.name || 'Unknown Outlet'}
                  </p>
                  <p className="text-sm text-gray-600">{outlet.outlet?.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">{outlet.errorCount}</p>
                  <p className="text-xs text-gray-600">errors</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Affected Modules */}
      {overview.mostAffectedModules.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-orange-600" />
            Most Affected Modules (Last 7 Days)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overview.mostAffectedModules.map((module, index) => (
              <div key={module.module || index} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{module.module || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">module</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">{module.errorCount}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Critical Events */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Recent Critical Events
        </h2>
        {overview.recentCriticalEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No critical events found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overview.recentCriticalEvents.map((event) => (
              <div 
                key={event.id}
                className={`p-4 rounded-lg border ${getSeverityColor(event.level)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-white bg-opacity-50">
                        {event.level}
                      </span>
                      <span className="text-sm font-medium">{event.service}</span>
                      {event.module && <span className="text-sm text-gray-600">• {event.module}</span>}
                      {event.event && <span className="text-sm text-gray-600">• {event.event}</span>}
                    </div>
                    <p className="text-sm mt-1">{event.message}</p>
                    {event.outlet && (
                      <p className="text-xs mt-1 opacity-75">
                        {event.outlet.name} - {event.outlet.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs opacity-75 ml-4">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatTimestamp(event.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Activity className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">More Features Coming Soon</h3>
            <p className="text-sm text-blue-700 mt-1">
              Additional tabs for detailed application logs, device logs, WebSocket monitoring, deployment tracking, 
              audit logs, and device health management are currently under development.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
