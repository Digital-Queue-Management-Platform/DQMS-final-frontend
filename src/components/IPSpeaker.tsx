import { useState, useEffect } from 'react'
import { Volume2, VolumeX, Play, Square, Settings } from 'lucide-react'
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

export default function IPSpeaker({ token, counterNumber, onCall }: IPSpeakerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'si' | 'ta'>('en')
  const [showSettings, setShowSettings] = useState(false)
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

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
  }, [token.preferredLanguages])

  const findBestVoice = (language: string): SpeechSynthesisVoice | null => {
    // Try to find a voice that matches the language
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
    
    // Only use English as fallback if explicitly requesting English
    if (!voice && language === 'en' && availableVoices.length > 0) {
      voice = availableVoices.find(v => v.lang.startsWith('en') || v.default) || availableVoices[0]
    }
    
    return voice || null
  }

  const speak = (text: string, language: 'en' | 'si' | 'ta') => {
    if (!speechSynthesis || isMuted) return

    // Stop any current speech
    speechSynthesis.cancel()
    
    // Wait a bit to ensure cancellation is complete
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = findBestVoice(language)
      
      // If no appropriate voice found for Sinhala or Tamil, use English voice but keep the original text
      if (!voice && (language === 'si' || language === 'ta')) {
        console.warn(`No ${language} voice found, using English voice with ${language} text`)
        const englishVoice = findBestVoice('en')
        if (englishVoice) {
          utterance.voice = englishVoice
        }
        utterance.lang = 'en-US' // Use English for pronunciation guidance
      } else if (voice) {
        utterance.voice = voice
        utterance.lang = LANGUAGE_CODES[language] || 'en-US'
        console.log(`Using voice: ${voice.name} (${voice.lang}) for language: ${language}`)
      } else if (language === 'en') {
        // For English, try to get any available voice
        const anyVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0]
        if (anyVoice) {
          utterance.voice = anyVoice
          utterance.lang = 'en-US'
        }
      }

      utterance.volume = volume
      utterance.rate = 0.9 // Slightly slower for clarity
      utterance.pitch = 1.0

      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event)
        setIsPlaying(false)
      }

      speechSynthesis.speak(utterance)
    }, 100)
  }

  const callCustomer = () => {
    // Cancel any ongoing speech synthesis globally
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    
    const template = ANNOUNCEMENT_TEMPLATES[selectedLanguage]
    const announcement = template.call(token.tokenNumber, counterNumber || token.counterNumber || undefined)
    
    console.log(`Calling customer in ${selectedLanguage}: ${announcement}`)
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
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted) {
      stopSpeech()
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

          <div className="mb-2">
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
            <span>Calling customer...</span>
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