import { useState, useEffect } from 'react'
import { Volume2, VolumeX, Play, Square, Settings, Wifi, WifiOff } from 'lucide-react'
import type { Token } from '../types'

interface IPSpeakerProps {
  token: Token
  counterNumber?: number
  onCall?: () => void
}

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
    wait: 'Please wait for your turn.'
  },
  si: {
    call: (tokenNumber: number, counterNumber?: number) => 
      `අංක ${tokenNumber} ගැණුම්කරු ${counterNumber || 'නියම කළ'} කවුන්ටරයට පැමිණෙන්න. අංක ${tokenNumber}, කවුන්ටරය ${counterNumber || 'නියම කළ'}.`,
    welcome: 'අපගේ සේවා මධ්‍යස්ථානයට සාදරයෙන් පිළිගනිමු.',
    next: 'ඊළඟ පාරිභෝගිකයා කරුණාකර.',
    wait: 'කරුණාකර ඔබේ වාරය සඳහා රැඳී සිටින්න.'
  },
  ta: {
    call: (tokenNumber: number, counterNumber?: number) => 
      `எண் ${tokenNumber}, தயவுசெய்து கவுண்டர் ${counterNumber || 'ஒதுக்கப்பட்ட'} க்கு வாருங்கள். எண் ${tokenNumber}, கவுண்டர் ${counterNumber || 'ஒதுக்கப்பட்ட'}.`,
    welcome: 'எங்கள் சேவை மையத்திற்கு வரவேற்கிறோம்.',
    next: 'அடுத்த வாடிக்கையாளர், தயவுசெய்து.',
    wait: 'தயவுசெய்து உங்கள் முறைக்கு காத்திருங்கள்.'
  }
}

// IP Speaker configuration
interface IPSpeakerConfig {
  ip: string
  port: number
  username?: string
  password?: string
  model: 'hikvision' | 'dahua' | 'axis' | 'generic'
}

export default function IPSpeaker({ token, counterNumber, onCall }: IPSpeakerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'si' | 'ta'>('en')
  const [showSettings, setShowSettings] = useState(false)
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  
  // IP Speaker settings
  const [useIPSpeaker, setUseIPSpeaker] = useState(false)
  const [ipSpeakerConfig, setIpSpeakerConfig] = useState<IPSpeakerConfig>({
    ip: '192.168.1.100',
    port: 80,
    username: 'admin',
    password: 'admin123',
    model: 'hikvision'
  })
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')

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

    // Set default language based on customer preference
    if (token.preferredLanguages && token.preferredLanguages.length > 0) {
      const firstLang = token.preferredLanguages[0] as 'en' | 'si' | 'ta'
      if (firstLang in ANNOUNCEMENT_TEMPLATES) {
        setSelectedLanguage(firstLang)
      }
    }

    // Load IP speaker settings from localStorage
    const savedConfig = localStorage.getItem('ipSpeakerConfig')
    if (savedConfig) {
      try {
        setIpSpeakerConfig(JSON.parse(savedConfig))
      } catch (e) {
        console.warn('Failed to load IP speaker config:', e)
      }
    }

    const savedUseIP = localStorage.getItem('useIPSpeaker')
    if (savedUseIP === 'true') {
      setUseIPSpeaker(true)
      testIPSpeakerConnection()
    }
  }, [token.preferredLanguages])

  const findBestVoice = (language: string): SpeechSynthesisVoice | null => {
    // Try to find a voice that matches the language
    const languageCode = LANGUAGE_CODES[language as keyof typeof LANGUAGE_CODES] || 'en-US'
    
    // First try exact match
    let voice = availableVoices.find(v => v.lang === languageCode)
    
    // If no exact match, try language family (e.g., 'en' for 'en-US')
    if (!voice) {
      const langFamily = languageCode.split('-')[0]
      voice = availableVoices.find(v => v.lang.startsWith(langFamily))
    }
    
    // Fallback to default voice
    if (!voice && availableVoices.length > 0) {
      voice = availableVoices.find(v => v.default) || availableVoices[0]
    }
    
    return voice || null
  }

  const testIPSpeakerConnection = async () => {
    setConnectionStatus('connecting')
    
    try {
      // Test connection to IP speaker
      const response = await fetch(`/api/ip-speaker/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ipSpeakerConfig)
      })

      if (response.ok) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('IP Speaker connection failed:', error)
      setConnectionStatus('error')
    }
  }

  const sendToIPSpeaker = async (text: string, language: 'en' | 'si' | 'ta') => {
    try {
      setIsPlaying(true)
      
      const response = await fetch(`/api/ip-speaker/announce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: ipSpeakerConfig,
          text,
          language,
          volume: volume * 100
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send to IP speaker')
      }

      // Simulate announcement duration
      setTimeout(() => {
        setIsPlaying(false)
      }, 5000)

    } catch (error) {
      console.error('IP Speaker announcement failed:', error)
      setIsPlaying(false)
      
      // Fallback to browser speech synthesis
      speakWithBrowser(text, language)
    }
  }

  const speakWithBrowser = (text: string, language: 'en' | 'si' | 'ta') => {
    if (!speechSynthesis || isMuted) return

    // Stop any current speech
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = findBestVoice(language)
    
    if (voice) {
      utterance.voice = voice
    }
    
    utterance.lang = LANGUAGE_CODES[language] || 'en-US'
    utterance.volume = volume
    utterance.rate = 0.9 // Slightly slower for clarity
    utterance.pitch = 1.0

    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    speechSynthesis.speak(utterance)
  }

  const speak = (text: string, language: 'en' | 'si' | 'ta') => {
    if (useIPSpeaker && connectionStatus === 'connected') {
      sendToIPSpeaker(text, language)
    } else {
      speakWithBrowser(text, language)
    }
  }

  const callCustomer = () => {
    const template = ANNOUNCEMENT_TEMPLATES[selectedLanguage]
    const announcement = template.call(token.tokenNumber, counterNumber || token.counterNumber || undefined)
    
    speak(announcement, selectedLanguage)
    
    // Call parent callback if provided
    if (onCall) {
      onCall()
    }
  }

  const stopSpeech = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel()
      setIsPlaying(false)
    }
    
    if (useIPSpeaker) {
      // Send stop command to IP speaker
      fetch(`/api/ip-speaker/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: ipSpeakerConfig })
      }).catch(console.error)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted) {
      stopSpeech()
    }
  }

  const saveIPSpeakerConfig = () => {
    localStorage.setItem('ipSpeakerConfig', JSON.stringify(ipSpeakerConfig))
    localStorage.setItem('useIPSpeaker', useIPSpeaker.toString())
    
    if (useIPSpeaker) {
      testIPSpeakerConnection()
    } else {
      setConnectionStatus('disconnected')
    }
  }

  // Parse customer's preferred languages for display
  const getPreferredLanguages = (): string[] => {
    return token.preferredLanguages || []
  }

  const preferredLanguages = getPreferredLanguages()

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Call Customer</h3>
          {useIPSpeaker && (
            <div className="flex items-center space-x-1">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : connectionStatus === 'error' ? (
                <WifiOff className="w-4 h-4 text-red-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-xs text-gray-500">
                {connectionStatus === 'connected' ? 'IP' : 'Browser'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Customer Info */}
      <div className="mb-3 p-2 bg-gray-50 rounded">
        <div className="text-sm">
          <span className="font-medium">Token #{token.tokenNumber}</span> - {token.customer.name}
        </div>
        {preferredLanguages.length > 0 && (
          <div className="text-xs text-gray-600 mt-1">
            Preferred: {(() => {
              const lang = preferredLanguages[0]
              const names = { en: 'English', si: 'Sinhala', ta: 'Tamil' }
              return names[lang as keyof typeof names] || lang
            })()}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-3 p-3 bg-gray-50 rounded border">
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Announcement Language
            </label>
            <div className="flex space-x-2">
              {Object.keys(ANNOUNCEMENT_TEMPLATES).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang as 'en' | 'si' | 'ta')}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedLanguage === lang
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {lang === 'en' ? 'English' : lang === 'si' ? 'සිංහල' : 'தமிழ்'}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
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

          {/* IP Speaker Configuration */}
          <div className="border-t pt-3">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={useIPSpeaker}
                onChange={(e) => setUseIPSpeaker(e.target.checked)}
                className="rounded"
              />
              <label className="text-xs font-medium text-gray-700">
                Use IP Speaker
              </label>
            </div>

            {useIPSpeaker && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="IP Address"
                    value={ipSpeakerConfig.ip}
                    onChange={(e) => setIpSpeakerConfig(prev => ({ ...prev, ip: e.target.value }))}
                    className="text-xs px-2 py-1 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Port"
                    value={ipSpeakerConfig.port}
                    onChange={(e) => setIpSpeakerConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    className="text-xs px-2 py-1 border rounded"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Username"
                    value={ipSpeakerConfig.username}
                    onChange={(e) => setIpSpeakerConfig(prev => ({ ...prev, username: e.target.value }))}
                    className="text-xs px-2 py-1 border rounded"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={ipSpeakerConfig.password}
                    onChange={(e) => setIpSpeakerConfig(prev => ({ ...prev, password: e.target.value }))}
                    className="text-xs px-2 py-1 border rounded"
                  />
                </div>
                <select
                  value={ipSpeakerConfig.model}
                  onChange={(e) => setIpSpeakerConfig(prev => ({ ...prev, model: e.target.value as any }))}
                  className="text-xs px-2 py-1 border rounded w-full"
                >
                  <option value="hikvision">Hikvision</option>
                  <option value="dahua">Dahua</option>
                  <option value="axis">Axis</option>
                  <option value="generic">Generic</option>
                </select>
                <div className="flex space-x-2">
                  <button
                    onClick={saveIPSpeakerConfig}
                    className="flex-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save & Test
                  </button>
                  <div className={`px-2 py-1 text-xs rounded ${
                    connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
                    connectionStatus === 'error' ? 'bg-red-100 text-red-700' :
                    connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'error' ? 'Error' :
                     connectionStatus === 'connecting' ? 'Testing...' :
                     'Disconnected'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={callCustomer}
          disabled={isPlaying || isMuted}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded font-medium ${
            isPlaying || isMuted
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Call Customer</span>
        </button>

        {isPlaying && (
          <button
            onClick={stopSpeech}
            className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
            title="Stop"
          >
            <Square className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={toggleMute}
          className={`p-2 rounded ${
            isMuted 
              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Status */}
      {isPlaying && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span>
              {useIPSpeaker && connectionStatus === 'connected' 
                ? 'Announcing via IP Speaker...' 
                : 'Calling customer...'}
            </span>
          </div>
        </div>
      )}

      {isMuted && (
        <div className="mt-2 text-center text-xs text-red-600">
          Speaker is muted
        </div>
      )}
    </div>
  )
}