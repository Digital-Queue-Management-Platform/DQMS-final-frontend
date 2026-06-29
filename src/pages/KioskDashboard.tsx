// Removed unused billData state
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, Eye, EyeOff } from 'lucide-react'
import { API_URL } from '../config/api'
import api from '../config/api'
import OTPInput from '../components/OTPInput'
import OTPPopup from '../components/OTPPopup'
import BranchClosedModal from '../components/BranchClosedModal'
import NoticeModal from '../components/NoticeModal'
import MultiTelephoneNumberInput from '../components/MultiTelephoneNumberInput'
import { useBranchStatus } from '../hooks/useBranchStatus'
import { useOutletNotices } from '../hooks/useOutletNotices'
import { useWebSocket } from '../hooks/useWebSocket'
import { QRCodeSVG } from 'qrcode.react'

interface Service {
  id: string
  code: string
  title: string
  description: string | null
  isPriorityService?: boolean
  requireOtp?: boolean
  collectMobile?: boolean
}

export default function KioskDashboard() {
  const [outlet, setOutlet] = useState<any>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState<"en" | "si" | "ta">("en")
  const [promoVideoUrl, setPromoVideoUrl] = useState<string>('')
  const [showPromo, setShowPromo] = useState<boolean>(true)
  const [qrToken, setQrToken] = useState<string | null>(null)

  // Form state
  const [_name, setName] = useState('')
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
  const [sltTelephoneNumbers, setSltTelephoneNumbers] = useState<string[]>([])
  const [verifiedBills, setVerifiedBills] = useState<Array<{
    id: string;
    telephoneNumber: string;
    accountName: string;
    accountAddress?: string;
    currentBill: number;
    dueDate: string;
    status: string;
    lastPaymentDate?: string;
    mobileNumber?: string;  // Add mobile number property
  }>>([])
  // Legacy state variables (keeping for potential backward compatibility)
  // const [sltTelephoneNumber, setSltTelephoneNumber] = useState("")
  const [sltVerified, setSltVerified] = useState(false)
  const [billRateLimited, setBillRateLimited] = useState(false) // true = daily limit reached, stop auto-retry
  const [billPaymentIntent, setBillPaymentIntent] = useState<'full' | 'partial' | ''>('')
  const [billPaymentAmount, setBillPaymentAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'cheque' | ''>('')
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false)
  // Removed unused billData state
  // Payment intent states removed
  const formRef = useRef<HTMLFormElement>(null)

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1)
  // Branch closed state

  const navigate = useNavigate()

  // Use outlet id from localStorage for branch status check
  const kioskOutletId = (() => { try { const d = localStorage.getItem('kioskOutlet'); return d ? JSON.parse(d)?.id : null } catch { return null } })()
  const branchStatus = useBranchStatus(kioskOutletId)
  const { notices: activeNotices, dismiss: dismissNotice } = useOutletNotices(kioskOutletId)
  const enableBillPaymentOptions = outlet?.displaySettings?.enableBillPaymentOptions === true

  useWebSocket({
    onMessage: (msg) => {
      try {
        if (msg?.type === "QR_UPDATED" && msg?.data) {
          if (outlet && msg.data.outletId === outlet.id) {
            setQrToken(msg.data.token)
          }
        }
        if (msg?.type === "SERVICES_UPDATED") {
          if (kioskOutletId) {
            loadInitialData(kioskOutletId)
          }
        }
      } catch (err) {
        console.error("Error processing websocket message:", err)
      }
    }
  })

  useEffect(() => {
    const token = localStorage.getItem('kioskToken')
    const outletData = localStorage.getItem('kioskOutlet')

    if (!token || !outletData) {
      navigate('/kiosk/login')
      return
    }

    const parsedOutlet = JSON.parse(outletData)
    setOutlet(parsedOutlet)
    loadInitialData(parsedOutlet.id)
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

  // Auto-submit for bill payment removed in favor of manual selection post-verification
  // Auto-send OTP when mobile number reaches 10 valid digits on step 3
  useEffect(() => {
    const selectedServiceData = services.find(s => s.code === selectedService)
    const isOtpRequired = selectedServiceData?.requireOtp === true

    if (currentStep === 3 && mobileNumber.length === 10 && (mobileNumber.startsWith('07') || mobileNumber.startsWith('01'))) {
      if (canSendOtp() && isOtpRequired && otpStep === 'idle' && !otpSending && !autoSendingOtp) {
        setAutoSendingOtp(true);
        const timer = setTimeout(() => {
          goToNextStep();
          sendOtp();
          setAutoSendingOtp(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [mobileNumber, currentStep, selectedService, services])

  // Auto-verify SLT numbers when OTP is disabled and details are filled
  useEffect(() => {
    if (!isSltRequiredService(selectedService)) return
    if (billRateLimited) return // Stop retrying after a 429 – avoids infinite loop
    
    const selectedServiceData = services.find(s => s.code === selectedService)
    const isOtpRequired = selectedServiceData?.requireOtp === true
    
    if (isOtpRequired) return // OTP verification flow will handle it

    const allSltValid = sltTelephoneNumbers.length > 0 && sltTelephoneNumbers.every(num => isValidSlt(num))
    if (isValidMobile(mobileNumber) && allSltValid && !sltVerified && !loading) {
      console.log('OTP disabled: auto-verifying SLT numbers...')
      verifySltNumbers()
    }
  }, [mobileNumber, sltTelephoneNumbers, selectedService, sltVerified, loading, services, billRateLimited])

  // Reset SLT verification status if the numbers are modified
  useEffect(() => {
    setSltVerified(false)
    setVerifiedBills([])
    setBillRateLimited(false) // Allow a fresh attempt when mobile number changes
  }, [mobileNumber])

  useEffect(() => {
    setSltVerified(false)
    setVerifiedBills([])
  }, [sltTelephoneNumbers])

  const loadInitialData = async (currentOutletId: string) => {
    try {
      // Fetch outlet settings including promo video
      try {
        const settingsRes = await api.get('/kiosk/outlet-settings')
        let videoUrl = settingsRes.data.outlet?.displaySettings?.promoVideoUrl
        if (videoUrl) {
          // Auto-fix locally saved URLs if accessing from another device
          const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '') || ''
          if (videoUrl.includes('localhost:') && baseUrl && !baseUrl.includes('localhost:')) {
            videoUrl = videoUrl.replace(/http:\/\/localhost:\d+/, baseUrl)
          }
          setPromoVideoUrl(videoUrl)
          setShowPromo(true)
        } else {
          setShowPromo(false)
        }
        if (settingsRes.data.qrToken) {
          setQrToken(settingsRes.data.qrToken)
        }
      } catch (err) {
        console.error('Failed to load outlet settings:', err)
        setShowPromo(false)
      }

      // Fetch active services from public endpoint (already ordered correctly)
      const response = await api.get(`/queue/services?outletId=${currentOutletId}`)
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
    const selectedServiceData = services.find(s => s.code === serviceCode)
    const collectMobileNumber = selectedServiceData?.collectMobile === true
    const sltRequired = isSltRequiredService(serviceCode)

    if (!collectMobileNumber && !sltRequired) {
      // OTP disabled and NOT a bill payment service: submit token directly after brief visual feedback
      setTimeout(() => submitTokenDirect(serviceCode), 300)
    } else {
      // Proceed to step 3 (mobile, OTP, and/or Bill Payment details)
      setTimeout(() => goToNextStep(), 300)
    }
  }

  const getServiceTitle = (code: string) => {
    const service = services.find(s => s.code === code)
    if (!service) return code
    
    const title = service.title
    const lowerTitle = title.toLowerCase()
    
    // Add translation mapping for known service titles
    if (lowerTitle.includes('fixed') && lowerTitle.includes('bill')) {
      return `${t.fixed} - ${t.billPayment}`
    }
    if (lowerTitle.includes('fixed') && (lowerTitle.includes('other') || lowerTitle.includes('others'))) {
      return `${t.fixed} - ${t.other}`
    }
    if (lowerTitle === 'mobile' || lowerTitle === 'mobile service') {
      return t.mobileService
    }
    
    return title
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
        if (isSltRequiredService(selectedService) && sltTelephoneNumbers.length > 0 && verifiedBills.length === 0) {
          await verifySltNumbers()
        }

        // Auto-submit only for non-bill-payment services.
        // For bill payment, the user must first select payment intent and method, unless disabled.
        if (!isSltRequiredService(selectedService) || !enableBillPaymentOptions) {
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

  // Removed unused getMaskedPhoneNumber function

  // Removed unused normalizeMobileNumber function

  // Verify multiple SLT telephone numbers and send bill notifications
  const verifySltNumbers = async () => {
    if (sltTelephoneNumbers.length === 0) {
      setError("Please enter at least one SLT telephone number")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await api.post('/bills/verify-multiple', {
        telephoneNumbers: sltTelephoneNumbers,
        mobileNumber: mobileNumber
      })
      
      if (response.data.success) {
        const verifiedBills = response.data.results
          .filter((result: any) => result.bill)
          .map((result: any) => result.bill)

        setVerifiedBills(verifiedBills)
        setSltVerified(true)

        // Removed legacy bill data set
      }
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 429) {
        // Rate limit hit — expected, handled gracefully
        console.warn('Bill enquiry rate limit reached for this mobile number.')
        setBillRateLimited(true)
        setError(err?.response?.data?.error || t.billEnquiryLimitReached)
      } else {
        console.error('SLT verification error:', err)
        const errMsg = err?.response?.data?.error || 'Failed to verify SLT numbers. Please try again.'
        setError(errMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Legacy single number verification removed in favor of multi-number approach

  // Step navigation functions
  const goToNextStep = () => {
    const newStep = Math.min(currentStep + 1, 3)
    setCurrentStep(newStep)
  }

  const goToPreviousStep = () => {
    if (currentStep === 2) {
      if (promoVideoUrl) {
        setShowPromo(true)
        setPreferredLanguage("")
        setLanguage("en")
        setCurrentStep(1)
        return
      }
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

  // Check if basic details are filled to allow sending OTP (mobile + SLT numbers only)
  const canSendOtp = () => {
    const validMobile = isValidMobile(mobileNumber)
    if (isSltRequiredService(selectedService)) {
      return validMobile && sltTelephoneNumbers.length > 0 && sltTelephoneNumbers.every(num => isValidSlt(num))
    }
    return validMobile
  }

  // Check if final submit is allowed (requires payment selections too for bill payment)
  const canProceedFromStep3 = () => {
    if (!canSendOtp()) return false
    if (isSltRequiredService(selectedService)) {
      if (!enableBillPaymentOptions) return sltVerified
      const paymentValid = !!billPaymentIntent && (billPaymentIntent === 'full' || (billPaymentIntent === 'partial' && !!billPaymentAmount)) && !!paymentMethod
      return sltVerified && paymentValid
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)

    try {
      // When OTP is required, verify OTP if not already verified
      const selectedServiceData = services.find(s => s.code === selectedService)
      const isOtpRequired = selectedServiceData?.requireOtp === true

      let tokenForSubmit = otpToken
      if (isOtpRequired) {
        if (otpStep !== 'verified' || !tokenForSubmit) {
          const vt = await verifyOtp()
          if (!vt) {
            setSubmitting(false)
            return
          }
          tokenForSubmit = vt
        }
      }

      await generateToken(selectedService, mobileNumber || undefined, tokenForSubmit || undefined)
    } catch (err: any) {
      setError(err.message || 'Failed to create token')
    } finally {
      setSubmitting(false)
    }
  }

  // Direct token generation when OTP is disabled
  const submitTokenDirect = async (serviceCode: string) => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await generateToken(serviceCode, undefined, undefined)
    } catch (err: any) {
      setError(err.message || 'Failed to create token')
    } finally {
      setSubmitting(false)
    }
  }

  const generateToken = async (serviceCode: string, mobile?: string, verifiedToken?: string) => {
    const kioskJwt = localStorage.getItem('kioskToken')
    if (!kioskJwt) {
      navigate('/kiosk/login')
      return
    }

    const response = await fetch(`${API_URL}/kiosk/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kioskJwt}`,
      },
      body: JSON.stringify({
        name: 'Customer',
        mobileNumber: mobile,
        serviceTypes: [serviceCode],
        preferredLanguages: preferredLanguage ? [preferredLanguage] : undefined,
        verifiedMobileToken: verifiedToken,
        sltTelephoneNumbers: isSltRequiredService(serviceCode) ? sltTelephoneNumbers : undefined,
        billPaymentIntent: isSltRequiredService(serviceCode) ? billPaymentIntent || undefined : undefined,
        billPaymentAmount: isSltRequiredService(serviceCode) && billPaymentIntent === 'partial' ? billPaymentAmount : undefined,
        billPaymentMethod: isSltRequiredService(serviceCode) ? paymentMethod || undefined : undefined,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create token')
    }

    setSuccessToken(data.token)

    // Reset form
    setMobileNumber('')
    setNicNumber('')
    setEmail('')
    setSelectedService('')
    setPreferredLanguage('')
    setOtpStep('idle')
    setOtpCode('')
    setOtpToken('')
    setBillPaymentIntent('')
    setBillPaymentAmount('')
    setPaymentMethod('')
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
    setSltTelephoneNumbers([])
    setVerifiedBills([])
    setSltVerified(false)
    setBillPaymentIntent('')
    setBillPaymentAmount('')
    setPaymentMethod('')
    setCurrentStep(1)
    if (promoVideoUrl) {
      setShowPromo(true)
    }
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
      newService: "New Service",
      serviceComplaint: "Service Complaint",
      billDispute: "Bill Dispute",
      other: "Other Services",
      fixed: "Fixed",
      mobileService: "Mobile",
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
      dueAmountNote: "Please ask the account holder to confirm the due amount with the officer at the counter.",
      invalidMobile: "Enter a valid 10-digit number starting with 07 or 01",
      invalidSltNumber: "Enter a valid 10-digit SLT number (e.g. 011XXXXXXX)",
      invalidName: "Please enter your full name (at least 2 characters)",
      verifySltAccountNote: "We'll verify your SLT account after you verify your mobile number",
      billEnquiryLimitReached: "Daily bill enquiry limit reached. For your privacy, each mobile number can only request bill details 3 times per day. Please try again tomorrow.",
      pleaseWait: "Please wait...",
      tokenGeneratedSuccess: "Token Generated Successfully!",
      rememberTokenNumber: "Please remember your token number",
      yourTokenNumber: "Your Token Number",
      servicesLabel: "Services:",
      timeLabel: "Time:",
      generateAnotherTokenAction: "Generate Another Token"
    },
    si: {
      title: "ඩිජිටල් පෝලිම වේදිකාව",
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
      fixed: "ස්ථාවර",
      mobileService: "ජංගම",
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
      dueAmountNote: "ගිණුම් හිමිකරුගෙන් ගෙවිය යුතු නිවැරදි මුදල ශාලාවේ නිලධාරීට ලබා දෙන ලෙස කරුණාකර ඉල්ලා සිටින්න.",
      invalidMobile: "07 හෝ 01 න් ආරම්භ වන වලංගු අංක 10 කින් යුත් අංකයක් ඇතුළත් කරන්න",
      invalidSltNumber: "වලංගු අංක 10 කින් යුත් SLT දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 011XXXXXXX)",
      invalidName: "කරුණාකර ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න (අඩුම තරමින් අකුරු 2ක්)",
      verifySltAccountNote: "ඔබ ජංගම දුරකථන අංකය තහවුරු කළ පසු අපි ඔබේ SLT ගිණුම තහවුරු කරන්නෙමු",
      billEnquiryLimitReached: "දෛනික බිල් විමසීමේ සීමාව ළඟා වී ඇත. ඔබේ පෞද්ගලිකත්වය ආරක්ෂා කිරීම සඳහා, සෑම ජංගම අංකයකටම දිනකට 3 වතාවක් පමණ බිල් විස්තර ඉල්ලා ගත හැකිය. හෙට නැවත උත්සාහ කරන්න.",
      pleaseWait: "කරුණාකර රැඳී සිටින්න...",
      tokenGeneratedSuccess: "ටෝකනය සාර්ථකව ජනනය කරන ලදී!",
      rememberTokenNumber: "කරුණාකර ඔබගේ ටෝකන් අංකය මතක තබා ගන්න",
      yourTokenNumber: "ඔබගේ ටෝකන් අංකය",
      servicesLabel: "සේවාවන්:",
      timeLabel: "වේලාව:",
      generateAnotherTokenAction: "තවත් ටෝකනයක් ජනනය කරන්න"
    },
    ta: {
      title: "டிஜிட்டல் வரிசை தளம்",
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
      fixed: "நிலையான",
      mobileService: "மொபைல்",
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
      dueAmountNote: "கணக்கு வைத்திருப்பவர் கவுண்டரில் உள்ள அதிகாரியிடம் நிலுவைத் தொகையை உறுதிப்படுத்துமாறு கேட்கவும்.",
      invalidMobile: "07 அல்லது 01 இல் ஆரம்பிக்கும் சரியான 10 இலக்க எண்ணை உள்ளிடவும்",
      invalidSltNumber: "சரியான 10 இலக்க SLT எண்ணை உள்ளிடவும் (உதாரணமாக 011XXXXXXX)",
      invalidName: "தயவுசெய்து உங்கள் முழு பெயரை உள்ளிடவும் (குறைந்தது 2 எழுத்துக்கள்)",
      verifySltAccountNote: "உங்கள் மொபைல் எண்ணை சரிபார்த்த பிறகு உங்கள் SLT கணக்கை சரிபார்ப்போம்",
      billEnquiryLimitReached: "தினசரி பில் விசாரணை வரம்பை எட்டிவிட்டது. உங்கள் தனியுரிமையைப் பாதுகாக்க, ஒவ்வொரு மொபைல் எண்ணும் ஒரு நாளைக்கு 3 முறை மட்டுமே பில் விவரங்களைக் கோரலாம். நாளை மீண்டும் முயற்சிக்கவும்.",
      pleaseWait: "தயவுசெய்து காத்திருக்கவும்...",
      tokenGeneratedSuccess: "டோக்கன் வெற்றிகரமாக உருவாக்கப்பட்டது!",
      rememberTokenNumber: "தயவுசெய்து உங்கள் டோக்கன் எண்ணை நினைவில் கொள்ளுங்கள்",
      yourTokenNumber: "உங்கள் டோக்கன் எண்",
      servicesLabel: "சேவைகள்:",
      timeLabel: "நேரம்:",
      generateAnotherTokenAction: "மற்றொரு டோக்கனை உருவாக்குங்கள்"
    }
  }

  const t = translations[language]
  const selectedServiceData = services.find(s => s.code === selectedService)
  const isOtpRequired = selectedServiceData?.requireOtp === true

  // Idle timer logic
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>

    const resetIdleTimer = () => {
      clearTimeout(idleTimer)
      // Reset after 60 seconds of inactivity
      idleTimer = setTimeout(() => {
        if (!successToken) {
          setShowPromo(true)
          // Reset form state to Step 1
          setCurrentStep(1)
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
          setSltTelephoneNumbers([])
          setVerifiedBills([])
          setSltVerified(false)
          setBillPaymentIntent('')
          setBillPaymentAmount('')
          setPaymentMethod('')
        }
      }, 60000)
    }

    if (!showPromo && !successToken) {
      window.addEventListener('mousemove', resetIdleTimer)
      window.addEventListener('touchstart', resetIdleTimer)
      window.addEventListener('keypress', resetIdleTimer)
      window.addEventListener('click', resetIdleTimer)
      resetIdleTimer()
    }

    return () => {
      clearTimeout(idleTimer)
      window.removeEventListener('mousemove', resetIdleTimer)
      window.removeEventListener('touchstart', resetIdleTimer)
      window.removeEventListener('keypress', resetIdleTimer)
      window.removeEventListener('click', resetIdleTimer)
    }
  }, [showPromo, promoVideoUrl, successToken])

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

  if (showPromo && promoVideoUrl) {
    return (
      <div 
        className="fixed inset-0 w-full h-full bg-black z-50 overflow-hidden flex flex-col items-center justify-center"
      >
        <video 
          src={promoVideoUrl} 
          autoPlay 
          loop 
          muted 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-32 pb-8 px-6 sm:px-12 z-10 flex flex-col sm:flex-row items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end w-full sm:w-auto">
            {qrToken && outlet?.id && (
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-3 border-2 border-white/50 transition-transform hover:scale-105">
                <div className="bg-white p-2 rounded-xl">
                  <QRCodeSVG
                    value={`${window.location.origin}/register/${outlet.id}?qr=${encodeURIComponent(qrToken)}`}
                    size={140}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center">
                  <span className="text-blue-900 font-extrabold text-sm uppercase tracking-widest block">Scan to Join</span>
                  <span className="text-blue-700 font-semibold text-xs tracking-wider">From Mobile</span>
                </div>
              </div>
            )}
            <div className="text-left">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-2 drop-shadow-lg tracking-tight">
                Digital Queue Platform
              </h1>
              <p className="text-lg sm:text-2xl text-blue-300 font-medium mb-3 drop-shadow">
                Register to join the queue
              </p>
              <div className="h-px w-full max-w-sm bg-white/30 mb-3"></div>
              <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow">
                Walk-in Token Generation
              </h2>
              <p className="text-sm sm:text-lg text-gray-300 font-medium">
                {outlet?.name} {outlet?.location ? `- ${outlet.location}` : ''}
              </p>
            </div>
          </div>
          
          <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-3 pb-2">
            <p className="text-white/90 font-medium text-sm sm:text-lg mb-1 drop-shadow-md">Select Language to Begin</p>
            <div className="flex flex-wrap justify-center sm:justify-end gap-3 sm:gap-4">
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                      await document.documentElement.requestFullscreen()
                    }
                  } catch (err) {
                    console.error("Fullscreen request failed", err)
                  }
                  setPreferredLanguage('en')
                  setLanguage('en')
                  setShowPromo(false)
                  setCurrentStep(2)
                }}
                className="text-lg sm:text-xl text-white font-bold tracking-wide drop-shadow-xl bg-blue-600/90 hover:bg-blue-500/90 px-6 sm:px-8 py-3 sm:py-4 rounded-full backdrop-blur-sm border border-white/50 shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-transform hover:scale-105 active:scale-95"
              >
                English
              </button>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                      await document.documentElement.requestFullscreen()
                    }
                  } catch (err) {
                    console.error("Fullscreen request failed", err)
                  }
                  setPreferredLanguage('si')
                  setLanguage('si')
                  setShowPromo(false)
                  setCurrentStep(2)
                }}
                className="text-lg sm:text-xl text-white font-bold tracking-wide drop-shadow-xl bg-blue-600/90 hover:bg-blue-500/90 px-6 sm:px-8 py-3 sm:py-4 rounded-full backdrop-blur-sm border border-white/50 shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-transform hover:scale-105 active:scale-95"
              >
                සිංහල
              </button>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                      await document.documentElement.requestFullscreen()
                    }
                  } catch (err) {
                    console.error("Fullscreen request failed", err)
                  }
                  setPreferredLanguage('ta')
                  setLanguage('ta')
                  setShowPromo(false)
                  setCurrentStep(2)
                }}
                className="text-lg sm:text-xl text-white font-bold tracking-wide drop-shadow-xl bg-blue-600/90 hover:bg-blue-500/90 px-6 sm:px-8 py-3 sm:py-4 rounded-full backdrop-blur-sm border border-white/50 shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-transform hover:scale-105 active:scale-95"
              >
                தமிழ்
              </button>
            </div>
          </div>
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
      {/* Standard notices – dismissable, only shown when branch is open */}
      {!branchStatus.isClosed && activeNotices.length > 0 && (
        <NoticeModal notices={activeNotices} onDismiss={dismissNotice} />
      )}
      {/* Top language switcher removed as it's redundant with Step 1. Logout button preserved. */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          {/* Logos */}
          <div className="flex items-center gap-4 sm:gap-6">
            <img src="/logo.png" alt="SLT-Mobitel Logo" className="h-8 sm:h-10 object-contain" />
            <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
            <img src="/Transzent Logo.png" alt="Transzent Logo" className="h-[80px] sm:h-[90px] object-contain hidden sm:block -my-6" />
          </div>
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium shrink-0"
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
                {(() => {
                  const selectedServiceData = services.find(s => s.code === selectedService)
                  const collectMobileNumber = selectedServiceData?.collectMobile === true
                  const sltRequired = isSltRequiredService(selectedService)
                  const totalSteps = (collectMobileNumber || sltRequired) ? 3 : 2

                  return Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                    <div key={step} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold transition-colors ${currentStep >= step
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                          }`}
                      >
                        {step}
                      </div>
                      {step < totalSteps && (
                        <div
                          className={`w-8 sm:w-12 h-1 mx-1 transition-colors ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        />
                      )}
                    </div>
                  ))
                })()}
              </div>
              <p className="text-xs text-center text-gray-500">
                {(() => {
                  const selectedServiceData = services.find(s => s.code === selectedService)
                  const collectMobileNumber = selectedServiceData?.collectMobile === true
                  const sltRequired = isSltRequiredService(selectedService)
                  const totalSteps = (collectMobileNumber || sltRequired) ? 3 : 2
                  return `${t.step} ${currentStep} ${t.of} ${totalSteps}`
                })()}
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
                  </div>
                </div>
              )}

              {/* STEP 3: Customer Information — only shown when OTP or SLT details are required */}
              {currentStep === 3 && ((services.find(s => s.code === selectedService)?.collectMobile === true) || isSltRequiredService(selectedService)) && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t.step3Title}</h2>
                    <p className="text-sm text-gray-600">{t.step3Subtitle}</p>
                  </div>

                  {/* Bill Payment Path - Collect SLT Numbers, Intent, and Method */}
                  {isSltRequiredService(selectedService) && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-900 mb-3">{t.enterSltNumber}</h3>
                        <MultiTelephoneNumberInput
                          telephoneNumbers={sltTelephoneNumbers}
                          onTelephoneNumbersChange={setSltTelephoneNumbers}
                          verifiedBills={verifiedBills}
                          onVerifiedBillsChange={setVerifiedBills}
                          language={language}
                          autoVerify={false}
                          maxNumbers={10}
                          disabled={false}
                        />
                        <p className="text-xs text-blue-600 mt-2">{t.verifySltAccountNote}</p>
                      </div>

                      {sltVerified && enableBillPaymentOptions && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                          {/* Payment Intent (Full/Partial) */}
                          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
                            <label className="block text-sm font-medium text-gray-700">{t.paymentIntentTitle}</label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setBillPaymentIntent('full')}
                                className={`py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${billPaymentIntent === 'full' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-200'}`}
                              >
                                {t.payFullAmount}
                              </button>
                              <button
                                type="button"
                                onClick={() => setBillPaymentIntent('partial')}
                                className={`py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${billPaymentIntent === 'partial' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-200'}`}
                              >
                                {t.payPartialAmount}
                              </button>
                            </div>

                            {billPaymentIntent === 'partial' && (
                              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{t.partialAmountLabel}</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={billPaymentAmount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^\d+(\.\d{0,2})?$/.test(val)) {
                                      setBillPaymentAmount(val);
                                    }
                                  }}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder={t.partialAmountPlaceholder}
                                />
                              </div>
                            )}
                          </div>

                          {/* Payment Method */}
                          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
                            <label className="block text-sm font-medium text-gray-700">{t.paymentMethodTitle}</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'cash', label: t.payByCash },
                                { id: 'card', label: t.payByCard },
                                { id: 'cheque', label: t.payByCheque }
                              ].map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setPaymentMethod(m.id as any)}
                                  className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${paymentMethod === m.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-500 hover:border-indigo-100'}`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Entry Path - Always show for non-bill-payment OR after entering SLT number */}
                  <div className="space-y-4">
                    {/* Name field removed as per user request */}

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
                          <p className="text-xs text-red-500 mt-1">{t.invalidMobile}</p>
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

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      {t.back}
                    </button>
                    {otpStep === 'idle' && (
                      <button
                        type="button"
                        onClick={isOtpRequired ? sendOtp : () => generateToken(selectedService, mobileNumber)}
                        disabled={submitting || (isOtpRequired ? otpSending : false) || (isOtpRequired ? !canSendOtp() : !canProceedFromStep3()) || !selectedService}
                        className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isOtpRequired ? (otpSending ? t.sendingOTP : t.verify) : (submitting ? t.pleaseWait : t.generateToken)}
                      </button>
                    )}
                  </div>

                  {/* OTP Verification & Submit elements natively shown in Step 3 */}
                  <div className="space-y-4">
                    {/* verification alerts removed as per user request to streamline flow */}
                    {otpStep === 'sent' && (
                      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
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
                    )}

                    {/* Manual button hidden when OTP verified - auto-submit takes over */}
                    {!shouldAutoSubmit && (otpStep === 'sent' || otpStep === 'verified') && (
                      <button
                        type="submit"
                        disabled={submitting || !selectedService || (otpStep === 'sent' && otpCode.length !== 4) || (otpStep === 'verified' && isSltRequiredService(selectedService) && (!sltVerified || !billPaymentIntent || !paymentMethod))}
                        className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {submitting ? t.generating : t.generateToken}
                      </button>
                    )}

                    {/* Auto-submit feedback spinner */}
                    {shouldAutoSubmit && otpStep === 'verified' && (isSltRequiredService(selectedService) ? (verifiedBills.length > 0) : true) && (
                      <div className="w-full mt-4 bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        {submitting ? t.generating : t.generating}
                      </div>
                    )}

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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-sm-2xl p-8 max-w-md w-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.tokenGeneratedSuccess}</h2>
                <p className="text-gray-600 mb-6">{t.rememberTokenNumber}</p>

                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <div className="text-sm text-slate-500 mb-1">{t.yourTokenNumber}</div>
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

                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">{t.servicesLabel}</span>
                    <div className="text-right">
                      {successToken.serviceTypes.map((code: string) => (
                        <div key={code} className="font-medium text-blue-700">{getServiceTitle(code)}</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.timeLabel}</span>
                    <span className="font-medium">{new Date(successToken.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <button
                  onClick={closeSuccessModal}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  {t.generateAnotherTokenAction}
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

      {/* Footer Copyright */}
      <div className="mt-8 text-center text-sm text-slate-500 pb-6 flex flex-col items-center gap-3">
        <p>&copy; 2026 SLT-Mobitel Digital Platforms Section</p>
        <div className="flex items-center gap-2 sm:hidden opacity-50">
          <span className="text-xs">Powered by</span>
          <img src="/Transzent Logo.png" alt="Transzent Logo" className="h-[60px] object-contain -mt-5 -mb-5" />
        </div>
      </div>
    </div>
  )
}
