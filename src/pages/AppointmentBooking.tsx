"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar, MapPin, User, Phone, ChevronDown, X } from "lucide-react"
import api from "../config/api"
import type { Outlet } from "../types"
import OTPInput from "../components/OTPInput"

const STATIC_SERVICES = [
  { id: 'BILL_PAYMENT', code: 'BILL_PAYMENT', title: 'Bill Payment' },
  { id: 'OTHERS', code: 'OTHERS', title: 'Others' },
]

export default function AppointmentBooking() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [outletId, setOutletId] = useState("")
  const [name, setName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [datetime, setDatetime] = useState("") // yyyy-MM-ddTHH:mm
  const [preferredLanguage, setPreferredLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // OTP state
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>("idle")
  const [otpCode, setOtpCode] = useState("")
  const [otpToken, setOtpToken] = useState<string>("")
  const [otpError, setOtpError] = useState("")
  const [otpSending, setOtpSending] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const [openServices, setOpenServices] = useState(false)

  useEffect(() => {
    fetchOutlets()
  }, [])

  const fetchOutlets = async () => {
    try {
      const res = await api.get('/queue/outlets')
      setOutlets(res.data || [])
    } catch (e) {
      setError('Failed to load outlets')
    }
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenServices(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggleService = (code: string) => {
    setServiceTypes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  const sendOtp = async () => {
    setOtpError("")
    setOtpSending(true)
    try {
      await api.post("/customer/otp/start", { mobileNumber })
      setOtpStep('sent')
    } catch (err: any) {
      setOtpError(err?.response?.data?.error || 'Failed to send OTP')
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
      setOtpError(err?.response?.data?.error || 'OTP verification failed')
      return null
    } finally {
      setOtpSending(false)
    }
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      let tokenForSubmit = otpToken
      if (otpStep !== 'verified' || !tokenForSubmit) {
        const vt = await verifyOtp()
        if (!vt) return
        tokenForSubmit = vt
      }

      // Convert datetime-local to ISO
      const appointmentAt = new Date(datetime)
      if (Number.isNaN(appointmentAt.getTime())) {
        setError('Please select a valid date and time')
        return
      }

      const res = await api.post('/appointment/book', {
        name,
        mobileNumber,
        outletId,
        serviceTypes,
        preferredLanguage,
        appointmentAt: appointmentAt.toISOString(),
        verifiedMobileToken: tokenForSubmit,
      })

      if (res.data?.success) {
        setSuccess('Appointment booked successfully! You will be auto-added to the queue on the day.')
        // optional: navigate to a confirmation page later
      } else {
        setError(res.data?.error || 'Failed to book appointment')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  const canSendOtp = !!(name && mobileNumber && outletId && serviceTypes.length && datetime)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Book an Appointment</h1>
        <p className="text-sm text-gray-600 mb-6">Pick your branch, services, and time. You’ll be auto-added to the queue shortly before your slot.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            <div className="mb-2">{success}</div>
            {mobileNumber && (
              <button
                type="button"
                onClick={() => window.location.assign(`/appointment/my?mobileNumber=${encodeURIComponent(mobileNumber)}`)}
                className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
              >
                View my appointments
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleBook} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter your name" required />
            </div>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="07XXXXXXXX" pattern="[0-9]{10}" required />
            </div>
          </div>

          {/* Outlet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Outlet</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                <option value="">Select a branch</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.name} - {o.location}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Types <span className="text-xs text-gray-500">({serviceTypes.length}/{STATIC_SERVICES.length})</span></label>
            {serviceTypes.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {serviceTypes.map(code => (
                  <span key={code} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {STATIC_SERVICES.find(s => s.code === code)?.title || code}
                    <button type="button" onClick={() => toggleService(code)} className="ml-1 hover:bg-blue-200 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative" ref={dropdownRef}>
              <button type="button" onClick={() => setOpenServices(!openServices)} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between">
                <span className="text-gray-500">{serviceTypes.length ? `${serviceTypes.length} selected` : 'Select services...'}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openServices ? 'rotate-180' : ''}`} />
              </button>
              {openServices && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  <div className="max-h-60 overflow-y-auto">
                    {STATIC_SERVICES.map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={serviceTypes.includes(s.code)} onChange={() => toggleService(s.code)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <span className="text-sm text-gray-700 flex-1">{s.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preferred language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[{ code: 'en', label: 'English' }, { code: 'si', label: 'Sinhala' }, { code: 'ta', label: 'Tamil' }].map(l => (
                <label key={l.code} className="inline-flex items-center gap-2">
                  <input type="radio" name="preferredLanguage" value={l.code} checked={preferredLanguage === l.code} onChange={(e) => setPreferredLanguage(e.target.value)} />
                  <span>{l.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* OTP section */}
          {otpStep === 'idle' && (
            <button type="button" onClick={sendOtp} disabled={otpSending || !canSendOtp} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400">
              {otpSending ? 'Sending OTP…' : 'Verify Mobile'}
            </button>
          )}

          {otpStep === 'sent' && (
            <div className="p-3 border rounded-lg bg-gray-50">
              <OTPInput value={otpCode} onChange={setOtpCode} error={otpError} onResend={() => sendOtp()} resendDisabled={otpSending} />
            </div>
          )}

          <button type="submit" disabled={loading || !outletId || !mobileNumber || !name || !serviceTypes.length || !datetime || (otpStep === 'sent' && otpCode.length !== 6)} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400">
            {loading ? 'Booking…' : 'Book Appointment'}
          </button>
        </form>
      </div>
    </div>
  )
}
