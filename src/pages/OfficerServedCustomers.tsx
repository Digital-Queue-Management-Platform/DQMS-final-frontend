import React from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Filter, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react"
import api from "../config/api"
import { AnimatedDropdown } from "../components/AnimatedDropdown"

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
      const res = await api.get(`/service-case/${encodeURIComponent(refNumber)}`)
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
                className="w-44"
              />

              <AnimatedDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All statuses' },
                  ...uniqueStatuses.map(s => ({ value: s, label: s }))
                ]}
                icon={<Filter className="w-4 h-4" />}
                className="w-44"
              />

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => handleDateChange(e, setStartDate)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-transparent focus:outline-none"
                  placeholder="Start date"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => handleDateChange(e, setEndDate)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-transparent focus:outline-none"
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
                className="w-36"
              />

              {/* Action Buttons */}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>

                <button
                  onClick={applyFilters}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${hasUnappliedChanges
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  disabled={!hasUnappliedChanges}
                >
                  Apply Filters
                </button>

                <button
                  onClick={fetchData}
                  disabled={loading}
                  title={loading ? 'Loading data...' : 'Refresh data'}
                  className={`inline-flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 ${loading ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                >
                  <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-600">Loading...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-600">No served customers found for today.</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full min-w-max">
              <thead className="bg-black border-b border-gray-200">
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
                            <span key={s} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs whitespace-nowrap">{s}</span>
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
                          {loadingCase === t.refNumber ? (
                            <div className="text-center text-sm text-gray-600 py-4">Loading details...</div>
                          ) : !t.refNumber ? (
                            <div className="text-center text-sm text-gray-600 py-4">No service case reference available</div>
                          ) : caseDetails[t.refNumber] && caseDetails[t.refNumber] !== null ? (
                            <div className="space-y-4">
                              {/* Customer Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Customer Details</h4>
                                  <dl className="space-y-1 text-xs">
                                    <div className="flex gap-2">
                                      <dt className="font-medium text-gray-600">Name:</dt>
                                      <dd className="text-gray-900">{t.customerName || '-'}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="font-medium text-gray-600">Mobile:</dt>
                                      <dd className="text-gray-900">{t.customerMobile || '-'}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="font-medium text-gray-600">Assigned Officer:</dt>
                                      <dd className="text-gray-900">{t.assignedOfficerName || '-'}</dd>
                                    </div>
                                  </dl>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Service Case Details</h4>
                                    <dl className="space-y-1 text-xs">
                                      <div className="flex gap-2">
                                        <dt className="font-medium text-gray-600">Ref Number:</dt>
                                        <dd className="text-gray-900 font-mono">{caseDetails[t.refNumber].refNumber}</dd>
                                      </div>
                                      <div className="flex gap-2 justify-start items-center">
                                        <dt className="font-medium text-gray-600">Status:</dt>
                                        <dd className={`text-white px-1 py-[4.5px] rounded-xl font-semibold ${caseDetails[t.refNumber].status === 'completed' ? 'bg-green-600' :
                                          caseDetails[t.refNumber].status === 'open' ? 'bg-yellow-500' :
                                            'bg-gray-600'
                                          }`}>{caseDetails[t.refNumber].status}</dd>
                                      </div>
                                      <div className="flex gap-2">
                                        <dt className="font-medium text-gray-600">Outlet:</dt>
                                        <dd className="text-gray-900">{caseDetails[t.refNumber].outlet?.name || '-'}</dd>
                                      </div>
                                      <div className="flex gap-2">
                                        <dt className="font-medium text-gray-600">Created:</dt>
                                        <dd className="text-gray-900">{caseDetails[t.refNumber].createdAt ? new Date(caseDetails[t.refNumber].createdAt).toLocaleString() : '-'}</dd>
                                      </div>
                                      <div className="flex gap-2">
                                        <dt className="font-medium text-gray-600">Service Types:</dt>
                                        <dd className="text-gray-900">{(caseDetails[t.refNumber].serviceTypes || []).join(', ') || '-'}</dd>
                                      </div>
                                    </dl>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Token Timeline</h4>
                                    <dl className="space-y-1 text-xs">
                                      <div className="flex gap-2">
                                        <dt className="font-medium text-gray-600">Created:</dt>
                                        <dd className="text-gray-900">{t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}</dd>
                                      </div>
                                      <div className="flex gap-2">
                                        <dt className="font-medium text-gray-600">Called:</dt>
                                        <dd className="text-gray-900">{t.calledAt ? new Date(t.calledAt).toLocaleString() : '-'}</dd>
                                      </div>
                                      <div className="flex gap-2">
                                        <dt className="font-medium text-gray-600">Started:</dt>
                                        <dd className="text-gray-900">{t.startedAt ? new Date(t.startedAt).toLocaleString() : '-'}</dd>
                                      </div>
                                      <div className="flex gap-2">
                                        <dt className="font-medium text-gray-600">Completed:</dt>
                                        <dd className="text-gray-900">{t.completedAt ? new Date(t.completedAt).toLocaleString() : '-'}</dd>
                                      </div>
                                    </dl>
                                  </div>
                                </div>
                                {caseDetails[t.refNumber].updates && caseDetails[t.refNumber].updates.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Case Updates</h4>
                                    <div className="space-y-2">
                                      {caseDetails[t.refNumber].updates.map((update: any) => (
                                        <div key={update.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                          <div className="flex items-start justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-medium text-gray-900">{update.actorRole}</span>
                                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${update.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                                                update.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                                  update.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {update.status}
                                              </span>
                                            </div>
                                            <span className="text-xs text-gray-500">{new Date(update.createdAt).toLocaleString()}</span>
                                          </div>
                                          {update.note && (
                                            <p className="text-xs text-gray-700 mt-1">{update.note}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-sm text-gray-600 py-4">Failed to load case details</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
