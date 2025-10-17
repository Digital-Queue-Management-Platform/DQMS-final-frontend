import React, { useState, useEffect } from 'react';
import MetricCard from '../adminComponents/dashboardComponents/MetricCard';
import {BranchComparisonChart} from '../adminComponents/dashboardComponents/BranchComparisonChart';
import WaitingTimeChart from '../adminComponents/dashboardComponents/WaitingTimeChart';
import { BranchTable } from '../adminComponents/dashboardComponents/BranchTable';
import SriLankaMap from '../adminComponents/dashboardComponents/SriLankaMap';
import SystemHealthStatus from '../adminComponents/dashboardComponents/SystemHealthStatus';
import BranchDashboardPage from './BranchDashboardPage';
import { UsersIcon, ClockIcon, StarIcon, Ticket, BellIcon, RefreshCwIcon, DownloadIcon, Eye, ArrowLeft } from 'lucide-react';
import api, { WS_URL } from '../../config/api'

interface BranchData {
  id: number;
  name: string;
  customersServed: number;
  avgWaitingTime: number;
  avgServiceTime: number;
  rating: number;
  trend: 'up' | 'down';
}

interface WaitingTimeData {
  day: string;
  Colombo: number;
  Kandy: number;
  Galle: number;
  Jaffna: number;
}


const DashboardPage: React.FC = () => {
  // Real data states (populated from API)
  const [branchData, setBranchData] = useState<BranchData[]>([])
  const [waitingTimeData, setWaitingTimeData] = useState<WaitingTimeData[]>([])
  
  // derived metrics (safely computed from branchData)
  const totalCustomers: number = branchData.reduce((sum, branch) => sum + (branch.customersServed || 0), 0);
  const avgWaitingTime: string = branchData.length > 0 ? (branchData.reduce((sum, branch) => sum + (branch.avgWaitingTime || 0), 0) / branchData.length).toFixed(1) : '0.0';
  const avgRating: string = branchData.length > 0 ? (branchData.reduce((sum, branch) => sum + (branch.rating || 0), 0) / branchData.length).toFixed(1) : '0.0';
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showBranchDashboard, setShowBranchDashboard] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(3); // Example count

  // Admin data states
  // removed unused selectedOutlet and analytics state
  const [realtimeStats, setRealtimeStats] = useState<any | null>(null)
  // removed unused loading state
  const [outlets, setOutlets] = useState<any[]>([])

  useEffect(() => {
    fetchOutlets()
    fetchRealtimeStats()

    const interval = setInterval(fetchRealtimeStats, 30000)

    const ws = new WebSocket(WS_URL)
    ws.onmessage = (event) => {
      try {
        JSON.parse(event.data)
        // ignore specific data types, just refresh stats
      } catch (e) {
        // ignore
      }
      fetchRealtimeStats()
    }

    return () => {
      clearInterval(interval)
      try { ws.close() } catch (e) {}
    }
  }, [])

  // Date/time update effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Update every second

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Date/time formatting functions
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleBranchDashboardToggle = (): void => {
    setShowBranchDashboard(!showBranchDashboard);
  };

  const fetchOutlets = async () => {
    try {
      const res = await api.get('/queue/outlets')
      setOutlets(res.data)
      // populate branch-level metrics once outlets are loaded
      buildBranchMetrics(res.data)
    } catch (err) {
      console.error('Failed to fetch outlets', err)
    }
  }

  // Build branch-level aggregated metrics by calling admin analytics per outlet
  const buildBranchMetrics = async (availableOutlets?: any[]) => {
    const outs = availableOutlets || outlets
    if (!outs || outs.length === 0) return

    // use today's full day range by default
    const start = new Date()
    start.setHours(0,0,0,0)
    const end = new Date()
    end.setHours(23,59,59,999)

    try {
      const metrics = await Promise.all(
        outs.map(async (o: any) => {
          try {
            const res = await api.get('/admin/analytics', {
              params: { outletId: o.id, startDate: start.toISOString(), endDate: end.toISOString() }
            })
            const a = res.data || {}
            const feedbackStats = a.feedbackStats || []
            const totalFeedback = feedbackStats.reduce((s: number, f: any) => s + (f._count || 0), 0)
            const avgRating = totalFeedback > 0 ? feedbackStats.reduce((s: number, f: any) => s + (f.rating * (f._count || 0)), 0) / totalFeedback : 0

            return {
              id: o.id,
              name: o.name,
              customersServed: a.totalTokens || 0,
              avgWaitingTime: a.avgWaitTime || 0,
              avgServiceTime: a.avgServiceTime || 0,
              rating: Math.round((avgRating || 0) * 10) / 10,
              trend: (a.avgWaitTime || 0) > 15 ? 'up' : 'down'
            }
          } catch (e) {
            console.error('Failed to fetch analytics for outlet', o.id, e)
            return {
              id: o.id,
              name: o.name,
              customersServed: 0,
              avgWaitingTime: 0,
              avgServiceTime: 0,
              rating: 0,
              trend: 'down'
            }
          }
        })
      )

  setBranchData(metrics as BranchData[])

      // build waiting time series for top 4 outlets (or first 4)
      buildWaitingTimeSeries(metrics)
    } catch (err) {
      console.error('Failed to build branch metrics', err)
    }
  }

  // Build last-7-days waiting time per branch for the chart
  const buildWaitingTimeSeries = async (metrics: any[]) => {
    if (!metrics || metrics.length === 0) return

    // pick up to 4 outlets; prefer common names if present
    const preferred = ['Colombo', 'Kandy', 'Galle', 'Jaffna']
    const names: string[] = []
    for (const p of preferred) {
      const m = metrics.find((x: any) => x.name.includes(p))
      if (m) names.push(m.name)
    }
    // fill with first metrics if we still have fewer than 4
    for (const m of metrics) {
      if (names.length >= 4) break
      if (!names.includes(m.name)) names.push(m.name)
    }

    const days: WaitingTimeData[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString(undefined, { weekday: 'short' })
      const dayStart = new Date(d)
      dayStart.setHours(0,0,0,0)
      const dayEnd = new Date(d)
      dayEnd.setHours(23,59,59,999)

      const point: any = { day: label }

      // fetch average wait per chosen outlet for that day
      await Promise.all(names.map(async (name) => {
        const outlet = metrics.find((m: any) => m.name === name)
        if (!outlet) {
          point[name] = 0
          return
        }
        try {
          const res = await api.get('/admin/analytics', { params: { outletId: outlet.id, startDate: dayStart.toISOString(), endDate: dayEnd.toISOString() } })
          point[name] = res.data.avgWaitTime || 0
        } catch (e) {
          console.error('Failed to fetch daily analytics for', name, e)
          point[name] = 0
        }
      }))

      // ensure all chosen names exist as keys
      for (const n of names) if (point[n] === undefined) point[n] = 0

      days.push(point as WaitingTimeData)
    }

    setWaitingTimeData(days)
  }

  // fetchAnalytics removed (not needed)

  const fetchRealtimeStats = async () => {
    try {
      const res = await api.get('/admin/dashboard/realtime')
      setRealtimeStats(res.data)
    } catch (err) {
      console.error('Failed to fetch realtime stats', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {showBranchDashboard ? 'Branch Dashboard' : 'Admin Dashboard'}
              </h1>
              <p className="text-sm text-gray-500">
                {formatDate(currentDateTime)} | {formatTime(currentDateTime)}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative flex items-center justify-center p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <BellIcon className="w-5 h-5 text-gray-600" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="p-3 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">High Wait Time Alert</p>
                            <p className="text-xs text-gray-600">Colombo HQ - Average wait time exceeds 15 minutes</p>
                            <p className="text-xs text-gray-400 mt-1">5 minutes ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">System Update</p>
                            <p className="text-xs text-gray-600">New features available in queue management</p>
                            <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Daily Report Ready</p>
                            <p className="text-xs text-gray-600">Your daily analytics report is now available</p>
                            <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-t border-gray-200">
                      <button
                        onClick={() => setUnreadNotifications(0)}
                        className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        Mark all as read
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {showBranchDashboard ? (
                <button 
                  className="flex items-center px-4 py-2 bg-gray-900 border border-gray-300 rounded-md text-md font-medium text-white hover:text-black hover:bg-gray-50"
                  onClick={handleBranchDashboardToggle}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Admin Dashboard
                </button>
              ) : (
                <button 
                  className="flex items-center px-4 py-2 bg-black border border-gray-300 rounded-md text-md font-medium text-white hover:text-black hover:bg-gray-50"
                  onClick={handleBranchDashboardToggle}
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Location wise Dashboard
                </button>
              )}
              <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export
              </button>
              <button className="flex items-center px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700">
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Branch dashboard panel (shown when toggled) */}
          <div className={`${showBranchDashboard ? 'block' : 'hidden'} flex-1 overflow-y-auto transition-all duration-300`}>
            <BranchDashboardPage outlets={outlets} />
          </div>

          {/* Main admin content (hidden when branch dashboard is shown) */}
          <div className={`${showBranchDashboard ? 'hidden' : 'block'} flex-1 overflow-y-auto transition-all duration-300`}>
                          {/* filters removed per request */}

                  {/* Main content area */}
                
                    {/* Metrics row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <MetricCard title="Total Customers Served Today" value={totalCustomers.toString()} icon={<UsersIcon className="h-7 w-7 text-blue-500" />} detail={branchData.length >= 3 ? `${branchData[0].name}: ${branchData[0].customersServed}, ${branchData[1].name}: ${branchData[1].customersServed}, ${branchData[2].name}: ${branchData[2].customersServed}` : undefined} />
                    <MetricCard title="Average Waiting Time" value={`${avgWaitingTime} min`} icon={<ClockIcon className="h-7 w-7 text-blue-500" />} trend={Number(avgWaitingTime) < 15 ? 'down' : 'up'} trendLabel={Number(avgWaitingTime) < 15 ? 'Better than target' : 'Above target'} />
                    <MetricCard title="Customer Satisfaction Rating" value={avgRating} icon={<StarIcon className="h-7 w-7 text-blue-500" />} trend={Number(avgRating) > 4.0 ? 'up' : 'down'} trendLabel={Number(avgRating) > 4.0 ? 'Above average' : 'Below average'} />
                    <MetricCard title="Currently Active Queues" value={realtimeStats ? String(realtimeStats.activeTokens) : '0'} icon={<Ticket className="h-7 w-7 text-green-500"/>} trend={Number(avgRating) > 4.0 ? 'up' : 'down'} trendLabel={Number(avgRating) > 4.0 ? 'Above average' : 'Below average'}/>
                  </div>
                  
                  {/* Charts section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                      <h3 className="text-lg font-medium mb-4">
                        Customer Volume by Branch
                      </h3>
                      <BranchComparisonChart data={branchData} />
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                      <h3 className="text-lg font-medium mb-4">
                        Waiting Time Trends (Last 7 Days)
                      </h3>
                      <WaitingTimeChart data={waitingTimeData} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="p-2 rounded-lg shadow mb-6">
                      <SystemHealthStatus/>
                    </div>
                  </div>
                  
                  {/* Map section */}
                  <div className="bg-white p-4 rounded-lg shadow mb-6">
                    <h3 className="text-lg font-medium mb-4">
                      Branch Locations & Performance
                    </h3>
                    <div className="h-135">
                      <SriLankaMap branchData={branchData} />
                    </div> 
                  </div>

                  {/* Table section */}
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-medium mb-4">
                      Branch Performance Details
                    </h3>
                      <BranchTable 
                        data={branchData} 
                        currentPage={currentPage} 
                        setCurrentPage={setCurrentPage} 
                        sortColumn={sortColumn} 
                        setSortColumn={setSortColumn} 
                        sortDirection={sortDirection} 
                        setSortDirection={setSortDirection} 
                      />
                  </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;