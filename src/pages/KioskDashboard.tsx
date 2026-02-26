  // Removed unused billData state
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, Eye, EyeOff, Send, MessageSquare, CheckCircle } from 'lucide-react'
import { API_URL } from '../config/api'
import api from '../config/api'
import OTPInput from '../components/OTPInput'
import OTPPopup from '../components/OTPPopup'
import BranchClosedModal from '../components/BranchClosedModal'
import { useBranchStatus } from '../hooks/useBranchStatus'

interface Service {
  id: string
  code: string
  title: string
  description: string | null
}

export default function KioskDashboard() {
  const [notificationSent, setNotificationSent] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
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

  // Bill payment specific states
  const [sltTelephoneNumber, setSltTelephoneNumber] = useState("")
  const [sltVerified, setSltVerified] = useState(false)
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false)
  // Removed unused notificationSent, notificationMessage, and billData state
  const [isOwnerOfAccount, setIsOwnerOfAccount] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1)
  // Branch closed state

  const navigate = useNavigate()

  // Use outlet id from localStorage for branch status check
  const kioskOutletId = (() => { try { const d = localStorage.getItem('kioskOutlet'); return d ? JSON.parse(d)?.id : null } catch { return null } })()
  const branchStatus = useBranchStatus(kioskOutletId)

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

  // Auto-submit form after OTP verification
  useEffect(() => {
    if (shouldAutoSubmit && otpStep === 'verified' && otpToken) {
      setShouldAutoSubmit(false)
      // Submit the form immediately after OTP is verified
      if (formRef.current) {
        formRef.current.dispatchEvent(new Event('submit', { bubbles: true }))
      }
    }
  }, [shouldAutoSubmit, otpStep, otpToken])

  const loadInitialData = async () => {
    try {
      const token = localStorage.getItem('kioskToken')
      if (token) {
        // Fetch dynamic services from API
        const response = await fetch(`${API_URL}/kiosk/services`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const fetchedServices = await response.json()
          setServices(fetchedServices)
        } else {
          setServices([])
        }
      }
      setLoading(false)
    } catch (err: any) {
      console.error('Failed to load services:', err)
      setServices([])
      setLoading(false)
    }
  }

  const isSltRequiredService = (code: string) => {
    return code === 'SVC002'
  }

  const handleServiceToggle = (serviceCode: string) => {
    // Single-select: only one service at a time
    setSelectedServices(prev =>
      prev.includes(serviceCode) ? [] : [serviceCode]
    )
  }

  const getServiceTitle = (code: string) => {
    const service = services.find(s => s.code === code)
    return service?.title || code
  }

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
        if (selectedServices.some(code => isSltRequiredService(code)) && sltTelephoneNumber && !sltVerified) {
          await verifySltNumber()
        }

        // Trigger auto-submission of token generation
        setShouldAutoSubmit(true)
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
        if (bill.accountName) {
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

  // Step navigation functions
  const goToNextStep = () => {
    const newStep = Math.min(currentStep + 1, 4)
    setCurrentStep(newStep)
    // Reset OTP step when entering Step 4 for fresh OTP verification
    if (newStep === 4) {
      setOtpStep('idle')
      setOtpCode('')
      setOtpToken('')
      setOtpError('')
    }
  }

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const canProceedFromStep1 = preferredLanguage !== ''
  const canProceedFromStep2 = selectedServices.length > 0
  const canProceedFromStep3 = () => {
    // Check if any selected service requires SLT telephone number
    if (selectedServices.some(code => isSltRequiredService(code))) {
      return sltTelephoneNumber && name && mobileNumber
    }
    // Otherwise just need name and mobile
    return name && mobileNumber
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
      console.log('API Response:', data)
      console.log('Response Token:', data.token)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create token')
      }

      console.log('Setting successToken to:', data.token)
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
    // Reset form to step 1
    setName('')
    setMobileNumber('')
    setNicNumber('')
    setEmail('')
    setSelectedServices([])
    setPreferredLanguage('en')
    setOtpStep('idle')
    setOtpCode('')
    setOtpToken('')
    setOtpError('')
    setError('')
    setSltTelephoneNumber('')
    setSltVerified(false)
    setNotificationSent(false)
    setNotificationMessage('')
    setCurrentStep(1)
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
      logout: "Logout",
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
      // Multi-step labels
      step: "Step",
      of: "of",
      next: "Next",
      back: "Back",
      step1Title: "Select Language",
      step1Subtitle: "Choose your preferred language for announcements",
      step2Title: "Select Services",
      step2Subtitle: "What services do you need today?",
      step3Title: "Your Information",
      step3Subtitle: "Please provide your details",
      step4Title: "Review & Generate Token",
      step4Subtitle: "Verify your information and generate token",
      enterSltNumber: "Enter your SLT telephone number",
      verifiedAccount: "Account Verified",
      billSummary: "Bill Summary",
      continueWithYourNumber: "You can continue with any mobile number to complete the service.",
      notificationSent: "Notification Sent"
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
      logout: "ඉවත් වන්න",
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
      // Multi-step labels
      step: "පියවර",
      of: "න්",
      next: "ඊළඟ",
      back: "ආපසු",
      step1Title: "භාෂාව තෝරන්න",
      step1Subtitle: "ප්‍රකාශන සඳහා ඔබේ කැමති භාෂාව තෝරන්න",
      step2Title: "සේවා තෝරන්න",
      step2Subtitle: "අද ඔබට අවශ්‍ය සේවා මොනවාද?",
      step3Title: "ඔබේ තොරතුරු",
      step3Subtitle: "කරුණාකර ඔබේ විස්තර ලබා දෙන්න",
      step4Title: "සමාලෝචනය සහ ටෝකන් උත්පාදනය",
      step4Subtitle: "ඔබගේ තොරතුරු තහවුරු කර ටෝකන් උත්පාදනය කරන්න",
      enterSltNumber: "ඔබේ SLT දුරකථන අංකය ඇතුළත් කරන්න",
      verifiedAccount: "ගිණුම තහවුරු කර ඇත",
      billSummary: "බිල් සාරාංශය",
      continueWithYourNumber: "ඔබ සේවා ඉවරයි කිරීමට ඕනෑම ජංගම අංකයක් සමඟ ඉදිරියට යා හැක.",
      notificationSent: "දැනුම්දීම යැවිණි"
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
      logout: "வெளியேறு",
      sltTelephone: "SLT தொலைபேசி எண்",
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
      // Multi-step labels
      step: "படி",
      of: "இல்",
      next: "அடுத்து",
      back: "பின்",
      step1Title: "மொழியைத் தேர்வுசெய்",
      step1Subtitle: "அறிவிப்புகளுக்கான உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்",
      step2Title: "சேவைகளைத் தேர்ந்தெடுக்கவும்",
      step2Subtitle: "இன்று உங்களுக்கு என்ன சேவைகள் தேவை?",
      step3Title: "உங்கள் தகவல்",
      step3Subtitle: "தயவுசெய்து உங்கள் விவரங்களை வழங்கவும்",
      step4Title: "மதிப்பாய்வு மற்றும் டோக்கன் உருவாக்கம்",
      step4Subtitle: "உங்கள் தகவலைச் சரிபார்த்து டோக்கனை உருவாக்கவும்",
      enterSltNumber: "உங்கள் SLT தொலைபேசி எண்ணை உள்ளிடவும்",
      verifiedAccount: "கணக்கு சரிபார்க்கப்பட்டது",
      billSummary: "பில் சுருக்கம்",
      continueWithYourNumber: "சேவையை முடிக்க நீங்கள் எந்த மொபைல் எண்ணைக் கொண்டு தொடரலாம்.",
      notificationSent: "அறிவிப்பு அனுப்பப்பட்டது"
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
      {/* Branch Closed Modal – non-dismissable */}
      {branchStatus.isClosed && (
        <BranchClosedModal
          reason={branchStatus.reason}
          activeNotice={branchStatus.activeNotice}
        />
      )}
      {/* Language Switcher */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          {/* Language buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${language === "en"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("si")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${language === "si"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              සිංහල
            </button>
            <button
              onClick={() => setLanguage("ta")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${language === "ta"
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
            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                        }`}
                    >
                      {step}
                    </div>
                    {step < 4 && (
                      <div
                        className={`w-8 sm:w-12 h-1 mx-1 transition-colors ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-gray-500">
                {t.step} {currentStep} {t.of} 4
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

              {/* STEP 1: Language Selection */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t.step1Title}</h2>
                    <p className="text-sm text-gray-600">{t.step1Subtitle}</p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 mb-3">{t.preferredLanguage}</label>
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
                    <p className="text-xs text-gray-500 mt-2">{t.preferredLanguageSubtitle}</p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-3">{t.serviceType}</label>

                    <div className="space-y-3">
                      {services.map((service) => (
                        <label
                          key={service.id}
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400 ${
                            selectedServices.includes(service.code) ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="service"
                            checked={selectedServices.includes(service.code)}
                            onChange={() => handleServiceToggle(service.code)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <span className="text-base font-medium">{getServiceTitle(service.code)}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t.selectServiceTypesSubtitle}</p>
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

              {/* STEP 3: Customer Information */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t.step3Title}</h2>
                    <p className="text-sm text-gray-600">{t.step3Subtitle}</p>
                  </div>

                  {/* Bill Payment Path - Collect SLT Number (will verify after OTP) */}
                  {selectedServices.some(code => isSltRequiredService(code)) && (
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
                            <p className="text-xs text-blue-600 mt-2">🔒 We'll verify your SLT account after you verify your mobile number</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Entry Path - Always show for non-bill-payment OR after entering SLT number */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.name}</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={t.name}
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
                          placeholder="07XXXXXXXX"
                          pattern="[0-9]{10}"
                          required
                        />
                      </div>
                    </div>

                    {/* Optional fields toggle */}
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t.nic}</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="text"
                              value={nicNumber}
                              onChange={(e) => setNicNumber(e.target.value.toUpperCase())}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="123456789V or 200012345678"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="jason@gmail.com"
                            />
                          </div>
                        </div>
                      </>
                    )}
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
                      disabled={!canProceedFromStep3()}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {t.next}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: OTP Verification & Submit */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t.step4Title}</h2>
                    <p className="text-sm text-gray-600">{t.step4Subtitle}</p>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">{t.preferredLanguage}</span>
                      <p className="text-sm font-medium text-gray-900">
                        {preferredLanguage === 'en' ? t.english : preferredLanguage === 'si' ? t.sinhala : t.tamil}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">{t.serviceType}</span>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedServices.map(code => getServiceTitle(code)).join(', ')}
                      </p>
                    </div>
                    {selectedServices.some(code => isSltRequiredService(code)) && sltTelephoneNumber && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">{t.sltTelephone}</span>
                        <p className="text-sm font-medium text-gray-900">{sltTelephoneNumber}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">{t.name}</span>
                      <p className="text-sm font-medium text-gray-900">{name}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">{t.mobile}</span>
                      <p className="text-sm font-medium text-gray-900">{mobileNumber}</p>
                    </div>
                  </div>

                  {/* Notification Message - Show after SLT verified */}
                  {selectedServices.some(code => isSltRequiredService(code)) && sltVerified && notificationSent && (
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
                      <p className="text-xs text-gray-600">{t.continueWithYourNumber || 'You can continue with your token generation.'}</p>
                    </div>
                  )}

                  {/* OTP Verification */}
                  {otpStep === 'idle' && (
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={otpSending || !mobileNumber || selectedServices.length === 0}
                      className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {otpSending ? t.sendingOTP : t.verify}
                    </button>
                  )}

                  {otpStep === 'sent' && (
                    <div className="space-y-4">
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
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {submitting ? t.generating : t.generateToken}
                      </button>
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
                        setCurrentStep(1)
                      }}
                      className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                    >
                      {t.clearForm}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successToken && (
        <>
          {console.log('Rendering success modal with:', successToken)}
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
                  <div className="text-6xl font-bold text-blue-600">
                    {successToken.tokenNumber || 'N/A'}
                  </div>
                  {!successToken.tokenNumber && (
                    <div className="text-sm text-red-600 mt-2">
                      Debug: successToken = {JSON.stringify(successToken)}
                    </div>
                  )}
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
        </>
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
