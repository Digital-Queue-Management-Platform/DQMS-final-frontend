import { useState, useEffect } from 'react'
import { Volume2, VolumeX, Play, Square, Wifi, WifiOff, TestTube, Save, RefreshCw, Eye, EyeOff } from 'lucide-react'
import api from '../config/api'
import type { Token } from '../types'

// Language mapping for speech synthesis
const LANGUAGE_CODES = {
  'en': 'en-US',
  'si': 'si-LK', 
  'ta': 'ta-LK'
}

// Announcement templates in different languages
const ANNOUNCEMENT_TEMPLATES = {
  en: {
    call: (tokenNumber: number, counterNumber?: number) => 
      `Token number ${tokenNumber}, please proceed to counter ${counterNumber || 'assigned'}. Token ${tokenNumber}, counter ${counterNumber || 'assigned'}.`,
    welcome: 'Welcome to our service center.',
    next: 'Next customer, please.',
    wait: 'Please wait for your turn.',
    test: 'This is a test announcement. IP speaker is working correctly.'
  },
  si: {
    call: (tokenNumber: number, counterNumber?: number) => 
      `අංක ${tokenNumber} ගැණුම්කරු ${counterNumber || 'නියම කළ'} කවුන්ටරයට පැමිණෙන්න. අංක ${tokenNumber}, කවුන්ටරය ${counterNumber || 'නියම කළ'}.`,
    welcome: 'අපගේ සේවා මධ්‍යස්ථානයට සාදරයෙන් පිළිගනිමු.',
    next: 'ඊළඟ පාරිභෝගිකයා කරුණාකර.',
    wait: 'කරුණාකර ඔබේ වාරය සඳහා රැඳී සිටින්න.',
    test: 'මෙය පරීක්ෂණ නිවේදනයකි. IP ස්පීකර් නිවැරදිව ක්‍රියා කරයි.'
  },
  ta: {
    call: (tokenNumber: number, counterNumber?: number) => 
      `எண் ${tokenNumber}, தயவுசெய்து கவுண்டர் ${counterNumber || 'ஒதுக்கப்பட்ட'} க்கு வாருங்கள். எண் ${tokenNumber}, கவுண்டர் ${counterNumber || 'ஒதுக்கப்பட்ட'}.`,
    welcome: 'எங்கள் சேவை மையத்திற்கு வரவேற்கிறோம்.',
    next: 'அடுத்த வாடிக்கையாளர், தயவுசெய்து.',
    wait: 'தயவுசெய்து உங்கள் முறைக்கு காத்திருங்கள்.',
    test: 'இது ஒரு சோதனை அறிவிப்பு. IP ஸ்பீக்கர் சரியாக வேலை செய்கிறது.'
  }
}

// IP Speaker configuration
interface IPSpeakerConfig {
  ip: string
  port: number
  username?: string
  password?: string
  apiToken?: string
  model: 'hikvision' | 'dahua' | 'axis' | 'onvif' | 'rtsp' | 'generic' | 'restful' | 'webhook' | 'vlc_http' | 'vlc_udp' | 'vlc_rtsp' | 'custom'
  customEndpoints?: {
    testEndpoint?: string
    announceEndpoint?: string
    stopEndpoint?: string
  }
}

const IP_SPEAKER_MODELS = [
  { id: 'hikvision', name: 'Hikvision', description: 'Hikvision IP cameras with audio (ISAPI)' },
  { id: 'dahua', name: 'Dahua', description: 'Dahua IP cameras and speakers (CGI)' },
  { id: 'axis', name: 'Axis', description: 'Axis network audio systems (VAPIX)' },
  { id: 'onvif', name: 'ONVIF', description: 'ONVIF-compliant IP cameras/speakers' },
  { id: 'rtsp', name: 'RTSP', description: 'RTSP streaming audio devices' },
  { id: 'generic', name: 'Generic REST', description: 'Standard REST API speakers' },
  { id: 'restful', name: 'RESTful API', description: 'Modern REST API with Bearer auth' },
  { id: 'webhook', name: 'Webhook', description: 'Webhook-based speakers' },
  { id: 'vlc_http', name: 'VLC HTTP Stream', description: 'VLC Media Player HTTP streaming (port 8080)' },
  { id: 'vlc_udp', name: 'VLC UDP Stream', description: 'VLC Media Player UDP streaming (multicast/unicast)' },
  { id: 'vlc_rtsp', name: 'VLC RTSP Stream', description: 'VLC Media Player RTSP streaming' },
  { id: 'custom', name: 'Custom', description: 'Custom configuration with manual endpoints' }
]

export default function IPSpeakerPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'si' | 'ta'>('en')
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  
  // IP Speaker settings
  const [useIPSpeaker, setUseIPSpeaker] = useState(false)
  const [ipSpeakerConfig, setIpSpeakerConfig] = useState<IPSpeakerConfig>({
    ip: '192.168.1.100',
    port: 8080,
    username: 'admin',
    password: 'admin123',
    apiToken: '',
    model: 'generic',
    customEndpoints: {
      testEndpoint: '/status',
      announceEndpoint: '/announce',
      stopEndpoint: '/stop'
    }
  })
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [testMessage, setTestMessage] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [currentToken, setCurrentToken] = useState<Token | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [testing, setTesting] = useState(false)
  const [streamingSession, setStreamingSession] = useState<{
    sessionId?: string
    streamUrl?: string
    protocol?: string
  } | null>(null)

  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setSpeechSynthesis(window.speechSynthesis)
      
      // Load available voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        setAvailableVoices(voices)
      }
      
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    // Fetch current token if any (optional - don't fail if not authenticated)
    fetchCurrentToken()
    
    // Only test IP speaker connection if enabled and configured
    const savedUseIP = localStorage.getItem('useIPSpeaker')
    if (savedUseIP === 'true') {
      const savedConfig = localStorage.getItem('ipSpeakerConfig')
      if (savedConfig) {
        try {
          setIpSpeakerConfig(JSON.parse(savedConfig))
          setUseIPSpeaker(true)
          // Test connection only when user manually enables it
        } catch (e) {
          console.warn('Failed to load IP speaker config:', e)
        }
      }
    }
  }, [])

  const fetchCurrentToken = async () => {
    try {
      // First get the officer information
      const officerResponse = await api.get('/officer/me')
      const officer = officerResponse.data.officer
      
      // Then fetch the officer's current token using their ID
      const response = await api.get(`/officer/stats/${officer.id}`)
      setCurrentToken(response.data.currentToken)
    } catch (error) {
      console.error('Failed to fetch current token:', error)
      // It's okay if this fails - the IP speaker still works without current token info
    }
  }

  const findBestVoice = (language: string): SpeechSynthesisVoice | null => {
    const languageCode = LANGUAGE_CODES[language as keyof typeof LANGUAGE_CODES] || 'en-US'
    
    // First try exact match with the specific language
    let voice = availableVoices.find(v => v.lang === languageCode)
    
    // If no exact match, try language family (e.g., 'en' for 'en-US')
    if (!voice) {
      const langFamily = languageCode.split('-')[0]
      voice = availableVoices.find(v => v.lang.startsWith(langFamily))
    }
    
    // For Sinhala, try to find any Sinhala voice variations
    if (!voice && language === 'si') {
      voice = availableVoices.find(v => 
        v.lang.includes('si') || 
        v.lang.includes('sin') || 
        v.name.toLowerCase().includes('sinhala')
      )
    }
    
    // For Tamil, try to find any Tamil voice variations
    if (!voice && language === 'ta') {
      voice = availableVoices.find(v => 
        v.lang.includes('ta') || 
        v.lang.includes('tam') || 
        v.name.toLowerCase().includes('tamil')
      )
    }
    
    // For English, prefer higher quality voices
    if (!voice && language === 'en' && availableVoices.length > 0) {
      // Prefer Microsoft voices over Google voices for better quality
      voice = availableVoices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
              availableVoices.find(v => v.lang.startsWith('en')) ||
              availableVoices.find(v => v.default) ||
              availableVoices[0]
    }
    
    return voice || null
  }

  const testIPSpeakerConnection = async () => {
    setConnectionStatus('connecting')
    setTestMessage('Testing connection...')
    
    try {
      const response = await api.post('/ip-speaker/test', ipSpeakerConfig)
      
      if (response.data.success) {
        setConnectionStatus('connected')
        setTestMessage(`${response.data.message}`)
      } else {
        setConnectionStatus('error')
        setTestMessage(`Connection failed`)
      }
    } catch (error: any) {
      console.error('IP Speaker connection failed:', error)
      setConnectionStatus('error')
      
      // Provide more helpful error messages
      if (error.code === 'ERR_NETWORK') {
        setTestMessage(`Network error - check if you're logged in as an officer`)
      } else if (error.response?.status === 401) {
        setTestMessage(`Authentication required - please log in as an officer`)
      } else if (error.response?.status === 404) {
        setTestMessage(`IP speaker service not available`)
      } else {
        setTestMessage(`${error.response?.data?.error || 'Connection failed'}`)
      }
    }
  }

  const autoDetectSpeaker = async () => {
    setConnectionStatus('connecting')
    setTestMessage('Auto-detecting speaker type...')
    
    try {
      const response = await api.post('/ip-speaker/detect', {
        ip: ipSpeakerConfig.ip,
        port: ipSpeakerConfig.port,
        username: ipSpeakerConfig.username,
        password: ipSpeakerConfig.password
      })
      
      if (response.data.success) {
        // Update configuration with detected model
        setIpSpeakerConfig(prev => ({
          ...prev,
          model: response.data.detectedProtocol
        }))
        setConnectionStatus('connected')
        setTestMessage(`Detected: ${response.data.detectedProtocol} protocol`)
      } else {
        setConnectionStatus('error')
        setTestMessage(`Could not auto-detect. Try manual configuration.`)
        console.log('Detection results:', response.data.allResults)
      }
    } catch (error: any) {
      console.error('Auto-detection failed:', error)
      setConnectionStatus('error')
      setTestMessage(`Auto-detection failed - try manual configuration`)
    }
  }

  const sendToIPSpeaker = async (text: string, language: 'en' | 'si' | 'ta') => {
    try {
      setIsPlaying(true)
      
      const response = await api.post('/ip-speaker/announce', {
        config: ipSpeakerConfig,
        text,
        language,
        volume: volume * 100
      })

      if (response.data.success) {
        setTestMessage('Announcement sent successfully')
        
        // Handle VLC streaming response
        if (response.data.sessionId && response.data.streamUrl) {
          setStreamingSession({
            sessionId: response.data.sessionId,
            streamUrl: response.data.streamUrl,
            protocol: ipSpeakerConfig.model.replace('vlc_', '').toUpperCase()
          })
          setTestMessage(`${response.data.message} - Stream available at: ${response.data.streamUrl}`)
        }
        
        // Simulate announcement duration
        setTimeout(() => {
          setIsPlaying(false)
        }, 5000)
      } else {
        throw new Error('Failed to send to IP speaker')
      }

    } catch (error: any) {
      console.error('IP Speaker announcement failed:', error)
      setIsPlaying(false)
      setTestMessage(`${error.response?.data?.error || 'Announcement failed'}`)
      
      // Fallback to browser speech synthesis
      speakWithBrowser(text, language)
    }
  }

  const speakWithBrowser = (text: string, language: 'en' | 'si' | 'ta') => {
    if (!speechSynthesis || isMuted) return

    // Stop any current speech globally
    speechSynthesis.cancel()
    
    // Wait a bit to ensure cancellation is complete
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text)
      let voice = findBestVoice(language)
      let shouldSpeak = false
      
      if (voice) {
        // Found appropriate voice for the language
        utterance.voice = voice
        utterance.lang = LANGUAGE_CODES[language] || 'en-US'
        console.log(`Using voice: ${voice.name} (${voice.lang}) for language: ${language}`)
        shouldSpeak = true
      } else if (language === 'si' || language === 'ta') {
        // No Sinhala/Tamil voice found, use best English voice as fallback
        console.warn(`No ${language} voice found, using English voice with ${language} text`)
        const englishVoice = findBestVoice('en')
        if (englishVoice) {
          utterance.voice = englishVoice
          utterance.lang = 'en-US'
          console.log(`Fallback: Using English voice "${englishVoice.name}" for ${language} text`)
          shouldSpeak = true
        } else {
          // Even English voice not found, try Microsoft voices first, then any
          const microsoftVoice = availableVoices.find(v => v.name.includes('Microsoft'))
          const anyVoice = microsoftVoice || availableVoices.find(v => v.default) || availableVoices[0]
          if (anyVoice) {
            utterance.voice = anyVoice
            utterance.lang = 'en-US'
            console.log(`Fallback: Using available voice "${anyVoice.name}" for ${language} text`)
            shouldSpeak = true
          }
        }
      } else if (language === 'en') {
        // For English, try to get any English voice or fallback to any voice
        const englishVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0]
        if (englishVoice) {
          utterance.voice = englishVoice
          utterance.lang = 'en-US'
          console.log(`Using English voice: ${englishVoice.name}`)
          shouldSpeak = true
        }
      }
      
      if (shouldSpeak) {
        utterance.volume = volume
        utterance.rate = 0.9
        utterance.pitch = 1.0

        utterance.onstart = () => {
          console.log(`Speech started for ${language}: ${text.substring(0, 50)}...`)
          setIsPlaying(true)
        }
        utterance.onend = () => {
          console.log(`Speech ended for ${language}`)
          setIsPlaying(false)
        }
        utterance.onerror = (event) => {
          console.error(`Speech synthesis error for ${language}:`, event)
          setIsPlaying(false)
        }

        console.log(`About to speak ${language} text: "${text.substring(0, 50)}..."`)
        speechSynthesis.speak(utterance)
      } else {
        console.error(`No voice available for ${language} and no fallback found`)
        setIsPlaying(false)
      }
    }, 100)
  }

  const speak = (text: string, language: 'en' | 'si' | 'ta') => {
    // Cancel any ongoing speech synthesis globally first
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    
    if (useIPSpeaker && connectionStatus === 'connected') {
      sendToIPSpeaker(text, language)
    } else {
      speakWithBrowser(text, language)
    }
  }

  const testAnnouncement = (type: 'test' | 'welcome' | 'next' | 'wait' | 'custom') => {
    setTesting(true)
    let text = ''
    
    if (type === 'custom') {
      text = customMessage || 'Custom test message'
    } else if (type === 'test' && currentToken) {
      const template = ANNOUNCEMENT_TEMPLATES[selectedLanguage]
      text = template.call(currentToken.tokenNumber, currentToken.counterNumber || 1)
    } else {
      const templateValue = ANNOUNCEMENT_TEMPLATES[selectedLanguage][type as keyof typeof ANNOUNCEMENT_TEMPLATES.en]
      text = typeof templateValue === 'function' ? templateValue(1, 1) : templateValue
    }
    
    console.log(`Testing announcement in ${selectedLanguage}: ${text}`)
    speak(text, selectedLanguage)
    
    setTimeout(() => {
      setTesting(false)
    }, 1000)
  }

  const stopSpeech = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel()
      setIsPlaying(false)
    }
    
    if (useIPSpeaker) {
      api.post('/ip-speaker/stop', { config: ipSpeakerConfig })
        .catch(console.error)
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)
    
    try {
      localStorage.setItem('ipSpeakerConfig', JSON.stringify(ipSpeakerConfig))
      localStorage.setItem('useIPSpeaker', useIPSpeaker.toString())
      
      if (useIPSpeaker) {
        await testIPSpeakerConnection()
      } else {
        setConnectionStatus('disconnected')
        setTestMessage('')
      }
      
      setTestMessage('Configuration saved successfully')
    } catch (error) {
      setTestMessage('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const refreshConnection = () => {
    if (useIPSpeaker) {
      testIPSpeakerConnection()
    }
    fetchCurrentToken()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IP Speaker Management</h1>
          <p className="text-gray-600">Configure and test IP speaker announcements for customer calling</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
              <div className="flex items-center space-x-2">
                {useIPSpeaker && (
                  <div className="flex items-center space-x-1">
                    {connectionStatus === 'connected' ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${
                      connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                    </span>
                  </div>
                )}
                <button
                  onClick={refreshConnection}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Audio Output Selection */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="radio"
                  name="audioOutput"
                  checked={!useIPSpeaker}
                  onChange={() => setUseIPSpeaker(false)}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-gray-700">Browser Speaker (Computer Audio)</label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="audioOutput"
                  checked={useIPSpeaker}
                  onChange={() => setUseIPSpeaker(true)}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-gray-700">IP Speaker (Network Audio)</label>
              </div>
            </div>

            {/* IP Speaker Configuration */}
            {useIPSpeaker && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <input
                      type="text"
                      value={ipSpeakerConfig.ip}
                      onChange={(e) => setIpSpeakerConfig(prev => ({ ...prev, ip: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                    <input
                      type="number"
                      value={ipSpeakerConfig.port}
                      onChange={(e) => setIpSpeakerConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="80"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={ipSpeakerConfig.username}
                      onChange={(e) => setIpSpeakerConfig(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={ipSpeakerConfig.password}
                        onChange={(e) => setIpSpeakerConfig(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="admin123"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Speaker Model</label>
                  <select
                    value={ipSpeakerConfig.model}
                    onChange={(e) => {
                      const model = e.target.value as any
                      setIpSpeakerConfig(prev => ({ 
                        ...prev, 
                        model,
                        // Set default ports for VLC models
                        port: model === 'vlc_http' ? 8080 :
                              model === 'vlc_udp' ? 1234 :
                              model === 'vlc_rtsp' ? 8554 :
                              prev.port
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {IP_SPEAKER_MODELS.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* VLC-specific configuration */}
                {ipSpeakerConfig.model.startsWith('vlc_') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-blue-900">VLC Media Player Setup</h4>
                    </div>
                    
                    <div className="text-sm text-blue-800 space-y-2">
                      <p><strong>Step 1:</strong> Open VLC Media Player</p>
                      <p><strong>Step 2:</strong> Go to Media → Stream...</p>
                      <p><strong>Step 3:</strong> Add your audio file and click Stream</p>
                      <p><strong>Step 4:</strong> Configure destination:</p>
                      
                      {ipSpeakerConfig.model === 'vlc_http' && (
                        <div className="ml-4 bg-white p-3 rounded border">
                          <p><strong>HTTP Streaming:</strong></p>
                          <p>• Choose HTTP destination</p>
                          <p>• Path: <code>/</code></p>
                          <p>• Port: <code>{ipSpeakerConfig.port}</code></p>
                          <p>• Stream will be available at: <code>http://{ipSpeakerConfig.ip}:{ipSpeakerConfig.port}/</code></p>
                        </div>
                      )}
                      
                      {ipSpeakerConfig.model === 'vlc_udp' && (
                        <div className="ml-4 bg-white p-3 rounded border">
                          <p><strong>UDP Streaming:</strong></p>
                          <p>• Choose UDP destination</p>
                          <p>• IP: <code>{ipSpeakerConfig.ip}</code> (or 192.168.1.255 for multicast)</p>
                          <p>• Port: <code>{ipSpeakerConfig.port}</code></p>
                        </div>
                      )}
                      
                      {ipSpeakerConfig.model === 'vlc_rtsp' && (
                        <div className="ml-4 bg-white p-3 rounded border">
                          <p><strong>RTSP Streaming:</strong></p>
                          <p>• Choose RTSP destination</p>
                          <p>• Path: <code>/audio</code></p>
                          <p>• Port: <code>{ipSpeakerConfig.port}</code></p>
                          <p>• Stream will be available at: <code>rtsp://{ipSpeakerConfig.ip}:{ipSpeakerConfig.port}/audio</code></p>
                        </div>
                      )}
                      
                      <p><strong>Step 5:</strong> Choose Audio - MP3 transcoding profile</p>
                      <p><strong>Step 6:</strong> Click Stream to start</p>
                    </div>
                    
                    {streamingSession && (
                      <div className="bg-green-100 border border-green-300 rounded p-3">
                        <p className="text-sm font-medium text-green-900">Active Stream:</p>
                        <p className="text-sm text-green-800">
                          Protocol: {streamingSession.protocol} | URL: <code className="bg-white px-1 rounded">{streamingSession.streamUrl}</code>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-detect and test buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={autoDetectSpeaker}
                    disabled={!ipSpeakerConfig.ip || connectionStatus === 'connecting'}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium text-sm"
                  >
                    {connectionStatus === 'connecting' ? 'Detecting...' : 'Auto-Detect'}
                  </button>
                  
                  <button
                    onClick={testIPSpeakerConnection}
                    disabled={!ipSpeakerConfig.ip || connectionStatus === 'connecting'}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium text-sm"
                  >
                    {connectionStatus === 'connecting' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {testMessage && (
                  <div className={`p-3 rounded text-sm ${
                    testMessage.includes('successfully') || testMessage.includes('Detected:') || testMessage.includes('sent successfully')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {testMessage}
                  </div>
                )}
              </div>
            )}

            {/* Volume Control */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volume: {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Language Selection */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Language</label>
              <div className="flex space-x-2">
                {Object.keys(ANNOUNCEMENT_TEMPLATES).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang as 'en' | 'si' | 'ta')}
                    className={`px-4 py-2 text-sm rounded-md ${
                      selectedLanguage === lang
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {lang === 'en' ? 'English' : lang === 'si' ? 'සිංහල' : 'தமிழ்'}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Configuration */}
            <div className="mt-6 pt-6 border-t">
              <button
                onClick={saveConfiguration}
                disabled={saving}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>

          {/* Test Panel */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Test Announcements</h2>

            {/* Current Token Info */}
            {currentToken && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">Current Token</h3>
                <div className="text-sm text-blue-700">
                  <div>Token #{currentToken.tokenNumber} - {currentToken.customer.name}</div>
                  {currentToken.preferredLanguages && currentToken.preferredLanguages.length > 0 && (
                    <div className="mt-1">
                      Preferred: {(() => {
                        const lang = currentToken.preferredLanguages[0]
                        const names = { en: 'English', si: 'Sinhala', ta: 'Tamil' }
                        return names[lang as keyof typeof names] || lang
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Test Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => testAnnouncement('test')}
                disabled={isPlaying || testing || !currentToken}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <TestTube className="w-4 h-4" />
                <span>Test Current Token Call</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => testAnnouncement('welcome')}
                  disabled={isPlaying || testing}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>Welcome</span>
                </button>

                <button
                  onClick={() => testAnnouncement('next')}
                  disabled={isPlaying || testing}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>Next Customer</span>
                </button>
              </div>

              <button
                onClick={() => testAnnouncement('wait')}
                disabled={isPlaying || testing}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>Please Wait</span>
              </button>

              {/* Custom Message */}
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Message</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter custom announcement text..."
                />
                <button
                  onClick={() => testAnnouncement('custom')}
                  disabled={isPlaying || testing || !customMessage.trim()}
                  className="mt-2 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>Test Custom Message</span>
                </button>
              </div>

              {/* Stop Button */}
              {isPlaying && (
                <button
                  onClick={stopSpeech}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Announcement</span>
                </button>
              )}

              {/* Mute Toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md ${
                  isMuted 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            </div>

            {/* Status */}
            {isPlaying && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center space-x-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>
                    {useIPSpeaker && connectionStatus === 'connected' 
                      ? 'Playing via IP Speaker...' 
                      : 'Playing via Browser...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}