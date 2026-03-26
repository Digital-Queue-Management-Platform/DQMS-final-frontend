import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ExternalLink, Copy, Monitor, SlidersHorizontal, CheckCircle2, Save, Loader2, Volume2, Play, Music } from "lucide-react"
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

export default function TeleshopManagerOutletDisplay() {
  const navigate = useNavigate()
  const [manager, setManager] = useState<TeleshopManagerMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [refresh, setRefresh] = useState(10)
  const [next, setNext] = useState(8)
  const [services, setServices] = useState(false)
  const [counters, setCounters] = useState(false)
  const [recent, setRecent] = useState(false)
  const [autoSlide, setAutoSlide] = useState(true)
  const [playTone, setPlayTone] = useState(true)
  const [contentScale, setContentScale] = useState(100)
  
  
  // Speaker Test State
  const [testLang, setTestLang] = useState<'en' | 'si' | 'ta'>('en')
  const [testRunning, setTestRunning] = useState(false)
  const [customEn, setCustomEn] = useState("")
  const [customSi, setCustomSi] = useState("")
  const [customTa, setCustomTa] = useState("")

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
            if (s.next) setNext(s.next)
            if (s.services !== undefined) setServices(!!s.services)
            if (s.counters !== undefined) setCounters(!!s.counters)
            if (s.recent !== undefined) setRecent(!!s.recent)
            if (s.autoSlide !== undefined) setAutoSlide(!!s.autoSlide)
            if (s.playTone !== undefined) setPlayTone(!!s.playTone)
            if (s.contentScale) setContentScale(Number(s.contentScale))
            
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
      next: String(next),
      services: services ? "1" : "0",
      counters: counters ? "1" : "0",
      recent: recent ? "1" : "0",
      autoSlide: autoSlide ? "1" : "0",
      playTone: playTone ? "1" : "0",
      scale: String(contentScale),
    })
    return `${window.location.origin}/display/outlet/${manager.branchId}?${params.toString()}`
  }, [manager?.branchId, refresh, next, services, counters, recent, autoSlide, playTone, contentScale])

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
        customText: type === 'voice' ? (message || undefined) : undefined
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("teleshopManagerToken")}` }
      })
      console.log("[SpeakerTest] Remote broadcast triggered successfully")
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
      await api.post("/teleshop-manager/display-settings",
        {
          settings: {
            refresh,
            next,
            services,
            counters,
            recent,
            autoSlide,
            playTone,
            contentScale,
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Trigger a remote reload after saving settings to apply changes instantly
      await api.post("/teleshop-manager/test-sound", {
        type: 'RELOAD_DISPLAY'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const forceReload = async () => {
    if (saving) return
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      await api.post("/teleshop-manager/test-sound", {
        type: 'RELOAD_DISPLAY'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error("Force reload failed:", err)
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

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Up-next token count</span>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={next}
                  onChange={(e) => setNext(Math.max(3, Math.min(20, Number(e.target.value) || 8)))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </label>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-800">Show service names</span>
                <input type="checkbox" checked={services} onChange={(e) => setServices(e.target.checked)} />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-800">Show counter status panel</span>
                <input type="checkbox" checked={counters} onChange={(e) => setCounters(e.target.checked)} />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-800">Show recently called tokens</span>
                <input type="checkbox" checked={recent} onChange={(e) => setRecent(e.target.checked)} />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 bg-indigo-50/50 border-indigo-100">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">Enable Auto-Sliding</span>
                  <span className="text-xs text-slate-500">Automatically scroll lists (Up Next, Recently Called, etc.)</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoSlide} 
                  onChange={(e) => setAutoSlide(e.target.checked)} 
                  className="w-5 h-5 accent-indigo-600"
                />
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

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
               <button
                 onClick={forceReload}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 font-bold hover:bg-orange-100 transition-all disabled:opacity-50"
              >
                <Monitor className="w-4 h-4" />
                RELOAD SCREEN
              </button>

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
