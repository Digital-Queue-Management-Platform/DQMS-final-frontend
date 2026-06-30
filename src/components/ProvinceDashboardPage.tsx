import React, { useState, useEffect } from 'react'
import api from '../config/api'
import { AlertCircle, BarChart3, Users, Clock, Star, Calendar, TrendingUp, MessageSquare } from 'lucide-react'

interface Province { 
  id: string; 
  name: string; 
  dgm?: { name: string; id: string } 
}

interface ProvinceDashboardPageProps {
  provinces: Province[]
  timeframe: string
  setTimeframe: (tf: string) => void
}

const ProvinceDashboardPage: React.FC<ProvinceDashboardPageProps> = ({ 
  provinces = [], 
  timeframe,
  setTimeframe
}) => {
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null)
  const [provinceName, setProvinceName] = useState<string>('Select a province')
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false)
  
  const [analytics, setAnalytics] = useState<any>({
    totalTokens: 0,
    avgWaitTime: 0,
    avgServiceTime: 0,
    feedbackStats: [],
    officerPerformance: [],
    hourlyWaitingTimes: [],
    serviceTypes: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Calculate date range based on timeframe or custom range
  const getDateRange = () => {
    if (useCustomRange) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      }
    }

    const now = new Date()
    let start = new Date()
    
    switch (timeframe) {
      case 'Today':
        start.setHours(0, 0, 0, 0)
        break
      case 'Yesterday':
        start.setDate(now.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        now.setDate(now.getDate() - 1)
        now.setHours(23, 59, 59, 999)
        break
      case 'Last 7 days':
        start.setDate(now.getDate() - 7)
        break
      case 'Last 30 days':
        start.setDate(now.getDate() - 30)
        break
      default:
        start.setHours(0, 0, 0, 0)
    }
    
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString()
    }
  }

  // Fetch analytics data when province or timeframe changes
  useEffect(() => {
    if (!selectedProvinceId) return
    
    const fetchAnalytics = async () => {
      setLoading(true)
      setError("")
      
      try {
        const { startDate: start, endDate: end } = getDateRange()
        console.log('Fetching analytics for province:', selectedProvinceId, 'from', start, 'to', end)
        
        const res = await api.get(`/gm/analytics`, {
          params: {
            provinceId: selectedProvinceId,
            startDate: start,
            endDate: end
          }
        })
        
        console.log('Analytics response:', res.data)
        setAnalytics(res.data)
      } catch (err: any) {
        setError("Failed to load analytics data")
        console.error("Analytics error:", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAnalytics()
  }, [selectedProvinceId, timeframe, startDate, endDate, useCustomRange])

  // Handle province selection
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceId = e.target.value
    if (provinceId && provinceId !== 'none') {
      setSelectedProvinceId(provinceId)
      const province = provinces.find(p => p.id === provinceId)
      setProvinceName(province?.name || 'Unknown Province')
    } else {
      setSelectedProvinceId(null)
      setProvinceName('Select a province')
    }
  }

  // Handle timeframe change
  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf)
    if (tf !== 'Custom') {
      setUseCustomRange(false)
    } else {
      setUseCustomRange(true)
    }
  }

  // Calculate customer satisfaction
  const calculateSatisfaction = () => {
    if (!analytics.feedbackStats || analytics.feedbackStats.length === 0) return 0
    
    const total = analytics.feedbackStats.reduce((sum: number, stat: any) => sum + stat._count, 0)
    const weightedSum = analytics.feedbackStats.reduce((sum: number, stat: any) => 
      sum + (stat.rating * stat._count), 0)
    
    return total > 0 ? Math.round((weightedSum / total) * 20) : 0 // Convert to percentage
  }

  // Calculate total feedback count
  const getTotalFeedback = () => {
    if (!analytics.feedbackStats || analytics.feedbackStats.length === 0) return 0
    return analytics.feedbackStats.reduce((sum: number, stat: any) => sum + stat._count, 0)
  }

  return (
    <div className="space-y-6">
      {/* Province Selection & Date Range */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
            <p className="text-sm text-gray-500">Select province and date range to view detailed analytics</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Province Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
              <select 
                value={selectedProvinceId || 'none'} 
                onChange={handleProvinceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Select Province</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name} {province.dgm ? `(DGM: ${province.dgm.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <select 
                value={useCustomRange ? 'Custom' : timeframe} 
                onChange={(e) => handleTimeframeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Last 7 days">Last 7 days</option>
                <option value="Last 30 days">Last 30 days</option>
                <option value="Custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {useCustomRange && (
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      {selectedProvinceId ? (
        <div className="space-y-6">
          {/* Province Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{provinceName}</h3>
                <p className="text-gray-600">
                  Analytics for {useCustomRange ? `${startDate} to ${endDate}` : timeframe.toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-gray-500">Loading analytics...</div>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 bg-white rounded-lg shadow flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          ) : (
            <>
              {/* Main Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.totalTokens}</p>
                      <p className="text-xs text-gray-500 mt-1">Tokens processed</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.avgWaitTime}m</p>
                      <p className="text-xs text-gray-500 mt-1">Queue to service</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Service Time</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.avgServiceTime}m</p>
                      <p className="text-xs text-gray-500 mt-1">Service duration</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
                      <p className="text-3xl font-bold text-gray-900">{calculateSatisfaction()}%</p>
                      <p className="text-xs text-gray-500 mt-1">{getTotalFeedback()} reviews</p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Service Types */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Service Types
                  </h4>
                  {analytics.serviceTypes && analytics.serviceTypes.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.serviceTypes.map((service: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700 capitalize font-medium">{service.name}</span>
                          <span className="font-bold text-blue-600">{service.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No service data available</p>
                  )}
                </div>

                {/* Feedback Distribution */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-yellow-500" />
                    Feedback Distribution
                  </h4>
                  {analytics.feedbackStats && analytics.feedbackStats.length > 0 ? (
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map(rating => {
                        const stat = analytics.feedbackStats.find((s: any) => s.rating === rating)
                        const count = stat?._count || 0
                        const total = getTotalFeedback()
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                        
                        return (
                          <div key={rating} className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">{rating}</span>
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            </div>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No feedback data available</p>
                  )}
                </div>

                {/* Hourly Distribution Preview */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-500" />
                    Peak Hours
                  </h4>
                  {analytics.hourlyWaitingTimes && analytics.hourlyWaitingTimes.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.hourlyWaitingTimes
                        .sort((a: any, b: any) => b.waitTime - a.waitTime)
                        .slice(0, 5)
                        .map((hour: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{hour.hour}</span>
                            <span className="text-sm text-gray-600">{hour.waitTime}m avg wait</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No hourly data available</p>
                  )}
                </div>
              </div>

              {/* Officer Performance Table */}
              {analytics.officerPerformance && analytics.officerPerformance.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    Officer Performance
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4 font-semibold">Officer</th>
                          <th className="text-left py-3 px-4 font-semibold">Outlet</th>
                          <th className="text-left py-3 px-4 font-semibold">Tokens</th>
                          <th className="text-left py-3 px-4 font-semibold">Avg Rating</th>
                          <th className="text-left py-3 px-4 font-semibold">Feedback Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.officerPerformance
                          .sort((a: any, b: any) => b.tokensHandled - a.tokensHandled)
                          .map((officer: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{officer.officer?.name || 'Unknown'}</td>
                            <td className="py-3 px-4 text-gray-600">{officer.officer?.outlet?.name || 'Unknown'}</td>
                            <td className="py-3 px-4">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                                {officer.tokensHandled}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="font-medium">{officer.avgRating.toFixed(1)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{officer.feedbackCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Province Selected</h3>
          <p className="text-gray-500">Please select a province from the dropdown above to view detailed analytics.</p>
        </div>
      )}
    </div>
  )
}

export default ProvinceDashboardPage