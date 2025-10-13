import React, { useState, useEffect } from 'react';
import Header from '../adminComponents/dashboardComponents/header';
import MetricCard from '../adminComponents/dashboardComponents/MetricCard';
import {BranchComparisonChart} from '../adminComponents/dashboardComponents/BranchComparisonChart';
import WaitingTimeChart from '../adminComponents/dashboardComponents/WaitingTimeChart';
import { BranchTable } from '../adminComponents/dashboardComponents/BranchTable';
import { AlertsPanel } from '../adminComponents/dashboardComponents/AlertsPanel';
import SriLankaMap from '../adminComponents/dashboardComponents/SriLankaMap';
import SystemHealthStatus from '../adminComponents/dashboardComponents/SystemHealthStatus';
import BranchDashboardPage from './BranchDashboardPage';
import { UsersIcon, ClockIcon, StarIcon, Ticket, AlertOctagon, ChevronRightIcon, ChevronLeftIcon, BellIcon } from 'lucide-react';
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
  const [alertsPanelOpen, setAlertsPanelOpen] = useState<boolean>(false);
  const [showBranchDashboard, setShowBranchDashboard] = useState<boolean>(false);

  // Admin data states
  // removed unused selectedOutlet and analytics state
  const [realtimeStats, setRealtimeStats] = useState<any | null>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertFilter, _setAlertFilter] = useState({ type: '', severity: '', outletId: '', importantOnly: false })
  // removed unused loading state
  const [outlets, setOutlets] = useState<any[]>([])

  useEffect(() => {
    fetchOutlets()
    fetchRealtimeStats()
    fetchAlerts()

    const interval = setInterval(fetchRealtimeStats, 30000)

    const ws = new WebSocket(WS_URL)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'NEGATIVE_FEEDBACK' || data.type === 'LONG_WAIT') {
          fetchAlerts()
        }
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

  const fetchAlerts = async () => {
    try {
      const params: any = { isRead: false, importantOnly: true }
      if (alertFilter.type) params.type = alertFilter.type
      if (alertFilter.severity) params.severity = alertFilter.severity
      if (alertFilter.outletId) params.outletId = alertFilter.outletId
      const res = await api.get('/admin/alerts', { params })
      const all = res.data || []
      // Exclude feedback-related alerts; keep only operational/critical
      const filtered = all.filter((a: any) => {
        const t = String(a.type || '').toLowerCase()
        const msg = String(a.message || '').toLowerCase()
        // remove any alert explicitly about feedback
        if (t.includes('feedback') || msg.includes('feedback')) return false
        return true
      })
      setAlerts(filtered)
    } catch (err) {
      console.error('Failed to fetch alerts', err)
    }
  }

  // marking alerts handled in panel interactions (not implemented here)
  return (
    <div className="flex flex-col h-screen">
      <Header 
        showBranchDashboard={showBranchDashboard} 
        setShowBranchDashboard={setShowBranchDashboard} 
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Branch dashboard panel (shown when toggled) */}
        <div className={`${showBranchDashboard ? 'block' : 'hidden'} flex-1 overflow-y-auto p-6 transition-all duration-300`}>
          <BranchDashboardPage outlets={outlets} />
        </div>

        {/* Main admin content (hidden when branch dashboard is shown) */}
        <div className={`${showBranchDashboard ? 'hidden' : 'block'} flex-1 overflow-y-auto p-6 transition-all duration-300 ${alertsPanelOpen ? 'mr-0' : 'mr-0'}`}>
                        {/* filters removed per request */}

                {/* Main content area */}
              
                  {/* Metrics row */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                  <MetricCard title="Total Customers Served Today" value={totalCustomers.toString()} icon={<UsersIcon className="h-7 w-7 text-blue-500" />} detail={branchData.length >= 3 ? `${branchData[0].name}: ${branchData[0].customersServed}, ${branchData[1].name}: ${branchData[1].customersServed}, ${branchData[2].name}: ${branchData[2].customersServed}` : undefined} />
                  <MetricCard title="Average Waiting Time" value={`${avgWaitingTime} min`} icon={<ClockIcon className="h-7 w-7 text-blue-500" />} trend={Number(avgWaitingTime) < 15 ? 'down' : 'up'} trendLabel={Number(avgWaitingTime) < 15 ? 'Better than target' : 'Above target'} />
                  <MetricCard title="Customer Satisfaction Rating" value={avgRating} icon={<StarIcon className="h-7 w-7 text-blue-500" />} trend={Number(avgRating) > 4.0 ? 'up' : 'down'} trendLabel={Number(avgRating) > 4.0 ? 'Above average' : 'Below average'} />
                  <MetricCard title="Currently Active Queues" value={realtimeStats ? String(realtimeStats.activeTokens) : '0'} icon={<Ticket className="h-7 w-7 text-green-500"/>} trend={Number(avgRating) > 4.0 ? 'up' : 'down'} trendLabel={Number(avgRating) > 4.0 ? 'Above average' : 'Below average'}/>
                  <MetricCard title="System Alerts" value={String(alerts.length)} icon={<AlertOctagon className="h-7 w-7 text-red-500"/>}/>
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
        
        
        {/* Right sidebar for alerts */}
        <div className={`hidden lg:flex flex-col bg-white border-l border-gray-200 overflow-hidden transition-all duration-300 ${alertsPanelOpen ? 'w-80' : 'w-12'}`}>
          {/* Toggle button */}
          <div className="flex justify-between items-center py-2 px-2 border-b border-gray-200">
            <button
              onClick={() => setAlertsPanelOpen(!alertsPanelOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={alertsPanelOpen ? 'Collapse alerts panel' : 'Expand alerts panel'}
            >
              {alertsPanelOpen ? (
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              )}
            </button>
            
            {alertsPanelOpen && (
              <div className='flex items-center'>
                <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700">Alerts & Notifications</span>
              </div>
            )}
          </div>
          
          {/* Alerts panel content */}
          {alertsPanelOpen && (
            <div className="flex-1 overflow-y-auto">
              <AlertsPanel alerts={alerts} />
            </div>
          )}
          
          {/* Collapsed state - show alert count */}
          {!alertsPanelOpen && (
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div className="relative">
                <AlertOctagon className="h-6 w-6 text-gray-400" />
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {alerts.length}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;