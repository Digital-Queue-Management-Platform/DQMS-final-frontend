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
  FileText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Info,
  Copy,
  CheckCircle2,
  Calendar,
  X,
  FileJson
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

interface LogItem {
  id: string
  timestamp: string
  level: string
  service: string
  module: string | null
  event: string | null
  message: string
  stackTrace: string | null
  metadata: any | null
  userId: string | null
  userRole: string | null
  outletId: string | null
  deviceId: string | null
  sessionId: string | null
  requestId: string | null
  appVersion: string | null
  ipAddress: string | null
  userAgent: string | null
  outlet: { name: string; location: string } | null
  region: { name: string } | null
}

interface DeploymentItem {
  id: string
  timestamp: string
  service: string
  environment: string
  branch: string | null
  commitHash: string | null
  status: string
  triggeredBy: string | null
  duration: number | null
  output: string | null
  errorMessage: string | null
  notes: string | null
}

interface AuditLogItem {
  id: string
  timestamp: string
  userId: string
  userRole: string
  action: string
  targetType: string | null
  targetId: string | null
  outletId: string | null
  regionId: string | null
  changes: any | null
  metadata: any | null
  message: string
  ipAddress: string | null
  outlet: { name: string; location: string } | null
  region: { name: string } | null
}

interface DeviceHealthItem {
  id: string
  deviceId: string
  deviceType: string
  outletId: string
  status: string
  appVersion: string | null
  websocketConnected: boolean
  pollingMode: boolean
  ipAddress: string | null
  lastSeenAt: string
  lastError: string | null
  lastErrorAt: string | null
  metadata: any | null
  createdAt: string
  updatedAt: string
  outlet: { name: string; location: string; regionId: string } | null
  actualStatus: string
  isOnline: boolean
}

export default function SystemLogsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'application' | 'devices' | 'websocket' | 'deployment' | 'audit' | 'health'>('overview')
  const [outlets, setOutlets] = useState<any[]>([])

  // Global filters
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Tab specific lists/states
  const [logs, setLogs] = useState<any[]>([])
  const [devices, setDevices] = useState<DeviceHealthItem[]>([])
  const [healthSummary, setHealthSummary] = useState<any>(null)
  const [wsStats, setWsStats] = useState<any>({ disconnectsToday: 0, reconnectsToday: 0, failedBroadcastsToday: 0 })

  // Detailed Modal Item
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [selectedItemType, setSelectedItemType] = useState<'log' | 'deployment' | 'audit' | null>(null)
  const [copied, setCopied] = useState(false)

  // Tab-specific filters state
  const [appLevel, setAppLevel] = useState("all")
  const [appService, setAppService] = useState("all")
  const [appModule, setAppModule] = useState("")

  const [deviceType, setDeviceType] = useState("all")
  const [deviceLevel, setDeviceLevel] = useState("all")
  const [deviceOutletId, setDeviceOutletId] = useState("")

  const [wsOutletId, setWsOutletId] = useState("")
  const [wsLevel, setWsLevel] = useState("all")
  const [wsEvent, setWsEvent] = useState("")

  const [depService, setDepService] = useState("all")
  const [depStatus, setDepStatus] = useState("all")
  const [depEnvironment, setDepEnvironment] = useState("all")

  const [auditUserId, setAuditUserId] = useState("")
  const [auditUserRole, setAuditUserRole] = useState("all")
  const [auditAction, setAuditAction] = useState("")
  const [auditOutletId, setAuditOutletId] = useState("")

  const [healthDeviceType, setHealthDeviceType] = useState("all")
  const [healthOutletId, setHealthOutletId] = useState("")
  const [healthStatus, setHealthStatus] = useState("all")

  // Fetch initial overview and cache outlets
  useEffect(() => {
    fetchOverview()
    fetchOutlets()
    const interval = setInterval(fetchOverview, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  // Fetch tab data on tab or filter change
  useEffect(() => {
    fetchTabData()
  }, [
    selectedTab, 
    page, 
    appLevel, appService, appModule,
    deviceType, deviceLevel, deviceOutletId,
    wsOutletId, wsLevel, wsEvent,
    depService, depStatus, depEnvironment,
    auditUserId, auditUserRole, auditAction, auditOutletId,
    healthDeviceType, healthOutletId, healthStatus
  ])

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

  const fetchOutlets = async () => {
    try {
      const response = await api.get("/queue/outlets")
      setOutlets(response.data || [])
    } catch (error) {
      console.error("Failed to fetch outlets:", error)
    }
  }

  const fetchTabData = async () => {
    if (selectedTab === 'overview') return
    setTabLoading(true)
    try {
      let endpoint = ""
      const params: any = {
        page: page.toString(),
        limit: limit.toString(),
      }

      if (search) params.search = search
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo

      if (selectedTab === 'application') {
        endpoint = "/logs/application"
        if (appLevel !== 'all') params.level = appLevel
        if (appService !== 'all') params.service = appService
        if (appModule) params.module = appModule
      } else if (selectedTab === 'devices') {
        endpoint = "/logs/devices"
        if (deviceType !== 'all') params.deviceType = deviceType
        if (deviceLevel !== 'all') params.level = deviceLevel
        if (deviceOutletId) params.outletId = deviceOutletId
      } else if (selectedTab === 'websocket') {
        endpoint = "/logs/realtime"
        if (wsOutletId) params.outletId = wsOutletId
        if (wsLevel !== 'all') params.level = wsLevel
        if (wsEvent) params.event = wsEvent
      } else if (selectedTab === 'deployment') {
        endpoint = "/logs/deployments"
        if (depService !== 'all') params.service = depService
        if (depStatus !== 'all') params.status = depStatus
        if (depEnvironment !== 'all') params.environment = depEnvironment
      } else if (selectedTab === 'audit') {
        endpoint = "/logs/audit"
        if (auditUserId) params.userId = auditUserId
        if (auditUserRole !== 'all') params.userRole = auditUserRole
        if (auditAction) params.action = auditAction
        if (auditOutletId) params.outletId = auditOutletId
      } else if (selectedTab === 'health') {
        endpoint = "/logs/device-health"
        if (healthDeviceType !== 'all') params.deviceType = healthDeviceType
        if (healthOutletId) params.outletId = healthOutletId
        if (healthStatus !== 'all') params.status = healthStatus
      }

      const response = await api.get(endpoint, { params })
      
      if (selectedTab === 'health') {
        setDevices(response.data.devices || [])
        setHealthSummary(response.data.summary || null)
      } else {
        setLogs(response.data.logs || [])
        if (selectedTab === 'websocket' && response.data.stats) {
          setWsStats(response.data.stats)
        }
      }
      
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages || 1)
        setTotalItems(response.data.pagination.total || 0)
      }
    } catch (error) {
      console.error(`Failed to fetch tab data for ${selectedTab}:`, error)
    } finally {
      setTabLoading(false)
    }
  }

  const clearFilters = () => {
    setSearch("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
    
    // Reset tab specific filters
    setAppLevel("all")
    setAppService("all")
    setAppModule("")
    setDeviceType("all")
    setDeviceLevel("all")
    setDeviceOutletId("")
    setWsOutletId("")
    setWsLevel("all")
    setWsEvent("")
    setDepService("all")
    setDepStatus("all")
    setDepEnvironment("all")
    setAuditUserId("")
    setAuditUserRole("all")
    setAuditAction("")
    setAuditOutletId("")
    setHealthDeviceType("all")
    setHealthOutletId("")
    setHealthStatus("all")
    
    setTimeout(fetchTabData, 50)
  }

  const getSeverityColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'fatal': return 'text-red-900 bg-red-150 border-red-300 font-bold border'
      case 'error': return 'text-red-700 bg-red-50 border-red-200 border'
      case 'warn': return 'text-amber-700 bg-amber-50 border-amber-200 border'
      case 'info': return 'text-blue-700 bg-blue-50 border-blue-200 border'
      default: return 'text-gray-700 bg-gray-50 border-gray-250 border'
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenDetails = (item: any, type: 'log' | 'deployment' | 'audit') => {
    setSelectedItem(item)
    setSelectedItemType(type)
  }

  const handleCloseDetails = () => {
    setSelectedItem(null)
    setSelectedItemType(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Analyzing logs registry...</p>
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Failed to connect to the monitoring service</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Background blobs for modern premium design */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <Activity className="h-6 w-6 text-indigo-600 animate-pulse flex-shrink-0" />
              System Monitoring Dashboard
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Real-time log registry, heartbeat monitoring &amp; deployment diagnostics
            </p>
          </div>
          
          <button
            onClick={() => { fetchOverview(); fetchTabData(); }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold shadow-sm transition-all shrink-0"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${tabLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="flex overflow-x-auto scrollbar-none">
            {[
              { key: 'overview', label: 'Overview', icon: Gauge },
              { key: 'application', label: 'Application Logs', icon: FileText },
              { key: 'devices', label: 'Device Logs', icon: Monitor },
              { key: 'websocket', label: 'WebSocket Stream', icon: Radio },
              { key: 'deployment', label: 'Deployments', icon: Server },
              { key: 'audit', label: 'Audit Trail', icon: Database },
              { key: 'health', label: 'Device Health', icon: Activity },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setSelectedTab(tab.key as any); setPage(1); }}
                className={`
                  flex items-center gap-2 px-4 sm:px-6 py-3.5 font-semibold text-sm border-b-2 transition-all whitespace-nowrap outline-none
                  ${selectedTab === tab.key
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50/50'
                  }
                `}
              >
                <tab.icon className={`h-4 w-4 ${selectedTab === tab.key ? 'text-indigo-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Overview Metrics (Always visible at top when in Overview) */}
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Logs Today</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{overview.summary.totalLogsToday.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-xl">
                  <Activity className="h-5.5 w-5.5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Errors Today</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-red-650 mt-1">{overview.summary.totalErrorsToday.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 p-2.5 rounded-xl">
                  <XCircle className="h-5.5 w-5.5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-yellow-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Warnings Today</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-650 mt-1">{overview.summary.totalWarningsToday.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-xl">
                  <AlertTriangle className="h-5.5 w-5.5 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-orange-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Offline Devices</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-orange-650 mt-1">{overview.summary.offlineDevices}</p>
                </div>
                <div className="bg-orange-50 p-2.5 rounded-xl">
                  <WifiOff className="h-5.5 w-5.5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">WebSocket Outages</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-purple-650 mt-1">{overview.summary.websocketFailuresToday}</p>
                </div>
                <div className="bg-purple-50 p-2.5 rounded-xl">
                  <Radio className="h-5.5 w-5.5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Voice Outages</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-rose-650 mt-1">{overview.summary.audioFailuresToday}</p>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-xl">
                  <Volume2 className="h-5.5 w-5.5 text-rose-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Failed Deployments</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-indigo-650 mt-1">{overview.summary.failedDeployments}</p>
                </div>
                <div className="bg-indigo-50 p-2.5 rounded-xl">
                  <Server className="h-5.5 w-5.5 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-red-300 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Fatal Errors Today</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-red-800 mt-1">{overview.summary.criticalErrors}</p>
                </div>
                <div className="bg-red-150 p-2.5 rounded-xl">
                  <AlertCircle className="h-5.5 w-5.5 text-red-800" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Tab Screen */}
        <div className="transition-all duration-250">
          {tabLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 text-sm font-medium">Updating telemetry stream...</p>
          </div>
          ) : (
            <>
              {/* TAB: OVERVIEW */}
              {selectedTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Severity Distribution */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Log Volume by Severity (Last 7 Days)
                      </h2>
                      <div className="space-y-3.5">
                        {overview.logsBySeverity.map((log) => {
                          const total = overview.logsBySeverity.reduce((acc, l) => acc + l.count, 0)
                          const percentage = total > 0 ? (log.count / total) * 100 : 0
                          
                          return (
                            <div key={log.level}>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-bold uppercase ${
                                  log.level === 'fatal' ? 'text-red-950 font-black' :
                                  log.level === 'error' ? 'text-red-650' :
                                  log.level === 'warn' ? 'text-amber-600' :
                                  'text-blue-600'
                                }`}>
                                  {log.level}
                                </span>
                                <span className="text-xs font-bold text-slate-750">{log.count.toLocaleString()}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    log.level === 'fatal' ? 'bg-red-950' :
                                    log.level === 'error' ? 'bg-red-500' :
                                    log.level === 'warn' ? 'bg-amber-500' :
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

                    {/* Device Status Audit */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-indigo-600" />
                        Node Registry & Status
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50/50 border border-emerald-150 rounded-xl p-4">
                          <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Online Nodes</p>
                          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-750 mt-1">{overview.deviceStats.online}</p>
                        </div>
                        <div className="bg-rose-50/50 border border-rose-150 rounded-xl p-4">
                          <p className="text-xs text-rose-800 font-bold uppercase tracking-wider">Offline Nodes</p>
                          <p className="text-2xl sm:text-3xl font-extrabold text-rose-750 mt-1">{overview.deviceStats.offline}</p>
                        </div>
                        <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Total Terminals</p>
                              <p className="text-2xl font-bold text-slate-900 mt-1">{overview.deviceStats.total}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-600">Active Service Ratio</span>
                              <p className="text-lg font-bold text-indigo-750">
                                {overview.deviceStats.total > 0 ? ((overview.deviceStats.online / overview.deviceStats.total) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${overview.deviceStats.total > 0 ? (overview.deviceStats.online / overview.deviceStats.total) * 100 : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outlets & Modules breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Outlets */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-rose-650" />
                        Incidents by Outlet (Last 7 Days)
                      </h2>
                      {overview.mostAffectedOutlets.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          No outlet error reports recorded.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {overview.mostAffectedOutlets.map((item, index) => (
                            <div key={item.outletId || index} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">{item.outlet?.name || 'Central Platform Service'}</p>
                                <p className="text-xs text-slate-500">{item.outlet?.location || 'Core Backend Cluster'}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold text-rose-650">{item.errorCount}</span>
                                <span className="text-[10px] block text-slate-500 font-bold uppercase">alerts</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Modules */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Server className="h-5 w-5 text-orange-655" />
                        Incidents by Module (Last 7 Days)
                      </h2>
                      {overview.mostAffectedModules.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          No module incidents recorded.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {overview.mostAffectedModules.map((m, index) => (
                            <div key={m.module || index} className="flex items-center justify-between p-4 bg-orange-50/30 border border-orange-100 rounded-xl">
                              <div>
                                <p className="font-bold text-slate-800 text-sm capitalize">{m.module || 'System Kernels'}</p>
                                <p className="text-xs text-slate-500 uppercase font-bold text-[9px] tracking-wider">Sub-Service</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-black text-orange-650">{m.errorCount}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">hits</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Critical Events */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-650" />
                      Recent Critical Events Trail
                    </h2>
                    {overview.recentCriticalEvents.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        <Eye className="h-10 w-10 mx-auto mb-2 opacity-30 text-slate-450" />
                        <p>No high priority warning triggers found.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {overview.recentCriticalEvents.map((event) => (
                          <div 
                            key={event.id}
                            className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors cursor-pointer hover:bg-slate-50/50 ${getSeverityColor(event.level)}`}
                            onClick={() => handleOpenDetails(event, 'log')}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/70 border border-slate-200">
                                  {event.level}
                                </span>
                                <span className="text-xs font-bold text-slate-800">{event.service}</span>
                                {event.module && <span className="text-xs text-slate-500">• {event.module}</span>}
                                {event.event && <span className="text-xs text-slate-500">• {event.event}</span>}
                              </div>
                              <p className="text-sm font-semibold text-slate-800 truncate">{event.message}</p>
                              {event.outlet && (
                                <p className="text-xs mt-1 text-slate-600 font-medium">
                                  {event.outlet.name} — {event.outlet.location}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-2 text-xs font-medium text-slate-500">
                              <Clock className="h-3.5 w-3.5 text-slate-450" />
                              {formatTimestamp(event.timestamp)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FILTERS PANEL (Visible on all tabs except Overview) */}
              {selectedTab !== 'overview' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2 text-slate-850">
                      <SlidersHorizontal className="h-4.5 w-4.5 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">Diagnostic Filter Panel</h3>
                    </div>
                    <button 
                      onClick={clearFilters}
                      className="text-xs font-bold text-indigo-650 hover:text-indigo-850 flex items-center gap-1.5 transition-colors outline-none"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reset Diagnostics Filters
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* General Text Search */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Free-Text Query</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search message, event, status..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                        />
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    {/* Date From */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Range From</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                        />
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    {/* Date To */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Range To</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                        />
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    {/* TAB SPECIFIC FILTERS */}
                    {selectedTab === 'application' && (
                      <>
                        {/* App Severity Level */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Severity Threshold</label>
                          <select
                            value={appLevel}
                            onChange={(e) => setAppLevel(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All Incidents</option>
                            <option value="fatal">Fatal Outages</option>
                            <option value="error">System Errors</option>
                            <option value="warn">System Warnings</option>
                            <option value="info">Information Traces</option>
                          </select>
                        </div>

                        {/* App Service */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Core Service Layer</label>
                          <select
                            value={appService}
                            onChange={(e) => setAppService(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All Services</option>
                            <option value="backend">Backend API Server</option>
                            <option value="frontend">Super-Admin Client</option>
                            <option value="kiosk">Self-Service Kiosk UI</option>
                            <option value="officer">Officer Display Portal</option>
                          </select>
                        </div>

                        {/* App Module */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sub-Module Layer</label>
                          <input
                            type="text"
                            placeholder="e.g. auth, appointment, sms"
                            value={appModule}
                            onChange={(e) => setAppModule(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                          />
                        </div>
                      </>
                    )}

                    {selectedTab === 'devices' && (
                      <>
                        {/* Device Type */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Terminal Category</label>
                          <select
                            value={deviceType}
                            onChange={(e) => setDeviceType(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All Terminal Types</option>
                            <option value="kiosk">Kiosk</option>
                            <option value="display">Main Outlet Display</option>
                            <option value="speaker">IP Voice Speaker</option>
                          </select>
                        </div>

                        {/* Device Severity Level */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Incident severity</label>
                          <select
                            value={deviceLevel}
                            onChange={(e) => setDeviceLevel(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All Severities</option>
                            <option value="error">Errors Only</option>
                            <option value="warn">Warnings Only</option>
                          </select>
                        </div>

                        {/* Device Outlet Scope */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Outlet Scope</label>
                          <select
                            value={deviceOutletId}
                            onChange={(e) => setDeviceOutletId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="">All Outlets</option>
                            {outlets.map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {selectedTab === 'websocket' && (
                      <>
                        {/* WebSocket Severity Level */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Severity Level</label>
                          <select
                            value={wsLevel}
                            onChange={(e) => setWsLevel(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All Levels</option>
                            <option value="error">Errors</option>
                            <option value="warn">Warnings</option>
                            <option value="info">Info</option>
                          </select>
                        </div>

                        {/* WebSocket Event Type */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Realtime Connection Event</label>
                          <input
                            type="text"
                            placeholder="e.g. disconnect, heartbeat"
                            value={wsEvent}
                            onChange={(e) => setWsEvent(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                          />
                        </div>

                        {/* WebSocket Outlet Scope */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Outlet Scope</label>
                          <select
                            value={wsOutletId}
                            onChange={(e) => setWsOutletId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="">All Outlets</option>
                            {outlets.map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {selectedTab === 'deployment' && (
                      <>
                        {/* Deployment Service */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Cluster</label>
                          <select
                            value={depService}
                            onChange={(e) => setDepService(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All Deployments</option>
                            <option value="backend">Backend API Server</option>
                            <option value="frontend">Super-Admin Client</option>
                            <option value="kiosk">Self-Service Kiosk UI</option>
                          </select>
                        </div>

                        {/* Deployment Status */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Build Status</label>
                          <select
                            value={depStatus}
                            onChange={(e) => setDepStatus(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All States</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                          </select>
                        </div>

                        {/* Deployment Environment */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Environment Cluster</label>
                          <select
                            value={depEnvironment}
                            onChange={(e) => setDepEnvironment(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All Envs</option>
                            <option value="production">Production</option>
                            <option value="staging">Staging</option>
                          </select>
                        </div>
                      </>
                    )}

                    {selectedTab === 'audit' && (
                      <>
                        {/* Audit User ID */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Operator ID</label>
                          <input
                            type="text"
                            placeholder="Exact Operator UUID..."
                            value={auditUserId}
                            onChange={(e) => setAuditUserId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                          />
                        </div>

                        {/* Audit User Role */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Operator Role</label>
                          <select
                            value={auditUserRole}
                            onChange={(e) => setAuditUserRole(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All Roles</option>
                            <option value="super-admin">Super Admin</option>
                            <option value="teleshop-manager">Teleshop Manager</option>
                            <option value="officer">Officer</option>
                          </select>
                        </div>

                        {/* Audit Action Type */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Database Action</label>
                          <input
                            type="text"
                            placeholder="e.g. USER_LOGIN, PASSWORD_RESET"
                            value={auditAction}
                            onChange={(e) => setAuditAction(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                          />
                        </div>

                        {/* Audit Outlet scope */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Outlet Scope</label>
                          <select
                            value={auditOutletId}
                            onChange={(e) => setAuditOutletId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="">All Outlets</option>
                            {outlets.map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {selectedTab === 'health' && (
                      <>
                        {/* Health Device Type */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Terminal Category</label>
                          <select
                            value={healthDeviceType}
                            onChange={(e) => setHealthDeviceType(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All Categories</option>
                            <option value="kiosk">Kiosk</option>
                            <option value="display">Main Outlet Display</option>
                            <option value="speaker">IP Voice Speaker</option>
                          </select>
                        </div>

                        {/* Health status */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Connectivity State</label>
                          <select
                            value={healthStatus}
                            onChange={(e) => setHealthStatus(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="all">All States</option>
                            <option value="online">Online Only</option>
                            <option value="offline">Offline Only</option>
                            <option value="degraded">Degraded Only</option>
                          </select>
                        </div>

                        {/* Health Outlet Scope */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Outlet Scope</label>
                          <select
                            value={healthOutletId}
                            onChange={(e) => setHealthOutletId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white"
                          >
                            <option value="">All Outlets</option>
                            {outlets.map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={fetchTabData}
                        className="flex-1 px-4 py-2 bg-indigo-650 text-white font-semibold rounded-xl hover:bg-indigo-750 transition-all text-sm flex items-center justify-center gap-2 shadow-sm shadow-indigo-650/10"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Query Engine
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB DATA LISTINGS */}

              {/* VIEW: APPLICATION LOGS */}
              {selectedTab === 'application' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service / Module</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Message</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operator</th>
                          <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                              No application log records match the queried parameters.
                            </td>
                          </tr>
                        ) : (
                          logs.map((log: LogItem) => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wider ${getSeverityColor(log.level)}`}>
                                  {log.level}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                                {formatTimestamp(log.timestamp)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs font-bold text-slate-800 capitalize">{log.service}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.module || 'core'}</div>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-700 font-medium max-w-xs truncate">
                                {log.message}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {log.userRole ? (
                                  <div>
                                    <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md">
                                      {log.userRole}
                                    </span>
                                    <span className="text-[10px] block text-slate-500 mt-0.5 font-mono truncate max-w-[100px]">{log.userId}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                <button 
                                  onClick={() => handleOpenDetails(log, 'log')}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-650 transition-colors inline-flex items-center gap-1 font-semibold outline-none"
                                >
                                  <Eye className="h-4 w-4" />
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination footer */}
                  {renderPagination()}
                </div>
              )}

              {/* VIEW: DEVICE LOGS */}
              {selectedTab === 'devices' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Terminal ID / Category</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outlet Scope</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Event Message</th>
                          <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                              No device terminal error reports found.
                            </td>
                          </tr>
                        ) : (
                          logs.map((log: LogItem) => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wider ${getSeverityColor(log.level)}`}>
                                  {log.level}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                                {formatTimestamp(log.timestamp)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs font-bold text-slate-800 truncate max-w-[120px] font-mono">{log.deviceId}</div>
                                <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">{log.service?.replace("-ui", "")}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-bold">
                                {log.outlet ? (
                                  <div>
                                    <div className="font-semibold text-slate-800">{log.outlet.name}</div>
                                    <div className="text-[10px] text-slate-500">{log.outlet.location}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-700 font-medium max-w-xs truncate">
                                {log.message}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                <button 
                                  onClick={() => handleOpenDetails(log, 'log')}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-650 transition-colors inline-flex items-center gap-1 font-semibold outline-none"
                                >
                                  <Eye className="h-4 w-4" />
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination()}
                </div>
              )}

              {/* VIEW: WEBSOCKET STREAM */}
              {selectedTab === 'websocket' && (
                <div className="space-y-6">
                  {/* Realtime Socket Status Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Socket Disconnects Today</p>
                          <p className="text-2xl font-black text-rose-650 mt-1">{wsStats.disconnectsToday}</p>
                        </div>
                        <div className="bg-rose-50 p-2.5 rounded-xl">
                          <WifiOff className="h-5.5 w-5.5 text-rose-650" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Socket Reconnects Today</p>
                          <p className="text-2xl font-black text-emerald-650 mt-1">{wsStats.reconnectsToday}</p>
                        </div>
                        <div className="bg-emerald-50 p-2.5 rounded-xl">
                          <Radio className="h-5.5 w-5.5 text-emerald-650 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Failed Broadcasts Today</p>
                          <p className="text-2xl font-black text-amber-650 mt-1">{wsStats.failedBroadcastsToday}</p>
                        </div>
                        <div className="bg-amber-50 p-2.5 rounded-xl">
                          <AlertTriangle className="h-5.5 w-5.5 text-amber-650" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Event</th>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outlet Scope</th>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Socket Payload / Description</th>
                            <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inspect</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {logs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                                No live websocket telemetry records match the filters.
                              </td>
                            </tr>
                          ) : (
                            logs.map((log: LogItem) => (
                              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wider ${
                                    log.event?.includes('disconnect') ? 'bg-rose-50 text-rose-650 border border-rose-100' :
                                    log.event?.includes('reconnect') || log.event?.includes('connect') ? 'bg-emerald-50 text-emerald-650 border border-emerald-100' :
                                    'bg-indigo-50 text-indigo-650 border border-indigo-100'
                                  }`}>
                                    {log.event || 'broadcast'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                                  {formatTimestamp(log.timestamp)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-bold">
                                  {log.outlet ? log.outlet.name : 'Platform Socket Engine'}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-700 font-medium max-w-sm truncate">
                                  {log.message}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                  <button 
                                    onClick={() => handleOpenDetails(log, 'log')}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-650 transition-colors inline-flex items-center gap-1 font-semibold outline-none"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Payload
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination()}
                  </div>
                </div>
              )}

              {/* VIEW: DEPLOYMENTS */}
              {selectedTab === 'deployment' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Cluster</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Commit Hash</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">operator</th>
                          <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Build Log</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                              No deployment history records.
                            </td>
                          </tr>
                        ) : (
                          logs.map((dep: DeploymentItem) => (
                            <tr key={dep.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-[10px] uppercase px-2.5 py-1 rounded-md font-bold tracking-wider flex items-center gap-1.5 w-max ${
                                  dep.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : 'bg-rose-50 text-rose-700 border border-rose-250'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${dep.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  {dep.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                                {formatTimestamp(dep.timestamp)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-xs font-bold text-slate-800 capitalize">{dep.service}</span>
                                <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md ml-2">{dep.environment}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-mono">
                                {dep.commitHash ? dep.commitHash.substring(0, 7) : 'manual-release'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                                {dep.triggeredBy || 'CI/CD pipeline'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                <button 
                                  onClick={() => handleOpenDetails(dep, 'deployment')}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-650 transition-colors inline-flex items-center gap-1 font-semibold outline-none"
                                >
                                  <FileJson className="h-4 w-4" />
                                  Build Output
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination()}
                </div>
              )}

              {/* VIEW: AUDIT TRAIL */}
              {selectedTab === 'audit' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operator Profile</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Incident Outlet</th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Audit Log Details</th>
                          <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trace changes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                              No security audit trail logs matches standard queries.
                            </td>
                          </tr>
                        ) : (
                          logs.map((audit: AuditLogItem) => (
                            <tr key={audit.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-[10px] font-bold tracking-wider text-slate-750 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-250 font-mono">
                                  {audit.action}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                                {formatTimestamp(audit.timestamp)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs font-bold text-slate-800">{audit.userId.substring(0, 13)}...</div>
                                <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-0.5 block w-max">
                                  {audit.userRole}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-bold">
                                {audit.outlet ? audit.outlet.name : 'Super-Admin Operations'}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-700 font-medium max-w-xs truncate">
                                {audit.message}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                <button 
                                  onClick={() => handleOpenDetails(audit, 'audit')}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-650 transition-colors inline-flex items-center gap-1 font-semibold outline-none"
                                >
                                  <FileJson className="h-4 w-4" />
                                  Inspect Diff
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination()}
                </div>
              )}

              {/* VIEW: DEVICE HEALTH */}
              {selectedTab === 'health' && (
                <div className="space-y-6">
                  {/* Heartbeat Status Overview */}
                  {healthSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Nodes</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{healthSummary.total}</p>
                          </div>
                          <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
                            <Monitor className="h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Online Nodes</p>
                            <p className="text-2xl font-black text-emerald-650 mt-1">{healthSummary.online}</p>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                            <span className="relative flex h-3 w-3 inline-block mr-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Offline Nodes</p>
                            <p className="text-2xl font-black text-rose-650 mt-1">{healthSummary.offline}</p>
                          </div>
                          <div className="bg-rose-50 p-2 rounded-xl text-rose-600">
                            <WifiOff className="h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Degraded Nodes</p>
                            <p className="text-2xl font-black text-amber-650 mt-1">{healthSummary.degraded}</p>
                          </div>
                          <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Polling Terminals</p>
                            <p className="text-2xl font-black text-indigo-650 mt-1">{healthSummary.pollingMode}</p>
                          </div>
                          <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                            <Clock className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">State</th>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Terminal ID / Category</th>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outlet Scope</th>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Release Ver.</th>
                            <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Heartbeat Ping</th>
                            <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Diagnostics</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {devices.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm">
                                No registered terminals match standard health heartbeats query.
                              </td>
                            </tr>
                          ) : (
                            devices.map((device: DeviceHealthItem) => (
                              <tr key={device.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`text-[10px] uppercase px-2.5 py-1 rounded-md font-bold tracking-wider flex items-center gap-1.5 w-max ${
                                    device.isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    <span className={`h-2 w-2 rounded-full ${
                                      device.isOnline && device.actualStatus === 'degraded' ? 'bg-amber-500 animate-pulse' :
                                      device.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                    }`} />
                                    {device.isOnline ? (device.actualStatus === 'degraded' ? 'degraded' : 'online') : 'offline'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-xs font-bold text-slate-800 font-mono">{device.deviceId}</div>
                                  <span className="text-[9px] text-slate-500 font-black uppercase">{device.deviceType}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-bold">
                                  {device.outlet ? (
                                    <div>
                                      <div className="font-semibold text-slate-800">{device.outlet.name}</div>
                                      <div className="text-[10px] text-slate-500">{device.outlet.location}</div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-450">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-mono">
                                  {device.ipAddress || 'unknown-host'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-650 font-bold">
                                  {device.appVersion || 'v1.0.0'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                                  {formatTimestamp(device.lastSeenAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                  <button 
                                    onClick={() => handleOpenDetails(device, 'log')}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-650 transition-colors inline-flex items-center gap-1 font-semibold outline-none"
                                    title="View diagnostic variables payload"
                                  >
                                    <Info className="h-4 w-4" />
                                    Telemetry
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* DETAIL MODAL DRAWER */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div 
              onClick={handleCloseDetails}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
              aria-hidden="true"
            />

            {/* Modal Box */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-100">
              
              {/* Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    selectedItemType === 'log' ? 'bg-indigo-50 text-indigo-700' :
                    selectedItemType === 'deployment' ? 'bg-emerald-50 text-emerald-700' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {selectedItemType} Inspect
                  </span>
                  <h3 className="text-sm font-bold text-slate-900" id="modal-title">
                    Record ID: <span className="font-mono text-slate-500 text-xs">{selectedItem.id}</span>
                  </h3>
                </div>
                <button 
                  onClick={handleCloseDetails}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-4">
                
                {/* Specific Layout per Type */}
                {selectedItemType === 'log' && (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Timestamp</span>
                        <p className="font-bold text-slate-800">{formatTimestamp(selectedItem.timestamp)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Service Cluster</span>
                        <p className="font-bold text-slate-800 capitalize">{selectedItem.service} {selectedItem.module ? `(${selectedItem.module})` : ''}</p>
                      </div>
                      {selectedItem.deviceId && (
                        <div>
                          <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Device Terminal ID</span>
                          <p className="font-mono text-slate-800 font-bold">{selectedItem.deviceId}</p>
                        </div>
                      )}
                      {selectedItem.ipAddress && (
                        <div>
                          <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Source IP Address</span>
                          <p className="font-mono text-slate-800 font-bold">{selectedItem.ipAddress}</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1">Log Message Description</span>
                      <p className="text-slate-800 text-sm font-semibold leading-relaxed bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        {selectedItem.message}
                      </p>
                    </div>

                    {selectedItem.stackTrace && (
                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider">Call Stack Exception Trace</span>
                          <button 
                            onClick={() => copyToClipboard(selectedItem.stackTrace)}
                            className="text-[10px] font-bold text-indigo-650 hover:text-indigo-850 flex items-center gap-1 transition-colors outline-none"
                          >
                            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-650" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied Exception' : 'Copy Exception Stack'}
                          </button>
                        </div>
                        <pre className="bg-slate-950 text-slate-150 p-4 rounded-xl overflow-x-auto text-[11px] font-mono max-h-[250px] leading-relaxed select-all">
                          {selectedItem.stackTrace}
                        </pre>
                      </div>
                    )}

                    {selectedItem.metadata && Object.keys(selectedItem.metadata).length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1.5">JSON Payload Metadata Variables</span>
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-xs font-mono select-all">
                          {JSON.stringify(selectedItem.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                {selectedItemType === 'deployment' && (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Release Date</span>
                        <p className="font-bold text-slate-800">{formatTimestamp(selectedItem.timestamp)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Cluster Category</span>
                        <p className="font-bold text-slate-800 capitalize">{selectedItem.service} ({selectedItem.environment})</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Release Committer</span>
                        <p className="font-bold text-slate-850">{selectedItem.triggeredBy || 'Git Automation Trigger'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Branch Build</span>
                        <p className="font-mono text-slate-850 font-bold">{selectedItem.branch || 'production-main'}</p>
                      </div>
                    </div>

                    {selectedItem.notes && (
                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1">Developer Release Notes</span>
                        <p className="text-slate-850 bg-indigo-50/20 p-3.5 border border-indigo-100 rounded-xl text-xs font-medium italic leading-relaxed">
                          {selectedItem.notes}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider">Vite Engine Build Terminal Log</span>
                        <button 
                          onClick={() => copyToClipboard(selectedItem.output || selectedItem.errorMessage || '')}
                          className="text-[10px] font-bold text-indigo-650 hover:text-indigo-850 flex items-center gap-1 transition-colors outline-none"
                        >
                          {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-650" /> : <Copy className="h-3.5 w-3.5" />}
                          Copy Build Terminal Log
                        </button>
                      </div>
                      <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl overflow-x-auto text-[10px] font-mono max-h-[300px] leading-relaxed select-all">
                        {selectedItem.output || selectedItem.errorMessage || 'No terminal build stdout traces recorded for manual updates.'}
                      </pre>
                    </div>
                  </>
                )}

                {selectedItemType === 'audit' && (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Security Timestamp</span>
                        <p className="font-bold text-slate-800">{formatTimestamp(selectedItem.timestamp)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Operator UUID</span>
                        <p className="font-mono text-slate-800 font-bold">{selectedItem.userId}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Security Level Role</span>
                        <p className="font-bold text-slate-850 capitalize">{selectedItem.userRole}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Source Connection IP</span>
                        <p className="font-mono text-slate-850 font-bold">{selectedItem.ipAddress || 'direct-system-call'}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1">Operational Event Audit Message</span>
                      <p className="text-slate-800 bg-slate-50 p-3.5 border border-slate-150 rounded-xl text-xs font-semibold leading-relaxed">
                        {selectedItem.message}
                      </p>
                    </div>

                    {selectedItem.changes && Object.keys(selectedItem.changes).length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1.5">JSON Model Comparative Diff</span>
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-xs font-mono select-all">
                          {JSON.stringify(selectedItem.changes, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}

              </div>
              
              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleCloseDetails}
                  className="px-4 py-2 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm outline-none"
                >
                  Close Inspectors
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function renderPagination() {
    if (totalPages <= 1) return null
    
    return (
      <div className="bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs text-slate-500 font-semibold">
          Showing <span className="font-bold text-slate-800">{(page - 1) * limit + 1}</span> to{' '}
          <span className="font-bold text-slate-800">
            {Math.min(page * limit, totalItems)}
          </span>{' '}
          of <span className="font-bold text-slate-800">{totalItems}</span> incidents logs
        </div>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-colors outline-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-lg flex items-center justify-center">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-colors outline-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }
}
