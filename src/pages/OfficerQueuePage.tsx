"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { User, Clock, Phone, FileText, Users, RefreshCwIcon, Calendar, AlertTriangle } from "lucide-react"
// OfficerTopBar is provided globally from Layout for officer routes
import api, { WS_URL } from "../config/api"
import type { Officer, Token } from "../types"
import IPSpeaker from "../components/IPSpeaker"
import ServiceName from "../components/ServiceName"
import { getServiceColor } from "../utils/serviceUtils"

export default function OfficerQueuePage() {
  const navigate = useNavigate()
  const [officer, setOfficer] = useState<Officer | null>(null)
  const [currentToken, setCurrentToken] = useState<Token | null>(null)
  const [queue, setQueue] = useState<{ waiting: Token[]; inService: Token[]; availableOfficers: number; totalWaiting: number } | null>(null)
  const [accountRef, setAccountRef] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [queueLoading, setQueueLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<'my-queue' | 'unmatched'>('my-queue')
  const [unmatchedTokens, setUnmatchedTokens] = useState<Token[]>([])
  const TWILIO_TO_NUMBER = import.meta.env.VITE_TWILIO_TO_NUMBER

  // Helpers for language selection from a token's preferredLanguages
  const toLangArray = (val: any): string[] => {
    try {
      if (!val) return []
      if (Array.isArray(val)) return val.filter(v => typeof v === 'string') as string[]
      if (typeof val === 'string') {
        const parsed = JSON.parse(val)
        return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : []
      }
      if (typeof val === 'object') {
        return Object.values(val).filter(v => typeof v === 'string') as string[]
      }
    } catch { }
    return []
  }

  const pickLang = (token?: any): 'en' | 'si' | 'ta' => {
    const arr = toLangArray(token?.preferredLanguages)
    const l = (arr[0] as any) || 'en'
    return l === 'si' || l === 'ta' ? l : 'en'
  }

  const langText = {
    // Put required lang first, optional counter second (fix TS param order)
    proceed: (lang: 'en' | 'si' | 'ta', counter?: number) => ({
      en: `Please proceed to counter ${counter ?? ''} for your service.`,
      si: `කරුණාකර ඔබගේ සේවා සඳහා ${counter ?? ''} කවුටරයට පැමිණෙන්න.`,
      ta: `தயவுசெய்து உங்கள் சேவைக்காக ${counter ?? ''} கவுண்டருக்கு செல்லவும்.`,
    })[lang],
    skipped: (lang: 'en' | 'si' | 'ta') => ({
      en: `Your token has been skipped.`,
      si: `ඔබගේ ටෝකනය මඟ හැර තිබේ.`,
      ta: `உங்கள் டோக்கன் தவிர்க்கப்பட்டுள்ளது.`,
    })[lang],
    recalled: (lang: 'en' | 'si' | 'ta', counter?: number) => ({
      en: `You have been recalled to counter ${counter ?? ''} for your service.`,
      si: `ඔබගේ සේවාව සඳහා ඔබව ${counter ?? ''} කවුටරයට නැවත කැඳවා ඇත.`,
      ta: `உங்கள் சேவைக்காக ${counter ?? ''} கவுண்டருக்கு உங்களை மீண்டும் அழைத்திருக்கிறோம்.`,
    })[lang],
    completed: (
      ref: string | null,
      _track: string | null,
      lang: 'en' | 'si' | 'ta',
      _extra?: { officerName?: string; outletName?: string; servicesStr?: string }
    ) => ({
      /*en: ref
        ? `Your service is completed. Officer: ${extra?.officerName ?? ''} | Outlet: ${extra?.outletName ?? ''} | Services: ${extra?.servicesStr ?? ''} |Ref: ${ref}. Track: ${track ?? ''}`
        : `Service completed. Thank you for visiting.`,
      si: ref
        ? `ඔබගේ සේවාව සම්පූර්ණ විය. නිලධාරී: ${extra?.officerName ?? ''} | ශාඛාව: ${extra?.outletName ?? ''} | සේවාවන්: ${extra?.servicesStr ?? ''} | යොමු අංකය: ${ref}. පථය: ${track ?? ''}`
        : `සේවාව සම්පූර්ණයි. පැමිණියේට ස්තුති.`,
      ta: ref
        ? `உங்கள் சேவை முடிந்தது. அதிகாரி: ${extra?.officerName ?? ''} | கிளை: ${extra?.outletName ?? ''} | சேவைகள்: ${extra?.servicesStr ?? ''} | குறிப்பு: ${ref}. கண்காணிப்பு: ${track ?? ''}`
        : `சேவை முடிந்தது. வருகைக்கு நன்றி.`,*/
      en: ref
        ? `Your service is completed |Ref: ${ref}.}`
        : `Service completed. Thank you for visiting.`,
      si: ref
        ? `ඔබගේ සේවාව සම්පූර්ණ විය | යොමු අංකය: ${ref}.}`
        : `සේවාව සම්පූර්ණයි. පැමිණියේට ස්තුති.`,
      ta: ref
        ? `உங்கள் சேவை முடிந்தது | குறிப்பு: ${ref}.}`
        : `சேவை முடிந்தது. வருகைக்கு நன்றி.`,
    })[lang],
  }

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
    api.get('/officer/me').then(res => {
      if (!mounted) return
      const me: Officer = res.data.officer
      setOfficer(me)
      fetchQueue(me.outletId)
      fetchCurrentToken(me.id)
      fetchUnmatchedTokens(me.outletId)

      // Auto-refresh every 15 seconds for critical queue updates
      const interval = setInterval(() => {
        fetchQueue(me.outletId)
        fetchCurrentToken(me.id)
        fetchUnmatchedTokens(me.outletId)
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

          if (data.type === "NEW_TOKEN" || data.type === "TOKEN_COMPLETED" || data.type === 'TOKEN_SKIPPED' || data.type === 'TOKEN_CALLED' || data.type === 'TOKEN_RECALLED') {
            // Add a small delay to ensure database consistency
            setTimeout(() => {
              fetchQueue(me.outletId)
              fetchCurrentToken(me.id)
              fetchUnmatchedTokens(me.outletId)
            }, 100)
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
      if (ws) ws.close()
    }
  }, [navigate])

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])


  const fetchQueue = async (outletId?: string) => {
    if (!outletId) return
    try {
      setQueueLoading(true)
      const res = await api.get(`/queue/outlet/${outletId}`)
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
      // Officer stats returns currentToken; re-use it to keep parity with dashboard
      const res = await api.get(`/officer/stats/${officerId}`)
      setCurrentToken(res.data.currentToken)
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

  const handleNextToken = async () => {
    if (!officer) return
    setLoading(true)
    try {
      // Check if there are matching tokens in "My Queue"
      const matchingTokens = queue?.waiting.filter((t) => {
        const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
        const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
        const hasServiceMatch = tokenServices.length === 0 || officerServices.length === 0 || tokenServices.some((s: any) => officerServices.includes(s))
        const prefs = Array.isArray((t as any).preferredLanguages) ? (t as any).preferredLanguages : []
        const langs = Array.isArray((officer as any)?.languages) ? (officer as any).languages : []
        const hasLanguageMatch = prefs.length === 0 || langs.length === 0 || prefs.some((p: any) => langs.includes(p))
        return hasServiceMatch && hasLanguageMatch && (t as any).status !== 'skipped'
      }) || []

      // If no matching tokens but there are unmatched tokens, ask to call unmatched
      if (matchingTokens.length === 0 && unmatchedTokens.length > 0) {
        const confirmed = confirm('No tokens in your queue. Do you want to call an unmatched token? This token may require translation assistance or escalation.')
        if (!confirmed) {
          setLoading(false)
          return
        }

        // Call with allowUnmatched flag
        const response = await api.post('/officer/next-token', {
          officerId: officer.id,
          allowUnmatched: true
        })

        if (response.data.token) {
          const picked = response.data.token
          // Send localized proceed message
          try {
            const lang = pickLang(picked)
            const resp = await api.post('/twilio/test', {
              to: TWILIO_TO_NUMBER,
              body: langText.proceed(lang, officer.counterNumber),
            })
            if (resp.data?.success) {
              console.log('[TEST SMS][PROCEED][UNMATCHED]', resp.data)
            } else {
              console.warn('[TEST SMS][PROCEED][UNMATCHED][FAILED]', resp.data)
            }
          } catch (err: any) {
            console.error('Test SMS failed:', err)
            alert('Test SMS failed: ' + (err.response?.data?.error || err.message || 'Unknown error'))
          }
          setCurrentToken(picked)
          setAccountRef("")
          fetchQueue(officer.outletId)
        }
        setLoading(false)
        return
      }

      // Normal flow - call matching tokens or use fallback
      const response = await api.post('/officer/next-token', { officerId: officer.id })
      if (response.data.fallbackAllowed && !response.data.token) {
        const confirmed = confirm('No online/available relevant officers for this service. Do you want to call the next customer cross-service?')
        if (!confirmed) return
        const confirmRes = await api.post('/officer/next-token', { officerId: officer.id, allowFallback: true })
        if (confirmRes.data.token) {
          const picked = confirmRes.data.token
          // Send localized proceed message
          try {
            const lang = pickLang(picked)
            const resp = await api.post('/twilio/test', {
              to: TWILIO_TO_NUMBER,
              body: langText.proceed(lang, officer.counterNumber),
            })
            if (resp.data?.success) {
              console.log('[TEST SMS][PROCEED]', resp.data)
            } else {
              console.warn('[TEST SMS][PROCEED][FAILED]', resp.data)
            }
          } catch (err: any) {
            console.error('Test SMS failed:', err)
            alert('Test SMS failed: ' + (err.response?.data?.error || err.message || 'Unknown error'))
          }
          setCurrentToken(picked)
          setAccountRef("")
          fetchQueue(officer.outletId)
        }
      } else if (response.data.token) {
        console.log('Received token data:', response.data.token)
        console.log('Customer name:', response.data.token.customer?.name)
        const picked = response.data.token
        try {
          const lang = pickLang(picked)
          const resp = await api.post('/twilio/test', {
            to: TWILIO_TO_NUMBER,
            body: langText.proceed(lang, officer.counterNumber),
          })
          if (resp.data?.success) {
            console.log('[TEST SMS][PROCEED]', resp.data)
          } else {
            console.warn('[TEST SMS][PROCEED][FAILED]', resp.data)
          }
        } catch (err: any) {
          console.error('Test SMS failed:', err)
          alert('Test SMS failed: ' + (err.response?.data?.error || err.message || 'Unknown error'))
        }
        setCurrentToken(picked)
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
      // First complete the service to get reference number
      const completeResp = await api.post('/officer/complete-service', { tokenId: currentToken.id, officerId: officer.id, accountRef })
      const refNumber: string | null = completeResp.data?.refNumber || null
      const trackUrl: string | null = completeResp.data?.trackUrl || null
      const tokenData = completeResp.data?.token
      const officerName = tokenData?.officer?.name || officer.name || 'Officer'
      const outletName = tokenData?.outlet?.name || ''
      const servicesArray: string[] = Array.isArray(tokenData?.serviceTypes) ? tokenData.serviceTypes : []
      const servicesStr = servicesArray.length > 0 ? servicesArray.join(', ') : 'None'

      // Compose single SMS body matching backend console format with absolute Track URL
      // Example: Ref: 2025-11-08/Outlet/7 | Officer: Jane | Outlet: MainBranch | Services: BILL_PAYMENT, OTHERS. Track: https://app.example.com/service/status?ref=...
      const lang = pickLang(tokenData || currentToken)
      const body = langText.completed(refNumber, trackUrl, lang, { officerName, outletName, servicesStr })


      try {
        const smsResp = await api.post('/twilio/test', {
          to: TWILIO_TO_NUMBER,
          body,
        })
        if (smsResp.data?.success) {
          console.log('[TEST SMS][COMPLETE]', smsResp.data)
        } else {
          console.warn('[TEST SMS][COMPLETE][FAILED]', smsResp.data)
        }
      } catch (err: any) {
        console.error('SMS send failed:', err)
        alert('SMS failed: ' + (err.response?.data?.error || err.message || 'Unknown error'))
      }

      setCurrentToken(null)
      setAccountRef("")
      fetchQueue(officer.outletId)
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
      // Resolve token to read language
      const tokenObj = (currentToken && currentToken.id === targetTokenId)
        ? currentToken
        : (queue?.waiting || []).find(t => t.id === targetTokenId)
      const lang = pickLang(tokenObj)
      const resp = await api.post('/twilio/test', {
        to: TWILIO_TO_NUMBER,
        body: langText.skipped(lang),
      })
      if (resp.data?.success) {
        console.log('[TEST SMS][SKIP]', resp.data)
      } else {
        console.warn('[TEST SMS][SKIP][FAILED]', resp.data)
      }
    } catch (err: any) {
      console.error('Test SMS failed:', err)
      alert('Test SMS failed: ' + (err.response?.data?.error || err.message || 'Unknown error'))
    }
    try {
      await api.post('/officer/skip-token', { officerId: officer.id, tokenId: targetTokenId })
      if (!tokenId) {
        setCurrentToken(null)
      }
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
      const tokenObj = (currentToken && currentToken.id === tokenId)
        ? currentToken
        : (queue?.waiting || []).find(t => t.id === tokenId)
      const lang = pickLang(tokenObj)
      const resp = await api.post('/twilio/test', {
        to: TWILIO_TO_NUMBER,
        body: langText.recalled(lang, officer.counterNumber),
      })
      if (resp.data?.success) {
        console.log('[TEST SMS][RECALL]', resp.data)
      } else {
        console.warn('[TEST SMS][RECALL][FAILED]', resp.data)
      }
    } catch (err: any) {
      console.error('Test SMS failed:', err)
      alert('Test SMS failed: ' + (err.response?.data?.error || err.message || 'Unknown error'))
    }
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

  const handleSetPriority = async (tokenId: string) => {
    if (!officer) return
    setLoading(true)
    try {
      const response = await api.post('/officer/set-priority', { tokenId })
      if (response.data.success) {
        const isPriority = response.data.token.isPriority
        
        // If marking as priority, automatically call the customer to counter
        if (isPriority) {
          try {
            const callResponse = await api.post('/officer/call-token', { 
              officerId: officer.id, 
              tokenId 
            })
            if (callResponse.data.token) {
              setCurrentToken(callResponse.data.token)
              setAccountRef("")
            }
            alert('Customer marked as VIP priority and called to counter!')
          } catch (callErr: any) {
            console.error('Failed to call customer:', callErr)
            alert('Customer marked as VIP priority, but failed to call to counter')
          }
        } else {
          alert('Priority removed from customer')
        }
        
        fetchQueue(officer.outletId)
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
      await fetchQueue(officer.outletId)
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
        try { await fetchQueue(officer.outletId) } catch { }
      }
    }
    window.addEventListener('officer:status-changed', onStatus)
    return () => window.removeEventListener('officer:status-changed', onStatus)
  }, [officer?.outletId])

  if (!officer) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              {/*<h1 className="text-2xl font-bold text-gray-900">Queue Management</h1>*/}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-sm text-gray-500">
                  {formatDate(currentDateTime)} | {formatTime(currentDateTime)}
                </p>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  {queueLoading && <span className="flex items-center gap-1">🔄 Refreshing...</span>}
                  <span>Queue updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`px-2 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-700 flex items-center gap-2 ${refreshing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <RefreshCwIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setActiveTab('my-queue')}
                className={`px-6 py-2.5 font-medium text-sm transition-colors ${activeTab === 'my-queue'
                  ? 'border-b-2 border-black bg-white rounded-full hover:bg-gray-50'
                  : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-full'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>My Queue</span>
                  {queue && (
                    <span className="px-1.5 py-0.5 bg-black text-white rounded-full text-xs font-semibold">
                      {queue.waiting.filter((t) => {
                        const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
                        const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
                        const hasServiceMatch = tokenServices.length === 0 || officerServices.length === 0 || tokenServices.some(s => officerServices.includes(s))
                        const prefs = Array.isArray((t as any).preferredLanguages) ? (t as any).preferredLanguages : []
                        const langs = Array.isArray((officer as any)?.languages) ? (officer as any).languages : []
                        const hasLanguageMatch = prefs.length === 0 || langs.length === 0 || prefs.some((p: any) => langs.includes(p))
                        return hasServiceMatch && hasLanguageMatch
                      }).length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('unmatched')}
                className={`px-6 py-2.5 font-medium text-sm transition-colors ${activeTab === 'unmatched'
                  ? 'border-b-2 border-black bg-white rounded-full hover:bg-gray-50'
                  : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-full'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Unmatched Tokens</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${unmatchedTokens.length > 0
                    ? 'bg-black text-white'
                    : 'bg-black text-white'
                    }`}>
                    {unmatchedTokens.length}
                  </span>
                  {unmatchedTokens.length > 0 && (
                    <span className="px-2 py-0.5 text-red-600 rounded-full text-xs font-semibold animate-pulse flex">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Needs Attention
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Flex Container for Current Customer (Left) and Queue List (Right) */}
          <div className="flex gap-4 items-start">
            {/* Current Customer Section - Left Side (1/3 width) */}
            <div className="w-1/3 bg-white rounded-xl shadow-sm p-4 self-start sticky top-4">
              {!currentToken ? (
                <>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Current Customer</h2>
                  <div className="text-center py-6">
                    <div className="w-10 h-10 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to Serve</h3>
                    <p className="text-gray-600 mb-8 text-sm">Click the button below to call the next customer</p>
                    {/* Disable only when there are no callable (non-skipped) tokens */}
                    <button
                      onClick={handleNextToken}
                      disabled={
                        loading ||
                        officer.status !== "available" ||
                        !queue ||
                        // If waiting array exists, check for at least one token whose status !== 'skipped'
                        (Array.isArray(queue.waiting)
                          ? queue.waiting.filter(t => (t as any).status !== 'skipped').length === 0
                          : true)
                      }
                      className="px-6 py-1.5 bg-black text-white hover:text-black border-2 border-black rounded-full font-semibold hover:bg-gray-50 transition-colors disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-md"
                    >
                      {loading ? "Loading..." : "Call Next Token"}
                    </button>
                    {queue && Array.isArray(queue.waiting) && queue.waiting.filter(t => (t as any).status !== 'skipped').length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">No customers are waiting in the queue.</p>
                    )}
                    {officer.status !== "available" && (
                      <p className="mt-4 text-sm text-yellow-600">You must be available to call next token</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Current Customer</h2>

                  {/* Token Number Card */}
                  <div className="rounded-2xl border border-gray-200 p-4 mb-4 text-center">
                    <div className="text-xs text-gray-600 mb-2">TOKEN NUMBER</div>
                    <div className="text-5xl font-bold text-blue-600">{currentToken.tokenNumber}</div>
                  </div>

                  {/* Customer Details Card */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className="w-8 h-8 bg-white rounded-full border-b-2 border-black flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Customer Name</div>
                        <div className="text-sm font-semibold text-gray-900">{currentToken.customer.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className="w-8 h-8 bg-white rounded-full border-b-2 border-black flex items-center justify-center">
                        <Phone className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Phone Number</div>
                        <div className="text-sm font-semibold text-gray-900">{currentToken.customer.mobileNumber}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className="w-8 h-8 bg-white rounded-full border-b-2 border-black flex items-center justify-center">
                        <FileText className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Service Type</div>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(currentToken.serviceTypes) && currentToken.serviceTypes.length > 0 ? (
                            currentToken.serviceTypes.map((stype: string) => (
                              <span key={stype} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getServiceColor(stype)}`}>
                                <ServiceName serviceType={stype} />
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">No service types</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-full border-b-2 border-black flex items-center justify-center">
                        <Clock className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Waited Time</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {Math.floor((Date.now() - new Date(currentToken.createdAt).getTime()) / 60000)} min
                        </div>
                      </div>
                    </div>

                    {/* Preferred Languages */}
                    {Array.isArray((currentToken as any).preferredLanguages) && (currentToken as any).preferredLanguages.length > 0 && (
                      <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500">Preferred Languages:</div>
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

                  {/* IP Speaker Component */}
                  <div className="mb-4">
                    <IPSpeaker
                      token={currentToken}
                      counterNumber={officer?.counterNumber}
                    />
                  </div>

                  {/* Notes Section */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={accountRef}
                      onChange={(e) => setAccountRef(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-gray-400 focus:outline-none resize-none"
                      placeholder="Add notes here ..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => handleSkip()}
                      disabled={loading}
                      className="px-4 py-2.5 bg-orange-500 text-white font-bold border-b-2 border-black rounded-full text-sm hover:bg-gray-50 hover:text-orange-500 transition-colors disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      Skip Customer
                    </button>

                    <button
                      onClick={handleCompleteService}
                      disabled={loading}
                      className="px-6 py-2.5 bg-green-500 text-white font-bold border-b-2 border-black rounded-full text-sm hover:bg-gray-50 hover:text-green-500 transition-colors disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      Complete Service
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Queue List Section - Right Side (2/3 width) */}
            <div className="w-2/3 bg-white rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">{activeTab === 'my-queue' ? 'My Queue' : 'Unmatched Tokens'}</h2>
                {queue && (
                  <div className="text-sm text-gray-500">
                    Total waiting: {queue.waiting.length} |
                    Officer Languages: {Array.isArray((officer as any)?.languages) ? ((officer as any).languages as string[]).join(', ') : 'None'}
                  </div>
                )}
              </div>

              {/* Warning for Unmatched Tab */}
              {activeTab === 'unmatched' && unmatchedTokens.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-2 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">Unmatched Tokens Detected</p>
                      <p className="text-xs text-yellow-700">
                        There are no active officers to serve these tokens.
                        You can manually call them if needed, but they may require translation assistance or escalation because of language & service type mismatch.
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
                ) : queue.waiting.filter((t) => {
                  const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
                  const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
                  const hasServiceMatch = tokenServices.length === 0 || officerServices.length === 0 || tokenServices.some((s: any) => officerServices.includes(s))
                  const prefs = Array.isArray((t as any).preferredLanguages) ? (t as any).preferredLanguages : []
                  const langs = Array.isArray((officer as any)?.languages) ? (officer as any).languages : []
                  const hasLanguageMatch = prefs.length === 0 || langs.length === 0 || prefs.some((p: any) => langs.includes(p))
                  return hasServiceMatch && hasLanguageMatch
                }).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No customers in your queue</p>
                    <p className="text-xs text-gray-400 mt-2">Tokens matching your services and languages will appear here</p>
                  </div>
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-gray-900 border-b text-sm text-white rounded-full mb-3">
                      <div className="col-span-2">TOKEN</div>
                      <div className="col-span-2">CUSTOMER</div>
                      <div className="col-span-2">SERVICE TYPE</div>
                      <div className="col-span-2">WAITED TIME</div>
                      <div className="col-span-2">STATUS</div>
                      <div className="col-span-2">ACTION</div>
                    </div>

                    {/* Queue Items */}
                    <div className="divide-y divide-gray-100">
                      {queue.waiting.filter((t) => {
                        const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
                        const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
                        const hasServiceMatch = tokenServices.length === 0 || officerServices.length === 0 || tokenServices.some((s: any) => officerServices.includes(s))
                        const prefs = Array.isArray((t as any).preferredLanguages) ? (t as any).preferredLanguages : []
                        const langs = Array.isArray((officer as any)?.languages) ? (officer as any).languages : []
                        const hasLanguageMatch = prefs.length === 0 || langs.length === 0 || prefs.some((p: any) => langs.includes(p))
                        return hasServiceMatch && hasLanguageMatch
                      }).sort((a, b) => {
                        // Sort priority customers to the front
                        if (a.isPriority && !b.isPriority) return -1
                        if (!a.isPriority && b.isPriority) return 1
                        // Then by creation time (oldest first)
                        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                      }).map((t) => {
                        const waitTime = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
                        const isPriority = t.isPriority === true
                        const isSkipped = t.status === 'skipped'

                        return (
                          <div key={t.id} className={`grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 transition-colors ${isSkipped ? 'bg-orange-50 rounded-lg' : isPriority ? 'bg-yellow-50 rounded-lg border-l-4 border-yellow-400' : ''}`}>
                            <div className="col-span-2 flex items-center gap-2">
                              {isPriority ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-sm font-semibold">
                                  {t.tokenNumber} ★ Priority
                                </span>
                              ) : (
                                <span className="text-gray-900 font-semibold">{t.tokenNumber}</span>
                              )}
                              {(t as any)?.fromAppointment && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-semibold" title="Booked appointment">
                                  <Calendar className="w-3 h-3" /> Appointment
                                </span>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className={`${isSkipped ? 'text-gray-500' : 'text-gray-900'}`}>{t.customer.name}</span>
                            </div>
                            <div className="col-span-2">
                              {Array.isArray(t.serviceTypes) && t.serviceTypes.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {t.serviceTypes.map((stype: string) => (
                                    <span key={stype} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(stype)}`}>
                                      <ServiceName serviceType={stype} />
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">No service types</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-900">{waitTime} min</span>
                            </div>
                            <div className="col-span-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${isSkipped
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {isSkipped ? 'Skipped' : 'Waiting'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <div className="flex flex-col gap-2">
                                {isSkipped ? (
                                  <button
                                    onClick={() => handleRecall(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    Recall
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSkip(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    Skip
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSetPriority(t.id)}
                                  disabled={loading || currentToken !== null}
                                  className={`px-2 py-1 text-white text-xs rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap ${
                                    isPriority
                                      ? 'bg-yellow-600 hover:bg-yellow-700'
                                      : 'bg-purple-600 hover:bg-purple-700'
                                  }`}
                                >
                                  {isPriority ? '★ Priority' : 'Set Priority'}
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
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-gray-700 font-medium">All tokens are matched! ✅</p>
                    <p className="text-xs text-gray-500 mt-2">No unmatched tokens at the moment</p>
                  </div>
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-gray-900 border-b text-sm text-white rounded-full mb-3">
                      <div className="col-span-2">TOKEN</div>
                      <div className="col-span-2">CUSTOMER</div>
                      <div className="col-span-2">SERVICE TYPE</div>
                      <div className="col-span-2">WAITED TIME</div>
                      <div className="col-span-2">STATUS</div>
                      <div className="col-span-2">ACTION</div>
                    </div>

                    {/* Unmatched Tokens */}
                    <div className="divide-y divide-gray-100">
                      {unmatchedTokens.map((t) => {
                        const waitTime = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
                        const isPriority = t.isPriority === true
                        const isSkipped = t.status === 'skipped'

                        return (
                          <div key={t.id} className={`grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 transition-colors ${isSkipped ? 'bg-orange-50 rounded-lg' : isPriority ? 'bg-yellow-50 rounded-lg border-l-4 border-yellow-400' : ''}`}>
                            <div className="col-span-2 flex items-center gap-2">
                              {isPriority ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-sm font-semibold">
                                  {t.tokenNumber} ★ Priority
                                </span>
                              ) : (
                                <span className="text-gray-900 font-semibold">{t.tokenNumber}</span>
                              )}
                              {(t as any)?.fromAppointment && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-semibold" title="Booked appointment">
                                  <Calendar className="w-3 h-3" /> Appointment
                                </span>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className={`${isSkipped ? 'text-gray-500' : 'text-gray-900'}`}>{t.customer.name}</span>
                            </div>
                            <div className="col-span-2">
                              {Array.isArray(t.serviceTypes) && t.serviceTypes.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {t.serviceTypes.map((stype: string) => (
                                    <span key={stype} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(stype)}`}>
                                      <ServiceName serviceType={stype} />
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">No service types</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-900">{waitTime} min</span>
                            </div>
                            <div className="col-span-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${isSkipped
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {isSkipped ? 'Skipped' : 'Waiting'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <div className="flex flex-col gap-2">
                                {isSkipped ? (
                                  <button
                                    onClick={() => handleRecall(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    Recall
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSkip(t.id)}
                                    disabled={loading || currentToken !== null}
                                    className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    Skip
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSetPriority(t.id)}
                                  disabled={loading || currentToken !== null}
                                  className={`px-2 py-1 text-white text-xs rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap ${
                                    isPriority
                                      ? 'bg-yellow-600 hover:bg-yellow-700'
                                      : 'bg-purple-600 hover:bg-purple-700'
                                  }`}
                                >
                                  {isPriority ? '★ Priority' : 'Set Priority'}
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
    </div>
  )
}
