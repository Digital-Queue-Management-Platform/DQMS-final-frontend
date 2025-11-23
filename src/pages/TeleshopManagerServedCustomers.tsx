import React from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Filter, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react"
import api from "../config/api"

interface ServedToken {
  id: string
  tokenNumber: number
  customerName: string
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

export default function TeleshopManagerServedCustomers() {
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

  const fetchCaseDetails = React.useCallback(async (refNumber: string) => {
    if (caseDetails[refNumber]) return // Already loaded
    setLoadingCase(refNumber)
    try {
      const res = await api.get(`/service-case/${encodeURIComponent(refNumber)}`)
      setCaseDetails(prev => ({ ...prev, [refNumber]: res.data }))
    } catch (e: any) {
      console.error('Failed to load case details:', e)
      setCaseDetails(prev => ({ ...prev, [refNumber]: null }))
    } finally {
      setLoadingCase(null)
    }
  }, [caseDetails])

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // The teleshop manager should see tokens served by all their officers.
      // Fetch officers under this teleshop manager, then call the officer summary endpoint
      // for each officer and aggregate tokens.
      const officersRes = await api.get('/teleshop-manager/officers')
      const officers: any[] = officersRes.data?.officers || []

      // For each officer, fetch their served tokens summary (public officer endpoint)
      const summaries = await Promise.all(officers.map(async (off: any) => {
        try {
          const r = await api.get(`/officer/summary/served/${off.id}`)
          return r.data?.tokens || []
        } catch (err) {
          return []
        }
      }))

      // Flatten and normalize tokens
      const tokens: ServedToken[] = summaries.flat().map((t: any) => ({
        id: t.id,
        tokenNumber: t.tokenNumber,
        customerName: t.customerName || t.customer?.name || 'Anonymous',
        serviceNames: t.serviceNames || (t.serviceTypes || []) || ['General Service'],
        completedAt: t.completedAt,
        startedAt: t.startedAt || null,
        calledAt: t.calledAt || null,
        createdAt: t.createdAt || null,
        refNumber: t.refNumber || null,
        serviceCaseStatus: t.serviceCaseStatus || null,
        serviceTimeMinutes: t.serviceTimeMinutes ?? null,
        waitingTimeMinutes: t.waitingTimeMinutes ?? null,
      }))

      // Sort by completedAt desc
      tokens.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
      setAllTokens(tokens)
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load served customers')
    } finally {
      setLoading(false)
    }
  }, [])

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
        setSearchParams({})
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
    const q = query.trim().toLowerCase()
    if (q) {
      data = data.filter(t =>
        t.customerName.toLowerCase().includes(q) ||
        String(t.tokenNumber).includes(q) ||
        (t.refNumber || '').toLowerCase().includes(q) ||
        (t.serviceCaseStatus || '').toLowerCase().includes(q) ||
        (t.serviceNames || []).some(s => s.toLowerCase().includes(q))
      )
    }

    if (serviceFilter !== 'all') {
      data = data.filter(t => (t.serviceNames || []).includes(serviceFilter))
    }

    if (statusFilter !== 'all') {
      data = data.filter(t => t.serviceCaseStatus === statusFilter)
    }

    if (startDate || endDate) {
      data = data.filter(t => {
        if (!t.completedAt) return false
        const completedDate = new Date(t.completedAt)
        const completedDateOnly = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate())

        if (startDate && endDate) {
          const start = new Date(startDate)
          const end = new Date(endDate)
          return completedDateOnly >= start && completedDateOnly <= end
        } else if (startDate) {
          const start = new Date(startDate)
          return completedDateOnly >= start
        } else if (endDate) {
          const end = new Date(endDate)
          return completedDateOnly <= end
        }
        return true
      })
    }

    if (sortBy === 'completed_desc') {
      data.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    } else if (sortBy === 'completed_asc') {
      data.sort((a, b) => new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime())
    } else if (sortBy === 'token_asc') {
      data.sort((a, b) => a.tokenNumber - b.tokenNumber)
    } else if (sortBy === 'token_desc') {
      data.sort((a, b) => b.tokenNumber - a.tokenNumber)
    }

    setFiltered(data)
  }, [allTokens, query, serviceFilter, statusFilter, startDate, endDate, sortBy])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Serve Customers</h1>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, token, or service"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={serviceFilter}
                  onChange={e => setServiceFilter(e.target.value)}
                  className="appearance-none pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All services</option>
                  {uniqueServices.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All statuses</option>
                {uniqueStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Start date"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="End date"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(""); setEndDate("") }}
                    className="px-2 py-2 text-gray-500 hover:text-gray-700 text-sm"
                    title="Clear dates"
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="completed_desc">Newest first</option>
                <option value="completed_asc">Oldest first</option>
                <option value="token_asc">Token: Low → High</option>
                <option value="token_desc">Token: High → Low</option>
              </select>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                <RefreshCcw className="w-4 h-4" /> Refresh
              </button>
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
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium uppercase ${
                          t.serviceCaseStatus === 'open' ? 'bg-yellow-100 text-yellow-700' :
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
                          {t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'}
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
                                      <dd className={`text-white px-1 py-[4.5px] rounded-xl font-semibold ${
                                        caseDetails[t.refNumber].status === 'completed' ? 'bg-green-600' :
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
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Customer Details</h4>
                                  <dl className="space-y-1 text-xs">
                                    <div className="flex gap-2">
                                      <dt className="font-medium text-gray-600">Name:</dt>
                                      <dd className="text-gray-900">{caseDetails[t.refNumber].customer?.name || '-'}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="font-medium text-gray-600">Mobile:</dt>
                                      <dd className="text-gray-900">{caseDetails[t.refNumber].customer?.mobileNumber || '-'}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="font-medium text-gray-600">Assigned Officer:</dt>
                                      <dd className="text-gray-900">{caseDetails[t.refNumber].officer?.name || '-'}</dd>
                                    </div>
                                  </dl>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">Unable to load case details.</div>
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
