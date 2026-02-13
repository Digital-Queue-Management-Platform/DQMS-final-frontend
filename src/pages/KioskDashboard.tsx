import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, ChevronDown, X, Eye, EyeOff } from 'lucide-react'
import { API_URL } from '../config/api'
import api from '../config/api'
import OTPInput from '../components/OTPInput'
import OTPPopup from '../components/OTPPopup'

interface Service {
  id: string
  code: string
  title: string
  description: string | null
}

export default function KioskDashboard() {
  const [outlet, setOutlet] = useState<any>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState<"en" | "si" | "ta">("en")

  // Form state
  const [name, setName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [nicNumber, setNicNumber] = useState('')
  const [email, setEmail] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en')
  const [submitting, setSubmitting] = useState(false)
  const [successToken, setSuccessToken] = useState<any>(null)

  // Optional fields toggle
  const [showOptional, setShowOptional] = useState(false)

  // OTP verification states
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>("idle")
  const [otpCode, setOtpCode] = useState("")
  const [otpToken, setOtpToken] = useState<string>("")
  const [otpError, setOtpError] = useState("")
  const [otpSending, setOtpSending] = useState(false)
  const [showOtpPopup, setShowOtpPopup] = useState(false)
  const [devOtpCode, setDevOtpCode] = useState<string>("")

  // Service dropdown states
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false)
  const serviceDropdownRef = useRef<HTMLDivElement>(null)

  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('kioskToken')
    const outletData = localStorage.getItem('kioskOutlet')

    if (!token || !outletData) {
      navigate('/kiosk/login')
      return
    }

    setOutlet(JSON.parse(outletData))
    loadInitialData()
  }, [navigate])

  const loadInitialData = async () => {
    try {
      // Use static services like CustomerRegistration
      const STATIC_SERVICES = [
        { id: 'BILL_PAYMENT', code: 'BILL_PAYMENT', title: 'Bill Payment', description: null },
        { id: 'OTHERS', code: 'OTHERS', title: 'Others', description: null },
      ]
      setServices(STATIC_SERVICES)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
      setLoading(false)
    }
  }

  const handleServiceToggle = (serviceCode: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceCode)
        ? prev.filter(s => s !== serviceCode)
        : [...prev, serviceCode]
    )
  }

  const removeService = (serviceCode: string) => {
    setSelectedServices(prev => prev.filter(code => code !== serviceCode))
  }

  const getServiceTitle = (code: string) => {
    if (code === 'BILL_PAYMENT') {
      return language === 'en' ? 'Bill Payment' : language === 'si' ? 'බිල් ගෙවීම' : 'பில் செலுத்தல்'
    }
    if (code === 'OTHERS') {
      return language === 'en' ? 'Other Services' : language === 'si' ? 'වෙනත් සේවා' : 'மற்ற சேவைகள்'
    }
    const service = services.find(s => s.code === code)
    return service?.title || code
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServiceDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const sendOtp = async (): Promise<boolean> => {
    setOtpError("")
    setOtpSending(true)
    try {
      const response = await api.post("/customer/otp/start", { mobileNumber, preferredLanguage })
      setOtpStep('sent')
      
      // If dev mode returns the OTP code, show it in a popup
      if (response.data?.devCode) {
        setDevOtpCode(response.data.devCode)
        setShowOtpPopup(true)
      }
      
      return true
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to send OTP'
      setOtpError(msg)
      return false
    } finally {
      setOtpSending(false)
    }
  }

  const verifyOtp = async (): Promise<string | null> => {
    setOtpError("")
    setOtpSending(true)
    try {
      const res = await api.post("/customer/otp/verify", { mobileNumber, code: otpCode })
      if (res.data?.verifiedMobileToken) {
        setOtpToken(res.data.verifiedMobileToken)
        setOtpStep('verified')
        return res.data.verifiedMobileToken as string
      }
      setOtpError('OTP verification failed')
      return null
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'OTP verification failed'
      setOtpError(msg)
      return null
    } finally {
      setOtpSending(false)
    } 
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      // Verify OTP if not already verified
      let tokenForSubmit = otpToken
      if (otpStep !== 'verified' || !tokenForSubmit) {
        const vt = await verifyOtp()
        if (!vt) {
          setSubmitting(false)
          return
        }
        tokenForSubmit = vt
      }

      const token = localStorage.getItem('kioskToken')
      if (!token) {
        navigate('/kiosk/login')
        return
      }

      const response = await fetch(`${API_URL}/kiosk/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          mobileNumber,
          nicNumber: nicNumber || undefined,
          email: email || undefined,
          serviceTypes: selectedServices,
          preferredLanguages: preferredLanguage ? [preferredLanguage] : undefined,
          verifiedMobileToken: tokenForSubmit,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create token')
      }

      setSuccessToken(data.token)

      // Reset form
      setName('')
      setMobileNumber('')
      setNicNumber('')
      setEmail('')
      setSelectedServices([])
      setPreferredLanguage('en')
      setOtpStep('idle')
      setOtpCode('')
      setOtpToken('')
    } catch (err: any) {
      setError(err.message || 'Failed to create token')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('kioskToken')
    localStorage.removeItem('kioskOutlet')
    navigate('/kiosk/login')
  }

  const closeSuccessModal = () => {
    setSuccessToken(null)
  }

  const translations = {
    en: {
      title: "Digital Queue Platform",
      subtitle: "Register to join the queue",
      name: "Full Name",
      mobile: "Mobile Number",
      optionalDetails: "Optional details",
      serviceType: "Service Type",
      billPayment: "Bill Payment",
      other: "Other Services",
      register: "Register",
      registering: "Registering...",
      nic: "NIC (Optional)",
      email: "Email (Optional)",
      show: "Show",
      hide: "Hide",
      selectServiceTypes: "Select service types...",
      preferredLanguage: "Preferred Language",
      selectServiceTypesSubtitle: "Select one or more services.",
      english: "English",
      sinhala: "Sinhala",
      tamil: "Tamil",
      preferredLanguageSubtitle: "Select your preferred language for announcements.",
      verify: "Verify Mobile",
      sendingOTP: "Sending OTP...",
      clearForm: "Clear Form",
      changeNumber: "Change number",
      generateToken: "Generate Token",
      generating: "Generating...",
      kiosk: "Walk-in Token Generation",
      logout: "Logout"
    },
    si: {
      title: "ඩිජිටල් පෝලිම වේදිකාව",
      subtitle: "පෝලිමට එක්වීමට ලියාපදිංචි වන්න",
      name: "සම්පූර්ණ නම",
      mobile: "ජංගම දුරකථන අංකය",
      optionalDetails: "විකල්ප විස්තර",
      serviceType: "සේවා වර්ගය",
      billPayment: "බිල් ගෙවීම",
      other: "වෙනත් සේවා",
      register: "ලියාපදිංචි වන්න",
      registering: "ලියාපදිංචි වෙමින්...",
      nic: "ජාතික හැදුනුම්පත් අංකය (විකල්ප)",
      email: "ඊමේල් (විකල්ප)",
      show: "පෙන්වන්න",
      hide: "සඟවන්න",
      selectServiceTypes: "සේවා වර්ගය තෝරන්න...",
      preferredLanguage: "භාෂාව තෝරාගන්න",
      selectServiceTypesSubtitle: "සේවාවන් එකක් හෝ වැඩිදුර තෝරන්න.",
      english: "ඉංග්‍රීසි",
      sinhala: "සිංහල",
      tamil: "දෙමළ",
      preferredLanguageSubtitle: "ආපසු දැක්වීම් සඳහා ඔබේ කැමති භාෂාව තෝරන්න.",
      verify: "තහවුරු කරන්න",
      sendingOTP: "OTP යවමින්...",
      clearForm: "පෝරමය පැහැදිලි කරන්න",
      changeNumber: "වෙනත් අංකයක්",
      generateToken: "ටෝකනය නිකුත් කරන්න",
      generating: "නිකුත් කරමින්...",
      kiosk: "පදිකයින් සඳහා ටෝකන් නිකුත් කිරීම",
      logout: "ඉවත් වන්න"
    },
    ta: {
      title: "டிஜிட்டல் வரிசை தளம்",
      subtitle: "வரிசையில் சேர பதிவு செய்யவும்",
      name: "முழு பெயர்",
      mobile: "மொபைல் எண்",
      optionalDetails: "விருப்ப விவரங்கள்",
      serviceType: "சேவை வகை",
      billPayment: "பில் செலுத்தல்",
      other: "மற்ற சேவைகள்",
      register: "பதிவு செய்யவும்",
      registering: "பதிவு செய்யப்படுகிறது...",
      nic: "தேசிய அடையாள அட்டை (விருப்பம்)",
      email: "மின்னஞ்சல் (விருப்பம்)",
      show: "காட்டு",
      hide: "மறை",
      selectServiceTypes: "சேவை வகைகளைத் தேர்ந்தெடுக்கவும்...",
      preferredLanguage: "விருப்ப மொழி",
      selectServiceTypesSubtitle: "ஒன்று அல்லது அதற்கு மேற்பட்ட சேவைகளைத் தேர்ந்தெடுக்கவும்.",
      english: "ஆங்கிலம்",
      sinhala: "சிங்களம்",
      tamil: "தமிழ்",
      preferredLanguageSubtitle: "அறிவிப்புகளுக்கான உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்.",
      verify: "சரிபார்க்கவும்",
      sendingOTP: "OTP அனுப்புகிறது...",
      clearForm: "படிவத்தை அழி",
      changeNumber: "எண்ணை மாற்று",
      generateToken: "டோக்கனை உருவாக்கு",
      generating: "உருவாக்குகிறது...",
      kiosk: "நடந்து வருபவர்களுக்கான டோக்கன்",
      logout: "வெளியேறு"
    }
  }

  const t = translations[language]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Language Switcher */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          {/* Language buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                language === "en"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("si")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                language === "si"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              සිංහල
            </button>
            <button
              onClick={() => setLanguage("ta")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                language === "ta"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              தமிழ்
            </button>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
          >
            {t.logout}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-8 py-6 sm:py-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{t.title}</h1>
            <p className="text-blue-100 text-sm sm:text-base">{t.subtitle}</p>
          </div>

          {/* Outlet Info Banner */}
          <div className="bg-blue-50 border-b border-blue-100 px-4 sm:px-8 py-3">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-gray-600">{t.kiosk}</div>
              <div className="text-base sm:text-lg font-semibold text-gray-800">
                {outlet?.name} - {outlet?.location}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-4 sm:px-8 py-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* When OTP is being entered, hide other fields except OTP UI */}
              {otpStep !== 'sent' && (
                <>
                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.name}</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder={t.name}
                        required
                      />
                    </div>
                  </div>

                  {/* Mobile Number Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.mobile}</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="07XXXXXXXX"
                        pattern="[0-9]{10}"
                        required
                      />
                    </div>
                  </div>

                  {/* Optional details toggle */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-medium text-gray-700">{t.optionalDetails}</span>
                    <button
                      type="button"
                      onClick={() => setShowOptional((v) => !v)}
                      className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      {showOptional ? (<><EyeOff className="w-4 h-4" /> {t.hide}</>) : (<><Eye className="w-4 h-4" /> {t.show}</>)}
                    </button>
                  </div>

                  {showOptional && (
                    <>
                      {/* NIC Number Input (optional) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t.nic}</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          <input
                            type="text"
                            value={nicNumber}
                            onChange={(e) => setNicNumber(e.target.value.toUpperCase())}
                            className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                            placeholder="123456789V or 200012345678"
                          />
                        </div>
                      </div>

                      {/* Email Input (optional) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                            placeholder="jason@gmail.com"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Service Types (Dropdown with Checkboxes) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.serviceType}(0/2)
                      <span className="ml-2 text-xs text-gray-500">
                        ({selectedServices.length}/{services.length})
                      </span>
                    </label>
                    
                    {/* Selected Services Tags */}
                    {selectedServices.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {selectedServices.map((serviceCode) => (
                          <div
                            key={serviceCode}
                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                          >
                            <span>{getServiceTitle(serviceCode)}</span>
                            <button
                              type="button"
                              onClick={() => removeService(serviceCode)}
                              className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Service Dropdown */}
                    <div className="relative" ref={serviceDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
                      >
                        <span className="text-gray-500">
                          {selectedServices.length === 0 
                            ? `${t.selectServiceTypes}` 
                            : `${selectedServices.length} service${selectedServices.length === 1 ? '' : 's'} selected`
                          }
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isServiceDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isServiceDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                          <div className="p-2">
                            {services.map((service) => (
                              <label
                                key={service.code}
                                className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedServices.includes(service.code)}
                                  onChange={() => handleServiceToggle(service.code)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{getServiceTitle(service.code)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t.selectServiceTypesSubtitle}</p>
                  </div>

                  {/* Preferred Language Radio Group */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">{t.preferredLanguage}</label>
                    <div className="space-y-2">
                      {[
                        { value: 'en', label: t.english },
                        { value: 'si', label: t.sinhala },
                        { value: 'ta', label: t.tamil },
                      ].map((lang) => (
                        <label
                          key={lang.value}
                          className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                          style={{
                            borderColor: preferredLanguage === lang.value ? '#3B82F6' : '#E5E7EB',
                            backgroundColor: preferredLanguage ===  lang.value ? '#EFF6FF' : 'white',
                          }}
                        >
                          <input
                            type="radio"
                            name="preferredLanguage"
                            value={lang.value}
                            checked={preferredLanguage === lang.value}
                            onChange={(e) => setPreferredLanguage(e.target.value)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-3 text-sm font-medium text-gray-900">{lang.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t.preferredLanguageSubtitle}</p>
                  </div>
                </>
              )}

              {/* Submit / Verify Section */}
              <div className="space-y-3">
                {/* Step 1: Verify button only */}
                {otpStep === 'idle' && (
                  <button
                    type="button"
                    onClick={() => sendOtp()}
                    disabled={otpSending || !mobileNumber || selectedServices.length === 0}
                    className="w-full bg-indigo-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {otpSending ? t.sendingOTP : t.verify}
                  </button>
                )}

                {/* Step 2: Show OTP input UI and Register button */}
                {otpStep === 'sent' && (
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <OTPInput
                        value={otpCode}
                        onChange={setOtpCode}
                        error={otpError}
                        onResend={() => sendOtp()}
                        resendDisabled={otpSending}
                        lang={language}
                      />
                      <div className="mt-3 text-xs text-gray-600 text-center">
                        <button
                          type="button"
                          onClick={() => { setOtpStep('idle'); setOtpCode(''); setOtpError('') }}
                          className="text-gray-500 hover:underline"
                        >
                          {t.changeNumber}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || selectedServices.length === 0 || otpCode.length !== 4}
                      className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {submitting ? t.generating : t.generateToken}
                    </button>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    setName('')
                    setMobileNumber('')
                    setNicNumber('')
                    setEmail('')
                    setSelectedServices([])
                    setPreferredLanguage('en')
                    setOtpStep('idle')
                    setOtpCode('')
                    setOtpToken('')
                    setError('')
                  }}
                  className="w-full bg-gray-500 text-white py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors text-sm"
                >
                  {t.clearForm}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Token Generated Successfully!</h2>
              <p className="text-gray-600 mb-6">Please remember your token number</p>

              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <div className="text-sm text-gray-600 mb-1">Your Token Number</div>
                <div className="text-6xl font-bold text-blue-600">{successToken.tokenNumber}</div>
              </div>

              <div className="text-left bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{successToken.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Services:</span>
                  <span className="font-medium">{successToken.serviceTypes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{new Date(successToken.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <button
                onClick={closeSuccessModal}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                Generate Another Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Popup for Demo Mode */}
      {showOtpPopup && devOtpCode && (
        <OTPPopup
          otpCode={devOtpCode}
          onClose={() => setShowOtpPopup(false)}
          autoCloseDuration={30000}
        />
      )}
    </div>
  )
}
