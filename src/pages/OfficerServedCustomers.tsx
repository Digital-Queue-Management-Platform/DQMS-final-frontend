import React from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Filter, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react"
import api from "../config/api"
import { AnimatedDropdown } from "../components/AnimatedDropdown"
import ServiceName from "../components/ServiceName"

interface ServedToken {
  id: string
  tokenNumber: number
  customerName: string
  customerMobile?: string | null
  assignedOfficerName?: string | null
  serviceNames: string[]
  completedAt?: string
  startedAt?: string
  calledAt?: string
  createdAt?: string
  refNumber?: string | null
  serviceCaseStatus?: string | null
  serviceTimeMinutes?: number | null
  waitingTimeMinutes?: number | null
}

const TokenDetailContent = ({ t, caseDetails, loadingCase }: { t: ServedToken, caseDetails: Record<string, any>, loadingCase: string | null }) => {
  if (loadingCase === t.refNumber) {
    return <div className="text-center text-sm text-gray-600 py-4">Loading details...</div>
  }

  if (!t.refNumber) {
    return <div className="text-center text-sm text-gray-600 py-4">No service case reference available</div>
  }

  if (!caseDetails[t.refNumber]) {
    return <div className="text-center text-sm text-gray-600 py-4">Failed to load case details</div>
  }

  const details = caseDetails[t.refNumber]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Customer Details */}
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
            Customer Details
          </h4>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <dt className="font-medium text-gray-500">Name</dt>
              <dd className="text-gray-900 font-semibold">{t.customerName || '-'}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <dt className="font-medium text-gray-500">Mobile</dt>
              <dd className="text-gray-900 font-semibold">{t.customerMobile || '-'}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <dt className="font-medium text-gray-500">Assigned Officer</dt>
              <dd className="text-gray-900 font-semibold">{t.assignedOfficerName || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Case Details */}
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            Service Case
          </h4>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <dt className="font-medium text-gray-500">Ref Number</dt>
              <dd className="text-gray-900 font-mono font-bold uppercase">{details.refNumber}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <dt className="font-medium text-gray-500">Status</dt>
              <dd className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-white ${details.status === 'completed' ? 'bg-green-600' : details.status === 'open' ? 'bg-yellow-500' : 'bg-slate-500'
                }`}>
                {details.status}
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <dt className="font-medium text-gray-500">Outlet</dt>
              <dd className="text-gray-900 font-semibold">{details.outlet?.name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-500">Services</dt>
              <dd className="text-gray-900 text-right font-semibold">
                <div className="flex flex-wrap justify-end gap-1">
                  {details.serviceTypes && details.serviceTypes.length > 0 ? (
                    details.serviceTypes.map((s: string, idx: number) => (
                      <React.Fragment key={s}>
                        <ServiceName serviceType={s} />
                        {idx < details.serviceTypes.length - 1 && <span>, </span>}
                      </React.Fragment>
                    ))
                  ) : (
                    '-'
                  )}
                </div>
              </dd>
            </div>
          </dl>
        </div>

        {/* Timeline */}
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
            Token Timeline
          </h4>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <dt className="font-medium text-gray-500">Created</dt>
              <dd className="text-gray-900">{t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <dt className="font-medium text-gray-500">Called</dt>
              <dd className="text-gray-900">{t.calledAt ? new Date(t.calledAt).toLocaleString() : '-'}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <dt className="font-medium text-gray-500">Started</dt>
              <dd className="text-gray-900">{t.startedAt ? new Date(t.startedAt).toLocaleString() : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-500">Completed</dt>
              <dd className="text-gray-900 font-bold">{t.completedAt ? new Date(t.completedAt).toLocaleString() : '-'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Bill & Payment */}
      {details.token && (
        details.token.billPaymentIntent != null ||
        details.token.billPaymentMethod != null ||
        details.token.billPaymentAmount != null ||
        details.token.sltTelephoneNumber != null ||
        details.token.accountRef != null
      ) && (
          <div className="bg-white p-5 rounded-xl border border-indigo-100 bg-indigo-50/30">
            <h4 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <div className="p-1 bg-indigo-100 rounded">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              Bill Payment Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {details.token.sltTelephoneNumber && (
                <div>
                  <dt className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Telephone</dt>
                  <dd className="text-sm font-bold text-gray-900">{details.token.sltTelephoneNumber}</dd>
                </div>
              )}
              {details.token.billPaymentIntent && (
                <div>
                  <dt className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Intent</dt>
                  <dd className="text-sm font-bold text-gray-900 capitalize">{details.token.billPaymentIntent.replace('_', ' ')}</dd>
                </div>
              )}
              {details.token.billPaymentMethod && (
                <div>
                  <dt className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Method</dt>
                  <dd className="text-sm font-bold text-gray-900 capitalize">{details.token.billPaymentMethod}</dd>
                </div>
              )}
              {details.token.billPaymentAmount != null && (
                <div>
                  <dt className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Amount</dt>
                  <dd className="text-sm font-bold text-green-700">LKR {Number(details.token.billPaymentAmount).toLocaleString()}</dd>
                </div>
              )}
              {details.token.accountRef && (
                <div>
                  <dt className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Account Ref</dt>
                  <dd className="text-sm font-bold text-gray-900">{details.token.accountRef}</dd>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Updates History */}
      {details.updates && details.updates.length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            History Updates
            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full">{details.updates.length}</span>
          </h4>
          <div className="space-y-3">
            {details.updates.map((update: any) => (
              <div key={update.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-tighter">
                      {update.actorRole || 'System'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${update.status === 'completed' ? 'bg-green-100 text-green-700' :
                        update.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                      }`}>
                      {update.status}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400">{new Date(update.createdAt).toLocaleString()}</span>
                </div>
                {update.note && (
                  <p className="text-xs text-gray-600 italic bg-slate-50 p-2 rounded-lg border-l-2 border-slate-200">
                    "{update.note}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OfficerServedCustomers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [allTokens, setAllTokens] = React.useState<ServedToken[]>([])
  const [filtered, setFiltered] = React.useState<ServedToken[]>([])
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null)
  const [caseDetails, setCaseDetails] = React.useState<Record<string, any>>({})
  const [loadingCase, setLoadingCase] = React.useState<string | null>(null)

  // filters
  const [query, setQuery] = React.useState("")
  const [serviceFilter, setServiceFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [startDate, setStartDate] = React.useState<string>("")
  const [endDate, setEndDate] = React.useState<string>("")
  const [sortBy, setSortBy] = React.useState<string>("completed_desc")

  // Applied filter states (actually used for filtering)
  const [appliedQuery, setAppliedQuery] = React.useState("")
  const [appliedServiceFilter, setAppliedServiceFilter] = React.useState<string>("all")
  const [appliedStatusFilter, setAppliedStatusFilter] = React.useState<string>("all")
  const [appliedStartDate, setAppliedStartDate] = React.useState<string>("")
  const [appliedEndDate, setAppliedEndDate] = React.useState<string>("")
  const [appliedSortBy, setAppliedSortBy] = React.useState<string>("completed_desc")

  const uniqueServices = React.useMemo(() => {
    const set = new Set<string>()
    allTokens.forEach(t => (t.serviceNames || []).forEach(s => set.add(s)))
    return Array.from(set).sort()
  }, [allTokens])

  const uniqueStatuses = React.useMemo(() => {
    const set = new Set<string>()
    allTokens.forEach(t => { if (t.serviceCaseStatus) set.add(t.serviceCaseStatus) })
    return Array.from(set).sort()
  }, [allTokens])

  const handleDateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void
  ) => {
    const value = e.target.value;

    // Allow empty
    if (!value) {
      setter("");
      return;
    }

    // Enforce YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;

    setter(value);
  };

  // Apply filters function
  const applyFilters = () => {
    setAppliedQuery(query)
    setAppliedServiceFilter(serviceFilter)
    setAppliedStatusFilter(statusFilter)
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
    setAppliedSortBy(sortBy)
  }

  // Clear filters function
  const clearFilters = () => {
    setQuery("")
    setServiceFilter("all")
    setStatusFilter("all")
    setStartDate("")
    setEndDate("")
    setSortBy("completed_desc")

    // Also clear applied filters
    setAppliedQuery("")
    setAppliedServiceFilter("all")
    setAppliedStatusFilter("all")
    setAppliedStartDate("")
    setAppliedEndDate("")
    setAppliedSortBy("completed_desc")
  }

  // Check if filters have changed
  const hasUnappliedChanges = React.useMemo(() => {
    return (
      query !== appliedQuery ||
      serviceFilter !== appliedServiceFilter ||
      statusFilter !== appliedStatusFilter ||
      startDate !== appliedStartDate ||
      endDate !== appliedEndDate ||
      sortBy !== appliedSortBy
    )
  }, [query, appliedQuery, serviceFilter, appliedServiceFilter, statusFilter, appliedStatusFilter,
    startDate, appliedStartDate, endDate, appliedEndDate, sortBy, appliedSortBy])

  const fetchCaseDetails = React.useCallback(async (refNumber: string) => {
    if (caseDetails[refNumber]) return // Already loaded
    setLoadingCase(refNumber)
    try {
      const res = await api.get(`/service-case/${refNumber}`)
      setCaseDetails(prev => ({ ...prev, [refNumber]: res.data }))
    } catch (e: any) {
      console.error('Failed to load case details:', e)
      // Set empty object to prevent infinite retry
      setCaseDetails(prev => ({ ...prev, [refNumber]: null }))
    } finally {
      setLoadingCase(null)
    }
  }, [caseDetails])

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const me = await api.get('/officer/me')
      const officerId = me.data.officer?.id
      if (!officerId) throw new Error('Officer not found')

      // Build query params for date range
      const params = new URLSearchParams()
      if (appliedStartDate) params.append('from', appliedStartDate)
      if (appliedEndDate) params.append('to', appliedEndDate)
      const queryString = params.toString()

      const url = `/officer/summary/served/${officerId}${queryString ? `?${queryString}` : ''}`
      const res = await api.get(url)
      const tokens: ServedToken[] = (res.data?.tokens || []).map((t: any) => {
        const started = t.startedAt ? new Date(t.startedAt).getTime() : null
        const completed = t.completedAt ? new Date(t.completedAt).getTime() : null
        const created = t.createdAt ? new Date(t.createdAt).getTime() : null
        const called = t.calledAt ? new Date(t.calledAt).getTime() : null
        const serviceTime = started && completed ? Math.round((completed - started) / 60000) : null
        const waitingTime = created && called ? Math.round((called - created) / 60000) : null

        return {
          id: t.id,
          tokenNumber: t.tokenNumber,
          customerName: t.customerName || 'Anonymous',
          customerMobile: t.customerMobile ?? null,
          assignedOfficerName: t.assignedOfficerName ?? null,
          serviceNames: Array.isArray(t.serviceNames) ? t.serviceNames : [],
          completedAt: t.completedAt,
          startedAt: t.startedAt,
          calledAt: t.calledAt,
          createdAt: t.createdAt,
          refNumber: t.refNumber ?? null,
          serviceCaseStatus: t.serviceCaseStatus ?? null,
          serviceTimeMinutes: serviceTime,
          waitingTimeMinutes: waitingTime,
        }
      })
      tokens.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
      setAllTokens(tokens)
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load served customers')
    } finally {
      setLoading(false)
    }
  }, [appliedStartDate, appliedEndDate])

  React.useEffect(() => { fetchData() }, [fetchData])

  // Auto-expand token from URL parameter
  React.useEffect(() => {
    const tokenId = searchParams.get('tokenId')
    if (tokenId && allTokens.length > 0) {
      const token = allTokens.find(t => t.id === tokenId)
      if (token) {
        setExpandedRow(tokenId)
        if (token.refNumber) {
          fetchCaseDetails(token.refNumber)
        }
        // Clear the URL parameter after expanding
        setSearchParams({})
        // Scroll to the token after a short delay
        setTimeout(() => {
          const element = document.getElementById(`token-${tokenId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [searchParams, allTokens, fetchCaseDetails, setSearchParams])

  React.useEffect(() => {
    let data = [...allTokens]
    // text search over name, token number, ref number, status and services
    const q = appliedQuery.trim().toLowerCase()
    if (q) {
      data = data.filter(t =>
        t.customerName.toLowerCase().includes(q) ||
        String(t.tokenNumber).includes(q) ||
        (t.refNumber || '').toLowerCase().includes(q) ||
        (t.serviceCaseStatus || '').toLowerCase().includes(q) ||
        (t.serviceNames || []).some(s => s.toLowerCase().includes(q))
      )
    }

    // service filter
    if (appliedServiceFilter !== 'all') {
      data = data.filter(t => (t.serviceNames || []).includes(appliedServiceFilter))
    }

    // status filter
    if (appliedStatusFilter !== 'all') {
      data = data.filter(t => t.serviceCaseStatus === appliedStatusFilter)
    }

    // date range filter
    if (appliedStartDate || appliedEndDate) {
      data = data.filter(t => {
        if (!t.completedAt) return false
        const completedDate = new Date(t.completedAt)
        const completedDateOnly = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate())

        if (appliedStartDate && appliedEndDate) {
          const start = new Date(appliedStartDate)
          const end = new Date(appliedEndDate)
          return completedDateOnly >= start && completedDateOnly <= end
        } else if (appliedStartDate) {
          const start = new Date(appliedStartDate)
          return completedDateOnly >= start
        } else if (appliedEndDate) {
          const end = new Date(appliedEndDate)
          return completedDateOnly <= end
        }
        return true
      })
    }

    // sort
    if (appliedSortBy === 'completed_desc') {
      data.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    } else if (appliedSortBy === 'completed_asc') {
      data.sort((a, b) => new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime())
    }

    setFiltered(data)
  }, [allTokens, appliedQuery, appliedServiceFilter, appliedStatusFilter, appliedStartDate, appliedEndDate, appliedSortBy])

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Served Customers</h1>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, token, or service"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:border-transparent focus:ring-0 focus:outline-none text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <AnimatedDropdown
                value={serviceFilter}
                onChange={setServiceFilter}
                options={[
                  { value: 'all', label: 'All services' },
                  ...uniqueServices.map(s => ({ value: s, label: s }))
                ]}
                icon={<Filter className="w-4 h-4" />}
                className="w-full sm:w-44"
              />

              <AnimatedDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All statuses' },
                  ...uniqueStatuses.map(s => ({ value: s, label: s }))
                ]}
                icon={<Filter className="w-4 h-4" />}
                className="w-full sm:w-44"
              />

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => handleDateChange(e, setStartDate)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-transparent focus:outline-none min-w-[120px]"
                  placeholder="Start date"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => handleDateChange(e, setEndDate)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-transparent focus:outline-none min-w-[120px]"
                  placeholder="End date"
                />
              </div>

              <AnimatedDropdown
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'completed_desc', label: 'Newest first' },
                  { value: 'completed_asc', label: 'Oldest first' },
                ]}
                className="w-full sm:w-40"
              />

              {/* Action Buttons */}
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 sm:ml-auto">
                <button
                  onClick={clearFilters}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>

                <button
                  onClick={applyFilters}
                  className={`flex-[2] sm:flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${hasUnappliedChanges
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  disabled={!hasUnappliedChanges}
                >
                  Apply Filters
                </button>

                <button
                  onClick={fetchData}
                  disabled={loading}
                  className={`px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-gray-600">Loading...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-gray-600">No served customers found for today.</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full min-w-max">
                <thead className="bg-black border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Token</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Ref No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Services</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Wait (min)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Service (min)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Completed</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((t, idx) => (
                    <React.Fragment key={t.id}>
                      <tr
                        id={`token-${t.id}`}
                        onClick={() => {
                          if (expandedRow === t.id) {
                            setExpandedRow(null)
                          } else {
                            setExpandedRow(t.id)
                            if (t.refNumber) fetchCaseDetails(t.refNumber)
                          }
                        }}
                        className={`cursor-pointer hover:bg-indigo-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${expandedRow === t.id ? 'bg-indigo-50' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {expandedRow === t.id ? (
                              <ChevronUp className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="inline-flex items-center text-sm font-semibold">
                              #{t.tokenNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{t.customerName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-700 font-mono">{t.refNumber || '-'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium uppercase ${t.serviceCaseStatus === 'open' ? 'bg-yellow-100 text-yellow-700' :
                            t.serviceCaseStatus === 'completed' ? 'bg-green-100 text-green-700' :
                              'bg-gray-500 text-gray-700'
                            }`}>
                            {t.serviceCaseStatus || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(t.serviceNames || []).map(s => (
                              <span key={s} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs whitespace-nowrap">
                                <ServiceName serviceType={s} />
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-xs font-medium text-gray-700">
                            {t.waitingTimeMinutes !== null ? t.waitingTimeMinutes : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-xs font-medium text-gray-700">
                            {t.serviceTimeMinutes !== null ? t.serviceTimeMinutes : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-xs text-gray-700">
                            {t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </td>
                      </tr>
                      {expandedRow === t.id && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-gray-50">
                            <TokenDetailContent t={t} caseDetails={caseDetails} loadingCase={loadingCase} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View - Cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filtered.map((t) => (
                <div key={t.id} id={`mobile-token-${t.id}`} className="p-4 bg-white">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      if (expandedRow === t.id) {
                        setExpandedRow(null)
                      } else {
                        setExpandedRow(t.id)
                        if (t.refNumber) fetchCaseDetails(t.refNumber)
                      }
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-600 font-bold text-lg">#{t.tokenNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${t.serviceCaseStatus === 'open' ? 'bg-yellow-100 text-yellow-700' : t.serviceCaseStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {t.serviceCaseStatus || 'N/A'}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-gray-900">{t.customerName}</div>
                      <div className="text-xs text-gray-500">{t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Wait/Service</div>
                        <div className="text-xs font-medium bg-slate-50 px-2 py-1 rounded">
                          {t.waitingTimeMinutes || 0}m / {t.serviceTimeMinutes || 0}m
                        </div>
                      </div>
                      {expandedRow === t.id ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>
                  
                  {expandedRow === t.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 -mx-4 px-4 bg-gray-50 overflow-hidden">
                      <TokenDetailContent t={t} caseDetails={caseDetails} loadingCase={loadingCase} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
