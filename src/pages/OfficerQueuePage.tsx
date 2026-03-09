"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { User, Clock, Phone, FileText, Users, RefreshCwIcon, Calendar, AlertTriangle, CheckCircle2, CircleDashed, Banknote, CreditCard, Landmark } from "lucide-react"
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
  const [billInfo, setBillInfo] = useState<{ telephoneNumber: string; accountName: string; currentBill: number; dueDate: string; status: string; updatedAt: string } | null>(null)
  const [queue, setQueue] = useState<{ waiting: Token[]; inService: Token[]; availableOfficers: number; totalWaiting: number } | null>(null)
  const [accountRef, setAccountRef] = useState("")
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
  const [targetCounter, setTargetCounter] = useState<number | null>(null)
  const [transferNotes, setTransferNotes] = useState("")


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
            setOfficer(prev => prev ? { ...prev, counterNumber: data.data.counterNumber } : prev)
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
      // Officer stats returns currentToken and billData; re-use it to keep parity with dashboard
      const res = await api.get(`/officer/stats/${officerId}`)
      setCurrentToken(res.data.currentToken)
      setBillInfo(res.data.billData || null)
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
  const AUTO_SPEAK_TEMPLATES = {
    call: {
      en: (name: string, num: number, counter?: number) =>
        `${name}. Token number ${num}. Please proceed to counter ${counter || 'assigned'}. ${name}, counter ${counter || 'assigned'}.`,
      si: (name: string, num: number, counter?: number) =>
        `${name}. ${name}. අංක ${num}. කවුන්ටරය ${counter || 'නියම කළ'} වෙත පැමිණෙන්න.`,
      ta: (name: string, num: number, counter?: number) =>
        `${name}. ${name}. எண் ${num}. கவுண்டர் ${counter || 'ஒதுக்கப்பட்ட'} க்கு வாருங்கள்.`,
    },
    skip: {
      en: (name: string, num: number, _counter?: number) =>
        `${name}, token ${num}, you have been skipped. Please return to the counter.`,
      si: (name: string, num: number, _counter?: number) =>
        `${name}. ටෝකන් ${num}. ඔබ මග හැරී ඇත. කරුණාකර කවුන්ටරය වෙත ආපසු එන්න.`,
      ta: (name: string, num: number, _counter?: number) =>
        `${name}. எண் ${num}. நீங்கள் தவிர்க்கப்பட்டீர்கள். தயவுசெய்து கவுண்டருக்கு திரும்பவும்.`,
    },
    recall: {
      en: (name: string, num: number, counter?: number) =>
        `${name}. Token ${num} is being recalled. Please return to counter ${counter || 'assigned'} immediately.`,
      si: (name: string, num: number, counter?: number) =>
        `${name}. ටෝකන් ${num} නැවත කැඳවනු ලැබේ. කරුණාකර වහාම කවුන්ටර් ${counter || 'නියම'} වෙත එන්න.`,
      ta: (name: string, num: number, counter?: number) =>
        `${name}. எண் ${num} மீண்டும் அழைக்கப்படுகிறது. தயவுசெய்து உடனடியாக கவுண்டர் ${counter || ''} க்கு வாருங்கள்.`,
    },
  }

  const autoSpeak = async (token: any, eventType: 'call' | 'skip' | 'recall', counterNum?: number | null) => {
    if (!token) return
    const prefs = token?.preferredLanguages
    let lang: 'en' | 'si' | 'ta' = 'en'
    if (Array.isArray(prefs) && prefs.length > 0) {
      const p = String(prefs[0]).toLowerCase()
      if (p === 'si') lang = 'si'
      else if (p === 'ta') lang = 'ta'
    }
    const name = token.customer?.name || ''
    const counter = token.counterNumber || counterNum || undefined
    const text = AUTO_SPEAK_TEMPLATES[eventType][lang](name, token.tokenNumber, counter)

    if (window.speechSynthesis) window.speechSynthesis.cancel()

    const ttsLang = lang
    try {
      const resp = await api.get('/tts/speak', { params: { text, lang: ttsLang }, responseType: 'blob' })
      const url = URL.createObjectURL(resp.data)
      const audio = new Audio(url)
      audio.volume = 1.0
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch (e) {
      console.error('Auto-speak TTS error:', e)
      // Fallback to browser speech synthesis if TTS API fails
      const synth = window.speechSynthesis
      if (!synth) return
      const voices = synth.getVoices()
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
                    voices.find(v => v.lang.startsWith('en')) ||
                    voices[0]
      if (voice) { utterance.voice = voice; utterance.lang = 'en-US' }
      utterance.volume = 1.0
      utterance.rate = 0.9
      synth.speak(utterance)
    }
  }

  const handleTransfer = async () => {
    if (!officer || !currentToken) return
    if (transferServices.length === 0 && !targetCounter) {
      alert('Please select at least one service or a target counter')
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/officer/transfer-token', {
        officerId: officer.id,
        tokenId: currentToken.id,
        newServiceTypes: transferServices.length > 0 ? transferServices : currentToken.serviceTypes,
        targetCounterNumber: targetCounter,
        notes: transferNotes || accountRef || "(Transferred)"
      })

      if (res.data.success) {
        setIsTransferModalOpen(false)
        setTransferServices([])
        setTargetCounter(null)
        setTransferNotes("")

        setCurrentToken(null)
        setAccountRef("")
        // Refresh queue
        fetchQueue(officer.outletId, officer.id)
        alert("Customer successfully transferred!")
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
          setCurrentToken(response.data.token)
          setBillInfo(null)
          setAccountRef("")
          fetchQueue(officer.outletId, officer.id)
          fetchCurrentToken(officer.id)
          autoSpeak(response.data.token, 'call', officer.counterNumber)
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
          setCurrentToken(confirmRes.data.token)
          setBillInfo(null)
          setAccountRef("")
          fetchQueue(officer.outletId, officer.id)
          fetchCurrentToken(officer.id)
          autoSpeak(confirmRes.data.token, 'call', officer.counterNumber)
        }
      } else if (response.data.token) {
        console.log('Received token data:', response.data.token)
        console.log('Customer name:', response.data.token.customer?.name)
        setCurrentToken(response.data.token)
        setBillInfo(null)
        setAccountRef("")
        fetchQueue(officer.outletId, officer.id)
        fetchCurrentToken(officer.id)
        autoSpeak(response.data.token, 'call', officer.counterNumber)
      } else {
        const msg = response.data.message || response.data.error || 'No matching customers in queue right now.'
        alert(msg)
      }
    } catch (err: any) {
      console.error('failed to get next token', err)
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      if (err.response?.status === 409) {
        alert(errorMsg)
        // Refresh queue because a token was just taken
        fetchQueue(officer.outletId, officer.id)
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
      await api.post('/officer/complete-service', { tokenId: currentToken.id, officerId: officer.id, accountRef })
      setCurrentToken(null)
      setBillInfo(null)
      setAccountRef("")
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
      if (!tokenId) {
        setCurrentToken(null)
        setBillInfo(null)
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
        fetchQueue(officer.outletId, officer.id)
      }
    } catch (err: any) {
      console.error('Failed to set priority:', err)
      alert('Failed to set priority: ' + (err.response?.data?.error || err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCallToken = async (tokenId: string) => {
    if (!officer) return
    if (currentToken && currentToken.id !== tokenId) {
      alert("Please complete or skip the current customer first.")
      return
    }
    setLoading(true)
    try {
      const response = await api.post('/officer/call-token', {
        officerId: officer.id,
        tokenId
      })
      if (response.data.token) {
        setCurrentToken(response.data.token)
        setBillInfo(null)
        setAccountRef("")
        // Refresh queue and fetch bill info if applicable
        fetchQueue(officer.outletId, officer.id)
        fetchCurrentToken(officer.id)
        autoSpeak(response.data.token, 'call', officer.counterNumber)
      }
    } catch (err: any) {
      console.error('failed to call token', err)
      alert('Failed to call token: ' + (err.response?.data?.error || err.message || 'Unknown error'))
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

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-sm text-slate-500">{formatDate(currentDateTime)} &bull; {formatTime(currentDateTime)}</p>
                {queueLoading && <span className="text-xs text-amber-600 font-medium">Refreshing...</span>}
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-3 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2 text-sm font-medium transition-colors ${refreshing ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              <RefreshCwIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setActiveTab('my-queue')}
                className={`px-5 py-2 font-medium text-sm rounded-xl transition-all ${activeTab === 'my-queue'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>My Queue</span>
                  {queue && (
                    <span className="px-1.5 py-0.5 bg-amber-600 text-white rounded-full text-xs font-semibold">
                      {queue.waiting.filter((t) => {
                        if ((t as any).isTransferred === true) return false
                        const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
                        const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
                        const hasServiceMatch = tokenServices.length === 0 || officerServices.length === 0 || tokenServices.some(s => officerServices.includes(s))
                        const prefs = Array.isArray((t as any).preferredLanguages) ? (t as any).preferredLanguages : []
                        const langs = Array.isArray((officer as any)?.languages) ? (officer as any).languages : []
                        const hasLanguageMatch = prefs.length === 0 || langs.length === 0 || prefs.some((p: any) => langs.includes(p))
                        const isTransferredByMe = (t as any).lastTransferByOfficerId === officer.id
                        return hasServiceMatch && hasLanguageMatch && !isTransferredByMe
                      }).length}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setActiveTab('transferred')}
                className={`px-5 py-2 font-medium text-sm rounded-xl transition-all ${activeTab === 'transferred'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Transferred Tokens</span>
                  {queue && (
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs font-semibold">
                      {queue.waiting.filter((t) => {
                        if ((t as any).isTransferred !== true) return false
                        const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
                        const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
                        const isTransferredByMe = (t as any).lastTransferByOfficerId === officer.id
                        const counterMatch = (t as any).counterNumber === officer.counterNumber
                        const serviceMatch = tokenServices.some(s => officerServices.includes(s))
                        return (counterMatch || serviceMatch) && !isTransferredByMe
                      }).length}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setActiveTab('unmatched')}
                className={`px-5 py-2 font-medium text-sm rounded-xl transition-all ${activeTab === 'unmatched'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Unmatched Tokens</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${unmatchedTokens.length > 0
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-500 text-white'
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
            <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 self-start sticky top-4">
              {!currentToken ? (
                <>
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Current Customer</h2>
                  <div className="text-center py-6">
                    <div className="w-10 h-10 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to Serve</h3>
                    <p className="text-gray-600 mb-8 text-sm">Click the button below to call the next customer</p>
                    {/* Disable only when there are no callable (non-skipped) tokens in "My Queue" */}
                    <button
                      onClick={handleNextToken}
                      disabled={
                        loading ||
                        officer.status !== "available" ||
                        !queue ||
                        // If waiting array exists, check for at least one token whose status !== 'skipped' and is NOT transferred
                        (Array.isArray(queue.waiting)
                          ? queue.waiting.filter(t => (t as any).status !== 'skipped' && !(t as any).isTransferred).length === 0
                          : true)
                      }
                      className="px-6 py-2 bg-amber-600 text-white hover:bg-amber-700 border-2 border-amber-600 rounded-xl font-semibold transition-colors disabled:bg-gray-200 disabled:border-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
                    >
                      {loading ? "Loading..." : "Call Next Token"}
                    </button>
                    {queue && Array.isArray(queue.waiting) && queue.waiting.filter(t => (t as any).status !== 'skipped' && !(t as any).isTransferred).length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">No customers are waiting in your queue.</p>
                    )}
                    {officer.status !== "available" && (
                      <p className="mt-4 text-sm text-yellow-600">You must be available to call next token</p>
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
                  <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                      <div className="w-8 h-8 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Customer Name</div>
                        <div className="text-sm font-semibold text-gray-900">{currentToken.customer.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                      <div className="w-8 h-8 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Phone Number</div>
                        <div className="text-sm font-semibold text-gray-900">{currentToken.customer.mobileNumber}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                      <div className="w-8 h-8 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 mb-1">Service Type</div>
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
                      <div className="w-8 h-8 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
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
                      <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
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

                  {/* Bill Payment Info Card — shown when serving a bill payment customer */}
                  {(currentToken.serviceTypes.includes('SVC002') || currentToken.serviceTypes.includes('BILL_PAYMENT')) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></div>
                        <h3 className="text-sm font-bold text-amber-900">Bill Payment Details</h3>
                      </div>

                      {/* SLT Telephone */}
                      {currentToken.sltTelephoneNumber && (
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-500 text-xs">SLT Number</span>
                          <span className="font-mono font-semibold text-gray-800">{currentToken.sltTelephoneNumber}</span>
                        </div>
                      )}

                      {/* Bill Due Amount from DB */}
                      {billInfo ? (
                        <>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-500">Account Name</span>
                            <span className="text-sm font-semibold text-gray-800">{billInfo.accountName}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-500">Due Amount</span>
                            <span className="text-lg font-bold text-red-600">Rs. {billInfo.currentBill.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs text-gray-500">Bill Status</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${billInfo.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {billInfo.status.toUpperCase()}
                            </span>
                          </div>
                        </>
                      ) : currentToken.sltTelephoneNumber ? (
                        <p className="text-xs text-amber-700 italic mb-2">Fetching bill details...</p>
                      ) : null}

                      {/* Customer Payment Intent */}
                      <div className="border-t border-amber-200 pt-3 mt-1">
                        <div className="text-xs text-gray-500 mb-1">Customer's Payment Plan</div>
                        {currentToken.billPaymentIntent === 'full' ? (
                          <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-xl">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-bold">Full Payment</span>
                            {billInfo && (
                              <span className="ml-auto text-sm font-bold">Rs. {billInfo.currentBill.toFixed(2)}</span>
                            )}
                          </div>
                        ) : currentToken.billPaymentIntent === 'partial' ? (
                          <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-xl">
                            <CircleDashed className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-bold">Partial Payment</span>
                            <span className="ml-auto text-base font-bold">Rs. {(currentToken.billPaymentAmount ?? 0).toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-xl text-sm italic">
                            Customer did not specify payment amount
                          </div>
                        )}
                        {currentToken.billPaymentIntent === 'partial' && billInfo && (
                          <p className="text-xs text-orange-700 mt-1 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Remaining after payment: Rs. {Math.max(0, billInfo.currentBill - (currentToken.billPaymentAmount ?? 0)).toFixed(2)}
                          </p>
                        )}
                        {currentToken.billPaymentMethod && (
                          <div className="mt-2 flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl">
                            {currentToken.billPaymentMethod === 'cash' ? <Banknote className="w-4 h-4" /> :
                             currentToken.billPaymentMethod === 'card' ? <CreditCard className="w-4 h-4" /> :
                             currentToken.billPaymentMethod === 'cheque' ? <FileText className="w-4 h-4" /> :
                             <Landmark className="w-4 h-4" />}
                            <span className="text-xs text-gray-500">Payment Method</span>
                            <span className="ml-auto text-sm font-semibold capitalize">
                              {currentToken.billPaymentMethod === 'bank_transfer' ? 'Bank Transfer' : currentToken.billPaymentMethod.charAt(0).toUpperCase() + currentToken.billPaymentMethod.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                  <div className="flex gap-3 justify-center flex-wrap">
                    <button
                      onClick={() => handleSkip()}
                      disabled={loading}
                      className="px-4 py-2.5 bg-orange-500 text-white font-semibold rounded-xl text-sm hover:bg-orange-600 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      Skip Customer
                    </button>

                    <button
                      onClick={() => {
                        setIsTransferModalOpen(true)
                        if (officer) fetchCounters(officer.outletId)
                      }}
                      disabled={loading}
                      className="px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl text-sm hover:bg-indigo-700 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      Transfer
                    </button>

                    <button
                      onClick={handleCompleteService}
                      disabled={loading}
                      className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl text-sm hover:bg-emerald-700 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      Complete Service
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Queue List Section - Right Side (2/3 width) */}
            <div className="w-2/3 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {activeTab === 'my-queue' ? 'My Queue' : activeTab === 'transferred' ? 'Transferred Tokens' : 'Unmatched Tokens'}
                </h2>
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
                  if ((t as any).isTransferred === true) return false
                  const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
                  const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
                  const isTransferredByMe = (t as any).lastTransferByOfficerId === officer.id
                  const hasServiceMatch = tokenServices.length === 0 || officerServices.length === 0 || tokenServices.some((s: any) => officerServices.includes(s))
                  const prefs = Array.isArray((t as any).preferredLanguages) ? (t as any).preferredLanguages : []
                  const langs = Array.isArray((officer as any)?.languages) ? (officer as any).languages : []
                  const hasLanguageMatch = prefs.length === 0 || langs.length === 0 || prefs.some((p: any) => langs.includes(p))
                  return hasServiceMatch && hasLanguageMatch && !isTransferredByMe
                }).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No customers in your queue</p>
                    <p className="text-xs text-gray-400 mt-2">Tokens matching your services and languages will appear here</p>
                  </div>
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-800 border-b text-xs font-semibold text-slate-200 rounded-xl tracking-wide mb-3">
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
                        if ((t as any).isTransferred === true) return false
                        const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
                        const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
                        const isTransferredByMe = (t as any).lastTransferByOfficerId === officer.id
                        const hasServiceMatch = tokenServices.length === 0 || officerServices.length === 0 || tokenServices.some((s: any) => officerServices.includes(s))
                        const prefs = Array.isArray((t as any).preferredLanguages) ? (t as any).preferredLanguages : []
                        const langs = Array.isArray((officer as any)?.languages) ? (officer as any).languages : []
                        const hasLanguageMatch = prefs.length === 0 || langs.length === 0 || prefs.some((p: any) => langs.includes(p))
                        return hasServiceMatch && hasLanguageMatch && !isTransferredByMe
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
                                    className="px-2 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
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
                                  className={`px-2 py-1 text-white text-xs rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap ${isPriority
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
              ) : activeTab === 'transferred' ? (
                // TRANSFERRED TOKENS TAB
                !queue ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Loading transferred tokens...</p>
                  </div>
                ) : queue.waiting.filter((t) => {
                  if ((t as any).isTransferred !== true) return false
                  const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
                  const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
                  const isTransferredByMe = (t as any).lastTransferByOfficerId === officer.id
                  const counterMatch = (t as any).counterNumber === officer.counterNumber
                  const serviceMatch = tokenServices.some(s => officerServices.includes(s))
                  return (counterMatch || serviceMatch) && !isTransferredByMe
                }).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <RefreshCwIcon className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-gray-500">No transferred tokens for you</p>
                    <p className="text-xs text-gray-400 mt-2">Tokens transferred to your services or counter will appear here</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-blue-900 border-b text-sm text-white rounded-full mb-3">
                      <div className="col-span-2">TOKEN</div>
                      <div className="col-span-2">CUSTOMER</div>
                      <div className="col-span-2">SERVICE TYPE</div>
                      <div className="col-span-2">WAITED TIME</div>
                      <div className="col-span-2">STATUS</div>
                      <div className="col-span-2">ACTION</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {queue.waiting.filter((t) => {
                        if ((t as any).isTransferred !== true) return false
                        const tokenServices = Array.isArray(t.serviceTypes) ? t.serviceTypes : []
                        const officerServices = Array.isArray((officer as any)?.assignedServices) ? (officer as any).assignedServices : []
                        const isTransferredByMe = (t as any).lastTransferByOfficerId === officer.id
                        const counterMatch = (t as any).counterNumber === officer.counterNumber
                        const serviceMatch = tokenServices.some(s => officerServices.includes(s))
                        return (counterMatch || serviceMatch) && !isTransferredByMe
                      }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((t) => {
                        const waitTime = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
                        return (
                          <div key={t.id} className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-blue-50 transition-colors bg-blue-50/30 rounded-lg border-l-4 border-blue-400 mb-2">
                            <div className="col-span-2 flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm font-semibold">
                                {t.tokenNumber}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-900 font-medium">{t.customer.name}</span>
                            </div>
                            <div className="col-span-2">
                              <div className="flex flex-col gap-1">
                                {t.serviceTypes.map((stype: string) => (
                                  <span key={stype} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(stype)}`}>
                                    <ServiceName serviceType={stype} />
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="col-span-2 text-gray-900">{waitTime} min</div>
                            <div className="col-span-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-semibold font-mono">
                                TRANSFERRED
                              </span>
                            </div>
                            <div className="col-span-2 flex flex-col gap-2">
                              <button
                                onClick={() => handleCallToken(t.id)}
                                disabled={loading || currentToken !== null}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold"
                              >
                                {loading ? "..." : "Call Customer"}
                              </button>
                              <button
                                onClick={() => handleSkip(t.id)}
                                disabled={loading}
                                className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:bg-gray-400"
                              >
                                Skip
                              </button>
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
                    <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-gray-700 font-medium">All tokens are matched! ✅</p>
                    <p className="text-xs text-gray-500 mt-2">No unmatched tokens at the moment</p>
                  </div>
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-800 border-b text-xs font-semibold text-slate-200 rounded-xl tracking-wide mb-3">
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
                                    className="px-2 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
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
                                  className={`px-2 py-1 text-white text-xs rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap ${isPriority
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

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Transfer Customer</h2>
            <p className="text-sm text-gray-600 mb-6">Select a new service or a specific counter to transfer the customer.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Service Types</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {allServices.map((service) => (
                    <label key={service.id} className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all group ${transferServices.includes(service.code) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                      <input
                        type="checkbox"
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-indigo-500 cursor-pointer"
                        checked={transferServices.includes(service.code)}
                        onChange={(e) => {
                          if (e.target.checked) setTransferServices([...transferServices, service.code])
                          else setTransferServices(transferServices.filter(s => s !== service.code))
                        }}
                      />
                      <div className="flex-1">
                        <div className={`text-xs font-semibold ${transferServices.includes(service.code) ? 'text-blue-700' : 'text-gray-900'}`}>{service.title}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Counter Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Target Counter (Optional)</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  <button
                    onClick={() => setTargetCounter(null)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${targetCounter === null ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'}`}
                  >
                    Any Counter (General Queue)
                  </button>
                  {counters.map((c) => (
                    <button
                      key={c.number}
                      onClick={() => setTargetCounter(c.number)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all group flex justify-between items-center ${targetCounter === c.number ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>Counter #{c.number}</span>
                        {c.isStaffed ? (
                          <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-bold">
                            Idle
                          </span>
                        )}
                      </div>
                      {c.isStaffed && <span className="text-[10px] text-gray-500 font-normal">({c.officer.name})</span>}
                    </button>
                  ))}
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

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsTransferModalOpen(false)
                  setTargetCounter(null)
                  setTransferServices([])
                  setTransferNotes("")
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-300 rounded-2xl text-sm hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={loading || (transferServices.length === 0 && !targetCounter)}
                className="flex-[2] px-4 py-3 bg-blue-600 text-white font-bold border-b-2 border-black rounded-2xl text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px] active:translate-y-[1px]"
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
