"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Users, Clock, Star, MousePointer2, Award, Zap, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import api from "../config/api"

interface BranchComparison {
  id: string;
  name: string;
  customersServed: number;
  avgWaitTime: number;
  rating: number;
  efficiency: number;
  dropOffRate: number;
}

export default function ManagerCompare() {
  const navigate = useNavigate()
  const [comparisonData, setComparisonData] = useState<BranchComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'annual'>('today')

  useEffect(() => {
    fetchComparisonData()
  }, [timeRange])

  const fetchComparisonData = async () => {
    try {
      setLoading(true)
      const storedManager = localStorage.getItem('manager')
      const managerData = storedManager ? JSON.parse(storedManager) : null
      const params: any = {}
      if (managerData?.email) params.email = managerData.email
      
      const meRes = await api.get('/manager/me', { params })
      const outlets = (meRes.data?.manager?.outlets || [])

      if (outlets.length === 0) {
        setComparisonData([])
        setLoading(false)
        return
      }

      const end = new Date()
      const start = new Date()
      end.setHours(23, 59, 59, 999)
      
      switch (timeRange) {
        case 'today':
          start.setHours(0,0,0,0)
          break
        case 'week':
          start.setDate(start.getDate() - 7); start.setHours(0,0,0,0)
          break
        case 'month':
          start.setMonth(start.getMonth() - 1); start.setHours(0,0,0,0)
          break
        case 'annual':
          start.setFullYear(start.getFullYear() - 1); start.setHours(0,0,0,0)
          break
      }

      const branchComparisons = await Promise.all(
        outlets.map(async (outlet: any) => {
          try {
            const res = await api.get(`/manager/outlet/${outlet.id}/analytics`, {
              params: { startDate: start.toISOString(), endDate: end.toISOString() }
            })
            const a = res.data || {}

            const fb = a.feedbackStats || []
            const totalFb = fb.reduce((s: number, f: any) => s + (f._count || 0), 0)
            const avgR = totalFb > 0 ? fb.reduce((s: number, f: any) => s + (f.rating * (f._count || 0)), 0) / totalFb : 0

            // Efficiency: (Customers / (AvgWait + AvgService)) * 10
            const totalTime = (a.avgWaitTime || 0) + (a.avgServiceTime || 0)
            const efficiency = totalTime > 0 ? (a.totalTokens / totalTime) : 0
            
            // Drop-off rate
            const dropRate = a.totalTokens > 0 ? ((a.noShows || 0) / a.totalTokens) * 100 : 0

            return {
              id: outlet.id,
              name: outlet.name,
              customersServed: a.totalTokens || 0,
              avgWaitTime: Math.round((a.avgWaitTime || 0) * 10) / 10,
              rating: Math.round(avgR * 10) / 10,
              efficiency: Math.round(efficiency * 10) / 10,
              dropOffRate: Math.round(dropRate * 10) / 10
            } as BranchComparison
          } catch {
            return { id: outlet.id, name: outlet.name, customersServed: 0, avgWaitTime: 0, rating: 0, efficiency: 0, dropOffRate: 0 }
          }
        })
      )

      branchComparisons.sort((a, b) => b.customersServed - a.customersServed)
      setComparisonData(branchComparisons)
    } catch (error) {
      console.error('Failed to fetch comparison data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBestPerformer = (metric: keyof BranchComparison) => {
    if (comparisonData.length === 0) return null
    if (metric === 'avgWaitTime' || metric === 'dropOffRate') {
      return [...comparisonData].sort((a, b) => {
        if (a[metric] === 0) return 1
        if (b[metric] === 0) return -1
        return (a[metric] as number) - (b[metric] as number)
      })[0]
    }
    return [...comparisonData].sort((a, b) => (b[metric] as number) - (a[metric] as number))[0]
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  const bests = {
    served: getBestPerformer('customersServed'),
    wait: getBestPerformer('avgWaitTime'),
    rating: getBestPerformer('rating'),
    efficiency: getBestPerformer('efficiency')
  }

  const chartColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"]

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Regional Branch Comparison</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium uppercase tracking-wider">Metric-based performance ranking for your region</p>
          </div>

          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 self-start md:self-center">
            {(['today', 'week', 'month', 'annual'] as const).map((r) => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${timeRange === r ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {comparisonData.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
            No data available for the selected time range.
          </div>
        ) : (
          <>
            {/* Top Performers Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Most Customers Served", val: `${bests.served?.customersServed || 0} Served`, branch: bests.served?.name, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Shortest Wait Time", val: `${bests.wait?.avgWaitTime || 0}m Avg`, branch: bests.wait?.name, icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Highest Satisfaction", val: `${bests.rating?.rating || 0}/5.0 Rating`, branch: bests.rating?.name, icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
                { label: "Process Efficiency", val: `${bests.efficiency?.efficiency || 0} Score`, branch: bests.efficiency?.name, icon: Award, color: "text-violet-600", bg: "bg-violet-50" },
              ].map((card, i) => (
                <motion.div key={card.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-110 transition-transform ${card.bg}`} />
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg} ${card.color}`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    {i === 0 && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">Leader</span>}
                  </div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">{card.label}</h3>
                  <div className="font-bold text-slate-900 text-lg truncate mb-1">{card.branch}</div>
                  <div className={`text-sm font-bold ${card.color}`}>{card.val}</div>
                </motion.div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" /> Customers Served
                  </h2>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={150}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} hide={comparisonData.length > 5} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="customersServed" radius={[6, 6, 0, 0]} barSize={40}>
                        {comparisonData.map((_, index) => (
                           <Cell key={index} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" /> Wait Time (Minutes)
                  </h2>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={150}>
                    <BarChart data={[...comparisonData].sort((a,b) => a.avgWaitTime - b.avgWaitTime)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} hide={comparisonData.length > 5} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="avgWaitTime" fill="#10B981" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Performance Ranking Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Regional Ranking Table</h2>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Zap className="w-3 h-3 text-amber-500" /> Sorted by Customers Served
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Served</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Wait</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Rating</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Efficiency</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Drop-off</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparisonData.map((branch, idx) => (
                      <tr key={branch.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0 ? "bg-amber-100 text-amber-600" : idx === 1 ? "bg-slate-200 text-slate-600" : "bg-slate-100 text-slate-400"}`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{branch.name}</td>
                        <td className="px-6 py-4 text-center font-semibold text-slate-900">{branch.customersServed}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg font-bold text-xs ${branch.avgWaitTime < 10 ? "text-emerald-600 bg-emerald-50" : branch.avgWaitTime < 20 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"}`}>
                            {branch.avgWaitTime}m
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="font-bold text-slate-800">{branch.rating}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(branch.efficiency * 10, 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{branch.efficiency}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-bold ${branch.dropOffRate > 10 ? "text-red-500" : "text-slate-400"}`}>
                            {branch.dropOffRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => navigate(`/manager/dashboard?branchId=${branch.id}`)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <MousePointer2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}