// Removed unused billData state
import sltLogo from '../assets/logo.png'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, Eye, EyeOff, Send, MessageSquare, CheckCircle, Banknote, CreditCard, FileText, Landmark } from 'lucide-react'
import { API_URL } from '../config/api'
import api from '../config/api'
import OTPInput from '../components/OTPInput'
import OTPPopup from '../components/OTPPopup'
import BranchClosedModal from '../components/BranchClosedModal'
import NoticeModal from '../components/NoticeModal'
import { useBranchStatus } from '../hooks/useBranchStatus'
import { useOutletNotices } from '../hooks/useOutletNotices'

interface Service {
  id: string
  code: string
  title: string
  description: string | null
  isPriorityService?: boolean
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
  const [selectedService, setSelectedService] = useState<string>('')
  const [preferredLanguage, setPreferredLanguage] = useState<string>("")
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
  const [autoSendingOtp, setAutoSendingOtp] = useState(false)
  const [showOtpPopup, setShowOtpPopup] = useState(false)
  const [devOtpCode, setDevOtpCode] = useState<string>("")

  // Service dropdown states

  // Bill payment specific states
  const [sltTelephoneNumber, setSltTelephoneNumber] = useState("")
  const [sltVerified, setSltVerified] = useState(false)
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false)
  const [isOwnerOfAccount, setIsOwnerOfAccount] = useState(false)
  const [billData, setBillData] = useState<{ currentBill: number; accountName: string; dueDate: string; status: string } | null>(null)
  const [billPaymentIntent, setBillPaymentIntent] = useState<'full' | 'partial' | null>(null)
  const [billPaymentCustomAmount, setBillPaymentCustomAmount] = useState("")
  const [billPaymentMethod, setBillPaymentMethod] = useState<'cash' | 'card' | 'cheque' | 'bank_transfer' | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1)
  // Branch closed state

  const navigate = useNavigate()

  // Use outlet id from localStorage for branch status check
  const kioskOutletId = (() => { try { const d = localStorage.getItem('kioskOutlet'); return d ? JSON.parse(d)?.id : null } catch { return null } })()
  const branchStatus = useBranchStatus(kioskOutletId)
  const { notices: activeNotices, dismiss: dismissNotice } = useOutletNotices(kioskOutletId)

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

  // Auto-submit form after OTP verification (for non-bill services)
  useEffect(() => {
    if (shouldAutoSubmit && otpStep === 'verified' && otpToken && !isSltRequiredService(selectedService)) {
      setShouldAutoSubmit(false)
      // Submit the form immediately after OTP is verified
      if (formRef.current) {
        formRef.current.dispatchEvent(new Event('submit', { bubbles: true }))
      }
    }
  }, [shouldAutoSubmit, otpStep, otpToken, selectedService])

  // Auto-submit for bill payment once intent + method (+ amount if partial) are all set
  useEffect(() => {
    if (selectedService !== 'SVC002' && selectedService !== 'BILL_PAYMENT') {
      setShouldAutoSubmit(false)
      return
    }
    if (!sltVerified || otpStep !== 'verified') {
      setShouldAutoSubmit(false)
      return
    }
    if (!billPaymentIntent || !billPaymentMethod) {
      setShouldAutoSubmit(false)
      return
    }
    if (billPaymentIntent === 'partial') {
      const amount = parseFloat(billPaymentCustomAmount)
      if (!billPaymentCustomAmount || isNaN(amount) || amount <= 0) {
        setShouldAutoSubmit(false)
        return
      }
    }
    setShouldAutoSubmit(true)
    const timer = setTimeout(() => {
      if (formRef.current) {
        formRef.current.dispatchEvent(new Event('submit', { bubbles: true }))
      }
    }, 800)
    return () => {
      clearTimeout(timer)
      setShouldAutoSubmit(false)
    }
  }, [billPaymentIntent, billPaymentMethod, billPaymentCustomAmount, otpStep, selectedService, sltVerified])

  // Auto-send OTP when mobile number reaches 10 valid digits on step 3
  useEffect(() => {
    if (currentStep === 3 && mobileNumber.length === 10 && (mobileNumber.startsWith('07') || mobileNumber.startsWith('01'))) {
      const canProceed = canProceedFromStep3();
      if (canProceed && otpStep === 'idle' && !otpSending && !autoSendingOtp) {
        setAutoSendingOtp(true);
        const timer = setTimeout(() => {
          goToNextStep();
          sendOtp();
          setAutoSendingOtp(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [mobileNumber, currentStep])

  const loadInitialData = async () => {
    try {
      // Fetch active services from public endpoint (already ordered correctly)
      const response = await api.get('/queue/services')
      const allServices = response.data || []
      // Filter only active services
      const activeServices = allServices.filter((s: any) => s.isActive !== false)
      setServices(activeServices)
      setLoading(false)
    } catch (err: any) {
      console.error('Failed to load services:', err)
      setServices([])
      setLoading(false)
    }
  }

  const isSltRequiredService = (code: string) => {
    // SVC002 and BILL_PAYMENT require SLT telephone number
    return code === 'SVC002' || code === 'BILL_PAYMENT'
  }

  const handleServiceSelect = (serviceCode: string) => {
    setSelectedService(serviceCode)
    // Auto advance to next step after a tiny delay for visual feedback
    setTimeout(() => goToNextStep(), 300)
  }

  const getServiceTitle = (code: string) => {
    // Check by code first
    const upperCode = code.toUpperCase()
    if (upperCode === 'BILL_PAYMENT') return t.billPayment
    if (upperCode === 'OTHERS' || upperCode === 'OTHER') return t.other
    if (upperCode === 'NEW_SERVICE' || upperCode === 'SVC001') return t.newService
    if (upperCode === 'SERVICE_COMPLAINT' || upperCode === 'SVC003') return t.serviceComplaint
    if (upperCode === 'BILL_DISPUTE' || upperCode === 'SVC004') return t.billDispute

    const service = services.find(s => s.code === code)
    if (!service) return code

    // Try to match the title string to localized versions as fallback
    const title = service.title.toLowerCase()
    if (title.includes('new service')) return t.newService
    if (title.includes('bill payment')) return t.billPayment
    if (title.includes('service complaint')) return t.serviceComplaint
    if (title.includes('bill dispute')) return t.billDispute
    if (title.includes('other')) return t.other

    return service.title
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
        if (isSltRequiredService(selectedService) && sltTelephoneNumber && !sltVerified) {
          await verifySltNumber()
        }

        // For bill payment: do NOT auto-submit — customer must select payment intent first
        if (!isSltRequiredService(selectedService)) {
          setShouldAutoSubmit(true)
        }
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

    // Relaxed validation: Just check for 10 digits
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(sltTelephoneNumber)) {
      setError("Invalid telephone number. Must be 10 digits.")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await api.get(`/bills/verify/${sltTelephoneNumber}`, {
        params: { mobileNumber }
      })
      if (response.data.success && response.data.bill) {

        const bill = response.data.bill

        // Check if mobile number is registered with SLT account
        // If the API returned success, it means SLT system triggered an SMS, even if we couldn't parse the number
        if (!bill.mobileNumber && !response.data.smsNotification?.maskedMobile) {
          const hotline = import.meta.env.VITE_SLT_HOTLINE || "1213"
          setError(`⚠️ This SLT account does not have a registered mobile number. Please contact the SLT hotline at ${hotline} to register your mobile number before proceeding.`)
          setSltVerified(false)
          setNotificationSent(false)
          // Still allow proceeding if the user says it's correct? No, let's keep the block for absolute certainty of no number.
          // However, if the user says it was sent, then extractMaskedMobile likely failed or message was different.
          return
        }

        setSltVerified(true)
        setError("")
        setBillData({
          currentBill: bill.currentBill,
          accountName: bill.accountName,
          dueDate: bill.dueDate,
          status: bill.status,
        })
        // Reset payment intent when bill is freshly verified
        setBillPaymentIntent(null)
        setBillPaymentCustomAmount("")
        setBillPaymentMethod(null)

        // DO NOT auto-fill name from bill - allow user to enter their own name
        // This is important because sometimes the person paying (e.g., driver)
        // is not the account owner, and we want their name in the system

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
          const ownerMobile = bill.mobileNumber || ""
          
          if (ownerMobile.includes('*')) {
            // Masked number comparison: check if suffix matches
            const visiblePart = ownerMobile.replace(/\*+/g, '')
            if (visiblePart && userMobileNormalized.endsWith(visiblePart)) {
              isOwner = true
            }
          } else {
            // Unmasked comparison
            const ownerMobileNormalized = normalizeForComparison(ownerMobile)
            isOwner = userMobileNormalized === ownerMobileNormalized
          }
        }
        setIsOwnerOfAccount(isOwner)

        // Create appropriate message
        const maskedPhone = getMaskedPhoneNumber(bill.mobileNumber)

        if (isOwner) {
          setNotificationMessage(`Bill details have been sent to your registered mobile number.`)
        } else {
          // Non-owner: message says amount was sent to owner, but does NOT show the amount
          setNotificationMessage(`Bill details have been sent to the account holder at ${maskedPhone}`)
        }
        setNotificationSent(true)

        // Send SMS notification with bill information (including due amount)
        // Use the user's unmasked mobile number IF they are the owner
        const targetNumber = isOwner ? mobileNumber : bill.mobileNumber
        
        if (targetNumber && !targetNumber.includes('*')) {
          try {
            await api.post('/bills/send-notification', {
              mobileNumber: targetNumber,
              accountName: bill.accountName,
              billAmount: bill.currentBill,
              dueDate: bill.dueDate,
              sltNumber: sltTelephoneNumber
            })
          } catch (notifErr) {
            console.log('Notification sent (or notification service not configured)')
          }
        } else {
          console.log('[KIOSK] Skipping custom notification as target number is masked/missing')
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
    if (currentStep === 2) {
      setPreferredLanguage("")
    }
    if (currentStep === 3) {
      setSelectedService("")
    }
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const isValidMobile = (m: string) => m.length === 10 && (m.startsWith('07') || m.startsWith('01'))
  const isValidSlt = (s: string) => /^\d{10}$/.test(s) && s.startsWith('0') && !s.startsWith('07')
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  // const canProceedFromStep1 = preferredLanguage !== ''
  // const canProceedFromStep2 = selectedService !== ''
  const canProceedFromStep3 = () => {
    const validDetails = name.trim().length >= 2 && isValidMobile(mobileNumber)
    if (isSltRequiredService(selectedService)) {
      return validDetails && isValidSlt(sltTelephoneNumber)
    }
    return validDetails
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return;
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

      // Validate bill payment intent for bill payment service
      if (isSltRequiredService(selectedService) && sltVerified) {
        if (!billPaymentIntent) {
          setError('Please select your payment preference (full or partial payment)')
          setSubmitting(false)
          return
        }
        if (billPaymentIntent === 'partial') {
          const amount = parseFloat(billPaymentCustomAmount)
          if (!billPaymentCustomAmount || isNaN(amount) || amount <= 0) {
            setError('Please enter a valid payment amount')
            setSubmitting(false)
            return
          }
        }
        if (!billPaymentMethod) {
          setError('Please select a payment method (Cash, Card, Cheque, or Bank Transfer)')
          setSubmitting(false)
          return
        }
      }

      const token = localStorage.getItem('kioskToken')
      if (!token) {
        navigate('/kiosk/login')
        return
      }

      const partialAmount = billPaymentIntent === 'partial' ? parseFloat(billPaymentCustomAmount) : undefined

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
          serviceTypes: [selectedService],
          preferredLanguages: preferredLanguage ? [preferredLanguage] : undefined,
          verifiedMobileToken: tokenForSubmit,
          sltTelephoneNumber: isSltRequiredService(selectedService) ? sltTelephoneNumber || undefined : undefined,
          billPaymentIntent: isSltRequiredService(selectedService) && sltVerified ? billPaymentIntent : undefined,
          billPaymentAmount: partialAmount,
          billPaymentMethod: isSltRequiredService(selectedService) && sltVerified ? billPaymentMethod : undefined,
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
      setSelectedService('')
      setPreferredLanguage('')
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
    setSelectedService('')
    setPreferredLanguage('')
    setOtpStep('idle')
    setOtpCode('')
    setOtpToken('')
    setOtpError('')
    setError('')
    setSltTelephoneNumber('')
    setSltVerified(false)
    setNotificationSent(false)
    setNotificationMessage('')
    setBillData(null)
    setBillPaymentIntent(null)
    setBillPaymentCustomAmount('')
    setBillPaymentMethod(null)
    setCurrentStep(1)
  }

  const translations = {
    en: {
      title: "Digital Queue Management Platform",
      subtitle: "Register to join the queue",
      name: "Full Name",
      mobile: "Mobile Number",
      optionalDetails: "Optional details",
      serviceType: "Service Type",
      billPayment: "Bill Payment",
      newService: "New Service",
      serviceComplaint: "Service Complaint",
      billDispute: "Bill Dispute",
      other: "Other Services",
      register: "Register",
      registering: "Registering...",
      nic: "NIC (Optional)",
      email: "Email (Optional)",
      show: "Show",
      hide: "Hide",
      selectServiceTypes: "Select a service...",
      preferredLanguage: "Preferred Language",
      selectServiceTypesSubtitle: "Choose one service.",
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
      sltTelephonePlaceholder: "011XXXXXXX",
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
      notificationSent: "Notification Sent",
      paymentIntentTitle: "How would you like to pay?",
      payFullAmount: "Pay Full Amount",
      payPartialAmount: "Pay Partial Amount",
      partialAmountLabel: "Enter Amount to Pay (Rs.)",
      partialAmountPlaceholder: "Enter amount",
      partialAmountHint: "Due amount: Rs.",
      paymentIntentRequired: "Please select a payment option",
      paymentMethodTitle: "Payment Method",
      paymentMethodRequired: "Please select a payment method",
      payByCash: "Cash",
      payByCard: "Card",
      payByCheque: "Cheque",
      payByBankTransfer: "Bank Transfer",
      dueAmountNote: "Please ask the account holder to confirm the due amount with the officer at the counter."
    },
    si: {
      title: "ඩිජිටල් පෝලිම කළමනාකරණ වේදිකාව",
      subtitle: "පෝලිමට එක්වීමට ලියාපදිංචි වන්න",
      name: "සම්පූර්ණ නම",
      mobile: "ජංගම දුරකථන අංකය",
      optionalDetails: "විකල්ප විස්තර",
      serviceType: "සේවා වර්ගය",
      billPayment: "බිල් ගෙවීම",
      newService: "නව සේවාව",
      serviceComplaint: "සේවා පැමිණිල්ල",
      billDispute: "බිල්පත් ආරවුල",
      other: "වෙනත් සේවා",
      register: "ලියාපදිංචි වන්න",
      registering: "ලියාපදිංචි වෙමින්...",
      nic: "ජාතික හැදුනුම්පත් අංකය (විකල්ප)",
      email: "ඊමේල් (විකල්ප)",
      show: "පෙන්වන්න",
      hide: "සඟවන්න",
      selectServiceTypes: "සේවාවක් තෝරන්න...",
      preferredLanguage: "භාෂාව තෝරාගන්න",
      selectServiceTypesSubtitle: "සේවාවක් තෝරන්න.",
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
      sltTelephonePlaceholder: "011XXXXXXX",
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
      notificationSent: "දැනුම්දීම යැවිණි",
      paymentIntentTitle: "ඔබ ගෙවීම සිදු කරන්නේ කෙසේද?",
      payFullAmount: "සම්පූර්ණ ගෙවීම",
      payPartialAmount: "අර්ධ ගෙවීම",
      partialAmountLabel: "ගෙවිය යුතු මුදල (රු.)",
      partialAmountPlaceholder: "මුදල ඇතුළත් කරන්න",
      partialAmountHint: "ශේෂ මුදල: රු.",
      paymentIntentRequired: "ගෙවීමේ විකල්පයක් තෝරන්න",
      paymentMethodTitle: "ගෙවීමේ ක්‍රමය",
      paymentMethodRequired: "ගෙවීමේ ක්‍රමයක් තෝරන්න",
      payByCash: "මුදල්",
      payByCard: "කාඩ්",
      payByCheque: "චෙකක්",
      payByBankTransfer: "බැංකු හුවමාරුව",
      dueAmountNote: "ගිණුම් හිමිකරුගෙන් ගෙවිය යුතු නිවැරදි මුදල ශාලාවේ නිලධාරීට ලබා දෙන ලෙස කරුණාකර ඉල්ලා සිටින්න."
    },
    ta: {
      title: "டிஜிட்டல் வரிசை மேலாண்மை தளம்",
      subtitle: "வரிசையில் சேர பதிவு செய்யவும்",
      name: "முழு பெயர்",
      mobile: "மொபைல் எண்",
      optionalDetails: "விருப்ப விவரங்கள்",
      serviceType: "சேவை வகை",
      billPayment: "பில் செலுத்தல்",
      newService: "புதிய சேவை",
      serviceComplaint: "சேவை புகார்",
      billDispute: "பில் சர்ச்சை",
      other: "மற்ற சேவைகள்",
      register: "பதிவு செய்யவும்",
      registering: "பதிவு செய்யப்படுகிறது...",
      nic: "தேசிய அடையாள அட்டை (விருப்பம்)",
      email: "மின்னஞ்சல் (விருப்பம்)",
      show: "காட்டு",
      hide: "மறை",
      selectServiceTypes: "ஒரு சேவையைத் தேர்ந்தெடுக்கவும்...",
      preferredLanguage: "விருப்ப மொழி",
      selectServiceTypesSubtitle: "ஒரு சேவையைத் தேர்வுசெய்க.",
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
      sltTelephonePlaceholder: "011XXXXXXX",
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
      notificationSent: "அறிவிப்பு அனுப்பப்பட்டது",
      paymentIntentTitle: "நீங்கள் எவ்வாறு செலுத்த விரும்புகிறீர்கள்?",
      payFullAmount: "முழு தொகை செலுத்துங்கள்",
      payPartialAmount: "பகுதி தொகை செலுத்துங்கள்",
      partialAmountLabel: "செலுத்த வேண்டிய தொகை (ரூ.)",
      partialAmountPlaceholder: "தொகையை உள்ளிடவும்",
      partialAmountHint: "நிலுவை தொகை: ரூ.",
      paymentIntentRequired: "ஒரு கட்டண விருப்பத்தை தேர்ந்தெடுக்கவும்",
      paymentMethodTitle: "கட்டண முறை",
      paymentMethodRequired: "ஒரு கட்டண முறையை தேர்ந்தெடுக்கவும்",
      payByCash: "பணம்",
      payByCard: "அட்டை",
      payByCheque: "காசோலை",
      payByBankTransfer: "வங்கி பரிமாற்றம்",
      dueAmountNote: "கணக்கு வைத்திருப்பவர் கவுண்டரில் உள்ள அதிகாரியிடம் நிலுவைத் தொகையை உறுதிப்படுத்துமாறு கேட்கவும்."
    }
  }

  const t = translations[language]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 50%, #f3f0ff 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 50%, #f3f0ff 100%)' }}>
      {/* Branch Closed Modal */}
      {branchStatus.isClosed && (
        <BranchClosedModal
          reason={branchStatus.reason}
          activeNotice={branchStatus.activeNotice}
        />
      )}
      {!branchStatus.isClosed && activeNotices.length > 0 && (
        <NoticeModal notices={activeNotices} onDismiss={dismissNotice} />
      )}

      {/* ─── Top Header Bar ─── */}
      <header className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Logos */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <img src={sltLogo} alt="SLT-Mobitel" className="h-8 sm:h-10 w-auto object-contain flex-shrink-0" />
            <div className="h-7 w-px bg-slate-200 flex-shrink-0" />
            <img src="/Transzent Logo.png" alt="Transzent" className="h-14 sm:h-16 w-auto object-contain flex-shrink-0" />
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex-shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-50 border border-red-200 text-red-700 rounded-xl hover:bg-red-100 transition-colors font-semibold"
          >
            {t.logout}
          </button>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex items-start justify-center px-3 sm:px-6 py-4 sm:py-6 overflow-auto">
        <div className="w-full" style={{ maxWidth: '680px' }}>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 sm:px-8 py-4 sm:py-6 text-center">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">{t.title}</h1>
            <p className="text-blue-100 text-xs sm:text-sm">{t.subtitle}</p>
          </div>

          {/* Outlet Info Banner */}
          <div className="bg-blue-50 border-b border-blue-100 px-4 sm:px-8 py-2.5">
            <div className="text-center">
              <div className="text-xs text-gray-500">{t.kiosk}</div>
              <div className="text-sm sm:text-base font-semibold text-gray-800">
                {outlet?.name} - {outlet?.location}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-4 sm:px-8 py-4 sm:py-6">
            {/* Progress Indicator */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-sm font-semibold transition-colors ${currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                        }`}
                    >
                      {step}
                    </div>
                    {step < 4 && (
                      <div
                        className={`w-6 sm:w-12 h-1 mx-0.5 sm:mx-1 transition-colors ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
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
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
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
                          className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm ${preferredLanguage === l.code ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                            }`}
                        >
                          <input
                            type="radio"
                            name="preferredLanguage"
                            value={l.code}
                            checked={preferredLanguage === l.code}
                            onChange={(e) => {
                              const val = e.target.value as "en" | "si" | "ta";
                              setPreferredLanguage(val);
                              setLanguage(val);
                              // Persist to localStorage for other pages
                              try { localStorage.setItem('dq_lang', val); } catch (e) {}
                              // Auto advance to next step after a tiny delay for visual feedback
                              setTimeout(() => goToNextStep(), 300);
                            }}

                            className="w-5 h-5 text-blue-600"
                          />
                          <span className="text-base font-medium">{l.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t.preferredLanguageSubtitle}</p>
                  </div>

                  {/* Next button removed as per user request for auto-advance */}
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
                          className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm ${selectedService === service.code ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                            }`}
                        >
                          <input
                            type="radio"
                            name="service"
                            checked={selectedService === service.code}
                            onChange={() => handleServiceSelect(service.code)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-medium">{getServiceTitle(service.code)}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t.selectServiceTypesSubtitle}</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      {t.back}
                    </button>
                    {/* Next button removed as per user request for auto-advance */}
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
                                  setSltTelephoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                                  setError("")
                                  setSltVerified(false)
                                }}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-xl"
                                placeholder={t.sltTelephonePlaceholder}
                                maxLength={10}
                              />
                            </div>
                            {sltTelephoneNumber.length > 0 && !isValidSlt(sltTelephoneNumber) && (
                              <p className="text-xs text-red-500 mt-1">Enter a valid 10-digit SLT number (e.g. 011XXXXXXX)</p>
                            )}
                            <p className="text-xs text-blue-600 mt-2"> We'll verify your SLT account after you verify your mobile number</p>
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
                          onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s\-'.]/g, ''))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-xl"
                          placeholder={t.name}
                          maxLength={100}
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
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-xl"
                          placeholder="07XXXXXXXX"
                          maxLength={10}
                          required
                        />
                        {mobileNumber.length > 0 && !isValidMobile(mobileNumber) && (
                          <p className="text-xs text-red-500 mt-1">Enter a valid 10-digit number starting with 07 or 01</p>
                        )}
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
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-xl"
                              placeholder="123456789V or 200012345678"
                              maxLength={12}
                            />
                          </div>
                          {nicNumber.length > 0 && !/^\d{9}[VX]$|^\d{12}$/i.test(nicNumber) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid NIC (e.g. 123456789V or 200012345678)</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-xl"
                              placeholder="jason@gmail.com"
                            />
                          </div>
                          {email.length > 0 && !isValidEmail(email) && (
                            <p className="text-xs text-red-500 mt-1">Enter a valid email address</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      {t.back}
                    </button>
                    <button
                      type="button"
                      onClick={goToNextStep}
                      disabled={!canProceedFromStep3()}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">{t.preferredLanguage}</span>
                      <p className="text-sm font-medium text-gray-900">
                        {preferredLanguage === 'en' ? t.english : preferredLanguage === 'si' ? t.sinhala : t.tamil}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">{t.serviceType}</span>
                      <p className="text-sm font-medium text-gray-900">
                        {getServiceTitle(selectedService)}
                      </p>
                    </div>
                    {isSltRequiredService(selectedService) && sltTelephoneNumber && (
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
                  {isSltRequiredService(selectedService) && sltVerified && notificationSent && (
                    <div className={`rounded-lg p-4 border ${isOwnerOfAccount
                      ? 'bg-green-50 border-green-200'
                      : 'bg-blue-50 border-blue-200'
                      }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${isOwnerOfAccount ? 'bg-green-500' : 'bg-blue-500'
                          }`}></div>
                        <span className={`text-sm font-semibold ${isOwnerOfAccount
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
                        <p className="text-xs text-gray-600 bg-white p-2 rounded border border-slate-200 mb-2 flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>The bill details have been sent as an SMS notification to the account holder.</span>
                        </p>
                      )}
                      <p className="text-xs text-gray-600">{t.continueWithYourNumber || 'You can continue with your token generation.'}</p>
                    </div>
                  )}

                  {/* Bill Payment Intent Selection - shown after SLT verification */}
                  {isSltRequiredService(selectedService) && sltVerified && billData && otpStep === 'verified' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <h3 className="text-sm font-semibold text-amber-900">{t.paymentIntentTitle}</h3>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800"> {t.dueAmountNote}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => { setBillPaymentIntent('full'); setBillPaymentCustomAmount('') }}
                          className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${billPaymentIntent === 'full'
                            ? 'border-green-600 bg-green-600 text-white'
                            : 'border-green-300 bg-white text-green-700 hover:border-green-500'}`}
                        >
                          ✓ {t.payFullAmount}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillPaymentIntent('partial')}
                          className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${billPaymentIntent === 'partial'
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-blue-300 bg-white text-blue-700 hover:border-blue-500'}`}
                        >
                          ◑ {t.payPartialAmount}
                        </button>
                        {billPaymentIntent === 'partial' && (
                          <div className="mt-1 space-y-1">
                            <label className="block text-xs font-medium text-gray-700">{t.partialAmountLabel}</label>
                            <input
                              type="number"
                              value={billPaymentCustomAmount}
                              onChange={(e) => setBillPaymentCustomAmount(e.target.value)}
                              min="1"
                              step="0.01"
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={t.partialAmountPlaceholder}
                            />
                          </div>
                        )}
                      </div>

                      {/* Payment Method Selection — shown after intent is chosen */}
                      {billPaymentIntent && (
                        <div className="mt-1 space-y-2">
                          <div className="text-xs font-semibold text-amber-900">{t.paymentMethodTitle}</div>
                          <div className="grid grid-cols-2 gap-2">
                            {(['cash', 'card', 'cheque', 'bank_transfer'] as const).map((method) => {
                              const labels: Record<string, string> = { cash: t.payByCash, card: t.payByCard, cheque: t.payByCheque, bank_transfer: t.payByBankTransfer }
                              const icons: Record<string, React.ReactNode> = { cash: <Banknote className="w-4 h-4" />, card: <CreditCard className="w-4 h-4" />, cheque: <FileText className="w-4 h-4" />, bank_transfer: <Landmark className="w-4 h-4" /> }
                              return (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => setBillPaymentMethod(method)}
                                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-2 ${billPaymentMethod === method
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400'}`}
                                >
                                  <span>{icons[method]}</span>
                                  <span>{labels[method]}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
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

                      {/* Only show submit for non-bill-payment services when OTP is entered */}
                      {!isSltRequiredService(selectedService) && (
                        <button
                          type="submit"
                          disabled={submitting || !selectedService || otpCode.length !== 4}
                          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {submitting ? t.generating : t.generateToken}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Auto-submit feedback — spinner shown once all bill payment selections are made */}
                   {/* Auto-submit feedback — spinner shown once all bill payment selections are made */}
                  {shouldAutoSubmit && otpStep === 'verified' && (isSltRequiredService(selectedService) ? (sltVerified && billPaymentIntent && billPaymentMethod && !(billPaymentIntent === 'partial' && (!billPaymentCustomAmount || parseFloat(billPaymentCustomAmount) <= 0))) : true) && (
                    <div className="w-full bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                       <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                       </svg>
                       {submitting ? t.generating : t.generating}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
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
                        setSelectedService('')
                        setPreferredLanguage('')
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
      </main>

      {/* ─── Footer ─── */}
      <footer className="flex-shrink-0 py-3 text-center">
        <p className="text-xs text-slate-500 font-medium tracking-tight">
          © 2026 SLT-Mobitel Digital Platforms Section
        </p>
      </footer>

      {/* Success Modal */}
      {successToken && (
        <>
          {console.log('Rendering success modal with:', successToken)}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-sm-2xl p-8 max-w-md w-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Token Generated Successfully!</h2>
                <p className="text-gray-600 mb-6">Please remember your token number</p>

                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <div className="text-sm text-slate-500 mb-1">Your Token Number</div>
                  <div className="text-6xl font-bold text-blue-600">
                    {successToken.tokenNumber || 'N/A'}
                  </div>
                  {!successToken.tokenNumber && (
                    <div className="text-sm text-red-600 mt-2">
                      Debug: successToken = {JSON.stringify(successToken)}
                    </div>
                  )}
                </div>

                <div className="text-left bg-slate-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{successToken.customerName}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Services:</span>
                    <div className="text-right">
                      {successToken.serviceTypes.map((code: string) => (
                        <div key={code} className="font-medium text-blue-700">{getServiceTitle(code)}</div>
                      ))}
                    </div>
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
