"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, Star, Users, Building2, TrendingUp, TrendingDown } from "lucide-react"
// ManagerTopBar is provided globally from Layout for manager routes
import api, { WS_URL } from "../config/api"

interface BranchData {
  id: string;
  name: string;
  customersServed: number;
  avgWaitingTime: number;
  avgServiceTime: number;
  rating: number;
  trend: 'up' | 'down';
  activeOfficers: number;
  totalWaiting: number;
}

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const [branchData, setBranchData] = useState<BranchData[]>([])
  const [loading, setLoading] = useState(true)
  const [regionStats, setRegionStats] = useState({
    totalCustomersServed: 0,
    avgRegionalWaitTime: 0,
    avgRegionalRating: 0,
    totalActiveBranches: 0,
    totalActiveOfficers: 0,
    totalCustomersWaiting: 0
  })

  useEffect(() => {
    // Manager authentication is handled globally by Layout
    fetchRegionalData()

    // WebSocket for real-time updates
    const ws = new WebSocket(WS_URL)
    ws.onmessage = () => {
      fetchRegionalData()
    }

    const interval = setInterval(fetchRegionalData, 30000) // Refresh every 30 seconds

    return () => {
      clearInterval(interval)
      try { ws.close() } catch (e) {}
    }
  }, [navigate])

  const fetchRegionalData = async () => {
    try {
  // Fetch only this manager's region outlets
  const storedManager = localStorage.getItem('manager')
  const managerData = storedManager ? JSON.parse(storedManager) : null
  const params: any = {}
  if (managerData?.email) params.email = managerData.email
  
  const meRes = await api.get('/manager/me', { params })
  const outlets = (meRes.data?.manager?.outlets || [])

      const branchMetrics = await Promise.all(
        outlets.map(async (outlet: any) => {
          try {
            // Get queue data for each branch
            const queueRes = await api.get(`/queue/outlet/${outlet.id}`)
            const queueData = queueRes.data || {}

            // Get today's analytics
            const start = new Date()
            start.setHours(0,0,0,0)
            const end = new Date()
            end.setHours(23,59,59,999)

            const analyticsRes = await api.get('/admin/analytics', {
              params: { 
                outletId: outlet.id, 
                startDate: start.toISOString(), 
                endDate: end.toISOString() 
              }
            })
            const analytics = analyticsRes.data || {}

            const feedbackStats = analytics.feedbackStats || []
            const totalFeedback = feedbackStats.reduce((s: number, f: any) => s + (f._count || 0), 0)
            const avgRating = totalFeedback > 0 ? 
              feedbackStats.reduce((s: number, f: any) => s + (f.rating * (f._count || 0)), 0) / totalFeedback : 0

            return {
              id: outlet.id,
              name: outlet.name,
              customersServed: analytics.totalTokens || 0,
              avgWaitingTime: analytics.avgWaitTime || 0,
              avgServiceTime: analytics.avgServiceTime || 0,
              rating: Math.round((avgRating || 0) * 10) / 10,
              trend: (analytics.avgWaitTime || 0) > 15 ? 'up' : 'down',
              activeOfficers: queueData.availableOfficers || 0,
              totalWaiting: queueData.totalWaiting || 0
            } as BranchData
          } catch (e) {
            console.error(`Failed to fetch data for outlet ${outlet.id}`, e)
            return {
              id: outlet.id,
              name: outlet.name,
              customersServed: 0,
              avgWaitingTime: 0,
              avgServiceTime: 0,  
              rating: 0,
              trend: 'down',
              activeOfficers: 0,
              totalWaiting: 0
            } as BranchData
          }
        })
      )

      setBranchData(branchMetrics)

      // Calculate regional aggregates
      const totalServed = branchMetrics.reduce((sum, branch) => sum + branch.customersServed, 0)
      const avgWaitTime = branchMetrics.length > 0 ? 
        branchMetrics.reduce((sum, branch) => sum + branch.avgWaitingTime, 0) / branchMetrics.length : 0
      const avgRating = branchMetrics.length > 0 ? 
        branchMetrics.reduce((sum, branch) => sum + branch.rating, 0) / branchMetrics.length : 0
      const totalActiveOfficers = branchMetrics.reduce((sum, branch) => sum + branch.activeOfficers, 0)
      const totalWaiting = branchMetrics.reduce((sum, branch) => sum + branch.totalWaiting, 0)
      const activeBranches = branchMetrics.filter(branch => branch.activeOfficers > 0).length

      setRegionStats({
        totalCustomersServed: totalServed,
        avgRegionalWaitTime: Math.round(avgWaitTime * 10) / 10,
        avgRegionalRating: Math.round(avgRating * 10) / 10,
        totalActiveBranches: activeBranches,
        totalActiveOfficers: totalActiveOfficers,
        totalCustomersWaiting: totalWaiting
      })

    } catch (error) {
      console.error('Failed to fetch regional data:', error)
    } finally {
      setLoading(false)
    }
  }

  // handleLogout moved to ManagerTopBar

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading regional dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Regional Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Customers Served Today</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{regionStats.totalCustomersServed}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Avg Regional Wait</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{regionStats.avgRegionalWaitTime}m</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Regional Rating</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{regionStats.avgRegionalRating}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Branches</p>
                <p className="text-3xl font-bold text-gray-900">{regionStats.totalActiveBranches}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Officers</p>
                <p className="text-3xl font-bold text-gray-900">{regionStats.totalActiveOfficers}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Currently Waiting</p>
                <p className="text-3xl font-bold text-gray-900">{regionStats.totalCustomersWaiting}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Branch Performance Table */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Branch Performance</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Served Today
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Wait Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Officers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waiting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {branchData.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{branch.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {branch.customersServed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {branch.avgWaitingTime}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-gray-900">{branch.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {branch.activeOfficers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {branch.totalWaiting}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {branch.trend === 'up' ? (
                        <TrendingUp className="w-5 h-5 text-red-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-green-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
