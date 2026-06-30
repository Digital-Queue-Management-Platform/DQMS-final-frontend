import React, { useState, useEffect } from 'react'
import api from '../config/api'
import { AlertCircle, Users, Clock, Star, TrendingUp, MapPin, Target, Award, Activity } from 'lucide-react'

interface RTOMPerformance {
  rtomId: string
  rtomName: string
  regionName: string
  regionId: string
  totalOutlets: number
  totalTokens: number
  avgWaitTime: number
  avgServiceTime: number
  customerSatisfaction: number
  totalFeedback: number
  activeManagers: number
  totalManagers: number
  performanceScore: number
  teleshopManagers: {
    id: string
    name: string
    outletName: string
    tokensHandled: number
    avgRating: number
    feedbackCount: number
  }[]
}

interface RTOMPerformanceDashboardProps {
  timeframe: string
  setTimeframe: (tf: string) => void
}

const RTOMPerformanceDashboard: React.FC<RTOMPerformanceDashboardProps> = ({ 
  timeframe,
  setTimeframe
}) => {
  const [rtomPerformances, setRtomPerformances] = useState<RTOMPerformance[]>([])
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const dgmToken = localStorage.getItem("dgmToken")

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

  // Fetch RTOM performance data
  useEffect(() => {
    const fetchRTOMPerformance = async () => {
      setLoading(true)
      setError("")
      
      try {
        const { startDate: start, endDate: end } = getDateRange()
        
        // Get RTOMs and their regions
        const rtomsRes = await api.get("/dgm/rtoms", { 
          headers: { Authorization: `Bearer ${dgmToken}` } 
        })
        
        const regions = rtomsRes.data.regions || []
        const performances: RTOMPerformance[] = []
        
        // For each region with RTOMs, fetch analytics
        for (const region of regions) {
          for (const rtom of region.rtoms || []) {
            try {
              // Get analytics for all outlets in this region (RTOM's responsibility)
              await api.get("/dgm/analytics", {
                headers: { Authorization: `Bearer ${dgmToken}` },
                params: { startDate: start, endDate: end }
              })
              
              // Calculate RTOM-specific performance from region outlets
              const regionOutlets = region.outlets || []
              let rtomTokens = 0
              let rtomWaitTime = 0
              let rtomServiceTime = 0
              let rtomFeedback = 0
              let rtomTotalRating = 0
              
              // Get detailed analytics for each outlet in this RTOM's region
              const outletAnalytics = []
              for (const outlet of regionOutlets) {
                try {
                  const outletRes = await api.get("/dgm/analytics", {
                    headers: { Authorization: `Bearer ${dgmToken}` },
                    params: { 
                      startDate: start, 
                      endDate: end, 
                      outletId: outlet.id 
                    }
                  })
                  outletAnalytics.push({
                    outletId: outlet.id,
                    outletName: outlet.name,
                    ...outletRes.data
                  })
                } catch (err) {
                  console.warn(`Failed to fetch analytics for outlet ${outlet.id}`)
                }
              }
              
              // Aggregate RTOM performance
              outletAnalytics.forEach(analytics => {
                rtomTokens += analytics.totalTokens || 0
                rtomWaitTime += (analytics.avgWaitTime || 0) * (analytics.totalTokens || 1)
                rtomServiceTime += (analytics.avgServiceTime || 0) * (analytics.totalTokens || 1)
                
                if (analytics.feedbackStats) {
                  analytics.feedbackStats.forEach((stat: any) => {
                    rtomFeedback += stat._count || 0
                    rtomTotalRating += (stat.rating * stat._count) || 0
                  })
                }
              })
              
              // Calculate averages
              const avgWaitTime = rtomTokens > 0 ? Math.round(rtomWaitTime / rtomTokens) : 0
              const avgServiceTime = rtomTokens > 0 ? Math.round(rtomServiceTime / rtomTokens) : 0
              const customerSatisfaction = rtomFeedback > 0 ? Math.round((rtomTotalRating / rtomFeedback) * 20) : 0
              
              // Calculate performance score (0-100)
              const performanceScore = Math.round((
                (rtomTokens > 0 ? 25 : 0) + // Activity score
                (avgWaitTime < 15 ? 25 : Math.max(0, 25 - avgWaitTime)) + // Wait time score
                (customerSatisfaction > 80 ? 25 : customerSatisfaction * 0.3125) + // Satisfaction score
                (rtom.teleshopManagers?.length > 0 ? 25 : 0) // Management score
              ))
              
              // Prepare teleshop manager performance
              const managerPerformance = (rtom.teleshopManagers || []).map((manager: any) => ({
                id: manager.id,
                name: manager.name,
                outletName: 'Multiple Outlets', // RTOMs can manage multiple outlets
                tokensHandled: Math.floor(rtomTokens / (rtom.teleshopManagers?.length || 1)), // Distribute evenly
                avgRating: customerSatisfaction / 20, // Convert back to 5-star scale
                feedbackCount: Math.floor(rtomFeedback / (rtom.teleshopManagers?.length || 1))
              }))
              
              performances.push({
                rtomId: rtom.id,
                rtomName: rtom.name,
                regionName: region.name,
                regionId: region.id,
                totalOutlets: regionOutlets.length,
                totalTokens: rtomTokens,
                avgWaitTime,
                avgServiceTime,
                customerSatisfaction,
                totalFeedback: rtomFeedback,
                activeManagers: rtom.teleshopManagers?.filter((m: any) => m.isActive)?.length || 0,
                totalManagers: rtom.teleshopManagers?.length || 0,
                performanceScore,
                teleshopManagers: managerPerformance
              })
              
            } catch (err) {
              console.warn(`Failed to fetch analytics for RTOM ${rtom.id}:`, err)
            }
          }
        }
        
        // Sort by performance score
        performances.sort((a, b) => b.performanceScore - a.performanceScore)
        setRtomPerformances(performances)
        
      } catch (err: any) {
        setError("Failed to load RTOM performance data")
        console.error("RTOM performance error:", err)
      } finally {
        setLoading(false)
      }
    }
    
    if (dgmToken) {
      fetchRTOMPerformance()
    }
  }, [dgmToken, timeframe, startDate, endDate, useCustomRange])

  // Handle timeframe change
  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf)
    if (tf !== 'Custom') {
      setUseCustomRange(false)
    } else {
      setUseCustomRange(true)
    }
  }

  // Calculate summary metrics
  const summaryMetrics = {
    totalRTOMs: rtomPerformances.length,
    avgPerformanceScore: rtomPerformances.length > 0 
      ? Math.round(rtomPerformances.reduce((sum, r) => sum + r.performanceScore, 0) / rtomPerformances.length)
      : 0,
    totalTokensHandled: rtomPerformances.reduce((sum, r) => sum + r.totalTokens, 0),
    highPerformers: rtomPerformances.filter(r => r.performanceScore >= 80).length
  }

  return (
    <div className="space-y-6">
      {/* Header & Date Range Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">RTOM Performance Dashboard</h2>
            <p className="text-sm text-gray-500">Monitor and analyze performance of Regional Teleshop Operations Managers</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              <div className="lg:col-span-2">
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

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total RTOMs</p>
              <p className="text-3xl font-bold text-gray-900">{summaryMetrics.totalRTOMs}</p>
              <p className="text-xs text-gray-500 mt-1">Under your management</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Performance</p>
              <p className="text-3xl font-bold text-gray-900">{summaryMetrics.avgPerformanceScore}%</p>
              <p className="text-xs text-gray-500 mt-1">Overall score</p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tokens Handled</p>
              <p className="text-3xl font-bold text-gray-900">{summaryMetrics.totalTokensHandled}</p>
              <p className="text-xs text-gray-500 mt-1">Total processed</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Performers</p>
              <p className="text-3xl font-bold text-gray-900">{summaryMetrics.highPerformers}</p>
              <p className="text-xs text-gray-500 mt-1">Score ≥ 80%</p>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Loading/Error States */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-gray-500">Loading RTOM performance data...</div>
          </div>
        </div>
      ) : error ? (
        <div className="p-6 bg-white rounded-lg shadow flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      ) : (
        <>
          {/* RTOM Performance Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rtomPerformances.map((rtom) => (
              <div key={rtom.rtomId} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                {/* RTOM Header */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{rtom.rtomName}</h3>
                        <p className="text-sm text-gray-600">{rtom.regionName} • {rtom.totalOutlets} outlets</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        rtom.performanceScore >= 80 
                          ? 'bg-green-100 text-green-800'
                          : rtom.performanceScore >= 60 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {rtom.performanceScore}% Score
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-600">Customers</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{rtom.totalTokens}</p>
                    </div>
                    
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-600">Wait Time</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{rtom.avgWaitTime}m</p>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-600">Service Time</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{rtom.avgServiceTime}m</p>
                    </div>
                    
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-gray-600">Satisfaction</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{rtom.customerSatisfaction}%</p>
                    </div>
                  </div>

                  {/* Teleshop Managers */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">Teleshop Managers</h4>
                      <span className="text-xs text-gray-500">
                        {rtom.activeManagers}/{rtom.totalManagers} active
                      </span>
                    </div>
                    
                    {rtom.teleshopManagers.length > 0 ? (
                      <div className="space-y-2">
                        {rtom.teleshopManagers.slice(0, 3).map((manager) => (
                          <div key={manager.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{manager.name}</p>
                              <p className="text-xs text-gray-500">{manager.tokensHandled} tokens</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs font-medium">{manager.avgRating.toFixed(1)}</span>
                            </div>
                          </div>
                        ))}
                        {rtom.teleshopManagers.length > 3 && (
                          <p className="text-xs text-gray-400 text-center">
                            +{rtom.teleshopManagers.length - 3} more managers
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-2">No managers assigned yet</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No Data State */}
          {rtomPerformances.length === 0 && (
            <div className="bg-white p-12 rounded-lg shadow text-center">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No RTOM Data Available</h3>
              <p className="text-gray-500">No RTOMs assigned or no performance data for the selected period.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default RTOMPerformanceDashboard