// Removed unused billData state
"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, MapPin, User, Phone, Send, MessageSquare, CheckCircle } from "lucide-react"
import api from "../config/api"
import type { Outlet } from "../types"
import OTPInput from "../components/OTPInput"
import OTPPopup from "../components/OTPPopup"
import BranchClosedModal from "../components/BranchClosedModal"
import { useBranchStatus } from "../hooks/useBranchStatus"

interface Service {
  id: string
  code: string
  title: string
  description?: string
  isActive?: boolean
}

export default function AppointmentBooking() {
  const [notificationSent, setNotificationSent] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const navigate = useNavigate()
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [outletId, setOutletId] = useState("")
  const [name, setName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [selectedService, setSelectedService] = useState<string>('')
  const [datetime, setDatetime] = useState("") // yyyy-MM-ddTHH:mm

  // Get minimum date/time - at least 24 hours in advance
  const getMinDateTime = () => {
    const now = new Date()
    const minTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Add 24 hours
    const year = minTime.getFullYear()
    const month = String(minTime.getMonth() + 1).padStart(2, '0')
    const day = String(minTime.getDate()).padStart(2, '0')
    const hours = String(minTime.getHours()).padStart(2, '0')
    const minutes = String(minTime.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Validate that appointment is at least 24 hours away
  const isValidAppointmentTime = (datetimeStr: string) => {
    if (!datetimeStr) return true
    const selectedTime = new Date(datetimeStr)
    const now = new Date()
    const hoursUntil = (selectedTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntil >= 24
  }

  // UI language tabs (English/Sinhala/Tamil), independent from preferredLanguage used for announcements
  const [language, setLanguage] = useState<'en' | 'si' | 'ta'>(() => {
    try {
      const saved = localStorage.getItem('dq_lang') as 'en' | 'si' | 'ta' | null
      if (saved) return saved
    } catch { }
    const nav = (navigator?.language || 'en').toLowerCase()
    if (nav.startsWith('si')) return 'si'
    if (nav.startsWith('ta')) return 'ta'
    return 'en'
  })
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
  const [showOtpPopup, setShowOtpPopup] = useState(false)
  const [devOtpCode, setDevOtpCode] = useState<string>("")

  // Bill payment specific states
  const [sltTelephoneNumber, setSltTelephoneNumber] = useState("")
  const [sltVerified, setSltVerified] = useState(false)
  // Removed unused notificationSent, notificationMessage, and billData state
  const [isOwnerOfAccount, setIsOwnerOfAccount] = useState(false)

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1)
  // Branch closed dismissal (for "right now" status modal on AppointmentBooking)
  const [closedDismissed, setClosedDismissed] = useState(false)
  const branchStatus = useBranchStatus(outletId || null)
  // Error shown when selected appointment date/time is on a closed day
  const [closedOnDateError, setClosedOnDateError] = useState<string | null>(null)
  const [checkingDate, setCheckingDate] = useState(false)

  useEffect(() => {
    fetchOutlets()
    fetchServices()
  }, [])

  const fetchOutlets = async () => {
    try {
      const res = await api.get('/queue/outlets')
      setOutlets(res.data || [])
    } catch (e) {
      setError('Failed to load outlets')
    }
  }

  const fetchServices = async () => {
    try {
      const res = await api.get('/queue/services')
      if (res.data && Array.isArray(res.data)) {
        // Filter to only active services
        const activeServices = res.data.filter((s: Service) => s.isActive !== false)
        setServices(activeServices)
      }
    } catch (e) {
      console.error('Failed to load services:', e)
      // Fallback to default services if API fails
      const DEFAULT_SERVICES = [
        { id: 'BILL_PAYMENT', code: 'BILL_PAYMENT', title: 'Bill Payment', isActive: true },
        { id: 'OTHERS', code: 'OTHERS', title: 'Others', isActive: true },
      ]
      setServices(DEFAULT_SERVICES)
    }
  }

  const isSltRequiredService = (code: string) => {
    // Only SVC002 (Bill Payment) requires SLT telephone number
    return code === 'SVC002'
  }

  const handleServiceSelect = (code: string) => {
    setSelectedService(code)
  }

  // Translations for UI labels/buttons
  const translations = {
    en: {
      title: 'Book an Appointment',
      subtitle: 'Pick your branch, services, and time. You’ll be auto-added to the queue shortly before your slot.',
      fullName: 'Full Name',
      fullNamePh: 'Enter your name',
      mobile: 'Mobile Number',
      mobilePh: '07XXXXXXXX',
      outlet: 'Outlet',
      selectBranch: 'Select a branch',
      dateTime: 'Date & Time',
      serviceTypesLabel: 'Service Type',
      selected: 'selected',
      selectServices: 'Select services...',
      billPayment: 'Bill Payment',
      others: 'Others',
      preferredLang: 'Preferred Language',
      verifyMobile: 'Verify Mobile',
      sendingOTP: 'Sending OTP…',
      book: 'Book Appointment',
      booking: 'Booking…',
      success: 'Appointment booked successfully! You will be auto-added to the queue on the day.',
      viewMyAppts: 'View my appointments',
      english: 'English',
      sinhala: 'Sinhala',
      tamil: 'Tamil',
      sltTelephone: "SLT Telephone Number",
      sltTelephonePlaceholder: "01/041/081XXXXXXX",
      verifySlt: "Verify Number",
      verifyingSlt: "Verifying...",
      accountName: "Account Name",
      accountAddress: "Billing Address",
      billAmount: "Bill Amount",
      dueDate: "Due Date",
      billStatus: "Status",
      unpaid: "Unpaid",
      paid: "Paid",
      overdue: "Overdue",
      changeNumber: "Change number",
      optionalDetails: "Optional details",
      step1Title: "Select Language",
      step1Subtitle: "Choose your preferred language for announcements",
      step2Title: "Select Services",
      step2Subtitle: "Choose the services you need",
      step3Title: "Booking Details",
      step3Subtitle: "Enter your information and select date & time",
      step4Title: "Review & Confirm",
      step4Subtitle: "Verify your information and book appointment",
      back: "Back",
      next: "Next",
      verify: "Verify Mobile",
      enterSltNumber: "Enter your SLT telephone number",
      verifiedAccount: "Account Verified",
      minBookingTime: "Appointments must be booked at least 24 hours in advance",
      continueWithYourNumber: "You can continue with any mobile number to complete the appointment.",
      notificationSent: "Notification Sent"
    },
    si: {
      title: 'වේලාවක් වෙන්කරන්න',
      subtitle: 'ඔබගේ ශාඛාව, සේවාවන් සහ වේලාව තෝරන්න. ඔබගේ වේලාවට පෙර ඔබ ස්වයංක්‍රීයව පෝලිමට එක් කෙරේ.',
      fullName: 'සම්පූර්ණ නම',
      fullNamePh: 'ඔබගේ නම ඇතුළත් කරන්න',
      mobile: 'ජංගම දුරකථන අංකය',
      mobilePh: '07XXXXXXXX',
      outlet: 'ශාඛාව',
      selectBranch: 'ශාඛාවක් තෝරන්න',
      dateTime: 'දිනය හා වේලාව',
      serviceTypesLabel: 'සේවා වර්ගය',
      selected: 'තෝරාගෙන ඇත',
      selectServices: 'සේවාවන් තෝරන්න...',
      billPayment: 'බිල් ගෙවීම',
      others: 'වෙනත්',
      preferredLang: 'කැමති භාෂාව',
      verifyMobile: 'ජංගම අංකය තහවුරු කරන්න',
      sendingOTP: 'OTP යවමින්…',
      book: 'වෙන්කරගන්න',
      booking: 'වෙන්කරමින්…',
      success: 'වෙන්කරවාගැනීම සාර්ථකයි! ඔබගේ දිනයේදී ස්වයංක්‍රීයව පෝලිමට ඇතුළත් කෙරේ.',
      viewMyAppts: 'මගේ වෙන්කරවාගැනීම් බලන්න',
      english: 'English',
      sinhala: 'සිංහල',
      tamil: 'தமிழ்',
      sltTelephone: "SLT දුරකථන අංකය",
      sltTelephonePlaceholder: "01/041/081XXXXXXX",
      verifySlt: "අංකය තහවුරු කරන්න",
      verifyingSlt: "තහවුරු කරමින්...",
      accountName: "ගිණුම් නම",
      accountAddress: "බිල්පත් ලිපිනය",
      billAmount: "බිල් ගාස්තුව",
      dueDate: "ගෙවිය යුතු දිනය",
      billStatus: "තත්ත්වය",
      unpaid: "නොගෙවූ",
      paid: "ගෙවූ",
      overdue: "කල් ඉකුත් වූ",
      changeNumber: "වෙනත් අංකයක්",
      optionalDetails: "විකල්ප විස්තර",
      step1Title: "භාෂාව තෝරන්න",
      step1Subtitle: "නිවේදන සඳහා ඔබගේ කැමති භාෂාව තෝරන්න",
      step2Title: "සේවාවන් තෝරන්න",
      step2Subtitle: "ඔබට අවශ්‍ය සේවා තෝරන්න",
      step3Title: "වෙන්කරවාගැනීම් විස්තර",
      step3Subtitle: "ඔබගේ තොරතුරු ඇතුළත් කර දිනය සහ වේලාව තෝරන්න",
      step4Title: "සමාලෝචනය සහ තහවුරු කිරීම",
      step4Subtitle: "ඔබගේ තොරතුරු පරීක්ෂා කර වෙන්කරවාගන්න",
      back: "ආපසු",
      next: "ඊළඟ",
      verify: "ජංගම අංකය තහවුරු කරන්න",
      enterSltNumber: "ඔබගේ SLT දුරකථන අංකය ඇතුළත් කරන්න",
      verifiedAccount: "ගිණුම තහවුරු කර ඇත",
      minBookingTime: "වෙන්කරවාගැනීම් අවම වශයෙන් 24 ساعत ඉතින් වෙන්කරගත යුතුය",
      continueWithYourNumber: "ඔබ වෙනත් ජංගම අංකයකින් වැඩ සම්පූර්ණ කළ හැක.",
      notificationSent: "දැනුම්දීම යවා ඇත"
    },
    ta: {
      title: 'ஒரு நேரம் பதிவு செய்யவும்',
      subtitle: 'உங்கள் கிளை, சேவைகள் மற்றும் நேரத்தைத் தேர்வுசெய்க. உங்கள் நேரத்திற்கு முன் வரிசையில் தானாக சேர்க்கப்படுவீர்கள்.',
      fullName: 'முழு பெயர்',
      fullNamePh: 'உங்கள் பெயரை உள்ளிடவும்',
      mobile: 'கைபேசி எண்',
      mobilePh: '07XXXXXXXX',
      outlet: 'கிளை',
      selectBranch: 'ஒரு கிளையைத் தேர்ந்தெடுக்கவும்',
      dateTime: 'தேதி & நேரம்',
      serviceTypesLabel: 'சேவை வகை',
      selected: 'தேர்வு செய்யப்பட்டது',
      selectServices: 'சேவைகளைத் தேர்ந்தெடுக்கவும்...',
      billPayment: 'பில் செலுத்துதல்',
      others: 'பிறவை',
      preferredLang: 'விருப்ப மொழி',
      verifyMobile: 'மொபைல் சரிபார்க்கவும்',
      sendingOTP: 'OTP அனுப்பப்படுகிறது…',
      book: 'நேரம் பதிவு செய்யவும்',
      booking: 'பதிவு செய்கிறது…',
      success: 'நேரம் வெற்றிகரமாக பதிவு செய்யப்பட்டது! உங்கள் நாளில் வரிசையில் தானாக சேர்க்கப்படுவீர்கள்.',
      viewMyAppts: 'எனது நேரங்களைப் பார்க்க',
      english: 'English',
      sinhala: 'සිංහල',
      tamil: 'தமிழ்',
      sltTelephone: "SLT தொலை பேசி எண்",
      sltTelephonePlaceholder: "01/041/081XXXXXXX",
      verifySlt: "எண்ணைச் சரிபார்க்கவும்",
      verifyingSlt: "சரிபார்க்கிறது...",
      accountName: "கணக்கு பெயர்",
      accountAddress: "பில் முகவரி",
      billAmount: "பில் தொகை",
      dueDate: "செலுத்த வேண்டிய தேதி",
      billStatus: "நிலை",
      unpaid: "செலுத்தப்படாதது",
      paid: "செலுத்தப்பட்டது",
      overdue: "தாமதமானது",
      changeNumber: "எண்ணை மாற்று",
      optionalDetails: "விருப்ப விவரங்கள்",
      step1Title: "மொழியைத் தேர்ந்தெடுக்கவும்",
      step1Subtitle: "அறிவிப்புகளுக்கு உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்",
      step2Title: "சேவைகளைத் தேர்ந்தெடுக்கவும்",
      step2Subtitle: "உங்களுக்குத் தேவையான சேவைகளைத் தேர்ந்தெடுக்கவும்",
      step3Title: "முன்பதிவு விவரங்கள்",
      step3Subtitle: "உங்கள் தகவலை உள்ளிட்டு தேதி மற்றும் நேரத்தைத் தேர்ந்தெடுக்கவும்",
      step4Title: "மதிப்பாய்வு மற்றும் உறுதிப்படுத்தல்",
      step4Subtitle: "உங்கள் தகவலைச் சரிபார்த்து முன்பதிவு செய்யவும்",
      back: "முந்தைய",
      next: "அடுத்து",
      verify: "மொபைல் சரிபார்க்கவும்",
      enterSltNumber: "உங்கள் SLT தொலைபேசி எண்ணை உள்ளிடவும்",
      verifiedAccount: "கணக்கு சரிபார்க்கப்பட்டது",
      minBookingTime: "நேரங்கள் குறைந்தபட்சம் 24 மணி நேரத்திற்கு முன் பதிவு செய்யப்பட வேண்டும்",
      continueWithYourNumber: "சேவையை முடிக்க நீங்கள் எந்த மொபைல் எண்ணைக் கொண்டு தொடரலாம்.",
      notificationSent: "அறிவிப்பு அனுப்பப்பட்டது"
    },
  } as const

  const t = translations[language]

  const sendOtp = async () => {
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
    } catch (err: any) {
      setOtpError(err?.response?.data?.error || 'Failed to send OTP')
    } finally {
      setOtpSending(false)
    }
  }

  const verifyOtp = async (codeValue?: string): Promise<string | null> => {
    const code = codeValue || otpCode
    if (!code || code.length !== 4) {
      setOtpError("Please enter the 4-digit code")
      return null
    }

    setOtpError("")
    setOtpSending(true)
    try {
      const res = await api.post("/customer/otp/verify", { mobileNumber, code })
      if (res.data?.verifiedMobileToken) {
        setOtpToken(res.data.verifiedMobileToken)
        setOtpStep('verified')

        // Auto-verify SLT number after mobile OTP (for bill payment)
        if (isSltRequiredService(selectedService) && sltTelephoneNumber && !sltVerified) {
          await verifySltNumber()
        }

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

  // Helper function to mask phone number - show last 3 digits
  const getMaskedPhoneNumber = (phone: string): string => {
    if (!phone || phone.length < 3) return phone
    const lastThree = phone.slice(-3)
    return `xxxxxxx${lastThree}`
  }

  // Removed unused normalizeMobileNumber function

  // Verify SLT telephone number and send bill notification
  const verifySltNumber = async () => {
    if (!sltTelephoneNumber) {
      setError("Please enter SLT telephone number")
      return
    }

    // Validate format (10 digits starting with 01, 041, or 081)
    const phoneRegex = /^(01\d{8}|041\d{7}|081\d{7})$/
    if (!phoneRegex.test(sltTelephoneNumber)) {
      setError("Invalid SLT number. Must be 10 digits (01/041/081).")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await api.get(`/bills/verify/${sltTelephoneNumber}`)
      if (response.data.success && response.data.bill) {
        const bill = response.data.bill

        // Check if mobile number is registered with SLT account
        if (!bill.mobileNumber) {
          const hotline = import.meta.env.VITE_SLT_HOTLINE || "1213"
          setError(`⚠️ This SLT account does not have a registered mobile number. Please contact the SLT hotline at ${hotline} to register your mobile number before proceeding.`)
          setSltVerified(false)
          setNotificationSent(false)
          return
        }

        setSltVerified(true)
        setError("")
        // setBillData(bill) removed as billData is unused

        // Auto-fill account name from bill (but NOT the mobile number)
        // The user will enter their own mobile number separately
        if (bill.accountName && !name) {
          setName(bill.accountName)
        }

        // Normalize mobile numbers to compare (07x → 94x format)
        const normalizeForComparison = (num: string) => {
          let normalized = num.replace(/\D/g, '')
          if (normalized.startsWith('0')) {
            normalized = '94' + normalized.substring(1)
          } else if (!normalized.startsWith('94')) {
            normalized = '94' + normalized
          }
          return normalized
        }

        // Check if person verifying is the registered owner
        let isOwner = false
        if (otpStep === 'verified' && mobileNumber) {
          const userMobileNormalized = normalizeForComparison(mobileNumber)
          const ownerMobileNormalized = normalizeForComparison(bill.mobileNumber)
          isOwner = userMobileNormalized === ownerMobileNormalized
        }
        setIsOwnerOfAccount(isOwner)

        // Create appropriate message
        const maskedPhone = getMaskedPhoneNumber(bill.mobileNumber)
        const formattedAmount = Number(bill.currentBill).toFixed(2)
        
        if (isOwner) {
          // Owner can see the due amount directly
          setNotificationMessage(`Due amount: Rs. ${formattedAmount}`)
        } else {
          // Non-owner: message says amount was sent to owner, but does NOT show the amount
          setNotificationMessage(`Bill details have been sent to the account holder at ${maskedPhone}`)
        }
        setNotificationSent(true)
        
        // Send SMS notification with bill information (including due amount)
        try {
          await api.post('/bills/send-notification', {
            mobileNumber: bill.mobileNumber,
            accountName: bill.accountName,
            billAmount: bill.currentBill,
            dueDate: bill.dueDate,
            sltNumber: sltTelephoneNumber
          })
        } catch (notifErr) {
          console.log('Notification sent (or notification service not configured)')
        }
      } else {
        setError("No account found for this telephone number")
      }
    } catch (err: any) {
      console.error('Bill verification error:', err)
      setError(err.response?.data?.error || "Failed to verify telephone number")
      setSltVerified(false)
      setNotificationSent(false)
    } finally {
      setLoading(false)
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

      // Final validation: verify 24-hour requirement (backend will also check)
      if (!isValidAppointmentTime(datetime)) {
        setError(t.minBookingTime)
        return
      }

      const res = await api.post('/appointment/book', {
        name,
        mobileNumber,
        outletId,
        serviceTypes: [selectedService],
        preferredLanguage,
        appointmentAt: appointmentAt.toISOString(),
        verifiedMobileToken: tokenForSubmit,
        sltTelephoneNumber: isSltRequiredService(selectedService) ? sltTelephoneNumber : undefined,
      })

      if (res.data?.success) {
        setSuccess('Appointment booked successfully! You will be auto-added to the queue on the day.')
        // Navigate to "My Appointments" page
        setTimeout(() => {
          navigate(`/appointment/my?mobileNumber=${mobileNumber}`)
        }, 1500)
      } else {
        setError(res.data?.error || 'Failed to book appointment')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }


  // Step navigation functions
  /** Check if the selected appointment datetime is on a branch-closed period */
  const checkAppointmentDateClosed = async (): Promise<string | null> => {
    if (!outletId || !datetime) return null
    const dt = new Date(datetime)
    // Client-side Saturday ≥ 12:30 PM check
    if (dt.getDay() === 6 && (dt.getHours() > 12 || (dt.getHours() === 12 && dt.getMinutes() >= 30))) {
      return "Appointments cannot be booked on Saturdays after 12:30 PM as the branch is closed."
    }
    // Backend check for holidays / closure notices at the selected time
    try {
      const res = await api.get(`/branch-status/${outletId}`, { params: { at: dt.toISOString() } })
      if (res.data?.isClosed) {
        return res.data.reason || "The branch is closed on the selected date/time."
      }
    } catch {
      // If network error, don't block but log silently
      console.warn('Branch status check failed; allowing step proceed')
    }
    return null
  }

  const goToNextStep = async () => {
    if (currentStep === 3) {
      setClosedOnDateError(null)
      setCheckingDate(true)
      const closedMsg = await checkAppointmentDateClosed()
      setCheckingDate(false)
      if (closedMsg) {
        setClosedOnDateError(closedMsg)
        return // Block progression
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const canProceedFromStep1 = preferredLanguage !== ''
  const canProceedFromStep2 = selectedService !== ''
  const canProceedFromStep3 = () => {
    // Must have: outlet, datetime, name, mobile
    // Datetime must be at least 24 hours in advance
    // If bill payment selected: must also have SLT number
    const hasBasicInfo = outletId && datetime && name && mobileNumber && isValidAppointmentTime(datetime)
    if (isSltRequiredService(selectedService)) {
      return hasBasicInfo && sltTelephoneNumber
    }
    return hasBasicInfo
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Branch Closed Modal */}
      {outletId && branchStatus.isClosed && !closedDismissed && (
        <BranchClosedModal
          reason={branchStatus.reason}
          activeNotice={branchStatus.activeNotice}
          onDismiss={() => setClosedDismissed(true)}
        />
      )}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        {/* Language Tabs (same style as CustomerRegistration) */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => { setLanguage('en'); try { localStorage.setItem('dq_lang', 'en') } catch { } }}
            className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {t.english}
          </button>
          <button
            onClick={() => { setLanguage('si'); try { localStorage.setItem('dq_lang', 'si') } catch { } }}
            className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${language === 'si' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {t.sinhala}
          </button>
          <button
            onClick={() => { setLanguage('ta'); try { localStorage.setItem('dq_lang', 'ta') } catch { } }}
            className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${language === 'ta' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {t.tamil}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.title}</h1>
        <p className="text-sm text-gray-600 mb-6">{t.subtitle}</p>

        {/* Progress Indicator */}
        {!success && (
          <div className="mb-6">
            <div className="flex justify-center items-center gap-2 mb-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === step
                    ? 'bg-blue-600 text-white'
                    : currentStep > step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                    }`}
                >
                  {step}
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-gray-500">
              Step {currentStep} of 4
            </p>
          </div>
        )}

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

          {/* STEP 1: Language Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t.step1Title}</h2>
                <p className="text-sm text-gray-600">{t.step1Subtitle}</p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-3">{t.preferredLang}</label>
                <div className="grid grid-cols-1 gap-3">
                  {[{ code: 'en', label: t.english }, { code: 'si', label: t.sinhala }, { code: 'ta', label: t.tamil }].map(l => (
                    <label
                      key={l.code}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400 ${preferredLanguage === l.code ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                        }`}
                    >
                      <input
                        type="radio"
                        name="preferredLanguage"
                        value={l.code}
                        checked={preferredLanguage === l.code}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-base font-medium">{l.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!canProceedFromStep1}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Service Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t.step2Title}</h2>
                <p className="text-sm text-gray-600">{t.step2Subtitle}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t.serviceTypesLabel}
                </label>

                <div className="space-y-3">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400 ${selectedService === service.code ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                        }`}
                    >
                      <input
                        type="radio"
                        name="service"
                        checked={selectedService === service.code}
                        onChange={() => handleServiceSelect(service.code)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-base font-medium">
                        {service.code === 'BILL_PAYMENT' ? t.billPayment : service.code === 'OTHERS' ? t.others : service.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!canProceedFromStep2}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Booking Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t.step3Title}</h2>
                <p className="text-sm text-gray-600">{t.step3Subtitle}</p>
              </div>

              {/* Bill Payment - Collect SLT Number (will verify after mobile OTP) */}
              {isSltRequiredService(selectedService) && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">{t.enterSltNumber}</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t.sltTelephone}</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            value={sltTelephoneNumber}
                            onChange={(e) => {
                              setSltTelephoneNumber(e.target.value)
                              setError("")
                              setSltVerified(false)
                            }}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t.sltTelephonePlaceholder}
                            pattern="(01[0-9]{8}|041[0-9]{7}|081[0-9]{7})"
                          />
                        </div>
                        <p className="text-xs text-blue-600 mt-2">🔒 {t.enterSltNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Outlet Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.outlet}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={outletId}
                    onChange={(e) => setOutletId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">{t.selectBranch}</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name} - {o.location}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.dateTime}</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                    min={getMinDateTime()}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${datetime && !isValidAppointmentTime(datetime)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                      }`}
                    required
                  />
                </div>
                {datetime && !isValidAppointmentTime(datetime) && (
                  <p className="text-sm text-red-600 mt-2">⚠️ {t.minBookingTime}</p>
                )}
              </div>

              {/* Customer Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.fullName}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t.fullNamePh}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.mobile}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t.mobilePh}
                      pattern="[0-9]{10}"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Closed-date error */}
              {closedOnDateError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <span className="shrink-0 mt-0.5">🚫</span>
                  <span>{closedOnDateError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!canProceedFromStep3() || checkingDate}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {checkingDate ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Checking…
                    </>
                  ) : t.next}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Confirm */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t.step4Title}</h2>
                <p className="text-sm text-gray-600">{t.step4Subtitle}</p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">{t.preferredLang}</span>
                  <p className="text-sm font-medium text-gray-900">
                    {preferredLanguage === 'en' ? t.english : preferredLanguage === 'si' ? t.sinhala : t.tamil}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">{t.serviceTypesLabel}</span>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedService === 'BILL_PAYMENT' ? t.billPayment : selectedService === 'OTHERS' ? t.others : selectedService}
                  </p>
                </div>
                {isSltRequiredService(selectedService) && sltTelephoneNumber && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">{t.sltTelephone}</span>
                    <p className="text-sm font-medium text-gray-900">{sltTelephoneNumber}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">{t.outlet}</span>
                  <p className="text-sm font-medium text-gray-900">
                    {outlets.find(o => o.id === outletId)?.name || outletId}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">{t.dateTime}</span>
                  <p className="text-sm font-medium text-gray-900">
                    {datetime ? new Date(datetime).toLocaleString() : ''}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">{t.fullName}</span>
                  <p className="text-sm font-medium text-gray-900">{name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">{t.mobile}</span>
                  <p className="text-sm font-medium text-gray-900">{mobileNumber}</p>
                </div>
              </div>

              {/* Notification Message - Show after SLT verified */}
              {isSltRequiredService(selectedService) && sltVerified && notificationSent && (
                <div className={`rounded-lg p-4 border ${
                  isOwnerOfAccount 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isOwnerOfAccount ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <span className={`text-sm font-semibold ${
                      isOwnerOfAccount 
                        ? 'text-green-700' 
                        : 'text-blue-700'
                    }`}>
                      {isOwnerOfAccount 
                        ? <><CheckCircle className="w-3 h-3 inline-block mr-1" /> Bill Amount</>
                        : <><Send className="w-3 h-3 inline-block mr-1" /> Notification Sent</>
                      }
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2 font-medium">{notificationMessage}</p>
                  {!isOwnerOfAccount && (
                    <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 mb-2 flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>The bill details have been sent as an SMS notification to the account holder.</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-600">{t.continueWithYourNumber || 'You can continue booking your appointment.'}</p>

                  <button
                    type="button"
                    onClick={() => {
                      setSltVerified(false)
                      setSltTelephoneNumber("")
                      setNotificationSent(false)
                      setNotificationMessage("")
                    }}
                    className="mt-3 text-sm text-blue-600 hover:underline"
                  >
                    {t.changeNumber}
                  </button>
                </div>
              )}

              {/* OTP Verification */}
              {otpStep === 'idle' && (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpSending || !mobileNumber || !selectedService}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {otpSending ? t.sendingOTP : t.verify}
                </button>
              )}

              {otpStep === 'sent' && (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <OTPInput
                    value={otpCode}
                    onChange={setOtpCode}
                    error={otpError}
                    onResend={sendOtp}
                    resendDisabled={otpSending}
                    lang={language}
                    onComplete={verifyOtp}
                  />
                </div>
              )}

              {otpStep === 'verified' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">✓ Mobile number verified</p>
                </div>
              )}

              {/* Book Appointment Button - Show after OTP verified */}
              {otpStep === 'verified' && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? t.booking : t.book}
                </button>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName('')
                    setMobileNumber('')
                    setSelectedService('')
                    setPreferredLanguage('en')
                    setOutletId('')
                    setDatetime('')
                    setSltTelephoneNumber('')
                    setSltVerified(false)
                    setOtpStep('idle')
                    setOtpCode('')
                    setOtpToken('')
                    setError('')
                    setCurrentStep(1)
                  }}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

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
