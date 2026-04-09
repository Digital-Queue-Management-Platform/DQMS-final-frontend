import { useEffect, useMemo, useRef, useState } from "react"
import logo from "../assets/logo.png"
import { useParams, useSearchParams } from "react-router-dom"
import { Ticket, AlertTriangle, Sparkles, Volume2, VolumeX, Play } from "lucide-react"
import api, { API_URL } from "../config/api"
import { useWebSocket } from "../hooks/useWebSocket"
import type { Token } from "../types"
import ServiceName from "../components/ServiceName"

type QueuePayload = {
  waiting: Token[]
  inService: Token[]
  availableOfficers: number
  totalWaiting: number
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



export default function OutletQueueDisplay() {
  const { outletId } = useParams()
  const [query] = useSearchParams()

  // Component instance tracking for debugging
  const instanceIdRef = useRef(Math.random().toString(36).substr(2, 9))

  // Log component mounting for debugging
  useEffect(() => {
    console.log(`[OutletQueueDisplay] Component mounted [Instance: ${instanceIdRef.current}] for outlet: ${outletId}`)
    return () => {
      console.log(`[OutletQueueDisplay] Component unmounting [Instance: ${instanceIdRef.current}]`)
    }
  }, [])

  const [refreshSeconds, setRefreshSeconds] = useState(() => Math.max(5, Math.min(60, toInt(query.get("refresh"), 10))))
  const [showService, setShowService] = useState(() => toBool(query.get("services"), false))
  const [playTone, setPlayTone] = useState(() => toBool(query.get("playTone"), true))

  // Zoom scale state (%)
  const [zoomScale, setZoomScale] = useState(() => toInt(query.get("scale"), 100))

  // YouTube Video ID
  const [videoId, setVideoId] = useState(() => query.get("videoId") || "Iea84C32YHA") // More stable nature video resource

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
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  
  // Deduplication: Track recent announcements to prevent duplicates
  const recentAnnouncementsRef = useRef<Set<string>>(new Set())
  
  // Audio Context Management for better browser compatibility
  const audioContextRef = useRef<AudioContext | null>(null)

  const [queue, setQueue] = useState<QueuePayload | null>(null)
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [outletMeta, setOutletMeta] = useState<{ name: string; location: string } | null>(null)
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)

  const fetchAll = async () => {
    if (!outletId) return

    try {
      const [queueRes, statusRes] = await Promise.all([
        api.get(`/queue/outlet/${outletId}`),
        api.get(`/branch-status/${outletId}`),
      ])

      const queueData: any = queueRes.data
      setQueue(queueData)

      // Update display settings from backend if available
      if (queueData.displaySettings) {
        const s = queueData.displaySettings
        if (s.refresh) setRefreshSeconds(Math.max(5, Math.min(60, Number(s.refresh))))
        if (s.services !== undefined) setShowService(!!s.services)

        if (s.playTone !== undefined) {
          const val = (s.playTone === "0" || s.playTone === 0 || s.playTone === false) ? false : true
          setPlayTone(val)
        }
        if (s.contentScale) setZoomScale(Number(s.contentScale))
        if (s.videoId) setVideoId(s.videoId)
      }

      if (queueData.outletMeta) {
        setOutletMeta(queueData.outletMeta)
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

  // Auto-reconnecting WebSocket with robust error handling
  useWebSocket({
    onMessage: (msg) => {
      try {
        const type = msg?.type
        const data = msg?.data
        if (!data || !outletId) return

        if (["NEW_TOKEN", "TOKEN_COMPLETED", "TOKEN_UPDATED", "TOKEN_CANCELLED", "TOKEN_PRIORITY_UPDATED", "OFFICER_STATUS_CHANGE", "OFFICER_UPDATED", "TOKEN_SKIPPED"].includes(type)) {
          if (!data.outletId || data.outletId === outletId) fetchAll()
        }

        if (type === "TOKEN_CALLED" || type === "TOKEN_RECALLED") {
          console.log(`[WebSocket] ${type} event received for token:`, data.tokenNumber, `[Instance: ${instanceIdRef.current}]`)
          if (!data.outletId || data.outletId === outletId) {
            fetchAll()
            if (voiceEnabledRef.current) {
              // Create unique key for deduplication: eventType + token + timestamp window (5 seconds)
              const timeWindow = Math.floor(Date.now() / 5000) // 5-second windows
              const announcementKey = `${type}-${data.tokenNumber}-${data.counterNumber}-${timeWindow}`
              
              // Check if we've already processed this announcement recently
              if (recentAnnouncementsRef.current.has(announcementKey)) {
                console.log(`[Voice] Skipping duplicate announcement: ${announcementKey} [Instance: ${instanceIdRef.current}]`)
                return
              }
              
              // Add to recent announcements set and clean up old entries
              recentAnnouncementsRef.current.add(announcementKey)
              
              // Clean up old entries (keep only last 10)
              if (recentAnnouncementsRef.current.size > 10) {
                const entries = Array.from(recentAnnouncementsRef.current)
                recentAnnouncementsRef.current.clear()
                entries.slice(-5).forEach(key => recentAnnouncementsRef.current.add(key))
              }
              
              console.log(`[Voice] Adding to announcement queue: ${type} Key: ${announcementKey} [Instance: ${instanceIdRef.current}]`)
              setAnnouncementQueue(prev => [...prev, { ...data, eventType: type, volume: 300 }]) // Default MAX (300%) volume for regular announcements
            } else {
              console.log("[Voice] Skipping announcement because sound is muted. Click the speaker icon to enable.")
            }
          }
        }

        if (type === "TEST_SOUND") {
          console.log(`[WebSocket] TEST_SOUND event received: ${data.testType} [Instance: ${instanceIdRef.current}]`)
          if (!data.outletId || data.outletId === outletId) {
            if (voiceEnabledRef.current) {
              const testType = data.testType || 'chime'
              const testLang = data.lang || 'en'

              if (testType === 'chime') {
                // Create unique key for chime test deduplication
                const timeWindow = Math.floor(Date.now() / 3000) // 3-second windows for tests
                const chimeKey = `TEST_CHIME-${timeWindow}`
                
                if (recentAnnouncementsRef.current.has(chimeKey)) {
                  console.log(`[Voice] Skipping duplicate chime test: ${chimeKey} [Instance: ${instanceIdRef.current}]`)
                  return
                }
                
                recentAnnouncementsRef.current.add(chimeKey)
                console.log(`[Voice] Playing chime test [Instance: ${instanceIdRef.current}]`)
                playChime(data.chimeVolume || 100) // Default to MAX chime volume (100%)
              } else {
                // Create unique key for voice test deduplication
                const timeWindow = Math.floor(Date.now() / 3000) // 3-second windows for tests
                const voiceTestKey = `TEST_VOICE-${testLang}-${timeWindow}`
                
                if (recentAnnouncementsRef.current.has(voiceTestKey)) {
                  console.log(`[Voice] Skipping duplicate voice test: ${voiceTestKey} [Instance: ${instanceIdRef.current}]`)
                  return
                }
                
                recentAnnouncementsRef.current.add(voiceTestKey)
                
                const sampleText = data.customText
                  ? data.customText
                  : testLang === 'si'
                    ? "ශබ්ද විකාශන යන්ත්‍ර පරීක්ෂා කිරීම. එය සාර්ථකව ක්‍රියා කරයි."
                    : testLang === 'ta'
                      ? "ஒலிபெருக்கி சோதனை. இது சரியாக வேலை செய்கிறது."
                      : "Testing the speakers. It is working fine."

                console.log(`[Voice] Enqueueing manual test announcement: ${sampleText} [Instance: ${instanceIdRef.current}]`)
                setAnnouncementQueue(prev => [...prev, {
                  tokenNumber: "Test", // Placeholder for speech logic
                  counterNumber: "",
                  eventType: 'TEST_SOUND',
                  text: sampleText,
                  lang: testLang,
                  volume: data.voiceVolume || 300 // Use voice volume from test request, default to MAX (300%)
                }])
              }
            }
          }
        }
      } catch (err) {
        console.error("WebSocket message processing error:", err)
      }
    },
    onError: () => {
      console.error("[WebSocket] Connection error - auto-reconnect will attempt recovery")
    },
    onClose: (event) => {
      if (!event.wasClean) {
        console.warn("[WebSocket] Connection lost unexpectedly - auto-reconnecting...")
      }
    },
    autoReconnect: true,
    reconnectInterval: 3000 // Reconnect every 3 seconds if connection drops
  })

  const servingByCounter = useMemo(() => {
    const serving = (queue?.inService || []).slice(0, 4)
    return serving.sort((a, b) => (a.counterNumber || 999) - (b.counterNumber || 999))
  }, [queue])

  const upNext = useMemo(() => {
    return (queue?.waiting || []).slice(0, 6)
  }, [queue])



  // Audio Context Management - ensures audio works after browser suspension
  const ensureAudioContextActive = async (): Promise<boolean> => {
    try {
      // Get or create audio context
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!audioContextRef.current && AudioContextClass) {
        audioContextRef.current = new AudioContextClass()
      }
      
      const ctx = audioContextRef.current
      if (!ctx) return true // Fallback to HTML5 audio
      
      // Resume if suspended (happens after user interaction is gone)
      if (ctx.state === 'suspended') {
        await ctx.resume()
        console.log("[Voice] Audio context resumed from suspended state")
      }
      
      return true
    } catch (err) {
      console.warn("[Voice] Could not ensure audio context:", err)
      return true // Fail gracefully
    }
  }

  // Voice Announcement Logic - Enhanced with audio context management
  const playChime = async (volume: number = 100) => {
    return new Promise<void>((resolve) => {
      let resolved = false
      const done = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutId)
          resolve()
        }
      }
      const timeoutId = setTimeout(done, 10000) // 10 seconds max

      // Ensure audio context is active before playing
      ensureAudioContextActive().then(async () => {
        const audio = new Audio("/announcement.mp3")
        // @ts-ignore - Prevent GC
        window.__activeChime = audio
        // Convert percentage to audio volume (0.0-1.0), capped at 100% for chime to prevent distortion
        audio.volume = Math.min(volume / 100, 1.0)
        console.log(`[Voice] Chime volume set to ${Math.min(volume, 100)}%`)
        audio.onended = done
        audio.onerror = (err) => {
          console.error("Failed to play custom announcement chime:", err)
          done()
        }
        audio.play().catch(err => {
          console.error("[Voice] Audio playback blocked:", err)
          if (err.name === 'NotAllowedError') {
            setAudioUnlocked(false)
          }
          done()
        })
      }).catch(done)
    })
  }

  // Helper function to ensure voices are loaded
  const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      if (window.speechSynthesis.getVoices().length > 0) {
        resolve(window.speechSynthesis.getVoices())
        return
      }
      
      const voicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChanged)
        resolve(window.speechSynthesis.getVoices())
      }
      
      window.speechSynthesis.addEventListener('voiceschanged', voicesChanged)
      
      // Fallback timeout
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChanged)
        resolve(window.speechSynthesis.getVoices())
      }, 1000)
    })
  }

  // Fallback to browser Speech API when TTS fails
  const fallbackToSpeechAPI = async (text: string, lang: string): Promise<void> => {
    return new Promise<void>(async (resolve) => {
      if (!window.speechSynthesis) {
        console.error("[Voice] SpeechSynthesis API not available")
        resolve()
        return
      }
      
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang === 'si' ? 'si-LK' : lang === 'ta' ? 'ta-LK' : 'en-US'
      utterance.rate = lang === 'en' ? 0.9 : 0.7
      utterance.volume = 1.0
      
      // For English, try to select a female voice
      if (lang === 'en') {
        const voices = await loadVoices()
        console.log(`[Voice] Available voices: ${voices.map(v => v.name).join(', ')}`)
        
        const femaleVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('female') || 
           voice.name.toLowerCase().includes('woman') ||
           voice.name.toLowerCase().includes('zira') ||
           voice.name.toLowerCase().includes('hazel') ||
           voice.name.toLowerCase().includes('susan') ||
           voice.name.toLowerCase().includes('samantha') ||
           voice.name.toLowerCase().includes('karen') ||
           voice.name.toLowerCase().includes('veena') ||
           voice.name.toLowerCase().includes('fiona'))
        )
        
        if (femaleVoice) {
          utterance.voice = femaleVoice
          console.log(`[Voice] Using female voice: ${femaleVoice.name}`)
        } else {
          // Fallback: try to find any English voice that's likely female
          const englishVoice = voices.find(voice => voice.lang.startsWith('en'))
          if (englishVoice) {
            utterance.voice = englishVoice
            console.log(`[Voice] Using English voice: ${englishVoice.name}`)
          }
        }
      }
      
      utterance.onend = () => resolve()
      utterance.onerror = (err) => {
        console.error("[Voice] SpeechSynthesis error:", err)
        resolve()
      }
      
      try {
        window.speechSynthesis.speak(utterance)
      } catch (err) {
        console.error("[Voice] Could not speak:", err)
        resolve()
      }
    })
  }

  const speakSentence = async (tokenData: any) => {
    const num = String(tokenData.tokenNumber) // No padding for natural speech
    const counter = tokenData.counterNumber || 'Counter'
    const eventType = tokenData.eventType || 'TOKEN_CALLED'
    const lang = tokenData.lang || (Array.isArray(tokenData.preferredLanguages) && tokenData.preferredLanguages[0]) || 'en'

    let text = ""

    if (eventType === 'TOKEN_CALLED') {
      if (lang === 'si') text = `ටෝකන් අංක ${num}, කරුණාකර කවුන්ටර අංක ${counter} වෙත පැමිණෙන්න.`
      else if (lang === 'ta') text = `அடையாள எண் ${num}, தயவுசெய்து கவுண்டர் எண் ${counter} க்கு செல்லவும்.`
      else text = `Token number ${num}, please proceed to counter number ${counter}.`
    } else if (eventType === 'TOKEN_RECALLED') {
      if (lang === 'si') text = `ටෝකන් අංක ${num} නැවත කැඳවනු ලැබේ. කරුණාකර වහාම කවුන්ටරය ${counter} වෙත පැමිණෙන්න.`
      else if (lang === 'ta') text = `அடையாள எண் ${num} மீண்டும் அழைக்கப்படுகிறது. உடனடியாக கவுண்டர் ${counter} க்கு வரவும்.`
      else text = `Token number ${num} is being recalled. Please proceed to counter number ${counter} immediately.`
    } else if (eventType === 'TEST_SOUND') {
      text = tokenData.text || ""
    }

    try {
      await ensureAudioContextActive()
      
      // Use TTS API for all languages for consistent quality
      if (lang === 'si' || lang === 'ta' || lang === 'en') {
        try {
          const ttsUrl = `${API_URL}/tts/speak?text=${encodeURIComponent(text)}&lang=${lang}&gender=female`
          console.log(`[Voice] Using TTS API for ${lang} (female voice): ${text.substring(0, 50)}...`)
          console.log(`[Voice] TTS URL: ${ttsUrl}`)
          console.log(`[Voice] Requested volume for this test: ${tokenData.volume}%`)
          
          // Fetch the audio data first, then create Audio from blob
          const response = await fetch(ttsUrl)
          if (!response.ok) {
            throw new Error(`TTS request failed with status ${response.status}`)
          }
          
          const audioBlob = await response.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          
          // Set up Web Audio API for volume amplification
          let audioContext: AudioContext | null = null
          let gainNode: GainNode | null = null
          let source: MediaElementAudioSourceNode | null = null
          
          try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            source = audioContext.createMediaElementSource(audio)
            gainNode = audioContext.createGain()
            
            // Add a compressor to prevent audio clipping at high volumes (less aggressive settings for better volume)
            const compressor = audioContext.createDynamicsCompressor()
            compressor.threshold.value = -10  // Higher threshold (was -20)
            compressor.knee.value = 20        // Smoother knee (was 40)
            compressor.ratio.value = 4        // Lower ratio (was 12)
            compressor.attack.value = 0.005   // Slightly slower attack
            compressor.release.value = 0.1    // Faster release (was 0.25)
            
            // Calculate volume multiplier based on user setting (20-300%)
            // Convert percentage to multiplier (100% = 1.0, 300% = 3.0)
            // Extra boost for Sinhala and Tamil to compensate for TTS differences
            const userVolume = tokenData.volume || 100 // Default to 100% if not specified
            let volumeMultiplier = userVolume / 100
            
            // Apply extra boost for Sinhala and Tamil (they tend to be quieter from Google TTS)
            if (lang === 'si' || lang === 'ta') {
              volumeMultiplier *= 1.5  // 50% extra boost for these languages
              console.log(`[Voice] Applied extra 50% boost for ${lang} language`)
            }
            
            gainNode.gain.value = volumeMultiplier
            console.log(`[Voice] Audio amplified to ${userVolume}% (effective: ${Math.round(volumeMultiplier * 100)}%) using Web Audio API with compression for language: ${lang}`)
            
            source.connect(gainNode)
            gainNode.connect(compressor)
            compressor.connect(audioContext.destination)
            
            // Set base volume to maximum as well
            audio.volume = 1.0
            
          } catch (webAudioError) {
            console.warn(`[Voice] Web Audio API amplification failed, using standard volume:`, webAudioError)
            audio.volume = 1.0
          }
          
          // @ts-ignore - Prevent GC
          window.__activeSpeech = audio
          
          return new Promise<void>((resolve) => {
            let resolved = false
            const done = () => {
              if (!resolved) {
                resolved = true
                clearTimeout(timeoutId)
                // Clean up blob URL to prevent memory leaks
                if (audioUrl) URL.revokeObjectURL(audioUrl)
                // Clean up Web Audio API resources
                if (audioContext && audioContext.state !== 'closed') {
                  audioContext.close().catch(err => console.warn('[Voice] AudioContext cleanup error:', err))
                }
                resolve()
              }
            }
            
            const timeoutId = setTimeout(done, 15000) // TTS timeout
            
            audio.onended = done
            audio.oncanplay = () => {
              console.log("[Voice] TTS audio (blob) loaded successfully")
            }
            audio.onplay = () => {
              console.log("[Voice] TTS audio (blob) started playing")
            }
            audio.onerror = (err) => {
              console.error(`[Voice] TTS audio (blob) error for ${lang}:`, err)
              console.error(`[Voice] Audio element state:`, {
                readyState: audio.readyState,
                networkState: audio.networkState,
                error: audio.error
              })
              fallbackToSpeechAPI(text, lang).then(done)
            }
            
            audio.play().catch(err => {
              console.error(`[Voice] TTS play (blob) failed for ${lang}:`, err)
              console.error(`[Voice] Audio element state:`, {
                readyState: audio.readyState,
                networkState: audio.networkState,
                src: audio.src
              })
              fallbackToSpeechAPI(text, lang).then(done)
            })
          })
        } catch (ttsErr) {
          console.error("[Voice] TTS request failed, using Speech API fallback:", ttsErr)
          return fallbackToSpeechAPI(text, lang)
        }
      } else {
        // Use browser Speech API for English or test sounds
        console.log(`[Voice] Using browser Speech API for ${lang}: ${text.substring(0, 50)}...`)
        return fallbackToSpeechAPI(text, lang)
      }
    } catch (err) {
      console.error("[Voice] speakSentence failed completely:", err)
    }
  }

  useEffect(() => {
    if (voiceEnabled && announcementQueue.length > 0 && !isSpeaking) {
      const processQueue = async () => {
        setIsSpeaking(true)
        const nextToken = announcementQueue[0]
        let retryCount = 0
        const maxRetries = 2
        
        let success = false
        while (!success && retryCount <= maxRetries) {
          try {
            console.log(`[Voice] Processing announcement for token ${nextToken.tokenNumber} (attempt ${retryCount + 1}/${maxRetries + 1})`)
            
            if (playTone) {
              await playChime(100) // Use MAX volume for regular announcements (100% is maximum for chimes)
              await new Promise(r => setTimeout(r, 600)) // Pause after chime
            }
            
            await speakSentence(nextToken)
            success = true
            
          } catch (err) {
            retryCount++
            console.error(`[Voice] Announcement failed (attempt ${retryCount}):`, err)
            
            if (retryCount <= maxRetries) {
              // Retry with exponential backoff
              await new Promise(r => setTimeout(r, 1000 * retryCount))
              
              // Try to reset audio context on retry
              try {
                await ensureAudioContextActive()
              } catch {}
            } else {
              console.error(`[Voice] Failed after ${maxRetries} retries, skipping announcement for token:`, nextToken.tokenNumber)
              
              // Log failure to backend for diagnostics (optional)
              try {
                api.post('/logs/voice-failure', {
                  tokenNumber: nextToken.tokenNumber,
                  lang: nextToken.lang || 'unknown',
                  error: (err as Error)?.message || 'Unknown error',
                  timestamp: new Date().toISOString()
                }).catch(() => {
                  // Silently fail if logging fails - don't break the queue
                })
              } catch {}
            }
          }
        }
        
        setAnnouncementQueue(prev => prev.slice(1))
        // Add a small pause between consecutive announcements so they are clear
        await new Promise(r => setTimeout(r, 1000))
        setIsSpeaking(false)
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
    <div className="h-screen bg-[#f8fafc] text-slate-900 flex flex-col overflow-hidden select-none"
      style={{
        backgroundImage: "radial-gradient(circle at 10% 10%, rgba(0, 51, 102, 0.03), transparent 40%), radial-gradient(circle at 90% 90%, rgba(14, 165, 233, 0.05), transparent 40%)"
      }}
    >
      <div
        className="flex-1 flex flex-col mx-auto w-full overflow-hidden transition-all duration-500 ease-in-out"
        style={{ 
          zoom: zoomScale / 100,
          maxWidth: zoomScale > 100 ? 'none' : '1536px',
          padding: zoomScale > 100 ? '1.5rem' : '2rem'
        }}
      >
        <header className="flex-shrink-0 flex items-center justify-between mb-6 border-b-[4px] border-[#003366] pb-6 bg-white/50 backdrop-blur-sm -mx-8 px-8">
          <div className="flex items-center gap-6">
            <img src={logo} alt="SLT Logo" className="h-[100px] w-auto object-contain" />
            <div>
              <h1 className="font-bold tracking-tight leading-none text-[#1e1b4b] capitalize text-7xl">
                {outletMeta?.name?.toLowerCase() || "Sri Lanka Telecom"}
              </h1>
              <p className="text-indigo-600 font-semibold uppercase tracking-[0.2em] text-lg mt-3 flex items-center gap-3">
                <span className="w-6 h-0.5 bg-indigo-600 rounded-full" />
                {outletMeta?.location || "Outlet Service Portal"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-emerald-700 font-bold text-xs tracking-widest uppercase">Live Sync</span>
            </div>
            <div className="bg-[#1e1b4b] text-white px-8 py-4 rounded-2xl shadow-xl flex flex-col items-center min-w-[320px] border border-white/10">
              <div className="text-6xl font-bold tabular-nums tracking-tight mb-0.5">
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-lg font-medium tracking-wide text-indigo-200">
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-h-0 overflow-hidden">
          {notice && (
            <div className="flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500 rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-amber-800 text-sm truncate">{notice.title}</p>
                {notice.message && <p className="text-xs text-amber-700 mt-1 line-clamp-2">{notice.message}</p>}
              </div>
            </div>
          )}

          {error && (
            <div className="flex-shrink-0 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm animate-pulse">
              {error}
            </div>
          )}

          <div className="flex-1 flex gap-8 min-h-0 overflow-hidden">
            <section className="flex-[7] flex flex-col gap-6 overflow-hidden">
              {/* Now Serving Strip (Dynamic size) */}
              <div 
                className={`transition-all duration-700 ease-in-out bg-white rounded-[2.5rem] border-4 border-slate-100 shadow-xl overflow-hidden flex flex-col ${
                  servingByCounter.length === 0 ? 'flex-0 h-0 p-0 border-0 mb-0 opacity-0' : 'flex-[6] p-8 mb-0 opacity-100'
                }`}
              >
                <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                  <Sparkles className="w-10 h-10 text-indigo-500" />
                  <h2 className="text-4xl font-bold text-slate-800 tracking-tight">Now Serving</h2>
                </div>

                {servingByCounter.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-2xl">
                    <p className="text-3xl font-medium text-slate-400">No active tokens</p>
                  </div>
                ) : (
                  <div className={`flex-1 grid gap-8 overflow-hidden ${
                    servingByCounter.length === 1 ? 'grid-cols-1' :
                    servingByCounter.length === 2 ? 'grid-cols-2' :
                    'grid-cols-4'
                  }`}>
                    {servingByCounter.slice(0, 4).map((token) => (
                      <div
                        key={token.id}
                        className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-3xl shadow-xl flex flex-col items-stretch overflow-hidden border border-white/5 animate-in zoom-in duration-500"
                      >
                        {/* Token Part */}
                        <div className="flex-[6] flex flex-col items-center justify-center p-6 border-b border-white/5">
                          <span className="text-indigo-300 text-sm font-semibold uppercase tracking-widest mb-1">Token</span>
                          <span className="text-7xl lg:text-8xl font-black text-white tracking-tight drop-shadow-xl">
                            {token.tokenNumber}
                          </span>
                        </div>
                        
                        {/* Counter Part */}
                        <div className="flex-[4] bg-white/5 flex items-center justify-center p-4">
                          <span className="text-3xl lg:text-4xl font-black text-yellow-400 uppercase tracking-tight">
                            Counter {token.counterNumber ?? token.officer?.counterNumber ?? '0'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* YouTube Video Section (Expands when needed) */}
              <div className={`transition-all duration-700 ease-in-out bg-black rounded-[2.5rem] shadow-xl overflow-hidden border-4 border-slate-100 relative group ${
                servingByCounter.length === 0 ? 'flex-1' : 'flex-[4]'
              }`}>
                {videoId ? (
                  <>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&fs=0&autohide=1`}
                      title="Promotion"
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full aspect-video min-h-full min-w-full object-cover scale-[1.01] pointer-events-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <div className="absolute inset-0 pointer-events-none border-[12px] border-white/5 rounded-[2rem]"></div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium italic">No promotion video configured</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Sidebar Up Next (Right 30%) */}
            <aside className="flex-[3] bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-4 border-blue-900/30">
              <div className="bg-blue-900/50 p-8 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <Ticket className="w-10 h-10 text-indigo-300" />
                  <h2 className="text-4xl font-bold text-white tracking-tight">Up Next</h2>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-6 space-y-4">
                {upNext.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 italic text-2xl">
                    No pending tokens
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 h-full">
                    {upNext.map((token, idx) => (
                      <div
                        key={token.id}
                        className={`p-6 rounded-[2rem] flex items-center justify-between border-2 transition-all h-[15%] min-h-[100px] ${
                          idx === 0 ? 'bg-white border-sky-500 shadow-[0_0_30px_rgba(14,165,233,0.3)]' : 'bg-[#002244] border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-8">
                          <div className={`text-6xl font-bold tabular-nums ${idx === 0 ? 'text-[#1e1b4b]' : 'text-slate-100'}`}>
                            {token.tokenNumber}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-xl font-semibold tracking-wide ${idx === 0 ? 'text-slate-600' : 'text-slate-400'}`}>
                              Queue Position: {idx + 1}
                            </span>
                            {showService && (
                              <div className="mt-2 flex gap-2">
                                {token.serviceTypes?.map(s => (
                                  <span key={s} className={`${idx === 0 ? 'text-indigo-600' : 'text-indigo-400'} text-xl font-bold`}>
                                    <ServiceName serviceType={s} />
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {idx === 0 && (
                          <div className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-sm tracking-wide animate-pulse">
                            Please Prepare
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Compact High-Visibility Queue Stats */}
              <div className="bg-white/5 p-6 border-t border-white/10 mt-auto">
                <div className="grid grid-cols-3 gap-4">
                  {/* Waiting Metric */}
                  <div className="bg-indigo-600/20 rounded-2xl p-4 border border-indigo-500/20 flex flex-col items-center">
                    <span className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-1">Waiting</span>
                    <span className="text-white text-4xl font-bold tracking-tight">{queue?.totalWaiting || 0}</span>
                  </div>

                  {/* Serving Metric */}
                  <div className="bg-emerald-600/20 rounded-2xl p-4 border border-emerald-500/20 flex flex-col items-center">
                    <span className="text-emerald-300 text-xs font-semibold uppercase tracking-widest mb-1">Serving</span>
                    <span className="text-white text-4xl font-bold tracking-tight">{queue?.inService?.length || 0}</span>
                  </div>

                  {/* Counters Metric */}
                  <div className="bg-blue-600/20 rounded-2xl p-4 border border-blue-500/20 flex flex-col items-center">
                    <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Counters</span>
                    <span className="text-white text-4xl font-bold tracking-tight">{queue?.availableOfficers || 0}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer Removed */}
      </div>


      {/* Voice Control Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {announcementQueue.length > 0 && (
          <div className="text-[10px] font-bold px-2 py-1 rounded-full animate-bounce shadow-lg bg-emerald-500 text-white shadow-emerald-200">
            {announcementQueue.length} Announcement{announcementQueue.length > 1 ? 's' : ''} Pending
          </div>
        )}
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${voiceEnabled
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
            <div className="absolute bottom-full mb-3 right-0 border shadow-xl p-3 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 bg-white border-slate-200 text-slate-800">
              <p className="text-xs font-bold">Browser blocks audio by default.</p>
              <p className="text-[10px] text-slate-500">Click to enable voice announcements.</p>
            </div>
          )}
        </button>
      </div>

      {/* Audio Unlock Overlay */}
      {voiceEnabled && !audioUnlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-center backdrop-blur-sm bg-slate-900/95">
          <div className="max-w-md w-full rounded-3xl p-8 shadow-2xl border bg-white border-white/20">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100 text-emerald-600">
              <Volume2 className="w-10 h-10 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black mb-2 text-slate-900">Enable Audio</h2>
            <p className="text-slate-500 mb-8">
              Browser security requires a manual click to enable sounds and voice announcements for this display.
            </p>
            <button
              onClick={() => {
                // Play a brief silent chime to unlock audio context
                const audio = new Audio("/announcement.mp3")
                audio.volume = 0.01 // Very quiet initial play
                audio.play().then(() => {
                  setAudioUnlocked(true)
                  console.log("[Voice] Audio context unlocked successfully")
                }).catch(err => {
                  console.error("[Voice] Final unlock attempt failed:", err)
                })
              }}
              className="w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700"
            >
              Start Audio Display
            </button>
          </div>
        </div>
      )}

      <style>{`
        .animate-marquee {
          display: -webkit-box;
          display: -webkit-flex;
          display: flex;
          width: -webkit-max-content;
          width: max-content;
          -webkit-animation: marquee linear infinite;
          animation: marquee linear infinite;
        }
        @-webkit-keyframes marquee {
          0% { -webkit-transform: translateX(0); transform: translateX(0); }
          100% { -webkit-transform: translateX(-50%); transform: translateX(-50%); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-slow {
          animation: marquee-slow 30s linear infinite;
        }
        @keyframes marquee-slow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .custom-scrollbar-dark::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-dark::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }

        /* Fallbacks for older Smart TV browsers (Chromium < 70) */
        h1 { font-size: 2.25rem; } /* Fallback for clamp() */
        .flex { display: -webkit-box; display: -webkit-flex; display: flex; }
        .grid { display: block; } /* Fallback for Grid: stacked blocks */
        @supports (display: grid) { .grid { display: grid; } }
        
        /* Fallback for 'gap' in flexbox on legacy engines */
        .flex-wrap > * { margin: 8px; }
        @supports (gap: 1px) { .flex-wrap > * { margin: 0; } }
      `}</style>
    </div >
  )
}
