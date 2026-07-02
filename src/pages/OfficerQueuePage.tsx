"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Clock, Phone, FileText, Users, RefreshCwIcon, Calendar, AlertTriangle, CheckCircle2, Volume2, Play, Star } from "lucide-react"
import Barcode from "react-barcode"
// OfficerTopBar is provided globally from Layout for officer routes
import api, { WS_URL } from "../config/api"
import type { Officer, Token } from "../types"
import ServiceName from "../components/ServiceName"
import { getServiceColor } from "../utils/serviceUtils"

export default function OfficerQueuePage() {
  const navigate = useNavigate()
  const [officer, setOfficer] = useState<Officer | null>(null)
  const [currentToken, setCurrentToken] = useState<Token | null>(null)
  const [billInfo, setBillInfo] = useState<{ telephoneNumber: string; accountName: string; currentBill: number; dueDate: string; status: string; updatedAt: string; accountNumber?: string | null } | null>(null)
  const [multipleBills, setMultipleBills] = useState<{ telephoneNumber: string; accountName: string; currentBill: number; dueDate: string; status: string; billPaymentIntent?: string; billPaymentAmount?: number; updatedAt: string; accountNumber?: string | null }[]>([])
  const [queue, setQueue] = useState<{ waiting: Token[]; inService: Token[]; availableOfficers: number; totalWaiting: number } | null>(null)
  const [accountRef, setAccountRef] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerMobile, setCustomerMobile] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [queueLoading, setQueueLoading] = useState(false)
  const [_lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<'my-queue' | 'transferred' | 'unmatched'>('my-queue')
  const [unmatchedTokens, setUnmatchedTokens] = useState<Token[]>([])
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferServices, setTransferServices] = useState<string[]>([])
  const [allServices, setAllServices] = useState<any[]>([])
  const [counters, setCounters] = useState<any[]>([])
  const [targetOfficer, setTargetOfficer] = useState<{ id: string; name: string; counterNumber: number | null } | null>(null)
  const [transferNotes, setTransferNotes] = useState("")
  const [showServiceTypeInQueue, setShowServiceTypeInQueue] = useState(false)


  // Helper functions for date and time formatting
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  useEffect(() => {
    // Fetch officer and initial queue
    let mounted = true

    // Fetch show-service-type setting
    api.get('/queue/settings/show-service-type').then(res => {
      if (mounted) setShowServiceTypeInQueue(res.data.enabled ?? false)
    }).catch(() => {})

    api.get('/officer/me').then(res => {
      if (!mounted) return
      const me: Officer = res.data.officer
      setOfficer(me)
      fetchQueue(me.outletId, me.id)
      fetchCurrentToken(me.id)
      fetchUnmatchedTokens(me.outletId)

      // Auto-refresh every 15 seconds for critical queue updates
      const interval = setInterval(() => {
        if (mounted) {
          fetchQueue(me.outletId, me.id)
          fetchCurrentToken(me.id)
          fetchUnmatchedTokens(me.outletId)
        }
      }, 15000)

      // Handle window closing/refreshing - send logout when window closes
      const handleBeforeUnload = () => {
        const token = localStorage.getItem("dqToken")
        if (token) {
          navigator.sendBeacon('/api/officer/logout', JSON.stringify({}))
        }
      }

      window.addEventListener('beforeunload', handleBeforeUnload)

      // WebSocket updates
      const ws = new WebSocket(WS_URL)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('WebSocket message received:', data)

          if (data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED" || data.type === "TOKEN_SKIPPED" || data.type === "TOKEN_CALLED" || data.type === "TOKEN_RECALLED" || data.type === "TOKEN_UPDATED" || data.type === "TOKEN_PRIORITY_UPDATED" || data.type === "TOKEN_CANCELLED") {
            // Add a small delay to ensure database consistency
            setTimeout(() => {
              if (mounted) {
                fetchQueue(me.outletId, me.id)
                fetchCurrentToken(me.id)
                fetchUnmatchedTokens(me.outletId)
              }
            }, 100)
          }

          if (data.type === "OFFICER_UPDATED" && data.data.officerId === me.id) {
            console.log('Officer updated, updating local state:', data.data)
            setOfficer(prev => prev ? { ...prev, ...data.data } : prev)
          }

          if (data.type === "OFFICER_STATUS_CHANGE" && data.data.officerId === me.id) {
            console.log('Officer status changed via WS:', data.data.status)
            setOfficer(prev => prev ? { ...prev, status: data.data.status } : prev)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onopen = () => {
        console.log('OfficerQueue WebSocket connected')
      }

      ws.onerror = (error) => {
        console.error('OfficerQueue WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('OfficerQueue WebSocket disconnected')
      }
        ; (window as any).__dq_ws_queue = ws

      return () => {
        mounted = false
        clearInterval(interval)
        window.removeEventListener('beforeunload', handleBeforeUnload)
        try {
          ws.close()
        } catch (error) {
          console.error('Error closing WebSocket:', error)
        }
      }
    }).catch(() => navigate('/officer/login'))

    return () => {
      mounted = false
      const ws = (window as any).__dq_ws_queue
      if (ws) {
        try {
          ws.close()
        } catch (e) {
          console.error('Error closing WebSocket in cleanup:', e)
        }
      }
    }
  }, [navigate])

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])


  const fetchQueue = async (outletId?: string, officerId?: string) => {
    if (!outletId) return
    try {
      setQueueLoading(true)
      const params = new URLSearchParams()
      if (officerId) {
        params.append('officerId', officerId)
      }
      const query = params.toString()
      const res = await api.get(`/queue/outlet/${outletId}${query ? `?${query}` : ''}`)
      setQueue(res.data)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('failed to fetch queue', e)
    } finally {
      setQueueLoading(false)
    }
  }

  const fetchCurrentToken = async (officerId: string) => {
    try {
      // Officer stats returns currentToken, billData, and multipleBills; update to handle both
      const res = await api.get(`/officer/stats/${officerId}`)
      console.log('DEBUG: fetchCurrentToken response:', res.data)
      console.log('DEBUG: currentToken customer data:', res.data.currentToken?.customer)
      setCurrentToken(res.data.currentToken)
      setBillInfo(res.data.billData || null)
      setMultipleBills(res.data.multipleBills || [])
      if (res.data.currentToken?.customer) {
        const cName = res.data.currentToken.customer.name || ""
        const cMobile = res.data.currentToken.customer.mobileNumber || ""
        setCustomerName(cName === "Customer" || cName === "Anonymous" ? "" : cName)
        setCustomerMobile(cMobile.toUpperCase() === "N/A" ? "" : cMobile)
        setCustomerEmail(res.data.currentToken.customer.email || "")
      } else {
        setCustomerName("")
        setCustomerMobile("")
        setCustomerEmail("")
      }
    } catch (e) {
      console.error('failed to fetch current token', e)
    }
  }

  const fetchUnmatchedTokens = async (outletId?: string) => {
    if (!outletId) return
    try {
      const res = await api.get(`/officer/unmatched-tokens/${outletId}`)
      setUnmatchedTokens(res.data.unmatchedTokens || [])
      console.log(`Fetched ${res.data.unmatchedTokens?.length || 0} unmatched tokens`)
    } catch (e) {
      console.error('failed to fetch unmatched tokens', e)
      setUnmatchedTokens([])
    }
  }

  const fetchServices = async () => {
    try {
      const resp = await api.get('/queue/services')
      setAllServices(resp.data || [])
    } catch (err) {
      console.error('failed to fetch services', err)
    }
  }

  const fetchCounters = async (outletId: string) => {
    try {
      const resp = await api.get(`/queue/outlet/${outletId}/counters`)
      setCounters(resp.data || [])
    } catch (err) {
      console.error('failed to fetch counters', err)
    }
  }

  // --- Auto-speech helpers ---

  const handleReannounce = async (tokenId: string) => {
    if (!officer) return
    setLoading(true)
    try {
      await api.post('/officer/reannounce-token', { officerId: officer.id, tokenId })
    } catch (err) {
      console.error('failed to re-announce', err)
    } finally {
      setLoading(false)
    }
  }

  const autoSpeak = async (_token: any, _eventType: 'call' | 'skip' | 'recall', _counterNum?: number | null) => {
    // Local speech disabled. Audio is now handled by the central Outlet Queue Display.
    return
  }

  const handleTransfer = async () => {
    if (!officer || !currentToken) return
    if (transferServices.length === 0) {
      alert('Please select a service')
      return
    }
    if (!targetOfficer) {
      alert('Please select a target officer')
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/officer/transfer-token', {
        officerId: officer.id,
        tokenId: currentToken.id,
        newServiceTypes: transferServices,
        targetCounterNumber: targetOfficer.counterNumber,
        notes: transferNotes || accountRef || `(Transferred to ${targetOfficer.name})`
      })

      if (res.data.success) {
        setIsTransferModalOpen(false)
        setTransferServices([])
        setTargetOfficer(null)
        setTransferNotes("")

        setCurrentToken(null)
        setOfficer(prev => prev ? { ...prev, status: 'available' } : prev)
        setAccountRef("")
        fetchQueue(officer.outletId, officer.id)
        alert(`Customer successfully transferred to ${targetOfficer.name}!`)
      } else {
        alert(res.data.error || 'Failed to transfer customer')
      }
    } catch (err: any) {
      console.error('Transfer error:', err)
      alert('Transfer failed: ' + (err.response?.data?.error || err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const refreshOfficerQueueState = async (currentOfficer: Officer) => {
    await Promise.all([
      fetchQueue(currentOfficer.outletId, currentOfficer.id),
      fetchCurrentToken(currentOfficer.id),
      fetchUnmatchedTokens(currentOfficer.outletId)
    ])
  }

  const callSpecificToken = async (tokenId: string) => {
    if (!officer) return null

    const response = await api.post('/officer/call-token', {
      officerId: officer.id,
      tokenId
    })

    if (response.data.token) {
      setOfficer(prev => prev ? { ...prev, status: 'serving' } : prev)
      setCurrentToken(response.data.token)
      setBillInfo(null)
      setAccountRef("")
      if (response.data.token.customer) {
        const cName = response.data.token.customer.name || ""
        const cMobile = response.data.token.customer.mobileNumber || ""
        setCustomerName(cName === "Customer" || cName === "Anonymous" ? "" : cName)
        setCustomerMobile(cMobile.toUpperCase() === "N/A" ? "" : cMobile)
        setCustomerEmail(response.data.token.customer.email || "")
      } else {
        setCustomerName("")
        setCustomerMobile("")
        setCustomerEmail("")
      }
      await refreshOfficerQueueState(officer)
      autoSpeak(response.data.token, 'call', officer.counterNumber)
      return response.data.token as Token
    }

    return null
  }

  const handleNextToken = async () => {
    if (!officer) return
    if (currentToken) {
      alert("Please complete or skip the current customer first.")
      return
    }

    setLoading(true)
    try {
      let nextTokenId: string | null = null

      if (activeTab === 'my-queue') {
        nextTokenId = sortedCallableMyQueueTokens[0]?.id || null
      } else if (activeTab === 'transferred') {
        nextTokenId = sortedCallableTransferredTokens[0]?.id || null
      } else {
        nextTokenId = sortedCallableUnmatchedTokens[0]?.id || null
      }

      if (!nextTokenId) {
        const emptyMessage = activeTab === 'my-queue'
          ? 'No customers are waiting in My Queue.'
          : activeTab === 'transferred'
            ? 'No customers are waiting in Transferred Tokens.'
            : 'No customers are waiting in Unmatched Tokens.'
        alert(emptyMessage)
        return
      }

      await callSpecificToken(nextTokenId)
    } catch (err: any) {
      console.error('failed to get next token', err)
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      if (err.response?.status === 409) {
        alert(errorMsg)
        // Refresh queue because a token was just taken
        refreshOfficerQueueState(officer)
      } else {
        alert('Failed to get next token: ' + errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteService = async () => {
    if (!officer || !currentToken) return
    setLoading(true)
    try {
      // First complete the service to get reference number
      await api.post('/officer/complete-service', { 
        tokenId: currentToken.id, 
        officerId: officer.id, 
        accountRef,
        customerName,
        customerMobile,
        customerEmail 
      })
      setOfficer(prev => prev ? { ...prev, status: 'available' } : prev)
      setCurrentToken(null)
      setBillInfo(null)
      setAccountRef("")
      setCustomerName("")
      setCustomerMobile("")
      setCustomerEmail("")
      fetchQueue(officer.outletId, officer.id)
    } catch (err) {
      console.error('failed to complete service', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async (tokenId?: string) => {
    if (!officer) return
    const targetTokenId = tokenId || currentToken?.id
    if (!targetTokenId) return
    if (!confirm('Are you sure you want to skip this customer?')) return
    setLoading(true)
    try {
      await api.post('/officer/skip-token', { officerId: officer.id, tokenId: targetTokenId })
      setOfficer(prev => prev ? { ...prev, status: 'available' } : prev)
      if (!tokenId) {
        setCurrentToken(null)
        setBillInfo(null)
        setCustomerName("")
        setCustomerMobile("")
        setCustomerEmail("")
      }
      fetchQueue(officer.outletId, officer.id)
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
        setBillInfo(null)
        setAccountRef("")
        if (response.data.token.customer) {
          const cName = response.data.token.customer.name || ""
          const cMobile = response.data.token.customer.mobileNumber || ""
          setCustomerName(cName === "Customer" || cName === "Anonymous" ? "" : cName)
          setCustomerMobile(cMobile.toUpperCase() === "N/A" ? "" : cMobile)
          setCustomerEmail(response.data.token.customer.email || "")
        } else {
          setCustomerName("")
          setCustomerMobile("")
          setCustomerEmail("")
        }
        fetchCurrentToken(officer.id)
      }
      fetchQueue(officer.outletId, officer.id)
    } catch (err) {
      console.error('failed to recall token', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSetPriority = async (tokenId: string) => {
    if (!officer) return
    if (currentToken) {
      alert("Please complete or skip the current customer first.")
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/officer/set-priority', { tokenId })
      if (response.data.success) {
        const isPriority = response.data.token.isPriority

        // If marking as priority, automatically call the customer to counter
        if (isPriority) {
          try {
            await callSpecificToken(tokenId)
            alert('Customer marked as VIP priority and called to counter!')
          } catch (callErr: any) {
            console.error('Failed to call customer:', callErr)
            alert('Customer marked as VIP priority, but failed to call to counter')
          }
        } else {
          alert('Priority removed from customer')
          await refreshOfficerQueueState(officer)
        }
      }
    } catch (err: any) {
      console.error('Failed to set priority:', err)
      alert('Failed to set priority: ' + (err.response?.data?.error || err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (officer?.outletId) {
      setRefreshing(true)
      console.log('Manual refresh triggered')
      await fetchQueue(officer.outletId, officer.id)
      await fetchCurrentToken(officer.id)
      setRefreshing(false)
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
        try { await fetchQueue(officer.outletId, officer.id) } catch { }
      }
    }
    window.addEventListener('officer:status-changed', onStatus)
    return () => window.removeEventListener('officer:status-changed', onStatus)
  }, [officer?.outletId])

  if (!officer) return null

  const isUnmatchedToken = (tokenId: string) => unmatchedTokens.some((u) => u.id === tokenId)

  const isIncomingTransferredToken = (t: Token) => {
    if ((t as any).isTransferred !== true) return false
    if ((t as any).lastTransferByOfficerId === officer.id) return false
    if (isUnmatchedToken(t.id)) return false

    const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
    const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []

    return (t as any).counterNumber === officer.counterNumber || tokenServices.some((s: any) => 
      officerServices.some((os: any) => String(os).toUpperCase() === String(s).toUpperCase())
    )
  }

  const matchesMyQueueRules = (t: Token) => {
    if ((t as any).isTransferred === true) return false
    if (isUnmatchedToken(t.id)) return false

    const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
    const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
    const hasServiceMatch = tokenServices.length === 0 || officerServices.length === 0 || tokenServices.some((s: any) => 
      officerServices.some((os: any) => String(os).toUpperCase() === String(s).toUpperCase())
    )
    const prefs = Array.isArray((t as any).preferredLanguages) ? (t as any).preferredLanguages : []
    const langs = Array.isArray((officer as any)?.languages) ? (officer as any).languages : []
    const hasLanguageMatch = prefs.length === 0 || langs.length === 0 || prefs.some((p: any) => 
      langs.some((l: any) => String(l).toUpperCase() === String(p).toUpperCase())
    )

    return hasServiceMatch && hasLanguageMatch
  }

  const myQueueTokens = queue?.waiting.filter(matchesMyQueueRules) || []
  const incomingTransferredTokens = queue?.waiting.filter(isIncomingTransferredToken) || []
  const sortedMyQueueTokens = [...myQueueTokens].sort((a, b) => {
    if (a.isPriority && !b.isPriority) return -1
    if (!a.isPriority && b.isPriority) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
  const sortedIncomingTransferredTokens = [...incomingTransferredTokens].sort((a, b) => {
    if (a.isPriority && !b.isPriority) return -1
    if (!a.isPriority && b.isPriority) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
  const sortedUnmatchedTokens = [...unmatchedTokens].sort((a, b) => {
    if (a.isPriority && !b.isPriority) return -1
    if (!a.isPriority && b.isPriority) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
  const sortedCallableMyQueueTokens = sortedMyQueueTokens.filter((t) => t.status !== 'skipped')
  const sortedCallableTransferredTokens = sortedIncomingTransferredTokens.filter((t) => t.status !== 'skipped')
  const sortedCallableUnmatchedTokens = sortedUnmatchedTokens.filter((t) => t.status !== 'skipped')
  const hasTransferredAttention = incomingTransferredTokens.length > 0
  const hasCallableMyQueueToken = sortedCallableMyQueueTokens.length > 0
  const hasCallableIncomingTransfer = sortedCallableTransferredTokens.length > 0
  const hasCallableUnmatchedToken = sortedCallableUnmatchedTokens.length > 0
  const hasCallableTokenForActiveTab = activeTab === 'my-queue'
    ? hasCallableMyQueueToken
    : activeTab === 'transferred'
      ? hasCallableIncomingTransfer
      : hasCallableUnmatchedToken

  return (
    <div className="h-[calc(100vh-64px)] bg-slate-50 p-4 flex flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-[1600px] flex-1 flex flex-col min-h-0">
        {/* Header Section in Body */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                {formatDate(currentDateTime)} &bull; {formatTime(currentDateTime)}
              </p>
              {queueLoading && <span className="text-xs text-amber-600 font-bold animate-pulse">Refreshing...</span>}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 flex items-center justify-center gap-2 text-sm font-bold shadow-md shadow-amber-200 transition-all ${refreshing ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              <RefreshCwIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Queue
            </motion.button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Tab Navigation */}
          <div className="w-full overflow-x-auto shrink-0 pb-1 scrollbar-hide">
            <div className="flex gap-2 min-w-max justify-start lg:justify-center">
              {[
                { id: 'my-queue', label: 'My Queue', color: 'amber', count: myQueueTokens.length },
                { id: 'transferred', label: 'Transferred', color: 'indigo', count: incomingTransferredTokens.length },
                { id: 'unmatched', label: 'Unmatched', color: 'slate', count: unmatchedTokens.length, warning: unmatchedTokens.length > 0 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-xl transition-all border flex items-center gap-2 ${activeTab === tab.id
                    ? `bg-${tab.color === 'amber' ? 'amber-600' : tab.color === 'indigo' ? 'indigo-600' : 'slate-700'} text-white border-transparent shadow-md`
                    : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
                    }`}
                >
                  <span className="whitespace-nowrap">{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                    {tab.count}
                  </span>
                  {tab.warning && activeTab !== tab.id && (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Flex Container for Current Customer and Queue List */}
          <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-h-0">
            {/* Current Customer Section - Top on mobile, Left on desktop (1/2 width) */}
            <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5 h-full overflow-y-auto custom-scrollbar">
              {!currentToken ? (
                <>
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Current Customer</h2>
                    <div className="text-center py-6 sm:py-8">
                      <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4 bg-indigo-50 rounded-2xl">
                        <Users className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ready to Serve</h3>
                      <p className="text-gray-600 mb-6 text-sm px-4">Click the button below to call the next customer</p>
                      <button
                        onClick={handleNextToken}
                        disabled={
                          loading ||
                          officer.status !== "available" ||
                          !queue ||
                          !hasCallableTokenForActiveTab
                        }
                        className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-700 border-2 border-indigo-600 rounded-xl font-bold transition-all disabled:bg-gray-200 disabled:border-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed text-sm shadow-md shadow-indigo-200 active:scale-95"
                      >
                        {loading ? "Loading..." : "Call Next Token"}
                      </button>
                    {queue && !hasCallableTokenForActiveTab && (
                      <p className="mt-4 text-xs sm:text-sm text-slate-500 bg-slate-50 inline-block px-3 py-1.5 rounded-lg border border-slate-100">
                        {activeTab === 'my-queue'
                          ? 'No customers are waiting in My Queue.'
                          : activeTab === 'transferred'
                            ? 'No customers are waiting in Transferred Tokens.'
                            : 'No customers are waiting in Unmatched Tokens.'}
                      </p>
                    )}
                    {officer.status !== "available" && (
                      <div className="mt-4 p-2 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-xs font-bold text-red-600 flex items-center gap-1 justify-center">
                          <AlertTriangle className="w-3 h-3" /> Status must be "Available"
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Current Customer</h2>

                  {/* Token Number Card */}
                  <div className="rounded-2xl border border-slate-200 p-4 mb-4 text-center">
                    <div className="text-xs text-gray-600 mb-2">TOKEN NUMBER</div>
                    <div className="text-5xl font-bold text-blue-600">{currentToken.tokenNumber}</div>
                  </div>

                  {/* Customer Details Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 mb-4 grid grid-cols-2 gap-4">
                    {/* Customer Name hidden for privacy */}

                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> Phone Number</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {currentToken.customer?.mobileNumber || 'N/A'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-gray-500 flex items-center gap-1"><FileText className="w-3 h-3 text-gray-400" /> Service Type</div>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(currentToken.serviceTypes) && currentToken.serviceTypes.length > 0 ? (
                          currentToken.serviceTypes.map((stype: string) => (
                            <span key={stype} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getServiceColor(stype)}`}>
                              <ServiceName serviceType={stype} />
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">No service</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" /> Waited Time</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {Math.floor((Date.now() - new Date(currentToken.createdAt).getTime()) / 60000)} min
                      </div>
                    </div>

                    {/* Preferred Languages */}
                    {Array.isArray((currentToken as any).preferredLanguages) && (currentToken as any).preferredLanguages.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-gray-500 flex items-center gap-1">Languages:</div>
                        <div className="flex gap-1">
                          {(currentToken as any).preferredLanguages.map((lang: string) => (
                            <span key={lang} className="px-2 py-0.5 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-300">
                              {lang.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bill Payment Info Card — show simplified SLT Number, Account Name, and Bill Status */}
                  {(currentToken.serviceTypes.includes('SVC002') || currentToken.serviceTypes.includes('BILL_PAYMENT')) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></div>
                        <h3 className="text-sm font-bold text-amber-900">Bill Payment Details</h3>
                      </div>

                      {/* Summary of Payment Intent & Method */}
                      {(currentToken.billPaymentIntent || currentToken.billPaymentMethod) && (
                        <div className="mb-4 p-3 bg-white/60 border border-amber-200 rounded-xl grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-amber-800 text-[10px] uppercase font-bold tracking-wider">Payment Plan</span>
                            <span className="font-bold text-sm text-amber-900">
                              {currentToken.billPaymentIntent === 'full' ? 'Full Payment' : 'Partial Payment'}
                            </span>
                          </div>
                          {currentToken.billPaymentAmount && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-amber-800 text-[10px] uppercase font-bold tracking-wider">Planned Amount</span>
                              <span className="font-bold text-sm text-amber-900">LKR {currentToken.billPaymentAmount.toLocaleString()}</span>
                            </div>
                          )}
                          {currentToken.billPaymentMethod && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-amber-800 text-[10px] uppercase font-bold tracking-wider">Payment Method</span>
                              <span className="font-bold text-sm uppercase text-amber-900">{currentToken.billPaymentMethod.replace('_', ' ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {multipleBills.length > 0 ? (
                          multipleBills.map((bill) => (
                            <div key={bill.telephoneNumber} className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                              <div className="flex-1 w-full space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">SLT Number</span>
                                    <span className="font-mono font-semibold text-gray-800 text-sm">{bill.telephoneNumber}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Account Name</span>
                                    <span className="text-sm font-semibold text-gray-800 truncate" title={bill.accountName}>{bill.accountName}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Bill Status</span>
                                    <div>
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {bill.status.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Bill Amount</span>
                                    <span className="font-bold text-sm text-gray-900">
                                      {bill.currentBill !== undefined && bill.currentBill !== null ? `LKR ${bill.currentBill.toLocaleString()}` : '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {bill.accountNumber && (
                                <div className="flex flex-col items-center sm:items-end w-full sm:w-auto sm:border-l sm:border-slate-100 sm:pl-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                                  <Barcode value={bill.accountNumber} height={45} width={1.5} fontSize={14} displayValue={true} background="transparent" margin={0} />
                                </div>
                              )}
                            </div>
                          ))
                        ) : billInfo ? (
                          <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                            <div className="flex-1 w-full space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">SLT Number</span>
                                  <span className="font-mono font-semibold text-gray-800 text-sm">{currentToken.sltTelephoneNumber}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Account Name</span>
                                  <span className="text-sm font-semibold text-gray-800 truncate" title={billInfo.accountName}>{billInfo.accountName}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Bill Status</span>
                                  <div>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${billInfo.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      {billInfo.status.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Bill Amount</span>
                                  <span className="font-bold text-sm text-gray-900">
                                    {billInfo.currentBill !== undefined && billInfo.currentBill !== null ? `LKR ${billInfo.currentBill.toLocaleString()}` : '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {billInfo.accountNumber && (
                              <div className="flex flex-col items-center sm:items-end w-full sm:w-auto sm:border-l sm:border-slate-100 sm:pl-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                                <Barcode value={billInfo.accountNumber} height={45} width={1.5} fontSize={14} displayValue={true} background="transparent" margin={0} />
                              </div>
                            )}
                          </div>
                        ) : currentToken.sltTelephoneNumber ? (
                          <p className="text-xs text-amber-700 italic">Fetching bill details...</p>
                        ) : (
                          <p className="text-xs text-gray-500 italic">No bill details available</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Central Voice Announcement Status & Control */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-blue-700">
                        <Volume2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Central Announcement</span>
                      </div>
                      <span className="text-[10px] text-blue-600 mt-0.5">Token call announced on main display.</span>
                    </div>
                    <button
                      onClick={() => handleReannounce(currentToken.id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 fill-current" /> Call
                    </button>
                  </div>

                  {/* Update Customer Details (Optional) & Notes */}
                  <details className="mb-4 group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <summary className="p-3 text-sm font-bold text-slate-800 cursor-pointer bg-slate-50 hover:bg-slate-100 select-none flex items-center justify-between">
                      Update Details & Notes (Optional)
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-3 border-t border-slate-200 space-y-3 bg-white">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
                          <input
                            type="text"
                            value={customerMobile}
                            onChange={(e) => setCustomerMobile(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                            placeholder="07XXXXXXXX"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={accountRef}
                          onChange={(e) => setAccountRef(e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-gray-400 focus:outline-none resize-none"
                          placeholder="Add notes here..."
                        />
                      </div>
                    </div>
                  </details>

                  {/* Action Buttons */}                  <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-stretch sm:justify-center">
                    <button
                      onClick={() => handleSkip()}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-orange-500 text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-orange-600 transition-all disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed active:scale-95 shadow-sm shadow-orange-100"
                    >
                      Skip Customer
                    </button>
                    <button
                      onClick={() => {
                        setIsTransferModalOpen(true)
                        if (officer) fetchCounters(officer.outletId)
                      }}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-indigo-700 transition-all disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed active:scale-95 shadow-sm shadow-indigo-100"
                    >
                      Transfer
                    </button>
                    <button
                      onClick={handleCompleteService}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-emerald-700 transition-all disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed active:scale-95 shadow-sm shadow-emerald-100"
                    >
                      Complete
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Queue List - Bottom on mobile, Right on desktop (1/2 width) */}
            <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-5 h-full flex flex-col min-h-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 px-1">
                <h2 className="text-lg font-bold text-slate-900 border-l-4 border-amber-500 pl-3">
                  {activeTab === 'my-queue' ? 'My Queue' : activeTab === 'transferred' ? 'Transferred Tokens' : 'Unmatched Tokens'}
                </h2>
                {officer && (
                  <div className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-amber-600">{queue?.waiting.length || 0}</span> Waiting &bull; <span className="text-indigo-600">Counter {officer.counterNumber}</span>
                  </div>
                )}
              </div>

              {/* Alert banner for incoming transferred tokens */}
              {activeTab === 'my-queue' && hasTransferredAttention && (
                <div className="mb-4 bg-orange-50 border border-orange-300 rounded-xl p-3 flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-orange-800">Transferred customers waiting — serve them first!</p>
                    <p className="text-xs text-orange-700">Open the Transferred Tokens tab. These customers already waited in another queue and are prioritised.</p>
                  </div>
                </div>
              )}

              {/* Warning for Unmatched Tab */}
              {activeTab === 'unmatched' && unmatchedTokens.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-2 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">Unmatched Tokens Detected</p>
                      <p className="text-xs text-yellow-700">
                        There are no active officers to serve these tokens. Calling from this tab will assign the oldest waiting unmatched customer to your counter.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Content Based on Active Tab */}
              {activeTab === 'my-queue' ? (
                // MY QUEUE TAB - Show filtered tokens
                !queue ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Loading queue...</p>
                  </div>
                ) : myQueueTokens.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No customers in your queue</p>
                    <p className="text-xs text-gray-400 mt-2">Tokens matching your services and languages will appear here</p>
                  </div>
                ) : (
                  <>
                    {/* Table Head */}
                    <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-800 border-b text-xs font-semibold text-slate-200 rounded-xl tracking-wide mb-3 uppercase text-center">
                      <div className="col-span-2 text-left">No</div>
                      {showServiceTypeInQueue && <div className="col-span-3 text-left">Service</div>}
                      <div className={showServiceTypeInQueue ? "col-span-2" : "col-span-5"}>Wait Time</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-3 text-right">Action</div>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {sortedMyQueueTokens.map((t) => {
                        const waitTime = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
                        const isPriority = t.isPriority === true
                        const isSkipped = t.status === 'skipped'
                        return (
                          <div key={t.id} className={`lg:grid lg:grid-cols-12 flex flex-col gap-4 px-4 py-4 hover:bg-slate-50 transition-colors border rounded-xl ${isSkipped ? 'bg-orange-50/50 border-orange-100' : isPriority ? 'bg-yellow-50/50 border-yellow-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                            {/* Mobile Layout Headers are shown through labels or flex items */}
                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-start gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Token</span>
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-black ${isPriority ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                {t.tokenNumber} {isPriority && '★'}
                              </span>
                            </div>
                            
                            {/* Customer column removed for privacy */}

                            {showServiceTypeInQueue && (
                              <div className="lg:col-span-3 flex items-center justify-between lg:justify-start gap-2">
                                <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Service</span>
                                {Array.isArray(t.serviceTypes) && t.serviceTypes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {t.serviceTypes.map((stype: string) => (
                                      <span key={stype} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getServiceColor(stype)} ring-1 ring-white/20`}>
                                        <ServiceName serviceType={stype} />
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] italic text-slate-400">Default</span>
                                )}
                              </div>
                            )}

                            <div className={`${showServiceTypeInQueue ? "lg:col-span-2" : "lg:col-span-5"} flex items-center justify-between lg:justify-center gap-2`}>
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Wait Time</span>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100/50 px-2 py-1 rounded-lg">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {waitTime} min
                              </div>
                            </div>

                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-center gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Status</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${isSkipped
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                {isSkipped ? 'Skipped' : 'Waiting'}
                              </span>
                            </div>

                            <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-2 mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Actions</span>
                              <div className="flex gap-2">
                                {isSkipped ? (
                                  <button
                                    onClick={() => handleRecall(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm shadow-indigo-100"
                                  >
                                    Recall
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSkip(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-3 py-1.5 bg-orange-500 text-white text-[10px] font-bold rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50 shadow-sm shadow-orange-100"
                                  >
                                    Skip
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSetPriority(t.id)}
                                  disabled={loading || currentToken !== null}
                                  className={`px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all disabled:opacity-50 shadow-sm ${t.isPriority ? 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-100' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-100'}`}
                                >
                                  {isPriority ? '★ VIP' : 'Prioritize'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              ) : activeTab === 'transferred' ? (
                // TRANSFERRED TOKENS TAB — tokens transferred to this officer
                !queue ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 font-medium animate-pulse">Loading transferred tokens...</p>
                  </div>
                ) : incomingTransferredTokens.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <RefreshCwIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-600 font-bold">No transferred tokens</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Tokens transferred specifically to your counter or service will appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs font-medium text-indigo-700 flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white">
                        <Users className="w-4 h-4" />
                      </div>
                      <p>These customers were transferred from another counter. Prioritize serving them as they have already waited.</p>
                    </div>
                    
                    <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2.5 bg-indigo-900 border-b text-xs font-semibold text-white rounded-xl mb-3 tracking-wide uppercase">
                      <div className="col-span-2">Token</div>
                      <div className="col-span-3">Service</div>
                      <div className="col-span-2">Total Wait</div>
                      <div className="col-span-3">Origin</div>
                      <div className="col-span-2 text-right">Action</div>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {sortedIncomingTransferredTokens.map((t) => {
                        const waitTime = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
                        const isPriority = t.isPriority === true
                        const isSkipped = t.status === 'skipped'
                        return (
                          <div key={t.id} className={`lg:grid lg:grid-cols-12 flex flex-col gap-4 px-4 py-4 hover:bg-slate-50 transition-colors border rounded-xl relative overflow-hidden ${isSkipped ? 'bg-orange-50/50 border-orange-100' : isPriority ? 'bg-white border-indigo-100 shadow-sm ring-1 ring-yellow-400' : 'bg-white border-indigo-100 shadow-sm'}`}>
                            {isPriority && <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-400 rounded-bl-xl flex items-center justify-center text-white"><Star className="w-4 h-4" /></div>}
                            
                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-start gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Token</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-sm font-bold ${isPriority ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                ↗ {t.tokenNumber}
                              </span>
                            </div>

                            {/* Customer column removed for privacy */}

                            <div className="lg:col-span-3 flex items-center justify-between lg:justify-start gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Services</span>
                              <div className="flex flex-wrap gap-1">
                                {t.serviceTypes.map((stype: string) => (
                                  <span key={stype} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getServiceColor(stype)}`}>
                                    <ServiceName serviceType={stype} />
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-start gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Total Wait</span>
                              <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                                {waitTime} min
                              </div>
                            </div>

                            <div className="lg:col-span-3 flex items-center justify-between lg:justify-start gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Origin</span>
                              {(t as any).counterNumber ? (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                                  Counter {(t as any).counterNumber}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400">General Queue</span>
                              )}
                            </div>

                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-2 mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Action</span>
                              <div className="flex gap-2">
                                {isSkipped ? (
                                  <button
                                    onClick={() => handleRecall(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm shadow-indigo-100"
                                  >
                                    Recall
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSkip(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-3 py-1.5 bg-orange-500 text-white text-[10px] font-bold rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50 shadow-sm shadow-orange-100"
                                  >
                                    Skip
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSetPriority(t.id)}
                                  disabled={loading || currentToken !== null}
                                  className={`px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all disabled:opacity-50 shadow-sm ${isPriority
                                    ? 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-100'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                                    }`}
                                >
                                  {isPriority ? '★ VIP' : 'Prioritize'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              ) : (
                // UNMATCHED TOKENS TAB - Show unmatched tokens
                unmatchedTokens.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-slate-600 font-bold">No unmatched tokens</p>
                    <p className="text-xs text-slate-400 mt-1">Excellent! All customers are assigned to appropriate service officers.</p>
                  </div>
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-800 border-b text-xs font-semibold text-slate-200 rounded-xl tracking-wide mb-3 uppercase text-center">
                      <div className="col-span-2 text-left">Token</div>
                      <div className="col-span-3 text-left">Service</div>
                      <div className="col-span-2">Wait Time</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-3 text-right">Action</div>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {sortedUnmatchedTokens.map((t) => {
                        const waitTime = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
                        const isPriority = t.isPriority === true
                        const isSkipped = t.status === 'skipped'

                        return (
                          <div key={t.id} className={`lg:grid lg:grid-cols-12 flex flex-col gap-4 px-4 py-4 hover:bg-slate-50 transition-colors border rounded-xl ${isSkipped ? 'bg-orange-50/50 border-orange-100' : isPriority ? 'bg-yellow-50/50 border-yellow-200 ring-1 ring-yellow-400' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-start gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Token</span>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-sm font-bold ${isPriority ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-700'}`}>
                                  {t.tokenNumber} {isPriority && '★'}
                                </span>
                                {(t as any)?.fromAppointment && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-bold border border-indigo-100">
                                    <Calendar className="w-2.5 h-2.5" /> Booked
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Customer column removed for privacy */}

                            <div className="lg:col-span-3 flex items-center justify-between lg:justify-start gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Service</span>
                              <div className="flex flex-wrap gap-1">
                                {t.serviceTypes.map((stype: string) => (
                                  <span key={stype} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getServiceColor(stype)}`}>
                                    <ServiceName serviceType={stype} />
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-center gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Wait Time</span>
                              <div className="text-xs font-bold text-slate-600 bg-slate-100/50 px-2 py-1 rounded-lg">
                                {waitTime} min
                              </div>
                            </div>

                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-center gap-2">
                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Status</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${isSkipped
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-amber-100 text-amber-800'
                                }`}>
                                {isSkipped ? 'Skipped' : 'Waiting'}
                              </span>
                            </div>

                            <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-2 mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">

                              <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Action</span>
                              <div className="flex gap-2">
                                {isSkipped ? (
                                  <button
                                    onClick={() => handleRecall(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm shadow-indigo-100"
                                  >
                                    Recall
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSkip(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-3 py-1.5 bg-orange-500 text-white text-[10px] font-bold rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50 shadow-sm shadow-orange-100"
                                  >
                                    Skip
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSetPriority(t.id)}
                                  disabled={loading || currentToken !== null}
                                  className={`px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all disabled:opacity-50 shadow-sm ${isPriority
                                    ? 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-100'
                                    : 'bg-slate-700 hover:bg-slate-900 shadow-slate-100'
                                    }`}
                                >
                                  {isPriority ? 'VIP' : 'Prioritize'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Transfer Customer</h2>
            <p className="text-sm text-gray-600 mb-6">Select a service and the officer to transfer to.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Service Selection — single choice */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Service</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {allServices.map((service) => (
                    <label key={service.id} className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${transferServices[0] === service.code ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                      <input
                        type="radio"
                        name="transferService"
                        className="mt-0.5 w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={transferServices[0] === service.code}
                        onChange={() => setTransferServices([service.code])}
                      />
                      <div className="flex-1">
                        <div className={`text-xs font-semibold ${transferServices[0] === service.code ? 'text-blue-700' : 'text-gray-900'}`}>{service.title}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Officer Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Transfer To Officer</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {counters.filter(c => c.isStaffed && c.officer && c.officer.id !== officer?.id).length === 0 ? (
                    <p className="text-xs text-gray-500 py-2 text-center">No other officers currently available</p>
                  ) : (
                    counters
                      .filter(c => c.isStaffed && c.officer && c.officer.id !== officer?.id)
                      .map((c) => (
                        <button
                          key={c.officer.id}
                          type="button"
                          onClick={() => {
                            setTargetOfficer({ id: c.officer.id, name: c.officer.name, counterNumber: c.number })
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all flex justify-between items-center ${
                            targetOfficer?.id === c.officer.id
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              c.officer.status === 'available' ? 'bg-green-400'
                              : c.officer.status === 'serving' ? 'bg-amber-400'
                              : 'bg-gray-300'
                            }`} />
                            <span>{c.officer.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-500">{c.number ? `Counter #${c.number}` : 'No counter'}</span>
                        </button>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Transfer Notes */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Transfer Notes</label>
              <textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Brief reason for transfer (e.g., requires manager override)"
                className="w-full px-4 py-2.5 bg-gray-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                rows={2}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setIsTransferModalOpen(false)
                  setTargetOfficer(null)
                  setTransferServices([])
                  setTransferNotes("")
                }}
                className="w-full sm:flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-300 rounded-2xl text-sm hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={loading || transferServices.length === 0 || !targetOfficer}
                className="w-full sm:flex-[2] px-4 py-3 bg-blue-600 text-white font-bold border-b-2 border-slate-900 rounded-2xl text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px] active:translate-y-[1px]"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCwIcon className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  "Initiate Transfer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
