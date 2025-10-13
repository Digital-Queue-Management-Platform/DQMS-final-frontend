"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { User, Clock, Phone, FileText, Users } from "lucide-react"
// OfficerTopBar is provided globally from Layout for officer routes
import api, { WS_URL } from "../config/api"
import type { Officer, Token } from "../types"

export default function OfficerQueuePage() {
  const navigate = useNavigate()
  const [officer, setOfficer] = useState<Officer | null>(null)
  const [currentToken, setCurrentToken] = useState<Token | null>(null)
  const [queue, setQueue] = useState<{ waiting: Token[]; inService: Token[]; availableOfficers: number; totalWaiting: number } | null>(null)
  const [accountRef, setAccountRef] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch officer and initial queue
    let mounted = true
    api.get('/officer/me').then(res => {
      if (!mounted) return
      const me: Officer = res.data.officer
      setOfficer(me)
      fetchQueue(me.outletId)
      fetchCurrentToken(me.id)

      // WebSocket updates
      const ws = new WebSocket(WS_URL)
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED" || data.type === 'TOKEN_SKIPPED' || data.type === 'TOKEN_CALLED' || data.type === 'TOKEN_RECALLED') {
          fetchQueue(me.outletId)
          fetchCurrentToken(me.id)
        }
      }
      ;(window as any).__dq_ws_queue = ws
    }).catch(() => navigate('/officer/login'))

    return () => {
      mounted = false
      const ws = (window as any).__dq_ws_queue
      if (ws) ws.close()
    }
  }, [navigate])

  const fetchQueue = async (outletId?: string) => {
    if (!outletId) return
    try {
      const res = await api.get(`/queue/outlet/${outletId}`)
      setQueue(res.data)
    } catch (e) {
      console.error('failed to fetch queue', e)
    }
  }

  const fetchCurrentToken = async (officerId: string) => {
    try {
      // Officer stats returns currentToken; re-use it to keep parity with dashboard
      const res = await api.get(`/officer/stats/${officerId}`)
      setCurrentToken(res.data.currentToken)
    } catch (e) {
      console.error('failed to fetch current token', e)
    }
  }

  const handleNextToken = async () => {
    if (!officer) return
    setLoading(true)
    try {
      const response = await api.post('/officer/next-token', { officerId: officer.id })
      if (response.data.token) {
        setCurrentToken(response.data.token)
        setAccountRef("")
        fetchQueue(officer.outletId)
      }
    } catch (err) {
      console.error('failed to get next token', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteService = async () => {
    if (!officer || !currentToken) return
    setLoading(true)
    try {
      await api.post('/officer/complete-service', { tokenId: currentToken.id, officerId: officer.id, accountRef })
      setCurrentToken(null)
      setAccountRef("")
      fetchQueue(officer.outletId)
    } catch (err) {
      console.error('failed to complete service', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!officer || !currentToken) return
    if (!confirm('Are you sure you want to skip this customer?')) return
    setLoading(true)
    try {
      await api.post('/officer/skip-token', { officerId: officer.id, tokenId: currentToken.id })
      setCurrentToken(null)
      fetchQueue(officer.outletId)
    } catch (err) {
      console.error('failed to skip token', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRecall = async (tokenId: string) => {
    if (!officer) return
    if (!confirm('Recall this customer?')) return
    setLoading(true)
    try {
      const response = await api.post('/officer/recall-token', { officerId: officer.id, tokenId })
      if (response.data.token) {
        setCurrentToken(response.data.token)
        setAccountRef("")
      }
      fetchQueue(officer.outletId)
    } catch (err) {
      console.error('failed to recall token', err)
    } finally {
      setLoading(false)
    }
  }

  // React to status changes broadcast by Layout's top bar
  useEffect(() => {
    const onStatus = async (e: any) => {
      const status = e?.detail?.status
      if (status) {
        setOfficer((prev) => (prev ? { ...prev, status } as any : prev))
      }
      if (officer?.outletId) {
        try { await fetchQueue(officer.outletId) } catch {}
      }
    }
    window.addEventListener('officer:status-changed', onStatus)
    return () => window.removeEventListener('officer:status-changed', onStatus)
  }, [officer?.outletId])

  if (!officer) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Left Column: Current Customer */}
        <div className="lg:col-span-2">
          {!currentToken ? (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-8">Current Customer</h2>
              <div className="text-center py-12">
                <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to Serve</h3>
                <p className="text-gray-600 mb-8 text-sm">Click the button below to call the next customer</p>
                <button
                  onClick={handleNextToken}
                  disabled={loading || officer.status !== "available"}
                  className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
                >
                  {loading ? "Loading..." : "Call Next Token"}
                </button>
                {officer.status !== "available" && (
                  <p className="mt-4 text-sm text-yellow-600">You must be available to call next token</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Current Customer</h2>

              {/* Token Number */}
              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-blue-600 mb-6">{currentToken.tokenNumber}</div>
              </div>

              {/* Customer Details */}
              <div className="space-y-5 mb-8">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">{currentToken.customer.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">{currentToken.customer.mobileNumber}</span>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">
                    {currentToken.serviceType === "bill_payment" ? "Bill Payment" : "Other Services"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">
                    Waiting for: {Math.floor((Date.now() - new Date(currentToken.createdAt).getTime()) / 60000)} min
                  </span>
                </div>
              </div>

              {/* Notes Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes:</label>
                <textarea
                  value={accountRef}
                  onChange={(e) => setAccountRef(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Add notes or account reference..."
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-0 flex gap-2 text-md">
                <button
                  onClick={handleNextToken}
                  disabled={loading || officer.status !== 'available'}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Call
                </button>

                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Skip
                </button>

                <button
                  onClick={handleCompleteService}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Complete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Queue List */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Queue List</h2>

            {!queue ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading queue...</p>
              </div>
            ) : queue.waiting.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No customers waiting</p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-900 border-b text-sm font-semibold text-white rounded-lg">
                  <div className="col-span-2">TOKEN</div>
                  <div className="col-span-2">CUSTOMER</div>
                  <div className="col-span-2">SERVICE TYPE</div>
                  <div className="col-span-2">WAIT TIME</div>
                  <div className="col-span-2">STATUS</div>
                  <div className="col-span-2">ACTION</div>
                </div>

                {/* Queue Items */}
                <div className="divide-y divide-gray-100">
                  {queue.waiting
                    .filter((t) => {
                      const prefs = Array.isArray((t as any).preferredLanguages) ? (t as any).preferredLanguages as string[] : []
                      const langs = Array.isArray((officer as any)?.languages) ? ((officer as any).languages as string[]) : []
                      return prefs.length === 0 || langs.length === 0 || prefs.some(p => langs.includes(p))
                    })
                    .map((t) => {
                    const waitTime = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
                    const isPriority = String(t.tokenNumber)?.startsWith('P')
                    const isSkipped = t.status === 'skipped'

                    return (
                      <div key={t.id} className={`grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 transition-colors ${isSkipped ? 'bg-orange-50 rounded-lg' : ''}`}>
                        <div className="col-span-2">
                          {isPriority ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-sm font-semibold">
                              {t.tokenNumber} Priority
                            </span>
                          ) : (
                            <span className="text-gray-900 font-semibold">{t.tokenNumber}</span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <span className={`${isSkipped ? 'text-gray-500' : 'text-gray-900'}`}>{t.customer.name}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 text-sm">
                            {t.serviceType === "bill_payment" ? "Bill Payments" : 
                              t.serviceType === "technical_support" ? "Technical Support" :
                              t.serviceType === "account_services" ? "Account Services" :
                              t.serviceType === "new_connection" ? "New Connections" :
                              t.serviceType === "device_sim_issues" ? "Device/SIM Issues" :
                              t.serviceType || "Other Services"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-900 font-medium">{waitTime} min</span>
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                            isSkipped
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isSkipped ? 'Skipped' : 'Waiting'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          {isSkipped ? (
                            <button
                              onClick={() => handleRecall(t.id)}
                              disabled={loading || currentToken !== null}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              Recall
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
