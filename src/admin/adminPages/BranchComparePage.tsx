import React, { useEffect, useMemo, useState } from 'react'
import api from '../../config/api'
import SearchableSelect from '../../components/SearchableSelect'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Scale3D } from 'lucide-react'

type TimeRange = 'daily' | 'weekly'
type MetricKey =
  | 'tokens'
  | 'demand'
  | 'avgWaitTime'
  | 'avgServiceTime'
  | 'avgRating'
  | 'feedbackCount'
  | 'positiveFeedbackRate'
  | 'waitToServiceRatio'

interface OutletOption { _id: string; name: string }

interface Point { label: string; a?: number; b?: number }

const metrics: { key: MetricKey; label: string }[] = [
  { key: 'tokens', label: 'Token count' },
  { key: 'demand', label: 'Customer demand (tokens)' },
  { key: 'avgWaitTime', label: 'Average waiting time (min)' },
  { key: 'avgServiceTime', label: 'Average handling time (min)' },
  { key: 'avgRating', label: 'Average rating (1-5)' },
  { key: 'feedbackCount', label: 'Feedback count' },
  { key: 'positiveFeedbackRate', label: 'Positive feedback rate (%)' },
  { key: 'waitToServiceRatio', label: 'Wait-to-service ratio' },
]

const BranchComparePage: React.FC = () => {
  const [outlets, setOutlets] = useState<OutletOption[]>([])
  const [a, setA] = useState<string>('')
  const [b, setB] = useState<string>('')
  const [metric, setMetric] = useState<MetricKey>('tokens')
  const [range, setRange] = useState<TimeRange>('daily')
  const [data, setData] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadOutlets = async () => {
      try {
        const res = await api.get('/queue/outlets')
        const opts: OutletOption[] = (res.data || []).map((o: any) => ({ _id: o.id, name: o.name }))
        setOutlets(opts)
      } catch (e) {
        console.error('Failed to load outlets', e)
      }
    }
    loadOutlets()
  }, [])

  const aName = useMemo(() => outlets.find((o) => o._id === a)?.name || 'Branch A', [a, outlets])
  const bName = useMemo(() => outlets.find((o) => o._id === b)?.name || 'Branch B', [b, outlets])

  const computeMetric = (key: MetricKey, analytics: any): number => {
    if (!analytics) return 0
    if (key === 'tokens' || key === 'demand') return analytics.totalTokens || 0
    if (key === 'avgWaitTime') return analytics.avgWaitTime || 0
    if (key === 'avgServiceTime') return analytics.avgServiceTime || 0
    if (key === 'avgRating') {
      const fb = analytics.feedbackStats || []
      const total = fb.reduce((s: number, f: any) => s + (f._count || 0), 0)
      const avg = total > 0 ? fb.reduce((s: number, f: any) => s + (f.rating * (f._count || 0)), 0) / total : 0
      return Math.round((avg || 0) * 100) / 100
    }
    if (key === 'feedbackCount') {
      const fb = analytics.feedbackStats || []
      return fb.reduce((s: number, f: any) => s + (f._count || 0), 0)
    }
    if (key === 'positiveFeedbackRate') {
      const fb = analytics.feedbackStats || []
      const total = fb.reduce((s: number, f: any) => s + (f._count || 0), 0)
      const positive = fb.filter((f: any) => (f.rating || 0) >= 4).reduce((s: number, f: any) => s + (f._count || 0), 0)
      return total > 0 ? Math.round((positive / total) * 1000) / 10 : 0 // percentage with 1 decimal
    }
    if (key === 'waitToServiceRatio') {
      const w = analytics.avgWaitTime || 0
      const s = analytics.avgServiceTime || 0
      return s > 0 ? Math.round((w / s) * 100) / 100 : 0
    }
    return 0
  }

  useEffect(() => {
    const build = async () => {
      if (!a && !b) { setData([]); return }
      setLoading(true)
      try {
        const merged: Record<string, Point> = {}

        const fetchSeries = async (outletId: string, key: 'a' | 'b') => {
          if (!outletId) return
          if (range === 'daily') {
            const day = new Date(); const start = new Date(day); start.setHours(0,0,0,0); const end = new Date(day); end.setHours(23,59,59,999)
            for (let h = 8; h <= 17; h++) {
              const s = new Date(start); s.setHours(h,0,0,0)
              const e = new Date(start); e.setHours(h,59,59,999)
              try {
                const r = await api.get('/admin/analytics', { params: { outletId, startDate: s.toISOString(), endDate: e.toISOString() } })
                const label = `${h.toString().padStart(2,'0')}:00`
                if (!merged[label]) merged[label] = { label }
                merged[label][key] = computeMetric(metric, r.data)
              } catch (err) {
                const label = `${h.toString().padStart(2,'0')}:00`
                if (!merged[label]) merged[label] = { label }
                merged[label][key] = 0
              }
            }
          } else {
            // last 7 days
            for (let i = 6; i >= 0; i--) {
              const d = new Date(); d.setDate(d.getDate() - i)
              const label = d.toLocaleDateString(undefined, { weekday: 'short' })
              const s = new Date(d); s.setHours(0,0,0,0)
              const e = new Date(d); e.setHours(23,59,59,999)
              try {
                const r = await api.get('/admin/analytics', { params: { outletId, startDate: s.toISOString(), endDate: e.toISOString() } })
                if (!merged[label]) merged[label] = { label }
                merged[label][key] = computeMetric(metric, r.data)
              } catch (err) {
                if (!merged[label]) merged[label] = { label }
                merged[label][key] = 0
              }
            }
          }
        }

        await Promise.all([fetchSeries(a, 'a'), fetchSeries(b, 'b')])
        const rows = Object.values(merged).sort((x, y) => x.label.localeCompare(y.label))
        setData(rows)
      } finally {
        setLoading(false)
      }
    }
    build()
  }, [a, b, metric, range])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 lg:p-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Scale3D className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Compare Branches</h1>
                <p className="text-gray-600 text-sm hidden sm:block">Analyze and compare performance metrics between branches</p>
            </div>
        </div>

      {/* Controls Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Branch A</label>
            <SearchableSelect
              options={outlets}
              value={a}
              onChange={setA}
              placeholder="Select branch A"
              displayKey={(o) => o.name}
              searchKeys={["name"]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Branch B</label>
            <SearchableSelect
              options={outlets}
              value={b}
              onChange={setB}
              placeholder="Select branch B"
              displayKey={(o) => o.name}
              searchKeys={["name"]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricKey)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            >
              {metrics.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <div className="grid grid-cols-2 gap-2">
              {(['daily','weekly'] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all duration-200 ${
                    range === r 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <span className="hidden sm:inline">{r === 'daily' ? 'Today (hourly)' : 'Last 7 days'}</span>
                  <span className="sm:hidden">{r === 'daily' ? 'Today' : '7 days'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {metrics.find(m=>m.key===metric)?.label}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Comparing {aName} vs {bName}
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading data...</span>
            </div>
          )}
        </div>
        
        <div className="h-64 sm:h-80 lg:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
                axisLine={{ stroke: '#d1d5db' }}
                interval={window.innerWidth < 640 ? 'preserveStartEnd' : 0}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                  padding: '12px'
                }}
                labelStyle={{ color: '#374151', fontWeight: 'semibold' }}
              />
              <Legend 
                wrapperStyle={{ 
                  fontSize: '14px',
                  paddingTop: '20px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="a" 
                name={aName} 
                stroke="#3B82F6" 
                strokeWidth={2} 
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: 'white' }}
              />
              <Line 
                type="monotone" 
                dataKey="b" 
                name={bName} 
                stroke="#10B981" 
                strokeWidth={2} 
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        {data.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="font-semibold text-gray-900">{aName}</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {data.reduce((sum, point) => sum + (point.a || 0), 0) / data.filter(p => p.a !== undefined).length || 0}
                </div>
                <div className="text-sm text-gray-600">Average {metrics.find(m=>m.key===metric)?.label.toLowerCase()}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="font-semibold text-gray-900">{bName}</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {data.reduce((sum, point) => sum + (point.b || 0), 0) / data.filter(p => p.b !== undefined).length || 0}
                </div>
                <div className="text-sm text-gray-600">Average {metrics.find(m=>m.key===metric)?.label.toLowerCase()}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BranchComparePage
