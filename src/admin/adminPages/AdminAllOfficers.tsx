import { useEffect, useMemo, useState } from 'react'
import api from '../../config/api'
import { Activity, Briefcase, Clock3, Filter, Globe2, Languages, MapPin, Phone, RefreshCw, Search, ShieldCheck, UserCircle2, UserRoundCheck } from 'lucide-react'

interface RegionOption {
  id: string
  name: string
}

interface OutletOption {
  id: string
  name: string
  location: string
  regionId: string
  regionName: string
}

interface RoleOption {
  id: string
  label: string
}

interface StaffMember {
  id: string
  name: string
  mobileNumber: string | null
  email: string | null
  roleKey: string
  roleLabel: string
  status: 'online' | 'break' | 'offline'
  statusLabel: string
  statusSource: 'tracked' | 'derived'
  accountState: string
  accountStateLabel: string
  lastLoginAt: string | null
  regionName: string | null
  outletName: string | null
  outletLocation: string | null
  primaryRegionId: string
  primaryRegionName: string
  coverageRegionIds: string[]
  coverageOutletIds: string[]
  scopeLabel: string
  counterNumber: number | null
  breakStartedAt: string | null
  breakDurationMinutes: number
  languages: string[]
  assignedServicesCount: number
  isTraining: boolean
}

interface StaffStatusResponse {
  staff: StaffMember[]
  summary: {
    total: number
    online: number
    onBreak: number
    offline: number
    byRole: Record<string, number>
  }
  filters: {
    regions: RegionOption[]
    outlets: OutletOption[]
    roles: RoleOption[]
  }
  presenceWindowMinutes: number
  generatedAt: string
}

export default function AdminAllOfficers() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [regions, setRegions] = useState<RegionOption[]>([])
  const [outlets, setOutlets] = useState<OutletOption[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'break' | 'offline'>('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [outletFilter, setOutletFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'last_login_desc' | 'status' | 'role' | 'region' | 'outlet'>('name_asc')
  const [presenceWindowMinutes, setPresenceWindowMinutes] = useState(30)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStaffStatus = async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
    if (showLoading) setLoading(true)
    else setIsRefreshing(true)
    try {
      const response = await api.get<StaffStatusResponse>('/admin/staff-status')
      setStaff(response.data.staff || [])
      setRegions(response.data.filters?.regions || [])
      setOutlets(response.data.filters?.outlets || [])
      setRoles(response.data.filters?.roles || [])
      setPresenceWindowMinutes(response.data.presenceWindowMinutes || 30)
      setLastUpdated(response.data.generatedAt ? new Date(response.data.generatedAt) : new Date())
    } catch (error) {
      console.error('Failed to fetch staff status', error)
    } finally {
      if (showLoading) setLoading(false)
      else setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let mounted = true

    ;(async () => {
      if (!mounted) return
      await fetchStaffStatus({ showLoading: true })
    })()

    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return staff.filter((member) => {
      const matchesSearch = !q || [
        member.name,
        member.mobileNumber || '',
        member.email || '',
        member.roleLabel,
        member.regionName || '',
        member.outletName || '',
        member.outletLocation || '',
        member.scopeLabel,
      ].some(value => value.toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'all' || member.status === statusFilter
      const matchesRole = roleFilter === 'all' || member.roleKey === roleFilter
      const matchesRegion = regionFilter === 'all' || member.coverageRegionIds.includes(regionFilter) || member.primaryRegionId === regionFilter
      const matchesOutlet = outletFilter === 'all' || member.coverageOutletIds.includes(outletFilter)

      return matchesSearch && matchesStatus && matchesRole && matchesRegion && matchesOutlet
    })
  }, [outletFilter, regionFilter, roleFilter, search, staff, statusFilter])

  const sorted = useMemo(() => {
    const statusOrder: Record<StaffMember['status'], number> = { online: 1, break: 2, offline: 3 }
    const list = [...filtered]
    list.sort((left, right) => {
      switch (sortBy) {
        case 'name_desc':
          return right.name.localeCompare(left.name)
        case 'last_login_desc': {
          const l = left.lastLoginAt ? new Date(left.lastLoginAt).getTime() : 0
          const r = right.lastLoginAt ? new Date(right.lastLoginAt).getTime() : 0
          return r - l
        }
        case 'status':
          return statusOrder[left.status] - statusOrder[right.status] || left.name.localeCompare(right.name)
        case 'role':
          return left.roleLabel.localeCompare(right.roleLabel) || left.name.localeCompare(right.name)
        case 'region':
          return (left.regionName || left.primaryRegionName).localeCompare(right.regionName || right.primaryRegionName) || left.name.localeCompare(right.name)
        case 'outlet':
          return (left.outletName || '').localeCompare(right.outletName || '') || left.name.localeCompare(right.name)
        case 'name_asc':
        default:
          return left.name.localeCompare(right.name)
      }
    })
    return list
  }, [filtered, sortBy])

  const statusBadge = (status: StaffMember['status'], label: string) => {
    const color = status === 'online'
      ? 'text-emerald-700 bg-emerald-100 border-emerald-200'
      : status === 'break'
        ? 'text-amber-700 bg-amber-100 border-amber-200'
        : 'text-slate-700 bg-slate-200 border-slate-300'
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${color}`}>{label}</span>
  }

  const formatLastLogin = (value: string | null) => {
    if (!value) return 'No login recorded'
    return new Date(value).toLocaleString()
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setRoleFilter('all')
    setRegionFilter('all')
    setOutletFilter('all')
    setSortBy('name_asc')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto p-3 sm:p-4 lg:p-6 xl:p-8">
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <UserCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-slate-800" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">All Staff Status</h1>
              <p className="text-slate-600 text-sm">Across GMs, DGMs, RTOMs, teleshop managers, and customer service officers</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for data'}
            </span>
            <button
              type="button"
              onClick={() => fetchStaffStatus({ showLoading: false })}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing…' : 'Refresh now'}
            </button>
            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Management roles show online if seen within {presenceWindowMinutes} min
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-slate-900 mb-3">
            <Filter className="w-4 h-4" />
            <h2 className="font-semibold">Search and Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="xl:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, mobile, role, outlet, or location"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'break' | 'offline')} className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All statuses</option>
              <option value="online">Online</option>
              <option value="break">At break</option>
              <option value="offline">Offline</option>
            </select>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All roles</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="name_asc">Sort: Name (A-Z)</option>
              <option value="name_desc">Sort: Name (Z-A)</option>
              <option value="last_login_desc">Sort: Last login (latest)</option>
              <option value="status">Sort: Status</option>
              <option value="role">Sort: Role</option>
              <option value="region">Sort: Region</option>
              <option value="outlet">Sort: Outlet</option>
            </select>
            <button type="button" onClick={clearFilters} className="px-3 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm sm:text-base">
              Clear filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All regions</option>
              {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
            <select value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)} className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All outlets</option>
              {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name} - {outlet.location}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-4 sm:p-6 text-center text-slate-500 text-sm sm:text-base">Loading staff status…</div>
          ) : sorted.length === 0 ? (
            <div className="p-4 sm:p-6 text-center text-slate-500 text-sm sm:text-base">No staff members match the current search and filters</div>
          ) : (
            <div className="divide-y divide-slate-200">
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-slate-50/60 border-b border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-sm sm:text-base">Island-wide Staff List</span>
                <span className="text-xs text-slate-500">({sorted.length})</span>
              </div>
              <div className="hidden xl:grid px-4 py-2 text-xs uppercase tracking-wide text-slate-500 grid-cols-12 bg-slate-50/50 border-b border-slate-200">
                <div className="col-span-3">Staff</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Contact</div>
                <div className="col-span-2">Assignment</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2 text-right">Last login</div>
              </div>
              <ul className="divide-y divide-slate-200">
                {sorted.map((member) => (
                              <li key={member.id} className="px-3 sm:px-4 py-3 xl:grid xl:grid-cols-12 xl:items-center hover:bg-slate-50">
                                <div className="xl:hidden">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                      {member.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                          <div className="font-medium text-slate-900 text-sm sm:text-base truncate">{member.name}</div>
                                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                            <Activity className="w-3 h-3 flex-shrink-0" /> 
                                            ID: {member.id.slice(0,8)}…
                                          </div>
                                          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{member.roleLabel}</div>
                                        </div>
                                        <div className="ml-2 flex-shrink-0">{statusBadge(member.status, member.statusLabel)}</div>
                                      </div>
                                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="text-slate-700 flex items-center gap-2 text-sm min-w-0">
                                          <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" /> 
                                          <span className="truncate">{member.mobileNumber || 'No mobile'}</span>
                                        </div>
                                        <div className="text-slate-700 flex items-center gap-2 text-sm min-w-0">
                                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                                          <span className="truncate">{member.outletName || member.regionName || '—'}</span>
                                        </div>
                                        <div className="text-slate-700 flex items-center gap-2 text-sm min-w-0">
                                          <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                                          <span className="truncate">{member.scopeLabel}</span>
                                        </div>
                                        <div className="text-slate-700 flex items-center gap-2 text-sm min-w-0">
                                          <Clock3 className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                                          <span className="truncate">{formatLastLogin(member.lastLoginAt)}</span>
                                        </div>
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] sm:text-[11px] font-medium rounded-full border border-slate-200">{member.accountStateLabel}</span>
                                        {member.counterNumber ? <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] sm:text-[11px] font-medium rounded-full border border-slate-200">Counter {member.counterNumber}</span> : null}
                                        {member.assignedServicesCount > 0 ? <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] sm:text-[11px] font-medium rounded-full border border-slate-200">{member.assignedServicesCount} service{member.assignedServicesCount === 1 ? '' : 's'}</span> : null}
                                        {member.isTraining ? <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] sm:text-[11px] font-medium rounded-full border border-sky-200">Training</span> : null}
                                      </div>
                                      {member.languages.length > 0 && (
                                        <div className="mt-2 flex flex-wrap items-center gap-1">
                                          <Languages className="w-3.5 h-3.5 text-slate-400" />
                                          {member.languages.map((code) => (
                                            <span key={code} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] sm:text-[11px] font-medium rounded-full border border-slate-200">
                                              {code === 'en' ? 'EN' : code === 'si' ? 'SI' : code === 'ta' ? 'TA' : (code || '').toUpperCase()}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="hidden xl:contents">
                                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-semibold">
                                      {member.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="truncate">
                                      <div className="font-medium text-slate-900 truncate">{member.name}</div>
                                      <div className="text-xs text-slate-500 flex items-center gap-1 truncate"><Activity className="w-3.5 h-3.5" /> ID: {member.id.slice(0,8)}…</div>
                                      {member.languages.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                          {member.languages.map((c: string) => (
                                            <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-full border border-slate-200">
                                              {c === 'en' ? 'EN' : c === 'si' ? 'SI' : c === 'ta' ? 'TA' : (c || '').toUpperCase()}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="col-span-2 min-w-0">
                                    <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">{member.roleLabel}</div>
                                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 truncate"><Globe2 className="w-3.5 h-3.5" /> {member.regionName || member.primaryRegionName}</div>
                                  </div>
                                  <div className="col-span-2 text-slate-700 min-w-0">
                                    <div className="flex items-center gap-2 truncate"><Phone className="w-4 h-4 text-slate-400" /> <span className="truncate">{member.mobileNumber || 'No mobile'}</span></div>
                                    <div className="mt-1 text-xs text-slate-500 truncate">{member.email || 'No email recorded'}</div>
                                  </div>
                                  <div className="col-span-2 text-slate-700 min-w-0">
                                    <div className="flex items-center gap-2 truncate"><MapPin className="w-4 h-4 text-slate-400" /> <span className="truncate">{member.outletName || member.regionName || 'Island-wide'}</span></div>
                                    <div className="mt-1 text-xs text-slate-500 truncate">{member.outletLocation || member.scopeLabel}</div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-full border border-slate-200">{member.accountStateLabel}</span>
                                      {member.counterNumber ? <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-full border border-slate-200">Counter {member.counterNumber}</span> : null}
                                    </div>
                                  </div>
                                  <div className="col-span-1">{statusBadge(member.status, member.statusLabel)}</div>
                                  <div className="col-span-2 text-right">
                                    <div className="font-medium text-slate-900">{formatLastLogin(member.lastLoginAt)}</div>
                                    <div className="mt-1 text-xs text-slate-500 inline-flex items-center justify-end gap-1"><UserRoundCheck className="w-3.5 h-3.5" /> {member.statusSource === 'tracked' ? 'Tracked status' : 'Derived status'}</div>
                                  </div>
                                </div>
                              </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
