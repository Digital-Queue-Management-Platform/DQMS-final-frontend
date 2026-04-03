"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  Users, 
  BarChart3,
  Filter,
  ChevronDown,
  Calendar,
  X
} from "lucide-react"
import { motion } from "framer-motion"
import api from "../config/api"

interface Officer {
  id: string
  name: string
  mobileNumber: string
  status: string
  counterNumber: number | null
  isTraining: boolean
  joinedAt: string
}

interface OfficerMetrics {
  servedCustomers: number
  totalTokensHandled: number
  avgWaitingTime: number
  maxWaitingTime: number
  avgServingTime: number
  totalServingTime: number
  completionRate: number
  efficiency: number
}

interface OfficerAnalytics {
  officer: Officer
  metrics: OfficerMetrics
  periodInfo: {
    timeRange: string
    startDate: string
    endDate: string
  }
}

interface BranchSummary {
  totalOfficers: number
  activeOfficers: number
  totalServedCustomers: number
  avgBranchWaitTime: number
  avgBranchServingTime: number
}

interface AnalyticsResponse {
  success: boolean
  branchId: string
  branchName: string
  timeRange: string
  period: {
    startDate: string
    endDate: string
  }
  summary: BranchSummary
  officers: OfficerAnalytics[]
}

export default function TeleshopManagerOfficerAnalytics() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('today')
  const [showFilters, setShowFilters] = useState(false)
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  useEffect(() => {
    fetchOfficerAnalytics()
  }, [timeRange, navigate])

  const fetchOfficerAnalytics = async () => {
    try {
      setLoading(true)
      let url = `/teleshop-manager/officer-analytics?timeRange=${timeRange}`
      
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`
      }
      
      const response = await api.get(url)
      setAnalytics(response.data)
    } catch (error: any) {
      console.error("Failed to fetch officer analytics:", error)
      if (error.response?.status === 401) {
        navigate("/teleshop-manager/login")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
    setShowFilters(false)
    if (range === 'custom') {
      setShowCustomDatePicker(true)
    } else {
      setShowCustomDatePicker(false)
    }
  }

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      setShowCustomDatePicker(false)
      fetchOfficerAnalytics()
    }
  }

  const formatTimeRangeLabel = (range: string) => {
    switch (range) {
      case 'today': return 'Today'
      case 'week': return 'Last 7 days'
      case 'month': return 'Last 30 days'
      case 'custom': 
        if (customStartDate && customEndDate) {
          return `${customStartDate} to ${customEndDate}`
        }
        return 'Custom Range'
      default: return 'Today'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'serving':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'on_break':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPerformanceColor = (value: number, type: 'completion' | 'efficiency' | 'speed') => {
    switch (type) {
      case 'completion':
        if (value >= 90) return 'text-green-600'
        if (value >= 70) return 'text-yellow-600'
        return 'text-red-600'
      case 'efficiency':
        if (value >= 2) return 'text-green-600'
        if (value >= 1) return 'text-yellow-600'
        return 'text-red-600'
      case 'speed':
        if (value <= 5) return 'text-green-600'
        if (value <= 10) return 'text-yellow-600'
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading officer analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md mx-auto">
          <BarChart3 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-400" />
          <h1 
            className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2"
            style={{ fontSize: `clamp(1.125rem, 4vw, 1.5rem)` }}
          >
            No Analytics Data
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Unable to load officer performance data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-screen-2xl mx-auto w-full overflow-hidden flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
          <div>
            <h1 
              className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1"
              style={{ fontSize: `clamp(1.25rem, 4vw, 2rem)` }}
            >
              Officer Performance Analytics
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {analytics.branchName} • {analytics.officers.length} officers
            </p>
          </div>
          
          {/* Time Range Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
            >
              <Filter className="h-4 w-4" />
              <span className="max-w-40 truncate">{formatTimeRangeLabel(timeRange)}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {['today', 'week', 'month', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeRangeChange(range)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2 ${
                      timeRange === range ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {range === 'custom' && <Calendar className="h-4 w-4" />}
                    {range === 'today' ? 'Today' : 
                     range === 'week' ? 'Last 7 days' : 
                     range === 'month' ? 'Last 30 days' : 'Custom Range'}
                  </button>
                ))}
              </div>
            )}

            {/* Custom Date Picker Modal */}
            {showCustomDatePicker && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Select Date Range</h3>
                    <button
                      onClick={() => setShowCustomDatePicker(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        min={customStartDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCustomDatePicker(false)}
                      className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCustomDateApply}
                      disabled={!customStartDate || !customEndDate}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Branch Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="text-center p-3 sm:p-4 rounded-xl border border-blue-100 bg-blue-50">
            <p 
              className="font-bold text-blue-600 tabular-nums mb-1"
              style={{ fontSize: `clamp(1.25rem, 3vw, 2rem)` }}
            >
              {analytics.summary.totalOfficers}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Officers</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl border border-green-100 bg-green-50">
            <p 
              className="font-bold text-green-600 tabular-nums mb-1"
              style={{ fontSize: `clamp(1.25rem, 3vw, 2rem)` }}
            >
              {analytics.summary.activeOfficers}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Active Now</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl border border-purple-100 bg-purple-50">
            <p 
              className="font-bold text-purple-600 tabular-nums mb-1"
              style={{ fontSize: `clamp(1.25rem, 3vw, 2rem)` }}
            >
              {analytics.summary.totalServedCustomers}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Served</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl border border-orange-100 bg-orange-50">
            <p 
              className="font-bold text-orange-600 tabular-nums mb-1"
              style={{ fontSize: `clamp(1.25rem, 3vw, 2rem)` }}
            >
              {analytics.summary.avgBranchWaitTime}m
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Avg Wait Time</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl border border-teal-100 bg-teal-50">
            <p 
              className="font-bold text-teal-600 tabular-nums mb-1"
              style={{ fontSize: `clamp(1.25rem, 3vw, 2rem)` }}
            >
              {analytics.summary.avgBranchServingTime}m
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Avg Service Time</p>
          </div>
        </div>
      </div>

      {/* Officers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900">
                  Officer
                </th>
                <th className="text-center px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900">
                  Served
                </th>
                <th className="text-center px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900">
                  Avg Wait
                </th>
                <th className="text-center px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900">
                  Max Wait
                </th>
                <th className="text-center px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900">
                  Avg Service
                </th>
                <th className="text-center px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900">
                  Total Service
                </th>
                <th className="text-center px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900">
                  Completion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.officers.map((officerData, index) => (
                <motion.tr 
                  key={officerData.officer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-semibold text-white">
                          {officerData.officer.name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                          {officerData.officer.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(officerData.officer.status)}`}>
                            {officerData.officer.status}
                          </span>
                          {officerData.officer.counterNumber && (
                            <span className="text-xs text-gray-500">
                              Counter #{officerData.officer.counterNumber}
                            </span>
                          )}
                          {officerData.officer.isTraining && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                              Training
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                    <div className="text-sm sm:text-base font-semibold text-gray-900 tabular-nums">
                      {officerData.metrics.servedCustomers}
                    </div>
                    <div className="text-xs text-gray-500">
                      of {officerData.metrics.totalTokensHandled}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                    <div className={`text-sm sm:text-base font-semibold tabular-nums ${getPerformanceColor(officerData.metrics.avgWaitingTime, 'speed')}`}>
                      {officerData.metrics.avgWaitingTime}m
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                    <div className="text-sm sm:text-base font-semibold text-red-600 tabular-nums">
                      {officerData.metrics.maxWaitingTime}m
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                    <div className={`text-sm sm:text-base font-semibold tabular-nums ${getPerformanceColor(officerData.metrics.avgServingTime, 'speed')}`}>
                      {officerData.metrics.avgServingTime}m
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                    <div className="text-sm sm:text-base font-semibold text-gray-900 tabular-nums">
                      {formatDuration(officerData.metrics.totalServingTime)}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                    <div className={`text-sm sm:text-base font-semibold tabular-nums ${getPerformanceColor(officerData.metrics.completionRate, 'completion')}`}>
                      {officerData.metrics.completionRate}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {officerData.metrics.efficiency} cust/min
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {analytics.officers.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-400" />
              <p className="text-sm sm:text-base text-gray-600">No officers found for this time period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}