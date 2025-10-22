"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { User, Phone, FileText } from "lucide-react"
import api from "../config/api"
import type { Outlet } from "../types"

export default function CustomerRegistration() {
  const { outletId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState(outletId || "")
  
  // Initialize all form fields to empty strings - NEVER use cached values
  const [name, setName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [sltMobileNumber, setSltMobileNumber] = useState("")
  const [nicNumber, setNicNumber] = useState("")
  const [email, setEmail] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [language, setLanguage] = useState<"en" | "si" | "ta">("en")
  const [qrToken, setQrToken] = useState<string>("")
  const [qrValid, setQrValid] = useState<boolean>(false)
  const [services, setServices] = useState<Array<{ id: string; code: string; title: string; isActive?: boolean }>>([])
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en')
  
  // Add a form key to force React re-render when needed
  const [formKey, setFormKey] = useState(Date.now())

  // Force clear all form fields whenever component mounts (every time page loads)
  const clearAllFormData = () => {
    setName("")
    setMobileNumber("")
  setServiceTypes([])
    setSltMobileNumber("")
    setNicNumber("")
    setEmail("")
    setPreferredLanguage('en')
    setError("")
    setLanguage("en")
    setFormKey(Date.now()) // Force form re-render
  }

  // Function to validate manager-generated QR tokens (localStorage backup)
  const validateManagerQRToken = (token: string, currentOutletId: string): boolean => {
    try {
      const storedQRCodes = localStorage.getItem('managerQRCodes')
      if (!storedQRCodes) return false

      const qrCodes = JSON.parse(storedQRCodes)
      const qrData = qrCodes[currentOutletId]
      
      if (!qrData) return false
      
      return qrData.token === token
    } catch (error) {
      console.error('Error validating manager QR token:', error)
      return false
    }
  }

  useEffect(() => {
    // IMMEDIATELY clear all form data when page loads - no matter what
    clearAllFormData()
    
    // Always fetch outlets and services first
    fetchOutlets()
    fetchServices()
    
    // Clear any previous customer session data that might interfere
    // Keep only QR-related data
    const keysToPreserve = ['managerQRCodes', 'adminToken', 'officerToken', 'managerToken']
    const allKeys = Object.keys(localStorage)
    
    allKeys.forEach(key => {
      if (!keysToPreserve.includes(key) && !key.startsWith('dq_')) {
        // Clear old customer-related data
        if (key.includes('customer') || key.includes('token') || key.includes('feedback')) {
          localStorage.removeItem(key)
        }
      }
    })
    
    // Also clear sessionStorage completely for customer data
    try {
      const sessionKeys = Object.keys(sessionStorage)
      sessionKeys.forEach(key => {
        if (key.includes('customer') || key.includes('registration') || key.includes('form')) {
          sessionStorage.removeItem(key)
        }
      })
    } catch (e) {
      // Ignore sessionStorage errors
    }
    
    // Extract qr token from query param
    const q = new URLSearchParams(location.search)
    const token = q.get("qr") || ""
    setQrToken(token)

    // If we have an outlet ID from URL params, set it
    if (outletId) {
      setSelectedOutlet(outletId)
    }

    // Validate QR token before allowing registration
    const validate = async () => {
      // If no QR token provided but we have an outlet ID, allow registration
      if (!token && outletId) {
        console.log('No QR token provided, but outlet ID available:', outletId)
        setQrValid(true)
        setError("")
        setSelectedOutlet(outletId)
        return
      }

      if (!token) {
        setError("Please scan the QR code at the branch to register.")
        setQrValid(false)
        return
      }

      try {
        // First check if this is a manager-generated QR token via backend
        console.log('Trying manager QR validation via backend for token:', token)
        try {
          const managerRes = await api.get(`/customer/validate-manager-qr`, { params: { token } })
          if (managerRes.data.valid) {
            console.log('Valid manager QR token for outlet:', managerRes.data.outletId)
            setQrValid(true)
            setError("")
            if (managerRes.data.outletId) {
              setSelectedOutlet(managerRes.data.outletId)
            }
            return
          }
        } catch (managerError) {
          console.log('Manager QR validation failed, trying legacy validation:', managerError)
        }

        // Also check localStorage as backup (for offline functionality)
        if (outletId) {
          const isManagerToken = validateManagerQRToken(token, outletId)
          
          if (isManagerToken) {
            console.log('Valid manager QR token from localStorage for outlet:', outletId)
            setQrValid(true)
            setError("")
            setSelectedOutlet(outletId)
            return
          }
        }

        // Fallback to backend validation for legacy QR tokens
        console.log('Trying backend validation for legacy token:', token)
        try {
          const res = await api.get(`/customer/validate-qr`, { params: { token } })
          if (res.data.valid) {
            setQrValid(true)
            // enforce outlet from token if available
            if (res.data.outletId) {
              setSelectedOutlet(res.data.outletId)
            }
            setError("")
            return
          }
        } catch (legacyError) {
          console.log('Legacy QR validation failed:', legacyError)
        }

        // If we have an outlet ID but QR validation failed, still allow registration
        if (outletId) {
          console.log('QR validation failed, but outlet ID available - allowing registration')
          setQrValid(true)
          setError("")
          setSelectedOutlet(outletId)
        } else {
          setError("Invalid QR code. Please scan the QR code at the branch.")
          setQrValid(false)
        }
      } catch (err: any) {
        console.error('QR validation error:', err)
        // If we have an outlet ID but QR validation failed, still allow registration
        if (outletId) {
          console.log('QR validation error, but outlet ID available - allowing registration')
          setQrValid(true)
          setError("")
          setSelectedOutlet(outletId)
        } else {
          setQrValid(false)
          setError(err?.response?.data?.error || "Invalid or expired QR token")
        }
      }
    }

    validate()
  }, [location.search, outletId])

  // Additional effect to clear form when URL changes (new QR scan)
  useEffect(() => {
    clearAllFormData()
  }, [location.pathname, location.search])

  const fetchOutlets = async () => {
    try {
      const response = await api.get("/queue/outlets")
      setOutlets(response.data)
    } catch (err) {
      console.error("Failed to fetch outlets:", err)
      setError("Failed to load outlets. Please check your network / API server.")
      setOutlets([])
    }
  }

  const fetchServices = async () => {
    try {
      const response = await api.get("/queue/services")
      const list = Array.isArray(response.data) ? response.data : []
      // Show only active services (or those without explicit isActive=false)
      setServices(list.filter((s: any) => s?.isActive !== false))
    } catch (err) {
      console.error("Failed to fetch services:", err)
      // keep services empty; allow UI to reflect no options
      setServices([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/customer/register", {
        name,
        mobileNumber,
        sltMobileNumber: sltMobileNumber || undefined,
        nicNumber: nicNumber || undefined,
        email: email || undefined,
        serviceTypes,
        outletId: selectedOutlet,
        qrToken,
        preferredLanguages: preferredLanguage ? [preferredLanguage] : undefined,
      })

      if (response.data.success) {
        // Clear form state to prevent confusion for next user
        clearAllFormData()
        
        // Extra safety: Clear browser form cache
        setTimeout(() => {
          const form = document.querySelector('form')
          if (form) {
            form.reset()
          }
        }, 100)
        
        // Navigate to queue status
        navigate(`/queue/${response.data.token.id}`)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      
      // Handle specific error cases
      if (err.response?.status === 409) {
        setError(err.response?.data?.error || "You are already registered for this outlet")
      } else if (err.response?.status === 403) {
        setError(err.response?.data?.error || "QR code verification failed")
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || "Please fill in all required fields")
      } else {
        setError(err.response?.data?.error || "Registration failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const translations = {
    en: {
      title: "Digital Queue Registration",
      subtitle: "Register to join the queue",
      name: "Full Name",
      mobile: "Mobile Number",
      outlet: "Outlet",
      serviceType: "Service Type",
      billPayment: "Bill Payment",
      other: "Other Services",
      register: "Register",
      registering: "Registering...",
      sltMobile: "Telephone Number",
      nic: "NIC Number",
      email: "Email (Optional)",
    },
    si: {
      title: "ඩිජිටල් පෝලිම ලියාපදිංචිය",
      subtitle: "පෝලිමට එක්වීමට ලියාපදිංචි වන්න",
      name: "සම්පූර්ණ නම",
      mobile: "ජංගම දුරකථන අංකය",
      outlet: "ශාඛාව",
      serviceType: "සේවා වර්ගය",
      billPayment: "බිල් ගෙවීම",
      other: "වෙනත් සේවා",
      register: "ලියාපදිංචි වන්න",
      registering: "ලියාපදිංචි වෙමින්...",
      sltMobile: "දුරකථන අංකය",
      nic: "ජාතික කාර්ද අංකය",
      email: "ඊමේල් (විකල්ප)",
    },
    ta: {
      title: "டிஜிட்டல் வரிசை பதிவு",
      subtitle: "வரிசையில் சேர பதிவு செய்யவும்",
      name: "முழு பெயர்",
      mobile: "கைபேசி எண்",
      outlet: "கிளை",
      serviceType: "சேவை வகை",
      billPayment: "பில் செலுத்துதல்",
      other: "பிற சேவைகள்",
      register: "பதிவு செய்யவும்",
      registering: "பதிவு செய்கிறது...",
      sltMobile: "தொலைபேசி எண்",
      nic: "NIC எண்",
      email: "மின்னஞ்சல் (விருப்பம்)",
    },
  }

  const t = translations[language]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-lg p-4 sm:p-6 lg:p-8">
        {!qrValid && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            {error || "Please scan the QR code displayed at the branch to proceed."}
          </div>
        )}
        {/* Language Selector */}
        <div className="flex justify-end gap-1 sm:gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => setLanguage("en")}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              language === "en" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("si")}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              language === "si" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            සිංහල
          </button>
          <button
            onClick={() => setLanguage("ta")}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              language === "ta" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            தமிழ்
          </button>
        </div>

        {/* Header */}
  <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{t.title}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t.subtitle}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form key={formKey} onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" autoComplete="off" data-form-type="other">
          {/* Current Outlet (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.outlet}</label>
            {(() => {
              const current = outlets.find((o) => o.id === selectedOutlet)
              const display = current
                ? `${current.name} - ${current.location}`
                : selectedOutlet
                ? "Loading branch..."
                : ""
            
              return (
                <input
                  type="text"
                  value={display}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
              )
            })()}
          </div>

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
                autoComplete="off"
                data-form-type="other"
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
                autoComplete="off"
                data-form-type="other"
                required
              />
            </div>
          </div>

          {/* Telephone Number Input (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.sltMobile}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="tel"
                value={sltMobileNumber}
                onChange={(e) => setSltMobileNumber(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="0112345678"
                pattern="[0-9]{10}"
                autoComplete="off"
                data-form-type="other"
              />
            </div>
          </div>

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
                placeholder="NIC"
                autoComplete="off"
                data-form-type="other"
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
                placeholder="example@domain.com"
                autoComplete="off"
                data-form-type="other"
              />
            </div>
          </div>

          {/* Service Types (Multi-select Checkboxes) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.serviceType}</label>
            <div className="flex flex-wrap gap-2">
              {services.length === 0 ? (
                <span className="text-gray-500">No services available</span>
              ) : (
                services.map((s) => (
                  <label key={s.id} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      value={s.code}
                      checked={serviceTypes.includes(s.code)}
                      onChange={e => {
                        if (e.target.checked) {
                          setServiceTypes(prev => [...prev, s.code])
                        } else {
                          setServiceTypes(prev => prev.filter(code => code !== s.code))
                        }
                      }}
                    />
                    <span>{s.title || s.code}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select one or more services.</p>
          </div>

          {/* Preferred Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[{ code: 'en', label: 'English' }, { code: 'si', label: 'Sinhala' }, { code: 'ta', label: 'Tamil' }].map(l => (
                <label key={l.code} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="preferredLanguage"
                    value={l.code}
                    checked={preferredLanguage === l.code}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                  />
                  <span>{l.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select your preferred language for announcements.</p>
          </div>

          {/* Submit Button */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={!qrValid || loading || !selectedOutlet || serviceTypes.length === 0}
              className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? t.registering : t.register}
            </button>
            
            <button
              type="button"
              onClick={() => {
                // Aggressive form clearing
                clearAllFormData()
                
                // Also clear any browser form data/autocomplete
                const form = document.querySelector('form')
                if (form) {
                  form.reset()
                }
                
                // Clear any stored form data in browser
                try {
                  // Clear autocomplete/autofill data for this page
                  const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]')
                  inputs.forEach((input: any) => {
                    input.value = ''
                    input.autocomplete = 'off'
                  })
                } catch (e) {
                  // Ignore errors
                }
              }}
              className="w-full bg-gray-500 text-white py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors text-sm"
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
