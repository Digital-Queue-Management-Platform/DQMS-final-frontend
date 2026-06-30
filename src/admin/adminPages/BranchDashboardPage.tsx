import React, { useState, useEffect } from 'react'
import Header2 from '../adminComponents/branchDashboardComponents/Header2'
import OverviewCards from '../adminComponents/branchDashboardComponents/OverviewCards'
import AnalyticsCharts from '../adminComponents/branchDashboardComponents/AnalyticsCharts'
import AgentPerformance from '../adminComponents/branchDashboardComponents/AgentPerformance'
import api, { WS_URL } from '../../config/api'
import { AlertsPanel } from '../adminComponents/dashboardComponents/AlertsPanel'

interface BranchDashboardPageProps {
  outlets?: any[]
  initialBranchId?: string | null
  initialBranchName?: string | null
  timeframe: string
  setTimeframe: (tf: string) => void
}

const BranchDashboardPage: React.FC<BranchDashboardPageProps> = ({ 
  outlets = [], 
  initialBranchId = null, 
  initialBranchName = 'Not selected',
  timeframe,
  setTimeframe
}) => {
  const NOT_SELECTED_LABEL = 'Not selected'
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(initialBranchId)
  const [branchName, setBranchName] = useState<string>(initialBranchName || NOT_SELECTED_LABEL)
  const [hasUserSelectedBranch, setHasUserSelectedBranch] = useState(!!initialBranchId)

  const [overview, setOverview] = useState<any>({
    totalCustomers: 0,
    avgWaitingTime: 0,
    avgServiceTime: 0,
    customerSatisfaction: 0,
  })

  const [analyticsData, setAnalyticsData] = useState<any>({
    hourlyWaitingTimes: [],
    serviceTypes: [],
    ratingDistribution: [],
  })

  const [tokenFlow, setTokenFlow] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [branchAlerts, setBranchAlerts] = useState<any[]>([])
  // Verification removed: selecting a branch loads data immediately

  // No auto-selection on load; user must pick a branch explicitly

  useEffect(() => {
    if (!selectedBranchId) return
    if (hasUserSelectedBranch) {
      fetchBranchData(selectedBranchId, timeframe)
      
      // Auto-refresh every 60 seconds for branch analytics
      const interval = setInterval(() => {
        fetchBranchData(selectedBranchId, timeframe)
      }, 60000)

      // WebSocket for real-time updates
      const ws = new WebSocket(WS_URL)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "TOKEN_COMPLETED" || data.type === "NEW_TOKEN" || data.type === "OFFICER_STATUS_CHANGE") {
            fetchBranchData(selectedBranchId)
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error)
        }
      }

      ws.onopen = () => {
        console.log('BranchDashboard WebSocket connected')
      }

      ws.onerror = (error) => {
        console.error('BranchDashboard WebSocket error:', error)
      }

      return () => {
        clearInterval(interval)
        try {
          if (ws) {
            ws.onopen = null
            ws.onmessage = null
            ws.onerror = null
            ws.onclose = null
            if (ws.readyState === WebSocket.OPEN) {
              ws.close()
            }
          }
        } catch (error) {
          console.error('Error closing WebSocket:', error)
        }
      }
    }
  }, [selectedBranchId, hasUserSelectedBranch, timeframe])

  const fetchBranchData = async (outletId: string, currentTf: string = 'Today') => {
    try {
      // Calculate date range based on timeframe
      const start = new Date()
      const end = new Date()
      end.setHours(23, 59, 59, 999)

      switch (currentTf) {
        case 'Today':
          start.setHours(0, 0, 0, 0)
          break
        case 'Weekly':
          start.setDate(start.getDate() - 7)
          start.setHours(0, 0, 0, 0)
          break
        case 'Monthly':
          start.setDate(start.getDate() - 30)
          start.setHours(0, 0, 0, 0)
          break
        case 'Annual':
          start.setDate(start.getDate() - 365)
          start.setHours(0, 0, 0, 0)
          break
        default:
          start.setHours(0, 0, 0, 0)
      }

      const res = await api.get('/admin/analytics', { params: { outletId, startDate: start.toISOString(), endDate: end.toISOString() } })
      const a = res.data || {}

      setOverview({
        totalCustomers: a.totalTokens || 0,
        avgWaitingTime: a.avgWaitTime || 0,
        avgServiceTime: a.avgServiceTime || 0,
        customerSatisfaction: (() => {
          const fb = a.feedbackStats || []
          const total = fb.reduce((s: any, f: any) => s + (f._count || 0), 0)
          const avg = total > 0 ? fb.reduce((s: any, f: any) => s + (f.rating * (f._count || 0)), 0) / total : 0
          return Math.round((avg || 0) * 10) / 10
        })(),
      })

      // rating distribution mapping - backend sends { rating, count }
      const ratingDistribution = (a.feedbackStats || []).map((f: any) => ({ 
        rating: f.rating, 
        count: f.count || f._count || 0 
      }))

      // service types and hourly waiting times - backend sends { hour, value } for waiting times
      const serviceTypes = a.serviceTypes || []
      const hourlyWaitingTimes = (a.hourlyWaitingTimes || []).map((h: any) => ({
        hour: h.hour,
        waitTime: h.value !== undefined ? h.value : (h.waitTime || 0)
      }))
      const staffUtilizationTrend = a.staffUtilizationTrend || []

      setAnalyticsData({ hourlyWaitingTimes, serviceTypes, ratingDistribution, staffUtilizationTrend })

      // Token flow mapping - backend sends { time, issued, completed }
      const tokenFlow = (a.tokenFlow || []).map((t: any) => ({
        hour: t.time || t.hour,
        issued: t.issued || 0,
        completed: t.completed || 0
      }))
      setTokenFlow(tokenFlow)

      // Agents: use officerPerformance from analytics if present
      const agentsData = (a.officerPerformance || []).map((op: any) => ({
        id: op.officer?.id || op.officerId || Math.random().toString(36).slice(2),
        name: op.officer?.name || op.officer?.name || 'Officer',
        status: op.officer?.status || 'active',
        tokensHandled: op.tokensHandled || op._count || 0,
        avgServiceTime: op.avgServiceTime || 0,
        avgRating: op.avgRating || 0,
      }))

      // If no officers present, try to fetch officers by outlet from queue endpoint by inspecting tokens or officers - quick fallback: call /queue/outlet/:outletId to get in-service tokens with officer details
      if (agentsData.length === 0) {
        try {
          const q = await api.get(`/queue/outlet/${outletId}`)
          const inService = q.data.inService || []
          const unique = new Map<string, any>()
          inService.forEach((t: any) => {
            if (t.officer) unique.set(t.officer.id, { id: t.officer.id, name: t.officer.name, status: 'serving', tokensHandled: 0, avgServiceTime: 0, avgRating: 0 })
          })
          setAgents(Array.from(unique.values()))
        } catch (e) {
          setAgents([])
        }
      } else {
        setAgents(agentsData)
      }

      // set branch name from outlets list
      const outlet = outlets.find((o: any) => o.id === outletId)
      if (outlet) setBranchName(outlet.name)

      // Fetch important alerts for this outlet
      try {
        const ar = await api.get('/admin/alerts', { params: { isRead: false, importantOnly: true, outletId } })
        const items = (ar.data || []).map((a: any) => ({
          id: a.id,
          type: a.severity === 'critical' ? 'error' : (a.severity === 'high' ? 'warning' : (a.severity === 'medium' ? 'info' : 'info')),
          branch: outlet?.name || 'Branch',
          message: a.message || a.type || 'Alert',
          time: new Date(a.createdAt || Date.now()).toLocaleString(),
        }))
        setBranchAlerts(items)
      } catch (e) {
        setBranchAlerts([])
      }

    } catch (error) {
      console.error('Failed to fetch branch analytics', error)
    }
  }

  return (
    <div className="">
      {/* Manager verification removed: content loads immediately after branch selection */}
      <Header2
        selectedBranch={branchName}
        setSelectedBranch={(name: string) => {
          setHasUserSelectedBranch(true)
          if (name === NOT_SELECTED_LABEL) {
            // Reset selection state
            setSelectedBranchId(null)
            setBranchName(NOT_SELECTED_LABEL)
            // Optional: clear data panels
            setOverview({
              totalCustomers: 0,
              avgWaitingTime: 0,
              avgServiceTime: 0,
              customerSatisfaction: 0,
            })
            setAnalyticsData({ hourlyWaitingTimes: [], serviceTypes: [], ratingDistribution: [] })
            setTokenFlow([])
            setAgents([])
            return
          }
          // allow selecting by name; find matching outlet id
          const o = outlets.find((x: any) => x.name === name)
          if (o) setSelectedBranchId(o.id)
          setBranchName(name)
        }}
        branchOptions={[NOT_SELECTED_LABEL, ...outlets.map((branch) => branch.name)]}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
      />

      {selectedBranchId ? (
        <>
          <OverviewCards data={overview} />
          <div className="mt-6">
            <div className="lg:col-span-2">
              <AnalyticsCharts
                data={analyticsData}
                tokenData={tokenFlow}
              />
              <AgentPerformance
                agents={agents}
              />
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Branch Alerts</h3>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <AlertsPanel alerts={branchAlerts} />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default BranchDashboardPage