"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { User, Phone, Eye, EyeOff, Check, Banknote, CreditCard, FileText, Landmark, Send, MessageSquare, CheckCircle } from "lucide-react"
import api from "../config/api"
import type { Outlet } from "../types"
import OTPInput from "../components/OTPInput"
import OTPPopup from "../components/OTPPopup"
import BranchClosedModal from "../components/BranchClosedModal"
import NoticeModal from "../components/NoticeModal"
import { useBranchStatus } from "../hooks/useBranchStatus"
import { useOutletNotices } from "../hooks/useOutletNotices"

export default function CustomerRegistration() {
  const { outletId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState(outletId || "")

  // Initialize all form fields to empty strings - NEVER use cached values
  const [name, setName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [selectedService, setSelectedService] = useState<string>("")
  // Optional fields section toggle
  const [showOptional, setShowOptional] = useState(false)
  const [nicNumber, setNicNumber] = useState("")
  const [email, setEmail] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [language, setLanguage] = useState<"en" | "si" | "ta">("en")
  const [qrToken, setQrToken] = useState<string>("")
  const [qrValid, setQrValid] = useState<boolean>(false)
  const [services, setServices] = useState<Array<{ id: string; code: string; title: string; isActive?: boolean; isPriorityService?: boolean }>>([])
  const [priorityFeatureEnabled, setPriorityFeatureEnabled] = useState(true)
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en')
  // OTP verification states
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>("idle")
  const [otpCode, setOtpCode] = useState("")
  const [otpToken, setOtpToken] = useState<string>("")
  const [otpError, setOtpError] = useState("")
  const [otpSending, setOtpSending] = useState(false)
  const [showOtpPopup, setShowOtpPopup] = useState(false)
  const [devOtpCode, setDevOtpCode] = useState<string>("")
  const [autoSendingOtp, setAutoSendingOtp] = useState(false)
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)


  // Bill payment specific states
  const [sltTelephoneNumber, setSltTelephoneNumber] = useState("")
  const [_billData, setBillData] = useState<any>(null)
  const [sltVerified, setSltVerified] = useState(false)
  const [billPaymentIntent, setBillPaymentIntent] = useState<'full' | 'partial' | null>(null)
  const [billPaymentCustomAmount, setBillPaymentCustomAmount] = useState("")
  const [billPaymentMethod, setBillPaymentMethod] = useState<'cash' | 'card' | 'cheque' | 'bank_transfer' | null>(null)
  const [notificationSent, setNotificationSent] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [isOwnerOfAccount, setIsOwnerOfAccount] = useState(false)


  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1)
  // Branch closed dismissal state

  // Branch status check using the outlet from URL params
  const branchStatus = useBranchStatus(selectedOutlet || outletId || null)
  const { notices: activeNotices, dismiss: dismissNotice } = useOutletNotices(selectedOutlet || outletId || null)

  // Add a form key to force React re-render when needed
  const [formKey, setFormKey] = useState(Date.now())

  // Force clear all form fields whenever component mounts (every time page loads)
  const clearAllFormData = () => {
    console.log('clearAllFormData called - clearing selectedService from:', selectedService)
    setName("")
    setMobileNumber("")
    setSelectedService("")
    setNicNumber("")
    setEmail("")
    setPreferredLanguage('en')
    setError("")
    setLanguage("en")
    setFormKey(Date.now()) // Force form re-render
    setCurrentStep(1) // Reset to first step
    // Reset OTP state
    setOtpStep('idle')
    setOtpCode("")
    setOtpToken("")
    setOtpError("")
    setOtpSending(false)
    // Reset bill payment state
    setSltTelephoneNumber("")
    setBillData(null)
    setError("")
    setSltVerified(false)
    setBillPaymentIntent(null)
    setBillPaymentCustomAmount("")
    setBillPaymentMethod(null)
    setNotificationSent(false)
    setNotificationMessage("")
    setIsOwnerOfAccount(false)

    // Additional browser form clearing
    setTimeout(() => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]')
      inputs.forEach((input: any) => {
        if (input) {
          input.value = ''
          input.autocomplete = 'off'
          input.setAttribute('autocomplete', 'off')
        }
      })
    }, 50)
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
    console.log('CustomerRegistration useEffect - Initial selectedService:', selectedService)
    // IMMEDIATELY clear all form data when page loads - no matter what
    clearAllFormData()

    // Additional aggressive clearing for browser autocomplete
    setTimeout(() => {
      clearAllFormData()
      // Force clear any browser-cached form data
      const form = document.querySelector('form')
      if (form) {
        form.reset()
        // Clear all input values manually
        const inputs = form.querySelectorAll('input')
        inputs.forEach((input: any) => {
          input.value = ''
          input.checked = false
        })
      }
    }, 100)

    // Extra aggressive clearing for service types specifically
    setTimeout(() => {
      setSelectedService("")
    }, 150)

    // Final safety clear
    setTimeout(() => {
      setSelectedService("")
    }, 200)

    // Always fetch outlets and services first
    fetchOutlets()
    fetchServices()
    fetchPriorityFeatureSetting()

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
    // Force clear browser form cache when URL changes
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) {
        form.reset()
        const inputs = form.querySelectorAll('input')
        inputs.forEach((input: any) => {
          input.value = ''
          input.checked = false
        })
      }
    }, 50)

    // Additional aggressive clearing for service types specifically
    setTimeout(() => {
      setSelectedService("")
    }, 100)
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

  // Load services from admin-managed list (active only)
  const fetchServices = async () => {
    try {
      const response = await api.get('/queue/services')
      const data = Array.isArray(response.data) ? response.data : []
      setServices(data.filter((s: any) => s.isActive !== false))
    } catch (err) {
      console.error('Failed to fetch services:', err)
      setServices([])
    }
  }

  const fetchPriorityFeatureSetting = async () => {
    try {
      const response = await api.get('/queue/settings/priority-service')
      setPriorityFeatureEnabled(response.data?.enabled !== false)
    } catch (err) {
      console.error('Failed to fetch priority feature setting:', err)
      setPriorityFeatureEnabled(true)
    }
  }

  const selectedServiceMeta = services.find((service) => service.code === selectedService)

  // Auto-send OTP when mobile number is 10 digits
  useEffect(() => {
    if (currentStep === 3 && mobileNumber.length === 10 && (mobileNumber.startsWith('07') || mobileNumber.startsWith('01'))) {
      const canProceed = canProceedFromStep3();
      if (canProceed && otpStep === 'idle' && !otpSending && !autoSendingOtp) {
        console.log('Mobile number reached 10 digits, auto-sending OTP...');
        setAutoSendingOtp(true);
        // Small delay to ensure the user sees their number entered
        const timer = setTimeout(() => {
          goToNextStep();
          sendOtp();
          setAutoSendingOtp(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [mobileNumber, currentStep])

  // Auto-submit form after OTP verification
  useEffect(() => {
    if (shouldAutoSubmit && otpStep === 'verified' && otpToken) {
      setShouldAutoSubmit(false)
      if (formRef.current) {
        formRef.current.dispatchEvent(new Event('submit', { bubbles: true }))
      }
    }
  }, [shouldAutoSubmit, otpStep, otpToken])


  // Auto-submit for bill payment once intent + method (+ amount if partial) are all set
  useEffect(() => {
    if (!isSltRequiredService(selectedService)) return
    if (!sltVerified || otpStep !== 'verified') return
    if (!billPaymentIntent || !billPaymentMethod) return
    if (billPaymentIntent === 'partial') {
      const amount = parseFloat(billPaymentCustomAmount)
      if (!billPaymentCustomAmount || isNaN(amount) || amount <= 0) return
    }
    const timer = setTimeout(() => {
      if (formRef.current) {
        formRef.current.dispatchEvent(new Event('submit', { bubbles: true }))
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [billPaymentIntent, billPaymentMethod, billPaymentCustomAmount, otpStep, selectedService, sltVerified])


  // Handle service selection
  const handleServiceSelect = (serviceCode: string) => {
    console.log('Selecting service:', serviceCode)
    setSelectedService(serviceCode)
  }

  // Check if service requires SLT number (Bill Payment or Billing Inquiry)
  const isSltRequiredService = (code: string) => {
    return code === 'BILL_PAYMENT' || code === 'SVC002'
  }

  // Get service title by code (localized for the two allowed services)
  const getServiceTitle = (code: string) => {
    // Localize fixed options
    if (code === 'BILL_PAYMENT') {
      // Use translations object later in render cycle via `t`
      // We can't reference `t` here directly before it's defined at call site, so
      // we return a key that will be resolved in render by reading `t`.
      // However since this runs during render (after `t` is defined), accessing `t` is safe.
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return t.billPayment
    }
    if (code === 'OTHERS') {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return t.other
    }
    const service = services.find(s => s.code === code)
    return service?.title || code
  }

  const sendOtp = async (): Promise<boolean> => {
    setOtpError("")
    setOtpSending(true)
    try {
      const response = await api.post("/customer/otp/start", { mobileNumber, preferredLanguage })
      setOtpStep('sent')

      // If dev mode returns the OTP code, show it in a popup AND auto-fill it
      if (response.data?.devCode) {
        const code = response.data.devCode
        setDevOtpCode(code)
        setOtpCode(code)
        setShowOtpPopup(true)

        // Auto-verify after a short delay for "magic" effect
        setTimeout(() => {
          verifyOtp(code)
        }, 1200)
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

        // Auto-submit for non-bill-payment services
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

  // Verify SLT telephone number and fetch bill data with auto-fill
  const verifySltNumber = async () => {
    if (!sltTelephoneNumber) {
      setError("Please enter SLT telephone number")
      return
    }

    /* Removed pattern validation */

    setLoading(true)
    setError("")
    try {
      const response = await api.get(`/bills/verify/${sltTelephoneNumber}`)
      if (response.data.success && response.data.bill) {
        const bill = response.data.bill
        setBillData(bill)
        setSltVerified(true)
        setError("")

        // Determine if the person verifying is the registered owner
        const normalizeForComparison = (num: string) => {
          let n = num.replace(/\D/g, '')
          if (n.startsWith('0')) n = '94' + n.substring(1)
          else if (!n.startsWith('94')) n = '94' + n
          return n
        }
        let isOwner = false
        if (bill.mobileNumber && mobileNumber) {
          isOwner = normalizeForComparison(mobileNumber) === normalizeForComparison(bill.mobileNumber)
        }
        setIsOwnerOfAccount(isOwner)

        const getMaskedPhone = (phone: string) => {
          if (!phone || phone.length < 3) return phone
          return `xxxxxxx${phone.slice(-3)}`
        }

        if (isOwner) {
          setNotificationMessage(`Bill details have been sent to your registered mobile number.`)
        } else {
          setNotificationMessage(`Bill details have been sent to the account holder at ${getMaskedPhone(bill.mobileNumber)}`)
        }
        setNotificationSent(true)

        // Send SMS notification
        try {
          await api.post('/bills/send-notification', {
            mobileNumber: bill.mobileNumber,
            accountName: bill.accountName,
            billAmount: bill.currentBill,
            dueDate: bill.dueDate,
            sltNumber: sltTelephoneNumber,
          })
        } catch {
          // Non-critical
        }
      } else {
        setError("No account found for this telephone number")
      }
    } catch (err: any) {
      console.error('Bill verification error:', err)
      setError(err.response?.data?.error || "Failed to verify telephone number")
      setBillData(null)
      setSltVerified(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // On Register: verify OTP if not already verified and ensure we submit the fresh token
      let tokenForSubmit = otpToken
      if (otpStep !== 'verified' || !tokenForSubmit) {
        const vt = await verifyOtp()
        if (!vt) return
        tokenForSubmit = vt
      }

      // Validate bill payment intent for SLT services
      if (isSltRequiredService(selectedService) && sltVerified) {
        if (!billPaymentIntent) {
          setError('Please select your payment preference (full or partial payment)')
          setLoading(false)
          return
        }
        if (billPaymentIntent === 'partial') {
          const amount = parseFloat(billPaymentCustomAmount)
          if (!billPaymentCustomAmount || isNaN(amount) || amount <= 0) {
            setError('Please enter a valid payment amount')
            setLoading(false)
            return
          }
        }
        if (!billPaymentMethod) {
          setError('Please select a payment method')
          setLoading(false)
          return
        }
      }

      const response = await api.post("/customer/register", {
        name,
        mobileNumber,
        nicNumber: nicNumber || undefined,
        email: email || undefined,
        serviceTypes: [selectedService],
        outletId: selectedOutlet,
        qrToken,
        verifiedMobileToken: tokenForSubmit,
        preferredLanguages: preferredLanguage ? [preferredLanguage] : undefined,
        sltTelephoneNumber: isSltRequiredService(selectedService) ? sltTelephoneNumber || undefined : undefined,
        billPaymentIntent: isSltRequiredService(selectedService) && sltVerified ? billPaymentIntent : undefined,
        billPaymentAmount: isSltRequiredService(selectedService) && billPaymentIntent === 'partial' ? parseFloat(billPaymentCustomAmount) || undefined : undefined,
        billPaymentMethod: isSltRequiredService(selectedService) && sltVerified ? billPaymentMethod : undefined,
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

  // Step navigation functions
  const goToNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const isValidMobile = (m: string) => m.length === 10 && (m.startsWith('07') || m.startsWith('01'))
  const isValidSlt = (s: string) => /^\d{10}$/.test(s) && s.startsWith('0') && !s.startsWith('07')
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const canProceedFromStep1 = preferredLanguage !== ''
  const canProceedFromStep2 = selectedService !== ""
  const canProceedFromStep3 = () => {
    const validDetails = name.trim().length >= 2 && isValidMobile(mobileNumber)
    if (selectedService === 'BILL_PAYMENT' || isSltRequiredService(selectedService)) {
      return validDetails && isValidSlt(sltTelephoneNumber)
    }
    return validDetails
  }

  const translations = {
    en: {
      title: "Digital Queue Platform",
      subtitle: "Register to join the queue",
      name: "Full Name",
      mobile: "Mobile Number",
      optionalDetails: "Optional details",
      outlet: "Outlet",
      serviceType: "Service Type",
      billPayment: "Bill Payment",
      other: "Other Services",
      register: "Generate Token",
      registering: "Generating...",
      sltMobile: "Telephone Number",
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
      noServicesAvailable: "No services available",
      nicPlaceholder: "123456789V or 200012345678",
      preferredLanguageSubtitle: "Select your preferred language for announcements.",
      verify: "Verify Mobile",
      sendingOTP: "Sending OTP...",
      clearForm: "Clear Form",
      changeNumber: "Change number",
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
      verified: "Phone Verified",
      readyToRegister: "Ready to generate your token",
      billSentNotification: "Due amount has been sent to the registered owner ({mobile}). Please ask the owner for the bill details.",
      notificationSent: "Notification Sent",
      continueWithYourNumber: "You can continue with any mobile number to complete the service.",
      dueAmountNote: "Please ask the account holder to confirm the due amount with the officer at the counter.",
      payFullAmount: "Pay Full Amount",
      payPartialAmount: "Pay Partial Amount",
      partialAmountLabel: "Enter Amount to Pay (Rs.)",
      partialAmountPlaceholder: "Enter amount",
      paymentMethodTitle: "Payment Method",
      payByCash: "Cash",
      payByCard: "Card",
      payByCheque: "Cheque",
      payByBankTransfer: "Bank Transfer",
      paymentIntentTitle: "How would you like to pay?"
    },
    si: {
      title: "ඩිජිටල් පෝලිම වේදිකාව",
      subtitle: "පෝලිමට එක්වීමට ලියාපදිංචි වන්න",
      name: "සම්පූර්ණ නම",
      mobile: "ජංගම දුරකථන අංකය",
      optionalDetails: "විකල්ප විස්තර",
      outlet: "ශාඛාව",
      serviceType: "සේවා වර්ගය",
      billPayment: "බිල් ගෙවීම",
      other: "වෙනත් සේවා",
      register: "ටෝකන් උත්පාදනය කරන්න",
      registering: "උත්පාදනය කරමින්...",
      sltMobile: "දුරකථන අංකය",
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
      noServicesAvailable: "සේවා ලබා ගත නොහැක",
      nicPlaceholder: "123456789V හෝ 200012345678",
      preferredLanguageSubtitle: "අறிவிப்புகளுக்கான உங்கள் விருப்ப மொழி தேர்ந்தெடுக்கவும்.",
      verify: "තහවුරු කරන්න",
      sendingOTP: "OTP යවමින්...",
      clearForm: "පෝරමය පැහැදිලි කරන්න",
      changeNumber: "எண்ணை மாற்றவும்",
      sltTelephone: "SLT தொலைபேசி எண்",
      sltTelephonePlaceholder: "011XXXXXXX",
      verifySlt: "எண்ணைச் சரிபார்க்கவும்",
      verifyingSlt: "சரிபார்க்கிறது...",
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
      step1Subtitle: "ප්‍රකාශන සඳහා ඔබගේ කැමති භාෂාව තෝරන්න",
      step2Title: "සේවා තෝරන්න",
      step2Subtitle: "අද ඔබට අවශ්‍ය සේවා මොනවාද?",
      step3Title: "ඔබේ තොරතුරු",
      step3Subtitle: "කරුණාකර ඔබේ විස්තර ලබා දෙන්න",
      step4Title: "සමාලෝචනය සහ ටෝකන් උත්පාදනය",
      step4Subtitle: "ඔබගේ තොරතුරු තහවුරු කර ටෝකන් උත්පාදනය කරන්න",
      enterSltNumber: "ඔබේ SLT දුරකථන අංකය ඇතුළත් කරන්න",
      verifiedAccount: "ගිණුම තහවුරු කර ඇත",
      billSummary: "බිල් සාරාංශය",
      verified: "දුරකථන තහවුරු විය",
      readyToRegister: "ටෝකන් උත්පාදනය කිරීමට සූදානම්",
      billSentNotification: "ගෙවිය යුතු මුදල ලියාපදිංචි අයිතිකරුට ({mobile}) යවා ඇත. කරුණාකර බිල්පතේ විස්තර අයිතිකරුගෙන් විමසන්න.",
      notificationSent: "දැනුම්දීම යැවිණි",
      continueWithYourNumber: "ඔබ ඕනෑම ජංගම අංකයකින් සේවා ඉවරයි කිරීමට ඉදිරියට යා හැක.",
      dueAmountNote: "ගිණුම් හිමිකරුගෙන් ගෙවිය යුතු නිවැරදි මුදල ශාලාවේ නිලධාරීට ලබා දෙන ලෙස කරුණාකර ඉල්ලා සිටින්න.",
      payFullAmount: "සම්පූර්ණ ගෙවීම",
      payPartialAmount: "අර්ධ ගෙවීම",
      partialAmountLabel: "ගෙවිය යුතු මුදල (රු.)",
      partialAmountPlaceholder: "මුදල ඇතුළත් කරන්න",
      paymentMethodTitle: "ගෙවීමේ ක්‍රමය",
      payByCash: "මුදල්",
      payByCard: "කාඩ්",
      payByCheque: "චෙකක්",
      payByBankTransfer: "බැංකු හුළමාරුව",
      paymentIntentTitle: "ඔබ ගෙවීම සිදු කරන්නේ කෙසේද?"
    },
    ta: {
      title: "டிஜிட்டல் வரிசை மேடை",
      subtitle: "வரிசையில் சேர பதிவு செய்யவும்",
      name: "முழு பெயர்",
      mobile: "கைபேசி எண்",
      optionalDetails: "விருப்ப விவரங்கள்",
      outlet: "கிளை",
      serviceType: "சேவை வகை",
      billPayment: "பில் செலுத்துதல்",
      other: "பிற சேவைகள்",
      register: "டோக்கன் உருவாக்கவும்",
      registering: "உருவாக்குகிறது...",
      sltMobile: "தொலைபேசி எண்",
      nic: "தேசிய அடையாள அட்டை எண் (விருப்பம்)",
      email: "மின்னஞ்சல் (விருப்பம்)",
      show: "காட்டு",
      hide: "மறைக்க",
      selectServiceTypes: "ஒரு சேவையைத் தேர்ந்தெடுக்கவும்...",
      preferredLanguage: "விருப்ப மொழி",
      selectServiceTypesSubtitle: "ஒரு சேவையைத் தேர்வுசெய்க.",
      english: "ஆங்கிலம்",
      sinhala: "சிங்களம்",
      tamil: "தமிழ்",
      noServicesAvailable: "சேவைகள் கிடைக்கவில்லை",
      nicPlaceholder: "123456789V  அல்லது  200012345678",
      preferredLanguageSubtitle: "அறிவிப்புகளுக்கான உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்.",
      verify: "சரிபார்க்கவும்",
      sendingOTP: "OTP அனுப்பப்படுகிறது...",
      clearForm: "படிவத்தை அழிக்கவும்",
      changeNumber: "எண்ணை மாற்றவும்",
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
      verified: "தொலைபேசி சரிபார்க்கப்பட்டது",
      readyToRegister: "டோக்கன் உருவாக்க தயாரானது",
      billSentNotification: "செலுத்த வேண்டிய தொகை பதிவு செய்யப்பட்ட உரிமையாளருக்கு ({mobile}) அனுப்பப்பட்டுள்ளது. பில் விவரங்களை உரிமையாளரிடம் கேளுங்கள்.",
      notificationSent: "அறிவிப்பு அனுப்பப்பட்டது",
      continueWithYourNumber: "சேவையை முடிக்க நீங்கள் எந்த மொபைல் எண்ணைக் கொண்டும் தொடரலாம்.",
      dueAmountNote: "கணக்கு வைத்திருப்பவர் கவுண்டரில் உள்ள அதிகாரியிடம் நிலுவைத் தொகையை உறுதிப்படுத்துமாறு கேட்கவும்.",
      payFullAmount: "முழு தொகை செலுத்துங்கள்",
      payPartialAmount: "பகுதி தொகை செலுத்துங்கள்",
      partialAmountLabel: "செலுத்த வேண்டிய தொகை (ரூ.)",
      partialAmountPlaceholder: "தொகையை உள்ளிடவும்",
      paymentMethodTitle: "கட்டண முறை",
      payByCash: "பணம்",
      payByCard: "அட்டை",
      payByCheque: "காசோலை",
      payByBankTransfer: "வங்கி பரிமாற்றம்",
      paymentIntentTitle: "நீங்கள் எவ்வாறு செலுத்த விரும்புகிறீர்கள்?"
    }
  }

  const t = translations[language]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-3 sm:p-4 lg:p-6">
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
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-lg p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="py-14 sm:py-16 flex flex-col items-center justify-center text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <p className="mt-3 text-sm text-gray-700 font-medium">Verifying code and registering your token…</p>
            <p className="mt-1 text-xs text-gray-500">This usually takes just a moment.</p>
          </div>
        ) : (
          <>
            {!qrValid && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                {error || "Please scan the QR code displayed at the branch to proceed."}
              </div>
            )}
            {/* Language Selector */}
            <div className="flex justify-end gap-1 sm:gap-2 mb-4 sm:mb-6">
              <button
                onClick={() => { setLanguage("en"); setPreferredLanguage("en"); }}
                className={`px-2 sm:px-3 py-1 rounded-xl text-xs sm:text-sm font-medium transition-colors ${language === "en" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
              >
                English
              </button>
              <button
                onClick={() => { setLanguage("si"); setPreferredLanguage("si"); }}
                className={`px-2 sm:px-3 py-1 rounded-xl text-xs sm:text-sm font-medium transition-colors ${language === "si" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
              >
                සිංහල
              </button>
              <button
                onClick={() => { setLanguage("ta"); setPreferredLanguage("ta"); }}
                className={`px-2 sm:px-3 py-1 rounded-xl text-xs sm:text-sm font-medium transition-colors ${language === "ta" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
              >
                தமிழ்
              </button>
            </div>

            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{t.title}</h1>
              <p className="text-sm sm:text-base text-gray-600">{t.subtitle}</p>
              {/* Show current outlet just under the headers */}
              {selectedOutlet && (
                <div className="mt-2 text-sm text-gray-700">
                  {(() => {
                    const current = outlets.find((o) => o.id === selectedOutlet)
                    const display = current
                      ? `${current.name} - ${current.location}`
                      : "Loading branch..."
                    return <span>{display}</span>
                  })()}
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold transition-colors ${currentStep >= step
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
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
            )}

            <form ref={formRef} key={formKey} onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" autoComplete="off" data-form-type="other" data-1p-ignore="true" data-bwignore="true" noValidate>

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
                            onChange={(e) => { setPreferredLanguage(e.target.value); setLanguage(e.target.value as "en" | "si" | "ta") }}
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
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                      {t.serviceType}
                      <span className="ml-2 text-xs text-red-500">*Required</span>
                    </label>

                    <div className="space-y-3">
                      {services.map((service) => (
                        <label
                          key={service.id}
                          className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm ${selectedService === service.code ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                            }`}
                        >
                          <input
                            type="radio"
                            name="serviceType"
                            checked={selectedService === service.code}
                            onChange={() => handleServiceSelect(service.code)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-medium">{getServiceTitle(service.code)}</span>
                              {priorityFeatureEnabled && service.isPriorityService && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                  Priority Queue
                                </span>
                              )}
                            </div>
                            {priorityFeatureEnabled && service.isPriorityService && (
                              <p className="text-xs text-amber-700 mt-1">Customers selecting this service are placed first in the waiting queue.</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t.selectServiceTypesSubtitle}</p>
                    {priorityFeatureEnabled && selectedServiceMeta?.isPriorityService && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This is a priority service. Your token will be placed at the front of the waiting queue.
                      </div>
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
                      disabled={!canProceedFromStep2}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                  {(() => {
                    const requiresSlt = isSltRequiredService(selectedService);
                    console.log('Step 3 Service Check:', { selectedService, requiresSlt, isSltRequired: isSltRequiredService });
                    return requiresSlt;
                  })() && (
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

                  {/* Manual Entry Path - Always show name/mobile fields */}
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
                    {name.length > 0 && name.trim().length < 2 && (
                      <p className="text-xs text-red-500 mt-1">Please enter your full name (at least 2 characters)</p>
                    )}
                  </div>

                  {/* Mobile Number Input */}
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
                    </div>
                    {mobileNumber.length > 0 && !isValidMobile(mobileNumber) && (
                      <p className="text-xs text-red-500 mt-1">Enter a valid 10-digit number starting with 07 or 01</p>
                    )}
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
                      {/* NIC Number (optional) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t.nic}</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={nicNumber}
                            onChange={(e) => setNicNumber(e.target.value.toUpperCase())}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-xl"
                            placeholder={t.nicPlaceholder}
                            maxLength={12}
                          />
                        </div>
                        {nicNumber.length > 0 && !/^\d{9}[VX]$|^\d{12}$/i.test(nicNumber) && (
                          <p className="text-xs text-red-500 mt-1">Enter a valid NIC (e.g. 123456789V or 200012345678)</p>
                        )}
                      </div>

                      {/* Email (optional) */}
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
                      className={`flex-1 ${autoSendingOtp ? 'bg-indigo-600' : 'bg-blue-600'} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                      {autoSendingOtp ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          <span>Sending OTP...</span>
                        </>
                      ) : t.next}
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
                  {/* Bill Notification - Show after SLT verified */}
                  {isSltRequiredService(selectedService) && sltVerified && notificationSent && (
                    <div className={`rounded-lg p-4 border ${
                      isOwnerOfAccount ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${isOwnerOfAccount ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        <span className={`text-sm font-semibold ${isOwnerOfAccount ? 'text-green-700' : 'text-blue-700'}`}>
                          {isOwnerOfAccount
                            ? <><CheckCircle className="w-3 h-3 inline-block mr-1" />Bill Confirmed</>
                            : <><Send className="w-3 h-3 inline-block mr-1" />{t.notificationSent}</>
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
                      <p className="text-xs text-gray-600">{t.continueWithYourNumber}</p>
                    </div>
                  )}

                  {/* Bill Payment Intent Selection — shown after SLT verified + OTP verified */}
                  {isSltRequiredService(selectedService) && sltVerified && otpStep === 'verified' && (
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
                          className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                            billPaymentIntent === 'full'
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-green-300 bg-white text-green-700 hover:border-green-500'
                          }`}
                        >
                          ✓ {t.payFullAmount}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillPaymentIntent('partial')}
                          className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                            billPaymentIntent === 'partial'
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-blue-300 bg-white text-blue-700 hover:border-blue-500'
                          }`}
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

                      {/* Payment Method — shown after intent chosen */}
                      {billPaymentIntent && (
                        <div className="space-y-2">
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
                                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-2 ${
                                    billPaymentMethod === method
                                      ? 'border-indigo-600 bg-indigo-600 text-white'
                                      : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400'
                                  }`}
                                >
                                  <span>{icons[method]}</span>
                                  <span>{labels[method]}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Auto-submit feedback spinner */}
                      {billPaymentIntent && billPaymentMethod && !(billPaymentIntent === 'partial' && (!billPaymentCustomAmount || parseFloat(billPaymentCustomAmount) <= 0)) && (
                        <div className="w-full bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          {loading ? t.registering : t.registering}
                        </div>
                      )}
                    </div>
                  )}

                  {/* OTP Verification */}
                  {otpStep === 'idle' && (
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={!qrValid || otpSending || !mobileNumber || !selectedOutlet || !selectedService}
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
                    </div>
                  )}

                  {otpStep === 'verified' && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="flex items-center justify-center gap-1.5 text-green-700 font-medium mb-1"><Check className="w-4 h-4" /> {t.verified || 'Phone Verified'}</p>
                        {otpCode && devOtpCode && (
                          <p className="text-xs text-green-600">Auto-verified for your convenience</p>
                        )}
                      </div>
                    </div>
                  )}



                  {(otpStep === 'sent' || (otpStep === 'verified' && (!isSltRequiredService(selectedService) || loading))) && (
                    <button
                      type="submit"
                      disabled={!qrValid || loading || !selectedOutlet || !selectedService || (otpStep === 'sent' && otpCode.length !== 4)}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? t.registering : t.register}
                    </button>
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
                      onClick={clearAllFormData}
                      className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                    >
                      {t.clearForm}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </>
        )}
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
