import React, { useState, useEffect } from 'react'
import Header2 from '../adminComponents/branchDashboardComponents/Header2'
import OverviewCards from '../adminComponents/branchDashboardComponents/OverviewCards'
import AnalyticsCharts from '../adminComponents/branchDashboardComponents/AnalyticsCharts'
import AgentPerformance from '../adminComponents/branchDashboardComponents/AgentPerformance'
import api from '../../config/api'
import { AlertsPanel } from '../adminComponents/dashboardComponents/AlertsPanel'
// Removed manager email verification flow

// real data is fetched from API

interface BranchDashboardPageProps {
  outlets?: any[]
}

const BranchDashboardPage: React.FC<BranchDashboardPageProps> = ({ outlets = [] }) => {
  const NOT_SELECTED_LABEL = 'Not selected'
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [branchName, setBranchName] = useState<string>(NOT_SELECTED_LABEL)
  const [hasUserSelectedBranch, setHasUserSelectedBranch] = useState(false)

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
      fetchBranchData(selectedBranchId)
    }
  }, [selectedBranchId, hasUserSelectedBranch])

  const fetchBranchData = async (outletId: string) => {
    try {
      // analytics for today
      const start = new Date()
      start.setHours(0,0,0,0)
      const end = new Date()
      end.setHours(23,59,59,999)

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

      // rating distribution
      const ratingDistribution = (a.feedbackStats || []).map((f: any) => ({ rating: f.rating, count: f._count }))

      // service types and hourly waiting times - now available from backend
      const serviceTypes = a.serviceTypes || []
      const hourlyWaitingTimes = a.hourlyWaitingTimes || []

      setAnalyticsData({ hourlyWaitingTimes, serviceTypes, ratingDistribution })

      // Build token flow for the day by querying analytics per hour (best-effort)
      const hours: any[] = []
      for (let h = 8; h <= 17; h++) {
        const s = new Date(start)
        s.setHours(h,0,0,0)
        const e = new Date(start)
        e.setHours(h,59,59,999)
        try {
          // Reuse admin analytics - it will return completed tokens for that hour
          const r = await api.get('/admin/analytics', { params: { outletId, startDate: s.toISOString(), endDate: e.toISOString() } })
          hours.push({ hour: `${h.toString().padStart(2,'0')}:00`, issued: r.data.totalTokens || 0, completed: r.data.totalTokens || 0 })
        } catch (e) {
          hours.push({ hour: `${h.toString().padStart(2,'0')}:00`, issued: 0, completed: 0 })
        }
      }
      setTokenFlow(hours)

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
          type: (a.severity === 'high' || a.type === 'error') ? 'error' : (a.type === 'warning' ? 'warning' : 'info'),
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
    <div className="px-0">
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
      />

      {selectedBranchId ? (
        <>
          <OverviewCards data={overview} />
          <div className="mt-6">
            <div className="lg:col-span-2">
              <AnalyticsCharts
                data={analyticsData}
                tokenData={tokenFlow}
                outletId={selectedBranchId}
              />
              <AgentPerformance
                agents={agents}
              />
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Branch Alerts</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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