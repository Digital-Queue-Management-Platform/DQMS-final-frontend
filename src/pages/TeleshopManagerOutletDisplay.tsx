import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ExternalLink, Copy, Monitor, SlidersHorizontal, CheckCircle2, Save, Loader2, Volume2, Play, Music, Bell, Mic, UploadCloud } from "lucide-react"
import api from "../config/api"

type TeleshopManagerMe = {
  id: string
  name: string
  branchId?: string | null
  branch?: {
    id: string
    name: string
    location: string
  } | null
}

const parsePromoMediaUrls = (raw: string): string[] => {
  if (!raw.trim()) return []

  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((value) => {
      const v = value.toLowerCase()
      const isHttp = v.startsWith("http://") || v.startsWith("https://")
      const isDirect = v.includes(".m3u8") || v.includes(".mpd") || v.includes(".mp4") || v.includes(".webm")
      return isHttp && isDirect
    })
}

const normalizeUploadedPromoUrl = (urlValue: string): string => {
  const raw = urlValue.trim()
  if (!raw) return raw

  if (raw.startsWith("/")) {
    if (raw.startsWith("/uploads/")) {
      return `${window.location.origin}/api${raw}`
    }
    return `${window.location.origin}${raw}`
  }

  try {
    const parsed = new URL(raw)
    const isLocalHost = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost"
    const isMixedContent = window.location.protocol === "https:" && parsed.protocol === "http:"

    if (parsed.pathname.startsWith("/uploads/")) {
      parsed.pathname = `/api${parsed.pathname}`
      return parsed.toString()
    }

    if (isLocalHost || isMixedContent) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    return raw
  }

  return raw
}

const normalizePromoVideoField = (raw: string): string => {
  if (!raw.trim()) return ""

  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeUploadedPromoUrl(item))
    .join("\n")
}

export default function TeleshopManagerOutletDisplay() {
  const navigate = useNavigate()
  const [manager, setManager] = useState<TeleshopManagerMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOverUpload, setDragOverUpload] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  const [refresh, setRefresh] = useState(10)
  const [services, setServices] = useState(false)
  const [playTone, setPlayTone] = useState(true)
  const [contentScale, setContentScale] = useState(100)
  const [videoId, setVideoId] = useState("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4")
  const normalizedVideoId = useMemo(() => normalizePromoVideoField(videoId), [videoId])
  
  
  // Speaker Test State
  const [testLang, setTestLang] = useState<'en' | 'si' | 'ta'>('en')
  const [testRunning, setTestRunning] = useState(false)
  const [customEn, setCustomEn] = useState("")
  const [customSi, setCustomSi] = useState("")
  const [customTa, setCustomTa] = useState("")
  // Load saved volume settings from localStorage, fallback to max defaults
  const [chimeVolume, setChimeVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('teleshop-chime-volume')
      if (saved) {
        const parsed = parseInt(saved)
        // Ensure value is within valid range (20-100)
        if (parsed >= 20 && parsed <= 100) {
          return parsed
        }
      }
    } catch (error) {
      console.warn('[VolumeSettings] Failed to load saved chime volume:', error)
    }
    return 100 // MAX by default (20-100%)
  })
  const [voiceVolume, setVoiceVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('teleshop-voice-volume')
      if (saved) {
        const parsed = parseInt(saved)
        // Ensure value is within valid range (20-300)
        if (parsed >= 20 && parsed <= 300) {
          return parsed
        }
      }
    } catch (error) {
      console.warn('[VolumeSettings] Failed to load saved voice volume:', error)
    }
    return 300 // MAX by default (20-300%)
  })
  // Volume settings are automatically saved to localStorage via useEffect hooks

  // Save chime volume to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('teleshop-chime-volume', chimeVolume.toString())
    console.log(`[VolumeSettings] Chime volume saved: ${chimeVolume}%`)
  }, [chimeVolume])

  // Save voice volume to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('teleshop-voice-volume', voiceVolume.toString())
    console.log(`[VolumeSettings] Voice volume saved: ${voiceVolume}%`)
  }, [voiceVolume])

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("teleshopManagerToken")
        if (!token) {
          navigate("/teleshop-manager/login")
          return
        }

        const res = await api.get("/teleshop-manager/me", {
          headers: { Authorization: `Bearer ${token}` },
        })

        const profile = res.data?.teleshopManager
        setManager(profile)

        if (!profile?.branchId) {
          setError("You are not assigned to an outlet. Please contact your RTOM manager.")
          return
        }

        // Load persisted settings
        try {
          const settingsRes = await api.get("/teleshop-manager/display-settings", {
            headers: { Authorization: `Bearer ${token}` },
          })
          const s = settingsRes.data?.settings
          if (s) {
            if (s.refresh) setRefresh(s.refresh)
            if (s.services !== undefined) setServices(!!s.services)
            if (s.playTone !== undefined) setPlayTone(!!s.playTone)
            if (s.contentScale) setContentScale(Number(s.contentScale))
            if (s.videoId) setVideoId(normalizePromoVideoField(s.videoId))
          }
        } catch (se) {
          console.warn("Could not load persisted display settings", se)
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || "Failed to load teleshop manager profile")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate])

  const displayUrl = useMemo(() => {
    if (!manager?.branchId) return ""
    const params = new URLSearchParams({
      refresh: String(refresh),
      services: services ? "1" : "0",
      playTone: playTone ? "1" : "0",
      scale: String(contentScale),
      videoId: normalizedVideoId
    })
    return `${window.location.origin}/display/outlet/${manager.branchId}?${params.toString()}`
  }, [manager?.branchId, refresh, services, playTone, contentScale, normalizedVideoId])

  const previewUrl = useMemo(() => parsePromoMediaUrls(normalizedVideoId)[0] || "", [normalizedVideoId])

  const uploadPromoVideo = async (file: File) => {
    const isMp4Mime = file.type.toLowerCase() === "video/mp4"
    const isMp4Name = file.name.toLowerCase().endsWith(".mp4")
    if (!isMp4Mime && !isMp4Name) {
      setError("Only MP4 files are supported for drag-and-drop upload.")
      return
    }

    setError("")
    setUploadingVideo(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await api.post("/teleshop-manager/upload-promo-video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (!event.total) return
          setUploadProgress(Math.round((event.loaded * 100) / event.total))
        },
      })

      const uploadedUrl = res.data?.url
      const uploadedRelativeUrl = res.data?.relativeUrl
      if (!uploadedUrl) {
        throw new Error("Upload completed but no URL was returned")
      }

      const normalizedUrl = normalizeUploadedPromoUrl(uploadedRelativeUrl || uploadedUrl)

      setVideoId(normalizedUrl)
      setUploadProgress(100)
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 413) {
        setError("Upload failed: file is too large for server/proxy limits. Try a smaller MP4 (for example under 50MB) or increase reverse-proxy upload size.")
      } else {
        setError(e?.response?.data?.error || e?.message || "Failed to upload promo video")
      }
    } finally {
      setUploadingVideo(false)
      setTimeout(() => setUploadProgress(0), 600)
    }
  }

  const onSelectPromoFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadPromoVideo(file)
    e.target.value = ""
  }

  const onDropPromoFile = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverUpload(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await uploadPromoVideo(file)
  }

  const openDisplay = () => {
    if (displayUrl) window.open(displayUrl, "_blank")
  }

  const runSpeakerTest = async (type: 'chime' | 'voice', message?: string, lang?: 'en' | 'si' | 'ta') => {
    if (testRunning) return
    setTestRunning(true)

    try {
      await api.post("/teleshop-manager/test-sound", {
        type,
        lang: lang || testLang,
        customText: type === 'voice' ? (message || undefined) : undefined,
        chimeVolume: chimeVolume, // Pass chime volume
        voiceVolume: voiceVolume  // Pass voice volume
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("teleshopManagerToken")}` }
      })
      console.log(`[SpeakerTest] Remote broadcast triggered successfully - ${type === 'chime' ? `Chime: ${chimeVolume}%` : `Voice: ${voiceVolume}%`}`)
    } catch (err) {
      console.error("Speaker test failed:", err)
    } finally {
      setTestRunning(false)
    }
  }

  const announceAll = async () => {
    if (testRunning) return
    
    const messages = []
    if (customEn.trim()) messages.push({ text: customEn, lang: 'en' as const })
    if (customSi.trim()) messages.push({ text: customSi, lang: 'si' as const })
    if (customTa.trim()) messages.push({ text: customTa, lang: 'ta' as const })
    
    if (messages.length === 0) return
    
    setTestRunning(true)
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      // Send them sequentially
      for (const m of messages) {
        await api.post("/teleshop-manager/test-sound", {
          type: 'voice',
          lang: m.lang,
          customText: m.text
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // Wait 100ms before sending the next one to ensure the backend receives them correctly
        await new Promise(r => setTimeout(r, 200))
      }
    } catch (err) {
      console.error("Multi-language announcement failed:", err)
    } finally {
      setTestRunning(false)
    }
  }

  const [isTranslating, setIsTranslating] = useState(false)

  const handleAutoTranslate = async () => {
    if (!customEn.trim()) return
    setIsTranslating(true)
    try {
      const results = await Promise.all([
        api.post("/utils/translate", { text: customEn, target: 'si' }),
        api.post("/utils/translate", { text: customEn, target: 'ta' })
      ])
      
      if (results[0].data?.translated) setCustomSi(results[0].data.translated)
      if (results[1].data?.translated) setCustomTa(results[1].data.translated)
    } catch (err) {
      console.error("Translation failed:", err)
    } finally {
      setIsTranslating(false)
    }
  }

  const copyLink = async () => {
    if (!displayUrl) return
    try {
      await navigator.clipboard.writeText(displayUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError("Failed to copy URL. Please copy it manually.")
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setError("")
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      const sanitizedVideoId = normalizePromoVideoField(videoId)
      setVideoId(sanitizedVideoId)
      await api.post("/teleshop-manager/display-settings",
        {
          settings: {
            refresh,
            services,
            playTone,
            contentScale,
            videoId: sanitizedVideoId,
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading outlet display settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-sky-700 to-indigo-700 text-white p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sky-100 text-sm">Customer-Facing Screen</p>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">Outlet Queue Display Management</h1>
              <p className="text-sky-100 mt-2 text-sm md:text-base">
                Configure and launch the public queue dashboard customers see in your outlet.
              </p>
            </div>
            <div className="hidden md:flex w-14 h-14 rounded-2xl bg-white/15 items-center justify-center">
              <Monitor className="w-7 h-7" />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 rounded-3xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">Display Options</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Refresh interval (seconds)</span>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={refresh}
                  onChange={(e) => setRefresh(Math.max(5, Math.min(60, Number(e.target.value) || 10)))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </label>

              <label className="block md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">Promo Video Upload</span>
                  <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">Local MP4 Only</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">Upload an MP4 from this device. The last uploaded video replaces the current promo video.</p>
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="video/mp4,.mp4"
                      onChange={onSelectPromoFile}
                      className="hidden"
                    />

                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragOverUpload(true)
                      }}
                      onDragLeave={() => setDragOverUpload(false)}
                      onDrop={onDropPromoFile}
                      className={`mt-2 rounded-xl border-2 border-dashed px-3 py-3 transition-colors ${
                        dragOverUpload ? "border-sky-500 bg-sky-50" : "border-slate-300 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <UploadCloud className="w-4 h-4 text-slate-500" />
                          <span>Drag and drop MP4 here, or upload from device</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => uploadInputRef.current?.click()}
                          disabled={uploadingVideo}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          {uploadingVideo ? "Uploading..." : "Select MP4"}
                        </button>
                      </div>
                      {uploadingVideo && (
                        <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-sky-600 transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Current Promo Video</span>
                        <span className="text-[10px] text-slate-400">Saved automatically when you click Save Configuration</span>
                      </div>
                      <div className="max-h-28 overflow-auto rounded-lg bg-white border border-slate-200 p-2 text-xs font-mono text-slate-700 break-all whitespace-pre-wrap">
                        {previewUrl || videoId.trim() || "No promo video uploaded yet"}
                      </div>
                    </div>
                  </div>
                  <div className="w-32 h-[72px] bg-black rounded-lg overflow-hidden border border-slate-200 shadow-sm grow-0 shrink-0">
                    {previewUrl ? (
                      <video
                        src={previewUrl}
                        className="w-full h-full object-cover"
                        muted
                        autoPlay
                        loop
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 italic text-[10px] text-slate-400">No valid URL</div>
                    )}
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-800">Show service names</span>
                <input type="checkbox" checked={services} onChange={(e) => setServices(e.target.checked)} />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 bg-amber-50/50 border-amber-100">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">Enable Announcement Tone</span>
                  <span className="text-xs text-slate-500">Play the announcement chime before speaking names</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={playTone} 
                  onChange={(e) => setPlayTone(e.target.checked)} 
                  className="w-5 h-5 accent-amber-600"
                />
              </label>
            </div>



            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-5 h-5 text-slate-700" />
                <h2 className="text-lg font-bold text-slate-900">Overall Content Zoom (%)</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6 font-medium">
                Adjust this slider to increase or decrease the entire content size of the outlet display. 
                Perfect for making the display readable from any distance.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={5}
                    value={contentScale}
                    onChange={(e) => setContentScale(Number(e.target.value))}
                    className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  />
                  <div className="w-16 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center font-bold text-sky-700">
                    {contentScale}%
                  </div>
                </div>
                
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  <span>Small (50%)</span>
                  <span>Normal (100%)</span>
                  <span>Huge (200%)</span>
                </div>
              </div>
            </div>
 
             {/* Speaker Testing Section */}
             <div className="mt-8 pt-8 border-t border-slate-100">
               <div className="flex items-center gap-2 mb-4">
                 <Volume2 className="w-5 h-5 text-slate-700" />
                 <h2 className="text-lg font-bold text-slate-900">Speaker & Voice Testing</h2>
               </div>
               <p className="text-xs text-slate-500 mb-6 font-medium">
                 Test the outlet's audio hardware by playing a sample announcement.
                 Adjust the language to hear how the voice synthesis sounds.
               </p>
 
               <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
                 {/* Volume Controls - Settings are automatically saved and restored on refresh */}
                 <div className="space-y-4 mb-4 pb-4 border-b border-slate-200">
                   {/* Chime Volume */}
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 min-w-0 w-20">
                       <Bell className="w-4 h-4 text-blue-600" />
                       <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Chime:</label>
                     </div>
                     <div className="flex-1 flex items-center gap-3">
                       <input
                         type="range"
                         min={20}
                         max={100}
                         step={5}
                         value={chimeVolume}
                         onChange={(e) => setChimeVolume(Number(e.target.value))}
                         className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                       <div className="w-14 h-8 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs shadow-sm">
                         {chimeVolume}%
                       </div>
                     </div>
                     <div className="text-xs text-slate-500 w-20 flex items-center gap-1">
                       <Bell className="w-3 h-3" />
                       <span>{chimeVolume >= 80 ? 'Loud' : chimeVolume >= 60 ? 'Normal' : 'Quiet'}</span>
                     </div>
                   </div>
                   
                   {/* Voice Volume */}
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 min-w-0 w-20">
                       <Mic className="w-4 h-4 text-green-600" />
                       <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Voice:</label>
                     </div>
                     <div className="flex-1 flex items-center gap-3">
                       <input
                         type="range"
                         min={20}
                         max={300}
                         step={10}
                         value={voiceVolume}
                         onChange={(e) => setVoiceVolume(Number(e.target.value))}
                         className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                       />
                       <div className="w-14 h-8 rounded-lg bg-gradient-to-r from-green-50 to-green-100 border border-green-200 flex items-center justify-center font-bold text-green-700 text-xs shadow-sm">
                         {voiceVolume}%
                       </div>
                     </div>
                     <div className="text-xs text-slate-500 w-20 flex items-center gap-1">
                       <Mic className="w-3 h-3" />
                       <span>{voiceVolume >= 200 ? 'Very Loud' : voiceVolume >= 150 ? 'Loud' : voiceVolume >= 100 ? 'Normal' : 'Quiet'}</span>
                     </div>
                   </div>
                 </div>
                 
                 {/* Auto-save indicator */}
                 <div className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                   <CheckCircle2 className="w-3 h-3" />
                   <span>Volume settings are automatically saved</span>
                 </div>
                 
                 <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                   {/* Language Switcher */}
                   <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm grow lg:grow-0">
                     {(['en', 'si', 'ta'] as const).map((l) => (
                       <button
                         key={l}
                         onClick={() => setTestLang(l)}
                         className={`flex-1 min-w-0 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                           testLang === l ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                         }`}
                       >
                         {l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}
                       </button>
                     ))}
                   </div>
 
                   {/* Action Buttons */}
                   <div className="flex flex-col sm:flex-row items-stretch gap-2 grow">
                     <button
                       onClick={() => runSpeakerTest('chime')}
                       disabled={testRunning}
                       className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
                     >
                       <Music className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                       Play Chime
                     </button>
                     <button
                       onClick={() => runSpeakerTest('voice')}
                       disabled={testRunning}
                       className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-sky-600 rounded-xl text-sm font-bold text-white hover:bg-sky-700 transition-all shadow-md disabled:opacity-50"
                     >
                       <Play className="w-4 h-4 fill-current" />
                       Play Voice
                     </button>
                   </div>
                 </div>

                  {/* Custom Announcement Input */}
                  <div className="mt-5 pt-5 border-t border-slate-200/60">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Manual Text Announcement (Multi-Language)</label>
                    <div className="space-y-4">
                      {/* English */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-2 sm:w-24 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500">ENGLISH</span>
                        </div>
                        <input
                          type="text"
                          value={customEn}
                          onChange={(e) => setCustomEn(e.target.value)}
                          placeholder="Type English message..."
                          className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 transition-all outline-none text-slate-900"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={handleAutoTranslate}
                            disabled={isTranslating || !customEn.trim()}
                            title="Auto-translate to SI and TA"
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all disabled:opacity-30 border border-indigo-100"
                          >
                            {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <SlidersHorizontal className="w-3 h-3" />}
                            <span className="hidden sm:inline">Translate</span>
                          </button>
                          <button
                            onClick={() => runSpeakerTest('voice', customEn, 'en')}
                            disabled={testRunning || !customEn.trim()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-30"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Sinhala */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-2 sm:w-24 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500">සිංහල</span>
                        </div>
                        <input
                          type="text"
                          value={customSi}
                          onChange={(e) => setCustomSi(e.target.value)}
                          placeholder="සිංහල නිවේදනය..."
                          className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 transition-all outline-none text-slate-900"
                        />
                        <button
                          onClick={() => runSpeakerTest('voice', customSi, 'si')}
                          disabled={testRunning || !customSi.trim()}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-30"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Tamil */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-2 sm:w-24 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500">தமிழ்</span>
                        </div>
                        <input
                          type="text"
                          value={customTa}
                          onChange={(e) => setCustomTa(e.target.value)}
                          placeholder="தமிழ் அறிவிப்பு..."
                          className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 transition-all outline-none text-slate-900"
                        />
                        <button
                          onClick={() => runSpeakerTest('voice', customTa, 'ta')}
                          disabled={testRunning || !customTa.trim()}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-30"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={announceAll}
                        disabled={testRunning || (!customEn.trim() && !customSi.trim() && !customTa.trim())}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-xl shadow-slate-200 border-2 border-slate-800 hover:border-slate-700 active:scale-[0.98]"
                      >
                        <Volume2 className="w-5 h-5" />
                        PLAY ALL LANGUAGES SEQUENTIALLY
                      </button>
                    </div>
                  </div>
                 
                 {testRunning && (
                   <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-sky-600 animate-pulse uppercase tracking-widest">
                     <div className="w-1.5 h-1.5 bg-sky-600 rounded-full" />
                     Test In Progress...
                   </div>
                 )}
               </div>
             </div>

             <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (saveSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />)}
                {saving ? "Saving..." : (saveSuccess ? "Saved Successfully" : "Save Configuration")}
              </button>
            </div>
          </section>

          <section className="lg:col-span-2 rounded-3xl bg-white border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Assigned Outlet</h2>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Outlet</p>
              <p className="font-semibold text-slate-900">{manager?.branch?.name || "Not assigned"}</p>
              <p className="text-sm text-slate-600 mt-1">{manager?.branch?.location || ""}</p>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-950 text-slate-100 p-3 text-xs break-all">
              {displayUrl || "Display URL unavailable"}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={openDisplay}
                disabled={!displayUrl}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" />
                Open Outlet Display
              </button>

              <button
                onClick={copyLink}
                disabled={!displayUrl}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy Display Link"}
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Tip: Open this URL on a TV browser and switch the browser to full screen for a clean customer display.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
