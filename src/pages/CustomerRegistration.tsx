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
  const [name, setName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [serviceType, setServiceType] = useState("")
  const [sltMobileNumber, setSltMobileNumber] = useState("")
  const [nicNumber, setNicNumber] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [language, setLanguage] = useState<"en" | "si" | "ta">("en")
  const [qrToken, setQrToken] = useState<string>("")
  const [qrValid, setQrValid] = useState<boolean>(false)
  const [services, setServices] = useState<Array<{ id: string; code: string; title: string; isActive?: boolean }>>([])
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([])

  useEffect(() => {
    // Extract qr token from query param
    const q = new URLSearchParams(location.search)
    const token = q.get("qr") || ""
    setQrToken(token)

    // Validate QR token before allowing registration
    const validate = async () => {
      if (!token) {
        setError("Please scan the QR code at the branch to register.")
        setQrValid(false)
        return
      }
      try {
        const res = await api.get(`/customer/validate-qr`, { params: { token } })
        if (res.data.valid) {
          setQrValid(true)
          // enforce outlet from token if available
          if (res.data.outletId) {
            setSelectedOutlet(res.data.outletId)
          }
          setError("")
          fetchOutlets()
          fetchServices()
        } else {
          setQrValid(false)
          setError(res.data.error || "Invalid QR token")
        }
      } catch (err: any) {
        setQrValid(false)
        setError(err?.response?.data?.error || "Invalid or expired QR token")
      }
    }

    validate()
  }, [location.search])

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
        serviceType,
        outletId: selectedOutlet,
        qrToken,
        preferredLanguages: preferredLanguages.length ? preferredLanguages : undefined,
      })

      if (response.data.success) {
        navigate(`/queue/${response.data.token.id}`)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed")
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
      sltMobile: "SLT Mobile Number",
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
      sltMobile: "SLT ජංගම අංකය",
      nic: "ජාතික කාර্ড අංකය",
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
      sltMobile: "SLT கைபேசி எண்",
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

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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

          {/* SLT Mobile Number Input (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.sltMobile}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="tel"
                value={sltMobileNumber}
                onChange={(e) => setSltMobileNumber(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="0XXXXXXXXX"
                pattern="0[0-9]{9}"
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
              />
            </div>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.serviceType}</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              required
            >
              <option value="" disabled>
                {services.length === 0 ? "No services available" : "Select a service"}
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.code}>{s.title || s.code}</option>
              ))}
            </select>
          </div>

          {/* Preferred Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language(s)</label>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[{ code: 'en', label: 'English' }, { code: 'si', label: 'Sinhala' }, { code: 'ta', label: 'Tamil' }].map(l => (
                <label key={l.code} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preferredLanguages.includes(l.code)}
                    onChange={(e) => setPreferredLanguages(prev => e.target.checked ? [...prev, l.code] : prev.filter(c => c !== l.code))}
                  />
                  <span>{l.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select language(s) you prefer to speak with the officer.</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!qrValid || loading || !selectedOutlet || !serviceType}
            className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading ? t.registering : t.register}
          </button>
        </form>
      </div>
    </div>
  )
}
