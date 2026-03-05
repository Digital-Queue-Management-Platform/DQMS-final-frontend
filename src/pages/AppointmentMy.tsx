"use client"

import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Calendar, Clock, MapPin, RefreshCwIcon } from "lucide-react"
import api from "../config/api"
import type { Outlet } from "../types"

type Appt = {
  id: string
  outletId: string
  outletName?: string
  outletLocation?: string
  status: string
  serviceTypes: string[]
  preferredLanguage?: string | null
  sltTelephoneNumber?: string | null
  appointmentAt: string
  queuedAt?: string | null
  createdAt: string
}

type BillData = {
  accountName: string
  accountAddress?: string
  currentBill: number
  dueDate?: string
  status?: string
}

export default function AppointmentMy() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNumber, setMobileNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [appts, setAppts] = useState<Appt[]>([])
  const [billDataMap, setBillDataMap] = useState<Record<string, BillData>>({})
  const [outletMap, setOutletMap] = useState<Record<string, { name: string; location?: string }>>({})
  const [language, setLanguage] = useState<'en' | 'si' | 'ta'>(() => {
    try {
      const saved = localStorage.getItem('dq_lang') as 'en' | 'si' | 'ta' | null
      if (saved) return saved
    } catch {}
    const nav = (navigator?.language || 'en').toLowerCase()
    if (nav.startsWith('si')) return 'si'
    if (nav.startsWith('ta')) return 'ta'
    return 'en'
  })

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const m = q.get('mobileNumber') || ''
    if (m) {
      setMobileNumber(m)
      fetchMy(m)
    }
    // Load outlets for mapping IDs to human names
    ;(async () => {
      try {
        const res = await api.get('/queue/outlets')
        const arr: Outlet[] = res.data || []
        const map: Record<string, { name: string; location?: string }> = {}
        for (const o of arr) map[o.id] = { name: o.name, location: (o as any).location }
        setOutletMap(map)
      } catch {
        // best-effort; leave map empty
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const fetchMy = async (mobile: string) => {
    if (!mobile || mobile.length !== 10) {
      setError(t.enterValidMobile)
      return
    }
    setError("")
    setLoading(true)
    try {
      const res = await api.get(`/appointment/my`, { params: { mobileNumber: mobile } })
      const appointments = res.data?.appointments || []
      setAppts(appointments)
      
      // Fetch bill data for appointments with SLT telephone numbers
      const billMap: Record<string, BillData> = {}
      for (const appt of appointments) {
        if (appt.sltTelephoneNumber && (appt.serviceTypes.includes('SVC002') || appt.serviceTypes.includes('BILL_PAYMENT'))) {
          try {
            const billRes = await api.get(`/bills/verify/${appt.sltTelephoneNumber}`)
            if (billRes.data?.success && billRes.data?.bill) {
              billMap[appt.id] = billRes.data.bill
            }
          } catch (e) {
            // Best-effort - skip if bill fetch fails
            console.warn(`Failed to fetch bill for appointment ${appt.id}`, e)
          }
        }
      }
      setBillDataMap(billMap)
    } catch (e: any) {
      setError(e?.response?.data?.error || t.failedToLoad)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  const formatTime = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const translations = {
    en: {
      title: 'My Appointments',
      subtitle: 'Enter your mobile number to view your upcoming and recent appointments.',
      mobilePh: '07XXXXXXXX',
      refresh: 'Refresh',
      loading: 'Loading…',
      none: 'No appointments found.',
      services: 'Services',
      languageLabel: 'Language',
      bookAnother: 'Book another appointment',
      statusQueued: 'Queued',
      statusBooked: 'Booked',
      statusCompleted: 'Completed',
      statusCancelled: 'Cancelled',
      billPayment: 'Bill Payment',
      others: 'Others',
      enterValidMobile: 'Enter a valid 10-digit mobile number',
      failedToLoad: 'Failed to load appointments',
      english: 'English',
      sinhala: 'Sinhala',
      tamil: 'Tamil',
      sltTelephone: 'SLT Telephone Number',
      accountName: 'Account Name',
      accountAddress: 'Billing Address',
      billAmount: 'Bill Amount',
      dueDate: 'Due Date',
      billStatus: 'Status',
      unpaid: 'Unpaid',
      paid: 'Paid',
      overdue: 'Overdue',
    },
    si: {
      title: 'මගේ ඇප්පොයින්ට්මන්ට්',
      subtitle: 'ඔබගේ ආසන්න සහ මෑත ඇප්පොයින්ට්මන්ට් බලන්න ජංගම අංකය ඇතුළත් කරන්න.',
      mobilePh: '07XXXXXXXX',
      refresh: 'නැව්වත ලබාගන්න',
      loading: 'පූරණය වෙමින්…',
      none: 'ඇප්පොයින්ට්මන්ට් නොපවතී.',
      services: 'සේවාවන්',
      languageLabel: 'භාෂාව',
      bookAnother: 'තවත් ඇප්පොයින්ට්මන්ට් වෙන්කරගන්න',
      statusQueued: 'පෝලිමට එක්වී ඇත',
      statusBooked: 'වෙන්කර ඇත',
      statusCompleted: 'සම්පූර්ණයි',
      statusCancelled: 'අවලංගු කළා',
      billPayment: 'බිල් ගෙවීම',
      others: 'වෙනත්',
      enterValidMobile: 'වලංගු අංක 10ක් යටිතළ ජංගම අංකයක් ඇතුළත් කරන්න',
      failedToLoad: 'ඇප්පොයින්ට්මන්ට් ලබාගැනීමට නොහැකි විය',
      english: 'English',
      sinhala: 'සිංහල',
      tamil: 'தமிழ்',
      sltTelephone: 'SLT දුරකථන අංකය',
      accountName: 'ගිණුම් නම',
      accountAddress: 'බිල්පත් ලිපිනය',
      billAmount: 'බිල්පත් මුදල',
      dueDate: 'ගෙවිය යුතු දිනය',
      billStatus: 'තත්ත්වය',
      unpaid: 'නොගෙවූ',
      paid: 'ගෙවූ',
      overdue: 'කල් ඉකුත් වූ',
    },
    ta: {
      title: 'எனது நேரங்கள்',
      subtitle: 'உங்கள் வரவிருக்கும் மற்றும் சமீபத்திய நேரங்களைப் பார்க்க உங்கள் கைபேசி எண்ணை உள்ளிடவும்.',
      mobilePh: '07XXXXXXXX',
      refresh: 'புதுப்பிக்க',
      loading: 'ஏற்றுகிறது…',
      none: 'நேரங்கள் எதுவும் இல்லை.',
      services: 'சேவைகள்',
      languageLabel: 'மொழி',
      bookAnother: 'மற்றொரு நேரம் பதிவு செய்யவும்',
      statusQueued: 'வரிசையில்',
      statusBooked: 'பதிவு செய்யப்பட்டது',
      statusCompleted: 'முடிந்தது',
      statusCancelled: 'ரத்துசெய்யப்பட்டது',
      billPayment: 'பில் செலுத்துதல்',
      others: 'பிறவை',
      enterValidMobile: 'செல்லுபடியாகும் 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்',
      failedToLoad: 'நேரங்களை ஏற்ற முடியவில்லை',
      english: 'English',
      sinhala: 'සිංහල',
      tamil: 'தமிழ்',
      sltTelephone: 'SLT தொலைபேசி எண்',
      accountName: 'கணக்கு பெயர்',
      accountAddress: 'பில் முகவரி',
      billAmount: 'பில் தொகை',
      dueDate: 'செலுத்த வேண்டிய தேதி',
      billStatus: 'நிலை',
      unpaid: 'செலுத்தப்படாதது',
      paid: 'செலுத்தப்பட்டது',
      overdue: 'தாமதமானது',
    },
  } as const

  const t = translations[language]

  const renderStatus = (status: string) => {
    switch (status) {
      case 'queued': return t.statusQueued
      case 'booked': return t.statusBooked
      case 'completed': return t.statusCompleted
      case 'cancelled': return t.statusCancelled
      default: return status
    }
  }

  const renderService = (code: string) => {
    if (code === 'BILL_PAYMENT') return t.billPayment
    if (code === 'OTHERS') return t.others
    return code
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl shadow-xl p-6 mb-4">
          {/* Language Tabs */}
          <div className="flex justify-end gap-2 mb-3">
            <button
              onClick={() => { setLanguage('en'); try { localStorage.setItem('dq_lang','en') } catch {} }}
              className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {t.english}
            </button>
            <button
              onClick={() => { setLanguage('si'); try { localStorage.setItem('dq_lang','si') } catch {} }}
              className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${language === 'si' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {t.sinhala}
            </button>
            <button
              onClick={() => { setLanguage('ta'); try { localStorage.setItem('dq_lang','ta') } catch {} }}
              className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${language === 'ta' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {t.tamil}
            </button>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-sm text-gray-600 mb-4">{t.subtitle}</p>
          <form onSubmit={(e) => { e.preventDefault(); fetchMy(mobileNumber) }} className="flex gap-2">
            <input
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              type="tel"
              placeholder={t.mobilePh}
              pattern="[0-9]{10}"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <RefreshCwIcon className="w-4 h-4" />
              {t.refresh}
            </button>
          </form>
          {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6">
          {loading ? (
            <div className="text-gray-600">{t.loading}</div>
          ) : appts.length === 0 ? (
            <div className="text-gray-600">{t.none}</div>
          ) : (
            <div className="space-y-3">
              {appts.map(a => (
                <div key={a.id} className="border rounded-lg p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(a.appointmentAt)} • {formatTime(a.appointmentAt)}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      a.status === 'queued' ? 'bg-green-100 text-green-700' :
                      a.status === 'booked' ? 'bg-yellow-100 text-yellow-700' :
                      a.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      a.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{renderStatus(a.status)}</span>
                  </div>
                  <div className="text-sm text-gray-600 inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>
                      {(a.outletName || outletMap[a.outletId]?.name || a.outletId)}
                      {(() => {
                        const loc = a.outletLocation || outletMap[a.outletId]?.location
                        return loc ? ` — ${loc}` : ''
                      })()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 inline-flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{t.services}: {Array.isArray(a.serviceTypes) ? a.serviceTypes.map(renderService).join(', ') : ''}</span>
                  </div>
                  {a.preferredLanguage && (
                    <div className="text-xs text-gray-500">{t.languageLabel}: {a.preferredLanguage}</div>
                  )}
                  
                  {/* Bill Details - Show if SVC002 (Bill Payment) service and bill data exists */}
                  {(a.serviceTypes.includes('SVC002') || a.serviceTypes.includes('BILL_PAYMENT')) && a.sltTelephoneNumber && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-medium text-gray-500 mb-2">
                        {t.sltTelephone}: {a.sltTelephoneNumber}
                      </div>
                      {billDataMap[a.id] ? (
                        <div className="bg-blue-50 rounded-lg p-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t.accountName}:</span>
                            <span className="font-medium text-gray-900">{billDataMap[a.id].accountName}</span>
                          </div>
                          {billDataMap[a.id].accountAddress && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t.accountAddress}:</span>
                              <span className="font-medium text-gray-900 text-right max-w-[60%]">{billDataMap[a.id].accountAddress}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-600">{t.billAmount}:</span>
                            <span className="font-bold text-lg text-blue-600">Rs. {billDataMap[a.id].currentBill?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t.dueDate}:</span>
                            <span className="font-medium text-gray-900">
                              {billDataMap[a.id].dueDate ? new Date(billDataMap[a.id].dueDate!).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t.billStatus}:</span>
                            <span className={`font-medium ${
                              billDataMap[a.id].status === 'paid' ? 'text-green-600' : 
                              billDataMap[a.id].status === 'overdue' ? 'text-red-600' : 
                              'text-orange-600'
                            }`}>
                              {billDataMap[a.id].status === 'paid' ? t.paid : 
                               billDataMap[a.id].status === 'overdue' ? t.overdue : 
                               t.unpaid}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">Loading bill details...</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/appointment/book')}
            className="text-sm text-indigo-600 hover:underline"
          >
            {t.bookAnother}
          </button>
        </div>
      </div>
    </div>
  )
}
