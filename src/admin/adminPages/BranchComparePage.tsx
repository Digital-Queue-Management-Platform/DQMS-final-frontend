import React, { useEffect, useMemo, useState } from 'react'
import api from '../../config/api'
import SearchableSelect from '../../components/SearchableSelect'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Package, Scale3D } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <Scale3D className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Compare Branches</h1>
                <p className="text-gray-600 text-sm">Compare 2 branches</p>
            </div>
        </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Branch A</label>
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
          <label className="block text-sm text-gray-600 mb-2">Branch B</label>
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
          <label className="block text-sm text-gray-600 mb-2">Metric</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
            className="w-full px-3 py-2 border rounded-xl"
          >
            {metrics.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Time range</label>
          <div className="flex gap-2">
            {(['daily','weekly'] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-2 rounded-lg border ${range===r?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700'}`}
              >
                {r === 'daily' ? 'Today (hourly)' : 'Last 7 days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-gray-700 font-medium">{metrics.find(m=>m.key===metric)?.label}</div>
          <div className="text-sm text-gray-500">{aName} vs {bName}</div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="a" name={aName} stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="b" name={bName} stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {loading && <div className="text-sm text-gray-500 mt-3">Loading...</div>}
      </div>
    </div>
  )
}

export default BranchComparePage
