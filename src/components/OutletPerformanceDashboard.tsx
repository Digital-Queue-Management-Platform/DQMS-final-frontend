import React, { useState, useEffect } from 'react'
import api from '../config/api'
import { AlertCircle, Users, Clock, Star, TrendingUp, Building2, Target, Award, Activity } from 'lucide-react'

interface OutletPerformance {
  outletId: string
  outletName: string
  regionName: string
  provinceName: string
  rtomName?: string
  totalTokens: number
  avgWaitTime: number
  avgServiceTime: number
  customerSatisfaction: number
  totalFeedback: number
  activeOfficers: number
  totalOfficers: number
  performanceScore: number
  officers: {
    id: string
    name: string
    tokensHandled: number
    avgRating: number
    feedbackCount: number
  }[]
  hoursOfOperation?: string
  lastActivity?: string
  // New detailed analytics
  hourlyWaitingTimes: { hour: string; waitTime: number; tokenCount: number }[]
  serviceTypes: { name: string; count: number; percentage: number }[]
  tokenTrend: { 
    hour: string; 
    issued: number; 
    completed: number; 
    dropOffs: number 
  }[]
  feedbackDistribution: { rating: number; count: number; percentage: number }[]
  staffUtilization: { hour: string; activeCounters: number; demand: number }[]
  completionRate: number
  noShowRate: number
  peakHours: string[]
  alerts: { type: string; message: string; severity: 'low' | 'medium' | 'high' }[]
}

interface OutletPerformanceDashboardProps {
  timeframe: string
  setTimeframe: (tf: string) => void
  provinces: { id: string; name: string; dgm?: { name: string; id: string } }[]
}

const OutletPerformanceDashboard: React.FC<OutletPerformanceDashboardProps> = ({ 
  timeframe,
  setTimeframe,
  provinces
}) => {
  const [outletPerformances, setOutletPerformances] = useState<OutletPerformance[]>([])
  const [selectedProvince, setSelectedProvince] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const gmToken = localStorage.getItem("gmToken")

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

  // Generate mock detailed analytics data
  const generateDetailedAnalytics = (basicData: any) => {
    // Generate hourly waiting times (8 AM to 6 PM)
    const hourlyWaitingTimes = []
    for (let hour = 8; hour <= 18; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`
      const baseWait = basicData.avgWaitTime || 0
      const variation = Math.random() * 10 - 5 // ±5 minutes variation
      const waitTime = Math.max(0, Math.round(baseWait + variation))
      const tokenCount = Math.floor(Math.random() * 20) + 5
      
      hourlyWaitingTimes.push({
        hour: timeStr,
        waitTime,
        tokenCount
      })
    }

    // Generate service types
    const serviceTypes = [
      { name: 'Bill Payment', count: Math.floor(Math.random() * 50) + 10, percentage: 0 },
      { name: 'New Connection', count: Math.floor(Math.random() * 30) + 5, percentage: 0 },
      { name: 'Technical Support', count: Math.floor(Math.random() * 40) + 8, percentage: 0 },
      { name: 'Account Inquiry', count: Math.floor(Math.random() * 25) + 3, percentage: 0 },
      { name: 'Service Upgrade', count: Math.floor(Math.random() * 20) + 2, percentage: 0 }
    ]
    const totalServices = serviceTypes.reduce((sum, s) => sum + s.count, 0)
    serviceTypes.forEach(s => s.percentage = Math.round((s.count / totalServices) * 100))

    // Generate token trend
    const tokenTrend = []
    for (let hour = 8; hour <= 18; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`
      const issued = Math.floor(Math.random() * 25) + 5
      const completed = Math.floor(issued * (0.8 + Math.random() * 0.15))
      const dropOffs = issued - completed
      
      tokenTrend.push({
        hour: timeStr,
        issued,
        completed,
        dropOffs
      })
    }

    // Generate feedback distribution
    const feedbackDistribution = []
    const totalFeedback = basicData.totalFeedback || 50
    for (let rating = 1; rating <= 5; rating++) {
      let count = 0
      if (rating === 5) count = Math.floor(totalFeedback * 0.4)
      else if (rating === 4) count = Math.floor(totalFeedback * 0.3)
      else if (rating === 3) count = Math.floor(totalFeedback * 0.2)
      else if (rating === 2) count = Math.floor(totalFeedback * 0.07)
      else count = Math.floor(totalFeedback * 0.03)
      
      feedbackDistribution.push({
        rating,
        count,
        percentage: totalFeedback > 0 ? Math.round((count / totalFeedback) * 100) : 0
      })
    }

    // Generate staff utilization
    const staffUtilization = []
    for (let hour = 8; hour <= 18; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`
      const activeCounters = Math.floor(Math.random() * 4) + 2
      const demand = Math.floor(Math.random() * 6) + 3
      
      staffUtilization.push({
        hour: timeStr,
        activeCounters,
        demand
      })
    }

    // Calculate rates
    const totalIssued = tokenTrend.reduce((sum, t) => sum + t.issued, 0)
    const totalCompleted = tokenTrend.reduce((sum, t) => sum + t.completed, 0)
    const totalDropOffs = tokenTrend.reduce((sum, t) => sum + t.dropOffs, 0)
    
    const completionRate = totalIssued > 0 ? Math.round((totalCompleted / totalIssued) * 100) : 100
    const noShowRate = totalIssued > 0 ? Math.round((totalDropOffs / totalIssued) * 100) : 0

    // Generate alerts
    const alerts = []
    if (basicData.avgWaitTime > 20) {
      alerts.push({ type: 'wait_time', message: 'High waiting times detected', severity: 'high' as const })
    }
    if (noShowRate > 15) {
      alerts.push({ type: 'no_show', message: 'High no-show rate', severity: 'medium' as const })
    }
    if (basicData.customerSatisfaction < 60) {
      alerts.push({ type: 'satisfaction', message: 'Low customer satisfaction', severity: 'high' as const })
    }

    return {
      ...basicData,
      hourlyWaitingTimes,
      serviceTypes,
      tokenTrend,
      feedbackDistribution,
      staffUtilization,
      completionRate,
      noShowRate,
      peakHours: ['10:00', '14:00', '16:00'],
      alerts
    }
  }

  // Fetch outlet performance data with detailed analytics
  useEffect(() => {
    const fetchOutletPerformance = async () => {
      setLoading(true)
      setError("")
      
      try {
        const { startDate: start, endDate: end } = getDateRange()
        
        // First, get all outlets in GM's provinces
        let allOutlets: any[] = []
        
        for (const province of provinces) {
          try {
            // Get analytics for this province to find outlets
            const analyticsRes = await api.get("/gm/analytics", {
              params: { 
                provinceId: province.id,
                startDate: start, 
                endDate: end 
              }
            })
            
            // If we have officer performance, that means we have outlets with data
            if (analyticsRes.data.officerPerformance) {
              const outletIds = [...new Set(analyticsRes.data.officerPerformance.map((officer: any) => officer.officer?.outlet?.id).filter(Boolean))]
              
              for (const outletId of outletIds) {
                try {
                  // Get detailed analytics for each outlet
                  await api.get("/gm/analytics", {
                    params: { 
                      provinceId: province.id,
                      startDate: start, 
                      endDate: end 
                    }
                  })
                  
                  // Find officers for this outlet
                  const outletOfficers = analyticsRes.data.officerPerformance.filter((officer: any) => 
                    officer.officer?.outlet?.id === outletId
                  )
                  
                  if (outletOfficers.length > 0) {
                    const outletName = outletOfficers[0].officer?.outlet?.name || 'Unknown Outlet'
                    const regionName = outletOfficers[0].officer?.outlet?.region?.name || 'Unknown Region'
                    
                    // Aggregate outlet metrics
                    const totalTokens = outletOfficers.reduce((sum: number, officer: any) => sum + (officer.tokensHandled || 0), 0)
                    const totalRating = outletOfficers.reduce((sum: number, officer: any) => sum + ((officer.avgRating || 0) * (officer.feedbackCount || 1)), 0)
                    const totalFeedback = outletOfficers.reduce((sum: number, officer: any) => sum + (officer.feedbackCount || 0), 0)
                    const avgRating = totalFeedback > 0 ? totalRating / totalFeedback : 0
                    const customerSatisfaction = Math.round(avgRating * 20) // Convert to percentage
                    
                    // Use overall analytics for wait/service times
                    const avgWaitTime = Math.round(analyticsRes.data.avgWaitTime || 0)
                    const avgServiceTime = Math.round(analyticsRes.data.avgServiceTime || 0)
                    
                    // Calculate performance score (0-100)
                    const performanceScore = Math.round((
                      (totalTokens > 0 ? 25 : 0) + // Activity score
                      (avgWaitTime < 15 ? 25 : Math.max(0, 25 - avgWaitTime)) + // Wait time score
                      (customerSatisfaction > 80 ? 25 : customerSatisfaction * 0.3125) + // Satisfaction score
                      (outletOfficers.length > 0 ? 25 : 0) // Staffing score
                    ))
                    
                    // Prepare officer performance
                    const officers = outletOfficers.map((officer: any) => ({
                      id: officer.officer?.id || '',
                      name: officer.officer?.name || 'Unknown Officer',
                      tokensHandled: officer.tokensHandled || 0,
                      avgRating: officer.avgRating || 0,
                      feedbackCount: officer.feedbackCount || 0
                    }))
                    
                    const basicOutletData = {
                      outletId,
                      outletName,
                      regionName,
                      provinceName: province.name,
                      rtomName: 'N/A', // We don't have RTOM info in GM analytics
                      totalTokens,
                      avgWaitTime,
                      avgServiceTime,
                      customerSatisfaction,
                      totalFeedback,
                      activeOfficers: officers.length,
                      totalOfficers: officers.length,
                      performanceScore,
                      officers,
                      lastActivity: totalTokens > 0 ? 'Recently Active' : 'No Recent Activity'
                    }
                    
                    // Generate detailed analytics
                    const detailedOutletData = generateDetailedAnalytics(basicOutletData)
                    allOutlets.push(detailedOutletData)
                  }
                } catch (outletErr) {
                  console.warn(`Failed to fetch analytics for outlet ${outletId}:`, outletErr)
                }
              }
            }
          } catch (provinceErr) {
            console.warn(`Failed to fetch analytics for province ${province.id}:`, provinceErr)
          }
        }
        
        // Filter by selected province if not 'all'
        if (selectedProvince !== 'all') {
          allOutlets = allOutlets.filter(outlet => 
            outlet.provinceName === provinces.find(p => p.id === selectedProvince)?.name
          )
        }
        
        // Sort by performance score
        allOutlets.sort((a, b) => b.performanceScore - a.performanceScore)
        setOutletPerformances(allOutlets)
        
      } catch (err: any) {
        setError("Failed to load outlet performance data")
        console.error("Outlet performance error:", err)
      } finally {
        setLoading(false)
      }
    }
    
    if (gmToken && provinces.length > 0) {
      fetchOutletPerformance()
    }
  }, [gmToken, timeframe, startDate, endDate, useCustomRange, selectedProvince, provinces])

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
    totalOutlets: outletPerformances.length,
    avgPerformanceScore: outletPerformances.length > 0 
      ? Math.round(outletPerformances.reduce((sum, o) => sum + o.performanceScore, 0) / outletPerformances.length)
      : 0,
    totalTokensHandled: outletPerformances.reduce((sum, o) => sum + o.totalTokens, 0),
    highPerformers: outletPerformances.filter(o => o.performanceScore >= 80).length,
    totalAlerts: outletPerformances.reduce((sum, o) => sum + o.alerts.length, 0),
    avgCompletionRate: outletPerformances.length > 0 
      ? Math.round(outletPerformances.reduce((sum, o) => sum + o.completionRate, 0) / outletPerformances.length)
      : 0
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Outlet Performance Dashboard</h2>
            <p className="text-sm text-gray-500">Monitor and analyze performance of outlets across your regions</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Province Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Province Filter</label>
              <select 
                value={selectedProvince} 
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Provinces</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
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
              <p className="text-sm font-medium text-gray-600">Total Outlets</p>
              <p className="text-3xl font-bold text-gray-900">{summaryMetrics.totalOutlets}</p>
              <p className="text-xs text-gray-500 mt-1">In your regions</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
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
            <div className="text-gray-500">Loading outlet performance data...</div>
          </div>
        </div>
      ) : error ? (
        <div className="p-6 bg-white rounded-lg shadow flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      ) : (
        <>
          {/* Outlet Performance Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {outletPerformances.map((outlet) => (
              <div key={outlet.outletId} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                {/* Outlet Header */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-green-50 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Building2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{outlet.outletName}</h3>
                        <p className="text-sm text-gray-600">{outlet.provinceName} • {outlet.regionName}</p>
                        <p className="text-xs text-gray-500">{outlet.lastActivity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        outlet.performanceScore >= 80 
                          ? 'bg-green-100 text-green-800'
                          : outlet.performanceScore >= 60 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {outlet.performanceScore}% Score
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
                      <p className="text-2xl font-bold text-gray-900">{outlet.totalTokens}</p>
                    </div>
                    
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-600">Wait Time</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{outlet.avgWaitTime}m</p>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-600">Service Time</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{outlet.avgServiceTime}m</p>
                    </div>
                    
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-gray-600">Satisfaction</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{outlet.customerSatisfaction}%</p>
                    </div>
                  </div>

                  {/* Officers */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">Customer Service Officers</h4>
                      <span className="text-xs text-gray-500">
                        {outlet.activeOfficers}/{outlet.totalOfficers} active
                      </span>
                    </div>
                    
                    {outlet.officers.length > 0 ? (
                      <div className="space-y-2">
                        {outlet.officers.slice(0, 3).map((officer) => (
                          <div key={officer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{officer.name}</p>
                              <p className="text-xs text-gray-500">{officer.tokensHandled} tokens</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs font-medium">{officer.avgRating.toFixed(1)}</span>
                            </div>
                          </div>
                        ))}
                        {outlet.officers.length > 3 && (
                          <p className="text-xs text-gray-400 text-center">
                            +{outlet.officers.length - 3} more officers
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-2">No officers assigned yet</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No Data State */}
          {outletPerformances.length === 0 && (
            <div className="bg-white p-12 rounded-lg shadow text-center">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Outlet Data Available</h3>
              <p className="text-gray-500">No outlets found or no performance data for the selected period and province.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default OutletPerformanceDashboard