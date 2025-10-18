"use client"

import { useState, useEffect } from "react"
import { Clock, Coffee, Users, AlertTriangle, TrendingUp, Calendar } from "lucide-react"
import api from "../config/api"

type BreakAnalytics = {
  timeframe: string
  startDate: string
  endDate: string
  regionStats: {
    totalOfficers: number
    officersOnBreak: number
    totalBreaksToday: number
    totalBreakMinutes: number
    avgBreakDuration: number
  }
  outlets: {
    outletId: string
    outletName: string
    outletLocation: string
    officers: {
      officerId: string
      officerName: string
      counterNumber: number
      status: string
      totalBreaks: number
      totalMinutes: number
      avgBreakDuration: number
      activeBreak: {
        id: string
        startedAt: string
        durationMinutes: number
      } | null
      recentBreaks: Array<{
        id: string
        startedAt: string
        endedAt: string | null
        durationMinutes: number
      }>
    }[]
  }[]
}

export default function ManagerBreakOversight() {
  const [analytics, setAnalytics] = useState<BreakAnalytics | null>(null)
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today')
  const [loading, setLoading] = useState(true)
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all')
  const [forceEndLoading, setForceEndLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchBreakAnalytics()
  }, [timeframe])

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBreakAnalytics, 30000)
    return () => clearInterval(interval)
  }, [timeframe])

  const fetchBreakAnalytics = async () => {
    try {
      const manager = JSON.parse(localStorage.getItem('dq_manager') || '{}')
      if (!manager.regionId) {
        throw new Error("Manager region not found")
      }

      const response = await api.get(`/manager/analytics/breaks/${manager.regionId}?timeframe=${timeframe}`)
      setAnalytics(response.data)
    } catch (error) {
      console.error("Failed to fetch break analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleForceEndBreak = async (breakId: string, officerName: string) => {
    if (!confirm(`Are you sure you want to end ${officerName}'s break? They will be notified.`)) {
      return
    }

    setForceEndLoading(breakId)
    try {
      await api.post(`/manager/breaks/end/${breakId}`, {
        reason: "Ended by manager due to operational needs"
      })
      await fetchBreakAnalytics() // Refresh data
      alert(`${officerName}'s break has been ended successfully.`)
    } catch (error: any) {
      console.error("Failed to end break:", error)
      alert(error.response?.data?.error || "Failed to end break")
    } finally {
      setForceEndLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-700 bg-green-100'
      case 'serving': return 'text-blue-700 bg-blue-100'
      case 'on_break': return 'text-yellow-700 bg-yellow-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const filteredOutlets = selectedOutlet === 'all' 
    ? analytics?.outlets || []
    : analytics?.outlets.filter(outlet => outlet.outletId === selectedOutlet) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading break analytics...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">Failed to load break analytics</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Break Oversight</h1>
            <p className="text-gray-600">Monitor and manage officer breaks across all outlets</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Timeframe Filter */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            {/* Outlet Filter */}
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              <option value="all">All Outlets</option>
              {analytics.outlets.map(outlet => (
                <option key={outlet.outletId} value={outlet.outletId}>
                  {outlet.outletName}
                </option>
              ))}
            </select>

            <button
              onClick={fetchBreakAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Officers</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.regionStats.totalOfficers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Currently on Break</p>
                <p className="text-2xl font-bold text-yellow-600">{analytics.regionStats.officersOnBreak}</p>
              </div>
              <Coffee className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Breaks</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.regionStats.totalBreaksToday}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Break Time</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(analytics.regionStats.totalBreakMinutes)}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Break Duration</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(analytics.regionStats.avgBreakDuration)}</p>
              </div>
              <Calendar className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Outlets and Officers */}
        <div className="space-y-6">
          {filteredOutlets.map(outlet => (
            <div key={outlet.outletId} className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{outlet.outletName}</h2>
                <p className="text-sm text-gray-600">{outlet.outletLocation}</p>
              </div>
              
              <div className="p-6">
                {outlet.officers.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No officers assigned to this outlet</p>
                ) : (
                  <div className="grid gap-4">
                    {outlet.officers.map(officer => (
                      <div key={officer.officerId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {officer.counterNumber || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{officer.officerName}</h3>
                              <p className="text-sm text-gray-500">Counter {officer.counterNumber || 'Not assigned'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(officer.status)}`}>
                              {officer.status.replace('_', ' ').toUpperCase()}
                            </span>
                            
                            {officer.activeBreak && (
                              <button
                                onClick={() => handleForceEndBreak(officer.activeBreak!.id, officer.officerName)}
                                disabled={forceEndLoading === officer.activeBreak.id}
                                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                              >
                                {forceEndLoading === officer.activeBreak.id ? 'Ending...' : 'End Break'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Breaks Today</p>
                            <p className="font-medium">{officer.totalBreaks}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total Time</p>
                            <p className="font-medium">{formatDuration(officer.totalMinutes)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Avg Duration</p>
                            <p className="font-medium">{formatDuration(officer.avgBreakDuration)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Current Break</p>
                            <p className="font-medium">
                              {officer.activeBreak 
                                ? formatDuration(officer.activeBreak.durationMinutes)
                                : 'None'
                              }
                            </p>
                          </div>
                        </div>

                        {officer.activeBreak && officer.activeBreak.durationMinutes > 30 && (
                          <div className="mt-3 flex items-center space-x-2 text-amber-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">Extended break - {formatDuration(officer.activeBreak.durationMinutes)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}