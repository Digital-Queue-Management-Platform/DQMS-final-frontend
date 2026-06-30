import React, { useState, useEffect } from 'react'
import { AlertCircle, Users, Clock, Star, TrendingUp, Building2, Target, Award, Activity, Eye, Bell, BarChart3 } from 'lucide-react'

interface OutletAnalytics {
  outletId: string
  outletName: string
  regionName: string
  provinceName: string
  totalTokens: number
  avgWaitTime: number
  avgServiceTime: number
  customerSatisfaction: number
  totalFeedback: number
  activeOfficers: number
  performanceScore: number
  officers: any[]
  // Detailed analytics
  hourlyWaitTimes: { hour: string; waitTime: number }[]
  serviceTypes: { name: string; count: number; percentage: number }[]
  tokenTrend: { hour: string; issued: number; completed: number; dropOffs: number }[]
  feedbackDistribution: { rating: number; count: number; percentage: number }[]
  staffUtilization: { hour: string; activeCounters: number; demand: number }[]
  completionRate: number
  noShowRate: number
  alerts: { type: string; message: string; severity: string }[]
}

interface DetailedOutletAnalyticsProps {
  timeframe: string
  provinces: { id: string; name: string; dgm?: { name: string; id: string } }[]
}

const DetailedOutletAnalytics: React.FC<DetailedOutletAnalyticsProps> = ({ 
  timeframe, 
  provinces 
}) => {
  const [outlets, setOutlets] = useState<OutletAnalytics[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null)
  const [selectedProvince] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Generate mock detailed analytics for an outlet
  const generateMockAnalytics = (outlet: any): OutletAnalytics => {
    // Generate hourly wait times (8 AM to 6 PM)
    const hourlyWaitTimes = []
    for (let hour = 8; hour <= 18; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`
      const baseWait = outlet.avgWaitTime || 0
      const variation = Math.random() * 10 - 5
      const waitTime = Math.max(0, Math.round(baseWait + variation))
      hourlyWaitTimes.push({ hour: timeStr, waitTime })
    }

    // Generate service types
    const serviceTypes = [
      { name: 'Bill Payment', count: Math.floor(Math.random() * 50) + 10, percentage: 0 },
      { name: 'New Connection', count: Math.floor(Math.random() * 30) + 5, percentage: 0 },
      { name: 'Technical Support', count: Math.floor(Math.random() * 40) + 8, percentage: 0 },
      { name: 'Account Inquiry', count: Math.floor(Math.random() * 25) + 3, percentage: 0 }
    ]
    const total = serviceTypes.reduce((sum, s) => sum + s.count, 0)
    serviceTypes.forEach(s => s.percentage = Math.round((s.count / total) * 100))

    // Generate token trend
    const tokenTrend = []
    for (let hour = 8; hour <= 18; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`
      const issued = Math.floor(Math.random() * 25) + 5
      const completed = Math.floor(issued * (0.8 + Math.random() * 0.15))
      const dropOffs = issued - completed
      tokenTrend.push({ hour: timeStr, issued, completed, dropOffs })
    }

    // Generate feedback distribution
    const feedbackDistribution = []
    const totalFeedback = outlet.totalFeedback || 50
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
      staffUtilization.push({ hour: timeStr, activeCounters, demand })
    }

    // Calculate rates
    const totalIssued = tokenTrend.reduce((sum, t) => sum + t.issued, 0)
    const totalCompleted = tokenTrend.reduce((sum, t) => sum + t.completed, 0)
    const totalDropOffs = tokenTrend.reduce((sum, t) => sum + t.dropOffs, 0)
    
    const completionRate = totalIssued > 0 ? Math.round((totalCompleted / totalIssued) * 100) : 100
    const noShowRate = totalIssued > 0 ? Math.round((totalDropOffs / totalIssued) * 100) : 0

    // Generate alerts
    const alerts = []
    if (outlet.avgWaitTime > 20) {
      alerts.push({ type: 'wait_time', message: 'High waiting times detected', severity: 'high' })
    }
    if (noShowRate > 15) {
      alerts.push({ type: 'no_show', message: 'High no-show rate', severity: 'medium' })
    }
    if (outlet.customerSatisfaction < 60) {
      alerts.push({ type: 'satisfaction', message: 'Low customer satisfaction', severity: 'high' })
    }

    return {
      ...outlet,
      hourlyWaitTimes,
      serviceTypes,
      tokenTrend,
      feedbackDistribution,
      staffUtilization,
      completionRate,
      noShowRate,
      alerts
    }
  }

  // Fetch outlets and generate mock analytics
  useEffect(() => {
    const fetchOutlets = async () => {
      setLoading(true)
      setError('')
      
      try {
        // Use the existing outlet performance dashboard logic but add mock analytics
        const mockOutlets: OutletAnalytics[] = [
          {
            outletId: '1',
            outletName: 'Sri Lanka Telecom Kotte',
            regionName: 'Western',
            provinceName: 'Metro 01',
            totalTokens: 245,
            avgWaitTime: 12,
            avgServiceTime: 8,
            customerSatisfaction: 85,
            totalFeedback: 67,
            activeOfficers: 4,
            performanceScore: 88,
            hourlyWaitTimes: [
              { hour: '9:00', waitTime: 8 },
              { hour: '10:00', waitTime: 12 },
              { hour: '11:00', waitTime: 15 },
              { hour: '12:00', waitTime: 18 },
              { hour: '13:00', waitTime: 14 },
              { hour: '14:00', waitTime: 10 }
            ],
            serviceTypes: [
              { name: 'Bill Payment', count: 89, percentage: 36 },
              { name: 'New Connection', count: 67, percentage: 27 },
              { name: 'Technical Support', count: 52, percentage: 21 },
              { name: 'Other', count: 37, percentage: 16 }
            ],
            tokenTrend: [
              { hour: '9:00', issued: 15, completed: 14, dropOffs: 1 },
              { hour: '10:00', issued: 22, completed: 20, dropOffs: 2 },
              { hour: '11:00', issued: 28, completed: 25, dropOffs: 3 }
            ],
            feedbackDistribution: [
              { rating: 1, count: 2, percentage: 3 },
              { rating: 2, count: 4, percentage: 6 },
              { rating: 3, count: 12, percentage: 18 },
              { rating: 4, count: 25, percentage: 37 },
              { rating: 5, count: 24, percentage: 36 }
            ],
            staffUtilization: [
              { hour: '9:00', activeCounters: 3, demand: 15 },
              { hour: '10:00', activeCounters: 4, demand: 22 },
              { hour: '11:00', activeCounters: 4, demand: 28 }
            ],
            completionRate: 87,
            noShowRate: 8,
            alerts: [
              { type: 'warning', message: 'High wait times in morning hours', severity: 'medium' }
            ],
            officers: [
              { id: '1', name: 'Priyanka Silva', tokensHandled: 45, avgRating: 4.2, feedbackCount: 23 },
              { id: '2', name: 'Kasun Perera', tokensHandled: 52, avgRating: 4.5, feedbackCount: 28 },
              { id: '3', name: 'Nimali Fernando', tokensHandled: 38, avgRating: 4.1, feedbackCount: 16 }
            ]
          },
          {
            outletId: '2',
            outletName: 'Sri Lanka Telecom Colombo',
            regionName: 'Western',
            provinceName: 'Metro 01', 
            totalTokens: 312,
            avgWaitTime: 18,
            avgServiceTime: 11,
            customerSatisfaction: 78,
            totalFeedback: 89,
            activeOfficers: 6,
            performanceScore: 75,
            hourlyWaitTimes: [
              { hour: '9:00', waitTime: 12 },
              { hour: '10:00', waitTime: 18 },
              { hour: '11:00', waitTime: 22 },
              { hour: '12:00', waitTime: 25 },
              { hour: '13:00', waitTime: 20 },
              { hour: '14:00', waitTime: 16 }
            ],
            serviceTypes: [
              { name: 'Bill Payment', count: 112, percentage: 36 },
              { name: 'New Connection', count: 87, percentage: 28 },
              { name: 'Technical Support', count: 65, percentage: 21 },
              { name: 'Other', count: 48, percentage: 15 }
            ],
            tokenTrend: [
              { hour: '9:00', issued: 18, completed: 16, dropOffs: 2 },
              { hour: '10:00', issued: 25, completed: 22, dropOffs: 3 },
              { hour: '11:00', issued: 32, completed: 28, dropOffs: 4 }
            ],
            feedbackDistribution: [
              { rating: 1, count: 5, percentage: 6 },
              { rating: 2, count: 8, percentage: 9 },
              { rating: 3, count: 18, percentage: 20 },
              { rating: 4, count: 32, percentage: 36 },
              { rating: 5, count: 26, percentage: 29 }
            ],
            staffUtilization: [
              { hour: '9:00', activeCounters: 4, demand: 18 },
              { hour: '10:00', activeCounters: 5, demand: 25 },
              { hour: '11:00', activeCounters: 6, demand: 32 }
            ],
            completionRate: 82,
            noShowRate: 12,
            alerts: [
              { type: 'high', message: 'Customer complaints increasing', severity: 'high' }
            ],
            officers: [
              { id: '4', name: 'Ruwan Jayasinghe', tokensHandled: 67, avgRating: 3.9, feedbackCount: 34 },
              { id: '5', name: 'Sanduni Wickramasinghe', tokensHandled: 71, avgRating: 4.0, feedbackCount: 28 }
            ]
          }
        ]

        // Generate detailed analytics for each outlet
        const outletsWithAnalytics = mockOutlets.map(generateMockAnalytics)
        setOutlets(outletsWithAnalytics)

      } catch (err: any) {
        setError('Failed to load outlet data')
        console.error('Outlet fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOutlets()
  }, [provinces, timeframe, selectedProvince])

  const selectedOutletData = selectedOutlet ? outlets.find(o => o.outletId === selectedOutlet) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-500">Loading detailed analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow flex items-center gap-3 text-red-600">
        <AlertCircle className="w-5 h-5 shrink-0" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Outlets</p>
              <p className="text-3xl font-bold text-gray-900">{outlets.length}</p>
              <p className="text-xs text-gray-500 mt-1">In your regions</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Performance</p>
              <p className="text-3xl font-bold text-gray-900">
                {outlets.length > 0 ? Math.round(outlets.reduce((sum, o) => sum + o.performanceScore, 0) / outlets.length) : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Overall score</p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tokens Handled</p>
              <p className="text-3xl font-bold text-gray-900">{outlets.reduce((sum, o) => sum + o.totalTokens, 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Total processed</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Performers</p>
              <p className="text-3xl font-bold text-gray-900">{outlets.filter(o => o.performanceScore >= 80).length}</p>
              <p className="text-xs text-gray-500 mt-1">Score ≥ 80%</p>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {outlets.length > 0 ? Math.round(outlets.reduce((sum, o) => sum + o.completionRate, 0) / outlets.length) : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Average</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-3xl font-bold text-gray-900">{outlets.reduce((sum, o) => sum + o.alerts.length, 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Requires attention</p>
            </div>
            <Bell className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Outlet Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Outlet for Detailed Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {outlets.map((outlet) => (
            <button
              key={outlet.outletId}
              onClick={() => setSelectedOutlet(outlet.outletId === selectedOutlet ? null : outlet.outletId)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedOutlet === outlet.outletId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{outlet.outletName}</h4>
                  <p className="text-sm text-gray-600">{outlet.provinceName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      outlet.performanceScore >= 80 
                        ? 'bg-green-100 text-green-800'
                        : outlet.performanceScore >= 60 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {outlet.performanceScore}% Score
                    </span>
                    {outlet.alerts.length > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        {outlet.alerts.length} Alert{outlet.alerts.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <Eye className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Analytics for Selected Outlet */}
      {selectedOutletData && (
        <div className="space-y-6">
          {/* Outlet Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedOutletData.outletName}</h2>
                <p className="text-blue-100">{selectedOutletData.provinceName} • {selectedOutletData.regionName}</p>
                <p className="text-blue-200 text-sm mt-1">Analytics for {timeframe.toLowerCase()}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{selectedOutletData.performanceScore}%</div>
                <div className="text-blue-200 text-sm">Performance Score</div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{selectedOutletData.totalTokens}</div>
              <div className="text-sm text-gray-600">Total Customers Served</div>
              <div className="text-xs text-green-600 mt-1">+5.2%</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow text-center">
              <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{selectedOutletData.avgWaitTime} min</div>
              <div className="text-sm text-gray-600">Average Waiting Time</div>
              <div className="text-xs text-green-600 mt-1">-2.3%</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow text-center">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{selectedOutletData.avgServiceTime} min</div>
              <div className="text-sm text-gray-600">Average Service Time</div>
              <div className="text-xs text-green-600 mt-1">-1.1%</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow text-center">
              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{(selectedOutletData.customerSatisfaction / 20).toFixed(1)}/5</div>
              <div className="text-sm text-gray-600">Customer Satisfaction</div>
              <div className="text-xs text-green-600 mt-1">+0.3</div>
            </div>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Waiting Times Throughout the Day */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Waiting Times Throughout the Day
              </h4>
              <div className="space-y-3">
                {selectedOutletData.hourlyWaitTimes.map((hour, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 w-16">{hour.hour}</span>
                    <div className="flex-1 mx-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (hour.waitTime / 30) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">{hour.waitTime} min</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Services Availed */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                Services Availed
              </h4>
              <div className="space-y-3">
                {selectedOutletData.serviceTypes.map((service, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${service.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">{service.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Drop-off Trend */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Token Drop-off Trend</h4>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Issued</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Drop-offs</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {selectedOutletData.tokenTrend.map((trend, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-12">{trend.hour}</span>
                    <div className="flex-1 flex gap-1">
                      <div 
                        className="bg-blue-500 h-4 rounded"
                        style={{ width: `${Math.max(2, (trend.issued / 30) * 100)}%` }}
                        title={`Issued: ${trend.issued}`}
                      ></div>
                      <div 
                        className="bg-green-500 h-4 rounded"
                        style={{ width: `${Math.max(2, (trend.completed / 30) * 100)}%` }}
                        title={`Completed: ${trend.completed}`}
                      ></div>
                      <div 
                        className="bg-red-500 h-4 rounded"
                        style={{ width: `${Math.max(1, (trend.dropOffs / 30) * 100)}%` }}
                        title={`Drop-offs: ${trend.dropOffs}`}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <div>Total no-shows: {selectedOutletData.tokenTrend.reduce((sum, t) => sum + t.dropOffs, 0)} customers ({selectedOutletData.noShowRate}% of issued tokens)</div>
                <div>Completion rate: {selectedOutletData.completionRate}%</div>
              </div>
            </div>

            {/* Customer Rating Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Customer Rating Distribution
              </h4>
              <div className="space-y-3">
                {selectedOutletData.feedbackDistribution.reverse().map((rating) => (
                  <div key={rating.rating} className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium w-4">{rating.rating}</span>
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${rating.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">
                      {rating.count} ({rating.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent Performance */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Agent Performance</h4>
              <button className="text-blue-600 text-sm hover:text-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Officer</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Tokens Handled</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Avg Rating</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Feedback Count</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOutletData.officers.map((officer) => (
                    <tr key={officer.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{officer.name}</td>
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

          {/* Branch Alerts */}
          {selectedOutletData.alerts.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-red-500" />
                <h4 className="text-lg font-semibold text-gray-900">Branch Alerts</h4>
              </div>
              <div className="space-y-3">
                {selectedOutletData.alerts.map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'high' 
                      ? 'bg-red-50 border-red-500 text-red-800'
                      : alert.severity === 'medium'
                      ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                      : 'bg-blue-50 border-blue-500 text-blue-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{alert.message}</span>
                      <span className="text-xs uppercase tracking-wide">
                        {alert.severity} Priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Outlet Selected */}
      {!selectedOutlet && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Outlet</h3>
          <p className="text-gray-500">Choose an outlet above to view detailed analytics with charts and trends.</p>
        </div>
      )}
    </div>
  )
}

export default DetailedOutletAnalytics