import { useEffect, useMemo, useState } from 'react'
import api from '../../config/api'
import { Activity, ChevronDown, ChevronRight, MapPin, Phone, Search, UserCircle2 } from 'lucide-react'

interface Officer {
  id: string
  name: string
  mobileNumber: string
  status?: string
  outlet?: { id: string; name: string; location?: string; regionId?: string }
  languages?: string[] | any
}

interface Region {
  id: string
  name: string
}

export default function AdminAllOfficers() {
  const [officers, setOfficers] = useState<Officer[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const [officersRes, regionsRes] = await Promise.all([
          api.get('/admin/officers'),
          api.get('/queue/regions'),
        ])
        if (!mounted) return
        setOfficers(officersRes.data || [])
        setRegions(regionsRes.data || [])
      } catch (e) {
        console.error('Failed to fetch officers/regions', e)
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return officers.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.mobileNumber.includes(search) ||
      (o.outlet?.name?.toLowerCase() || '').includes(q) ||
      (o.outlet?.location?.toLowerCase() || '').includes(q)
    )
  }, [officers, search])

  const UNASSIGNED_ID = '__unassigned__'

  const grouped = useMemo(() => {
    const map = new Map<string, Officer[]>()
    for (const o of filtered) {
      const rId = o.outlet?.regionId || UNASSIGNED_ID
      if (!map.has(rId)) map.set(rId, [])
      map.get(rId)!.push(o)
    }
    return map
  }, [filtered])

  const regionName = (id: string) =>
    id === UNASSIGNED_ID ? 'No Region / Unassigned' : (regions.find(r => r.id === id)?.name || 'Unknown Region')

  const toggleRegion = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const statusBadge = (s?: string) => {
    const label = s === 'serving' || s === 'available' ? 'Online' : s === 'on_break' ? 'At Break' : 'Offline'
    const color = s === 'serving' || s === 'available' ? 'text-emerald-700 bg-emerald-100' : s === 'on_break' ? 'text-amber-700 bg-amber-100' : 'text-slate-700 bg-slate-200'
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>{label}</span>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCircle2 className="w-7 h-7 text-slate-800" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">All Officers</h1>
              <p className="text-slate-600 text-sm">Across all branches with current status</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, outlet, or location"
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading officers…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No officers found</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {/* Render known regions in alphabetical order */}
              {[...regions.map(r => r.id), ...(grouped.has(UNASSIGNED_ID) ? [UNASSIGNED_ID] : [])]
                .filter(id => grouped.has(id))
                .map((regionId) => {
                  const officersInRegion = grouped.get(regionId) || []
                  const isCollapsed = search ? false : !!collapsed[regionId]
                  return (
                    <div key={regionId} className="">
                      <button
                        type="button"
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                        onClick={() => toggleRegion(regionId)}
                      >
                        <div className="flex items-center gap-2 text-left">
                          {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                          <span className="font-semibold text-slate-900">{regionName(regionId)}</span>
                          <span className="text-xs text-slate-500">({officersInRegion.length})</span>
                        </div>
                      </button>

                      {!isCollapsed && (
                        <div className="">
                          <div className="border-t border-slate-200 px-4 py-2 text-xs uppercase tracking-wide text-slate-500 grid grid-cols-12 bg-slate-50/50">
                            <div className="col-span-4">Officer</div>
                            <div className="col-span-2">Mobile</div>
                            <div className="col-span-4">Outlet</div>
                            <div className="col-span-2 text-right">Status</div>
                          </div>
                          <ul className="divide-y divide-slate-200">
                            {officersInRegion.map((o) => (
                              <li key={o.id} className="px-4 py-3 grid grid-cols-12 items-center hover:bg-slate-50">
                                <div className="col-span-4 flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-semibold">
                                    {o.name?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div className="truncate">
                                    <div className="font-medium text-slate-900 truncate">{o.name}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 truncate"><Activity className="w-3.5 h-3.5" /> ID: {o.id.slice(0,8)}…</div>
                                    {Array.isArray(o.languages) && o.languages.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        {o.languages.map((c: string) => (
                                          <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-full border border-slate-200">
                                            {c === 'en' ? 'EN' : c === 'si' ? 'SI' : c === 'ta' ? 'TA' : (c || '').toUpperCase()}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="col-span-2 text-slate-700 flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {o.mobileNumber}</div>
                                <div className="col-span-4 text-slate-700 truncate flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  <span className="truncate">{o.outlet?.name || '—'}</span>
                                </div>
                                <div className="col-span-2 text-right">{statusBadge(o.status)}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
