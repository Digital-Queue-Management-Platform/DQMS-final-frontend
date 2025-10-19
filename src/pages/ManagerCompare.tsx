"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts"
import { TrendingUp, TrendingDown, Users, Clock, Star, Building2 } from "lucide-react"
// ManagerTopBar is provided globally from Layout for manager routes
import api from "../config/api"

interface BranchComparison {
  name: string;
  customersServed: number;
  avgWaitTime: number;
  rating: number;
  efficiency: number;
}

export default function ManagerCompare() {
  const navigate = useNavigate()
  const [comparisonData, setComparisonData] = useState<BranchComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    // Manager authentication is handled globally by Layout
    fetchComparisonData()
  }, [navigate, timeRange])

  const fetchComparisonData = async () => {
    try {
  // Get only outlets in manager's region
  const storedManager = localStorage.getItem('manager')
  const managerData = storedManager ? JSON.parse(storedManager) : null
  const params: any = {}
  if (managerData?.email) params.email = managerData.email
  
  const meRes = await api.get('/manager/me', { params })
  const outlets = (meRes.data?.manager?.outlets || [])

      // Calculate date range based on selection
      const end = new Date()
      const start = new Date()
      
      switch (timeRange) {
        case 'today':
          start.setHours(0,0,0,0)
          end.setHours(23,59,59,999)
          break
        case 'week':
          start.setDate(start.getDate() - 7)
          break
        case 'month':
          start.setDate(start.getDate() - 30)
          break
      }

      const branchComparisons = await Promise.all(
        outlets.map(async (outlet: any) => {
          try {
            const analyticsRes = await api.get(`/manager/outlet/${outlet.id}/analytics`, {
              params: { 
                startDate: start.toISOString(), 
                endDate: end.toISOString() 
              }
            })
            const analytics = analyticsRes.data || {}

            const feedbackStats = analytics.feedbackStats || []
            const totalFeedback = feedbackStats.reduce((s: number, f: any) => s + (f._count || 0), 0)
            const avgRating = totalFeedback > 0 ? 
              feedbackStats.reduce((s: number, f: any) => s + (f.rating * (f._count || 0)), 0) / totalFeedback : 0

            // Calculate efficiency score (customers served per hour / avg wait time)
            const efficiency = analytics.totalTokens && analytics.avgWaitTime ? 
              Math.round((analytics.totalTokens / Math.max(analytics.avgWaitTime, 1)) * 100) / 100 : 0

            return {
              name: outlet.name,
              customersServed: analytics.totalTokens || 0,
              avgWaitTime: Math.round((analytics.avgWaitTime || 0) * 10) / 10,
              rating: Math.round((avgRating || 0) * 10) / 10,
              efficiency: efficiency
            } as BranchComparison
          } catch (e) {
            console.error(`Failed to fetch analytics for outlet ${outlet.id}`, e)
            return {
              name: outlet.name,
              customersServed: 0,
              avgWaitTime: 0,
              rating: 0,
              efficiency: 0
            } as BranchComparison
          }
        })
      )

      // Sort by customers served for better visualization
      branchComparisons.sort((a, b) => b.customersServed - a.customersServed)
      setComparisonData(branchComparisons)
    } catch (error) {
      console.error('Failed to fetch comparison data:', error)
    } finally {
      setLoading(false)
    }
  }

  // handleLogout moved to ManagerTopBar

  const getBestPerformer = (metric: keyof BranchComparison) => {
    if (comparisonData.length === 0) return null
    
    if (metric === 'avgWaitTime') {
      // For wait time, lowest is best
      return comparisonData.reduce((best, current) => 
        current.avgWaitTime < best.avgWaitTime && current.avgWaitTime > 0 ? current : best
      )
    } else {
      // For other metrics, highest is best
      return comparisonData.reduce((best, current) => 
        current[metric] > best[metric] ? current : best
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comparison data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Branch Comparison</h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Time Range Selector */}
          <div className="flex justify-start">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>{/* Existing content continues */}
        </div>
        {/* Top Performers Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Most Customers Served</h3>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            {getBestPerformer('customersServed') && (
              <>
                <p className="text-2xl font-bold text-gray-900">{getBestPerformer('customersServed')?.name}</p>
                <p className="text-sm text-blue-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {getBestPerformer('customersServed')?.customersServed} customers
                </p>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Shortest Wait Time</h3>
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            {getBestPerformer('avgWaitTime') && (
              <>
                <p className="text-2xl font-bold text-gray-900">{getBestPerformer('avgWaitTime')?.name}</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  {getBestPerformer('avgWaitTime')?.avgWaitTime}m average
                </p>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Highest Rating</h3>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            {getBestPerformer('rating') && (
              <>
                <p className="text-2xl font-bold text-gray-900">{getBestPerformer('rating')?.name}</p>
                <p className="text-sm text-yellow-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {getBestPerformer('rating')?.rating}/5.0 rating
                </p>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Most Efficient</h3>
              <Building2 className="w-5 h-5 text-purple-500" />
            </div>
            {getBestPerformer('efficiency') && (
              <>
                <p className="text-2xl font-bold text-gray-900">{getBestPerformer('efficiency')?.name}</p>
                <p className="text-sm text-purple-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {getBestPerformer('efficiency')?.efficiency} efficiency score
                </p>
              </>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Customers Served Comparison */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customers Served</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="customersServed" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Wait Time Comparison */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Wait Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgWaitTime" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating and Efficiency Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rating Comparison */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Ratings</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rating" stroke="#F59E0B" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Efficiency Comparison */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Efficiency Score</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="efficiency" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}