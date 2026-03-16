import { useEffect, useMemo, useRef, useState } from "react"
import logo from "../assets/logo.png"
import { useParams, useSearchParams } from "react-router-dom"
import { Clock3, Users, Ticket, Layers, AlertTriangle, Sparkles, CalendarDays, Coffee, Volume2, VolumeX } from "lucide-react"
import api, { WS_URL, API_URL } from "../config/api"
import type { Token } from "../types"
import ServiceName from "../components/ServiceName"

type QueuePayload = {
  waiting: Token[]
  inService: Token[]
  availableOfficers: number
  totalWaiting: number
}

type CounterRow = {
  number: number | null
  isStaffed: boolean
  officer: {
    id: string
    name: string
    status: "available" | "serving" | "on_break" | string
    services?: string[]
  } | null
}

type CalledRecord = {
  id: string
  tokenNumber: number
  counterNumber?: number | null
  calledAt?: string
  serviceTypes?: string[]
}

const toInt = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

const toBool = (value: string | null, fallback: boolean) => {
  if (!value) return fallback
  return value === "1" || value === "true"
}

const MARQUEE_PIXELS_PER_SECOND = 70

const useUniformMarqueeSpeed = (deps: unknown[]) => {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [duration, setDuration] = useState(40)

  useEffect(() => {
    const updateDuration = () => {
      const track = trackRef.current
      if (!track) return

      const loopDistance = track.scrollWidth / 2
      if (loopDistance <= 0) return

      const nextDuration = Math.max(12, loopDistance / MARQUEE_PIXELS_PER_SECOND)
      setDuration(nextDuration)
    }

    const raf = window.requestAnimationFrame(updateDuration)
    window.addEventListener("resize", updateDuration)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener("resize", updateDuration)
    }
  }, deps)

  return { trackRef, duration }
}

export default function OutletQueueDisplay() {
  const { outletId } = useParams()
  const [query] = useSearchParams()

  const [refreshSeconds, setRefreshSeconds] = useState(() => Math.max(5, Math.min(60, toInt(query.get("refresh"), 10))))
  const [nextLimit, setNextLimit] = useState(() => Math.max(3, Math.min(20, toInt(query.get("next"), 8))))
  const [showService, setShowService] = useState(() => toBool(query.get("services"), true))
  const [showCounters, setShowCounters] = useState(() => toBool(query.get("counters"), true))
  const [showRecent, setShowRecent] = useState(() => toBool(query.get("recent"), true))
  const [autoSlide, setAutoSlide] = useState(() => toBool(query.get("autoSlide"), true))
  const [playTone, setPlayTone] = useState(() => toBool(query.get("playTone"), true))
  
  // Voice Announcement State
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const voiceEnabledRef = useRef(true)
  
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled
    console.log("[Voice] Voice mode changed:", voiceEnabled ? "ON" : "OFF")
  }, [voiceEnabled])

  useEffect(() => {
    console.log("[Voice] Announcement Tone is now:", playTone ? "ENABLED" : "DISABLED")
  }, [playTone])

  const [announcementQueue, setAnnouncementQueue] = useState<any[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)

  const [queue, setQueue] = useState<QueuePayload | null>(null)
  const [counters, setCounters] = useState<CounterRow[]>([])
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [outletMeta, setOutletMeta] = useState<{ name: string; location: string } | null>(null)
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)
  const [recentCalled, setRecentCalled] = useState<CalledRecord[]>([])

  const fetchAll = async () => {
    if (!outletId) return

    try {
      const [queueRes, counterRes, statusRes] = await Promise.all([
        api.get(`/queue/outlet/${outletId}`),
        api.get(`/queue/outlet/${outletId}/counters`),
        api.get(`/branch-status/${outletId}`),
      ])

      const queueData: any = queueRes.data
      setQueue(queueData)
      setCounters(Array.isArray(counterRes.data) ? counterRes.data : [])

      // Update display settings from backend if available
      if (queueData.displaySettings) {
        const s = queueData.displaySettings
        if (s.refresh) setRefreshSeconds(Math.max(5, Math.min(60, Number(s.refresh))))
        if (s.next) setNextLimit(Math.max(3, Math.min(20, Number(s.next))))
        if (s.services !== undefined) setShowService(!!s.services)
        if (s.counters !== undefined) setShowCounters(!!s.counters)
        if (s.recent !== undefined) setShowRecent(!!s.recent)
        if (s.autoSlide !== undefined) setAutoSlide(!!s.autoSlide)
        if (s.playTone !== undefined) {
          const val = (s.playTone === "0" || s.playTone === 0 || s.playTone === false) ? false : true
          setPlayTone(val)
        }
      }

      if (queueData.outletMeta) {
        setOutletMeta(queueData.outletMeta)
      }

      if (queueData.recentlyCalled) {
        setRecentCalled(queueData.recentlyCalled.slice(0, 30))
      }

      const waiting = queueData.waiting || []
      const inService = queueData.inService || []
      const sample = waiting[0] || inService[0]
      if (sample?.outlet?.name) {
        setOutletMeta({
          name: sample.outlet.name,
          location: sample.outlet.location || "",
        })
      }

      const activeNotice = statusRes.data?.activeNotice || statusRes.data?.standardNotice
      if (activeNotice?.title) {
        setNotice({ title: activeNotice.title, message: activeNotice.message || "" })
      } else {
        setNotice(null)
      }

      setError("")
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load outlet display")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [outletId])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const poll = setInterval(fetchAll, refreshSeconds * 1000)
    return () => clearInterval(poll)
  }, [outletId, refreshSeconds])

  useEffect(() => {
    const ws = new WebSocket(WS_URL)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const type = msg?.type
        const data = msg?.data
        if (!data || !outletId) return

        if (["NEW_TOKEN", "TOKEN_COMPLETED", "TOKEN_UPDATED", "TOKEN_CANCELLED", "TOKEN_PRIORITY_UPDATED", "OFFICER_STATUS_CHANGE", "OFFICER_UPDATED"].includes(type)) {
          if (!data.outletId || data.outletId === outletId) fetchAll()
        }

        if (type === "TOKEN_CALLED" || type === "TOKEN_SKIPPED" || type === "TOKEN_RECALLED") {
          console.log(`[WebSocket] ${type} event received for token:`, data.tokenNumber)
          if (!data.outletId || data.outletId === outletId) {
            fetchAll()
            if (voiceEnabledRef.current) {
              console.log("[Voice] Adding to announcement queue:", type)
              setAnnouncementQueue(prev => [...prev, { ...data, eventType: type }])
            } else {
              console.log("[Voice] Skipping announcement because sound is muted. Click the speaker icon to enable.")
            }
          }
        }
      } catch (err) {
        console.error("WebSocket message processing error:", err)
      }
    }

    return () => ws.close()
  }, [outletId])

  const servingByCounter = useMemo(() => {
    const serving = (queue?.inService || []).slice()
    return serving.sort((a, b) => (a.counterNumber || 999) - (b.counterNumber || 999))
  }, [queue])

  const upNext = useMemo(() => {
    return (queue?.waiting || []).slice(0, nextLimit)
  }, [queue, nextLimit])

  const { trackRef: servingTrackRef, duration: servingDuration } = useUniformMarqueeSpeed([servingByCounter.length, showService])
  const { trackRef: upNextTrackRef, duration: upNextDuration } = useUniformMarqueeSpeed([upNext.length, showService])
  const { trackRef: recentTrackRef, duration: recentDuration } = useUniformMarqueeSpeed([recentCalled.length])
  const { trackRef: counterTrackRef, duration: counterDuration } = useUniformMarqueeSpeed([counters.length])

  // Voice Announcement Logic
  const playChime = () => {
    return new Promise((resolve) => {
      const audio = new Audio("/announcement.mp3")
      audio.volume = 0.8 // Slightly higher volume for the custom announcement
      audio.onended = resolve
      audio.onerror = (err) => {
        console.error("Failed to play custom announcement chime:", err)
        resolve(null)
      }
      audio.play().catch(err => {
        console.error("Audio playback error:", err)
        resolve(null)
      })
    })
  }

  const speakSentence = async (tokenData: any) => {
    const num = String(tokenData.tokenNumber) // No padding for natural speech
    const counter = tokenData.counterNumber || 'Counter'
    const eventType = tokenData.eventType || 'TOKEN_CALLED'
    const lang = (Array.isArray(tokenData.preferredLanguages) && tokenData.preferredLanguages[0]) || 'en'
    
    // Get customer name, use first name for a more personal touch
    const customerName = tokenData.customer?.name || ""
    const firstName = customerName.split(' ')[0] || ""
    
    let text = ""
    
    if (eventType === 'TOKEN_CALLED') {
      if (lang === 'si') text = `${firstName}. ටෝකන් අංක ${num}, කරුණාකර කවුන්ටර අංක ${counter} වෙත පැමිණෙන්න.`
      else if (lang === 'ta') text = `${firstName}. அடையாள எண் ${num}, தயவுசெய்து கவுண்டர் எண் ${counter} க்கு செல்லவும்.`
      else text = `${firstName}. Token number ${num}, please proceed to counter number ${counter}.`
    } else if (eventType === 'TOKEN_RECALLED') {
      if (lang === 'si') text = `${firstName}. ටෝකන් අංක ${num} නැවත කැඳවනු ලැබේ. කරුණාකර වහාම කවුන්ටරය ${counter} වෙත පැමිණෙන්න.`
      else if (lang === 'ta') text = `${firstName}. அடையாள எண் ${num} மீண்டும் அழைக்கப்படுகிறது. உடனடியாக கவுண்டர் ${counter} க்கு வரவும்.`
      else text = `${firstName}. Token number ${num} is being recalled. Please proceed to counter number ${counter} immediately.`
    } else if (eventType === 'TOKEN_SKIPPED') {
      if (lang === 'si') text = `${firstName}. ටෝකන් අංක ${num} මග හැරී ඇත.`
      else if (lang === 'ta') text = `${firstName}. அடையாள எண் ${num} தவிர்க்கப்பட்டது.`
      else text = `${firstName}. Token number ${num} has been skipped.`
    }

    try {
      const ttsUrl = `${API_URL}/tts/speak?text=${encodeURIComponent(text)}&lang=${lang}`
      const audio = new Audio(ttsUrl)
      return new Promise((resolve) => {
        audio.onended = resolve
        audio.onerror = resolve
        audio.play().catch(resolve)
      })
    } catch (err) {
      console.error("TTS failed", err)
    }
  }

  useEffect(() => {
    if (voiceEnabled && announcementQueue.length > 0 && !isSpeaking) {
      const processQueue = async () => {
        setIsSpeaking(true)
        const nextToken = announcementQueue[0]
        console.log("[Voice] Processing announcement for token:", nextToken.tokenNumber)
        
        try {
          if (playTone) {
            await playChime()
            await new Promise(r => setTimeout(r, 600)) // Pause after chime
          }
          await speakSentence(nextToken)
        } catch (err) {
          console.error("[Voice] Announcement failed:", err)
        } finally {
          setAnnouncementQueue(prev => prev.slice(1))
          // Add a small pause between consecutive announcements so they are clear
          await new Promise(r => setTimeout(r, 1000))
          setIsSpeaking(false)
        }
      }
      processQueue()
    }
  }, [voiceEnabled, announcementQueue, isSpeaking, playTone])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-lg">Loading outlet queue display...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-3 sm:p-5 md:p-8 overflow-x-hidden"
      style={{
        backgroundImage: "radial-gradient(circle at 20% 10%, rgba(16,185,129,0.08), transparent 35%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.08), transparent 40%)",
      }}
    >
      <div className="max-w-screen-2xl mx-auto">
        <header className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 items-start 2xl:items-center mb-6">
          <div>
            <h1 className="text-[clamp(1.6rem,4vw,2.25rem)] font-extrabold tracking-tight text-slate-900 leading-tight">
              {outletMeta?.name || "Outlet Queue Display"}
            </h1>
            <p className="text-slate-600 mt-1 text-sm md:text-base">{outletMeta?.location || "Customer queue information"}</p>
          </div>

          <div className="flex md:justify-end 2xl:justify-center">
            <div className="inline-flex items-center gap-4 px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="inline-flex items-center gap-2 text-slate-700">
                <CalendarDays className="w-5 h-5 text-sky-600" />
                <span className="font-semibold text-sm md:text-base">{now.toLocaleDateString()}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-slate-700 border-l border-slate-200 pl-4">
                <Clock3 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-base sm:text-lg tabular-nums">{now.toLocaleTimeString()}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:col-span-2 2xl:col-span-1">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 opacity-70">Waiting</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{queue?.totalWaiting || 0}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-700 opacity-70">Serving</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{queue?.inService?.length || 0}</p>
            </div>
            <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 opacity-70">Counters</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{queue?.availableOfficers || 0}</p>
            </div>
          </div>
        </header>

        {notice && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600" />
            <div>
              <p className="font-bold text-amber-800">{notice.title}</p>
              {notice.message && <p className="text-sm text-amber-700 mt-1">{notice.message}</p>}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
          <section className="2xl:col-span-2 rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Now Serving</h2>
            </div>

            {servingByCounter.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
                No token is currently in service.
              </div>
            ) : (
              <div className={`relative w-full ${!autoSlide ? 'overflow-x-auto custom-scrollbar' : 'overflow-hidden'}`}>
                <div 
                  ref={servingTrackRef}
                  className={`flex gap-3 sm:gap-4 py-2 ${autoSlide ? 'animate-marquee' : 'w-max'}`}
                  style={autoSlide ? { animationDuration: `${servingDuration}s` } : {}}
                >
                  {(autoSlide 
                    ? (servingByCounter.length < 4 
                        ? [...servingByCounter, { id: 'spacer', isSpacer: true }, ...servingByCounter, { id: 'spacer-2', isSpacer: true }] 
                        : [...servingByCounter, ...servingByCounter])
                    : servingByCounter
                  ).map((token: any, idx) => token.isSpacer ? (
                    <div key={`spacer-${idx}`} className="flex-shrink-0 w-[50vw]" />
                  ) : (
                    <div 
                      key={`${token.id}-${idx}`} 
                      className="flex-shrink-0 w-[min(82vw,320px)] sm:w-80 rounded-2xl p-4 bg-emerald-50 border border-emerald-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-emerald-700">Counter</p>
                        <p className="text-xl font-black text-slate-900">{token.counterNumber ? `#${token.counterNumber}` : "Serving"}</p>
                      </div>
                      <p className="text-[clamp(2.5rem,8vw,3.5rem)] font-black tracking-wider text-slate-900 leading-none">
                        {String(token.tokenNumber).padStart(3, "0")}
                      </p>
                      {showService && token.serviceTypes?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {token.serviceTypes.slice(0, 2).map((serviceCode: any) => (
                            <span key={`${token.id}-${idx}-${serviceCode}`} className="text-xs font-bold rounded-full px-2.5 py-1 bg-white text-emerald-700 border border-emerald-200 shadow-sm">
                              <ServiceName serviceType={serviceCode} />
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Up Next</h2>
            </div>

            {upNext.length === 0 && <p className="text-slate-600 font-medium">No waiting tokens right now.</p>}

            {upNext.length > 0 && (
              <div className={`relative w-full ${!autoSlide ? 'overflow-x-auto custom-scrollbar' : 'overflow-hidden'}`}>
                <div 
                  ref={upNextTrackRef} 
                  className={`flex gap-3 whitespace-nowrap py-2 ${autoSlide ? 'animate-marquee' : 'w-max'}`}
                  style={autoSlide ? { animationDuration: `${upNextDuration}s` } : {}}
                >
                  {(autoSlide 
                    ? (upNext.length < 6 
                        ? [...upNext, { id: 'spacer', isSpacer: true }, ...upNext, { id: 'spacer-2', isSpacer: true }] 
                        : [...upNext, ...upNext])
                    : upNext
                  ).map((token: any, idx) => token.isSpacer ? (
                    <div key={`spacer-${idx}`} className="flex-shrink-0 w-[50vw]" />
                  ) : (
                    <div
                      key={`${token.id}-${idx}`}
                      className="flex-shrink-0 w-[min(72vw,240px)] sm:min-w-[220px] rounded-xl px-3 py-3 bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-600">Queue #{upNext.findIndex(t => t.id === token.id) + 1}</p>
                        <p className="text-[clamp(1.5rem,6vw,1.8rem)] font-black tracking-wider text-slate-900 leading-none">{String(token.tokenNumber).padStart(3, "0")}</p>
                      </div>
                      {showService && token.serviceTypes?.[0] && (
                        <span className="text-xs px-2 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 max-w-[120px] truncate">
                          <ServiceName serviceType={token.serviceTypes[0]} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
          {showRecent && (
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 overflow-hidden relative min-w-0">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Ticket className="w-32 h-32" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-indigo-50">
                  <Layers className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Recently Called</h2>
              </div>

              {recentCalled.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-40">
                  <Ticket className="w-12 h-12 mb-2 text-slate-300" />
                  <p className="text-slate-600 font-medium">No recent calls yet.</p>
                </div>
              ) : (
                <div className={`relative w-full ${!autoSlide ? 'overflow-x-auto custom-scrollbar' : 'overflow-hidden'}`}>
                  <div 
                    ref={recentTrackRef} 
                    className={`flex gap-4 whitespace-nowrap py-2 ${autoSlide ? 'animate-marquee' : 'w-max'}`}
                    style={autoSlide ? { animationDuration: `${recentDuration}s` } : {}}
                  >
                    {(autoSlide 
                      ? (recentCalled.length < 6 
                          ? [...recentCalled, { id: 'spacer', isSpacer: true }, ...recentCalled, { id: 'spacer-2', isSpacer: true }] 
                          : [...recentCalled, ...recentCalled])
                      : recentCalled
                    ).map((item: any, idx) => item.isSpacer ? (
                      <div key={`spacer-${idx}`} className="flex-shrink-0 w-[50vw]" />
                    ) : (
                      <div
                        key={`${item.id}-${idx}`}
                        className="flex-shrink-0 w-[min(56vw,10rem)] sm:w-40 rounded-2xl p-3 bg-indigo-50/50 border border-indigo-100 text-center transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/50"
                      >
                        <p className="text-[clamp(1.5rem,6vw,1.875rem)] font-black tracking-wider text-slate-900 drop-shadow-sm leading-none">
                          {String(item.tokenNumber).padStart(3, "0")}
                        </p>
                        <div className="flex items-center justify-center gap-1.5 mt-1.5">
                          <p className="text-sm font-bold text-slate-600">
                            {item.counterNumber ? `Counter #${item.counterNumber}` : "Staff Station"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {showCounters && (
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 overflow-hidden relative min-w-0">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Users className="w-32 h-32" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-emerald-50">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Counter Status</h2>
              </div>

              <div className={`relative w-full ${!autoSlide ? 'overflow-x-auto custom-scrollbar' : 'overflow-hidden'}`}>
                <div 
                  ref={counterTrackRef} 
                  className={`flex gap-4 whitespace-nowrap py-2 ${autoSlide ? 'animate-marquee' : 'w-max'}`}
                  style={autoSlide ? { animationDuration: `${counterDuration}s` } : {}}
                >
                  {/* Filter and double the counters for seamless looping, using spacers for short lists */}
                  {(() => {
                    const activeCounters = counters.filter((c) => c.number !== null);
                    const itemsToDisplay = autoSlide 
                      ? (activeCounters.length > 0 && activeCounters.length < 6)
                        ? [...activeCounters, { id: 'spacer', isSpacer: true }, ...activeCounters, { id: 'spacer-2', isSpacer: true }]
                        : [...activeCounters, ...activeCounters]
                      : activeCounters;

                    return itemsToDisplay.map((counter: any, idx) => {
                      if (counter.isSpacer) return <div key={`spacer-${idx}`} className="flex-shrink-0 w-[50vw]" />;
                      
                      const status = counter.officer?.status;
                      const isOffline = !counter.isStaffed || !status || status === 'offline';
                      const isOnBreak = status === 'on_break' || status === 'break';
                      const isServing = status === 'serving';
                      const isOnline = status === 'available' || (counter.isStaffed && !isOffline && !isOnBreak && !isServing);

                      return (
                        <div
                          key={`${String(counter.number)}-${idx}`}
                          className={`flex-shrink-0 w-[min(86vw,16rem)] sm:w-64 group rounded-2xl p-3 sm:p-4 border-2 transition-all duration-300 flex items-center justify-between ${isOffline
                            ? 'border-slate-100 bg-slate-50/50 grayscale-[0.5]'
                            : isServing
                              ? 'border-sky-100 bg-sky-50 shadow-sm'
                              : isOnBreak
                                ? 'border-amber-100 bg-amber-50 shadow-sm'
                                : 'border-emerald-100 bg-emerald-50 shadow-sm'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shadow-sm ${isOffline ? 'bg-slate-200 text-slate-500' :
                              isServing ? 'bg-sky-500 text-white' :
                                isOnBreak ? 'bg-amber-500 text-white' :
                                  'bg-emerald-500 text-white'
                              }`}>
                              {counter.number}
                            </div>
                            <div className="text-left">
                              <p className={`font-bold text-sm leading-none ${isOffline ? 'text-slate-500' : 'text-slate-600'}`}>Counter #{counter.number}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {isOffline ? (
                                  <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Offline</span>
                                  </div>
                                ) : isServing ? (
                                  <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-600">Now Serving</span>
                                  </div>
                                ) : isOnBreak ? (
                                  <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">On Break</span>
                                  </div>
                                ) : isOnline ? (
                                  <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Online</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {!isOffline && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isServing ? 'text-sky-500 bg-white shadow-sm' :
                              isOnBreak ? 'text-amber-500 bg-white shadow-sm' :
                                'text-emerald-500 bg-white shadow-sm'
                              }`}>
                              {isServing ? <Sparkles className="w-4 h-4" /> :
                                isOnBreak ? <Coffee className="w-4 h-4" /> :
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </section>
          )}
        </div>

        <footer className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left">
          <img src={logo} alt="SLT-Mobitel Logo" className="h-10 sm:h-12 object-contain" />
          <div className="sm:border-l border-slate-300 sm:pl-4">
            <p className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
              Digital Queue<br />Management Platform
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">© 2026 SLT-Mobitel Digital Platforms Section</p>
          </div>
        </footer>
      </div>


      {/* Voice Control Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {announcementQueue.length > 0 && (
          <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce shadow-lg shadow-emerald-200">
            {announcementQueue.length} Announcement{announcementQueue.length > 1 ? 's' : ''} Pending
          </div>
        )}
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${
            voiceEnabled 
              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' 
              : 'bg-white text-slate-400 border border-slate-200 hover:text-emerald-600'
          }`}
          title={voiceEnabled ? "Mute Voice Announcements" : "Enable Voice Announcements"}
        >
          {voiceEnabled ? (
            <Volume2 className={`w-6 h-6 ${isSpeaking ? 'animate-pulse' : ''}`} />
          ) : (
            <VolumeX className="w-6 h-6" />
          )}
          
          {!voiceEnabled && (
            <div className="absolute bottom-full mb-3 right-0 bg-white border border-slate-200 shadow-xl p-3 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <p className="text-xs font-bold text-slate-800">Browser blocks audio by default.</p>
              <p className="text-[10px] text-slate-500">Click to enable voice announcements.</p>
            </div>
          )}
        </button>
      </div>

      <style>{`
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.3);
        }
      `}</style>
    </div >
  )
}
