"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { User, Phone, Eye, EyeOff } from "lucide-react"
import api from "../config/api"
import type { Outlet } from "../types"
import OTPInput from "../components/OTPInput"
import OTPPopup from "../components/OTPPopup"
import BranchClosedModal from "../components/BranchClosedModal"
import NoticeModal from "../components/NoticeModal"
import MultiTelephoneNumberInput from "../components/MultiTelephoneNumberInput"
import { useBranchStatus } from "../hooks/useBranchStatus"
import { useOutletNotices } from "../hooks/useOutletNotices"

export default function CustomerRegistration() {
  const { outletId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState(outletId || "")

  // Initialize all form fields to empty strings - NEVER use cached values

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
  const [services, setServices] = useState<Array<{ id: string; code: string; title: string; isActive?: boolean; isPriorityService?: boolean; requireOtp?: boolean }>>([])
  const [preferredLanguage, setPreferredLanguage] = useState<string>("")
  // OTP verification states
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>("idle")
  const [otpCode, setOtpCode] = useState("")
  const [otpToken, setOtpToken] = useState<string>("")
  const [otpError, setOtpError] = useState("")
  const [otpSending, setOtpSending] = useState(false)
  const [showOtpPopup, setShowOtpPopup] = useState(false)
  const [devOtpCode, setDevOtpCode] = useState<string>("")
  const [autoSendingOtp, setAutoSendingOtp] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)




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
  // Removed unused single SLT phone number state
  const [_billData, setBillData] = useState<any>(null)
  const [sltVerified, setSltVerified] = useState(false)
  const [billRateLimited, setBillRateLimited] = useState(false) // true = daily limit reached, stop auto-retry
  const [billPaymentIntent, setBillPaymentIntent] = useState<'full' | 'partial' | ''>("")
  const [billPaymentAmount, setBillPaymentAmount] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'cheque' | ''>("")
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false)

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

    setMobileNumber("")
    setSelectedService("")
    setNicNumber("")
    setEmail("")
    setPreferredLanguage("")
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
    setSltTelephoneNumbers([])
    setVerifiedBills([])
    setBillData(null)
    setError("")
    setSltVerified(false)
    setBillPaymentIntent("")
    setBillPaymentAmount("")
    setPaymentMethod("")
    setShouldAutoSubmit(false)

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



  // Auto-send OTP when mobile number is 10 digits (but don't auto-advance for bill payment services)
  useEffect(() => {
    if (currentStep === 3 && mobileNumber.length === 10 && (mobileNumber.startsWith('07') || mobileNumber.startsWith('01'))) {
      const canGetOtp = canReceiveOtp();
      // Only auto-send if OTP is actually required for this service/setting
      if (canGetOtp && effectiveOtpRequired && otpStep === 'idle' && !otpSending && !autoSendingOtp) {
        console.log('Mobile number reached 10 digits and OTP is required, auto-sending OTP...');
        setAutoSendingOtp(true);
        // Small delay to ensure the user sees their number entered
        const timer = setTimeout(() => {
          // Always auto-advance to Step 4 for OTP verification (regardless of service type)
          goToNextStep();
          sendOtp();
          setAutoSendingOtp(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [mobileNumber, currentStep, selectedService])

  // Auto-verify SLT numbers when OTP is disabled and details are filled
  useEffect(() => {
    if (!isSltRequiredService(selectedService)) return
    if (billRateLimited) return // Stop retrying after a 429 – avoids infinite loop
    
    const selectedServiceData = services.find(s => s.code === selectedService)
    const serviceRequiresOtp = selectedServiceData?.requireOtp !== false
    const effectiveOtpRequired = serviceRequiresOtp
    
    if (effectiveOtpRequired) return // OTP verification flow will handle it

    const allSltValid = sltTelephoneNumbers.length > 0 && sltTelephoneNumbers.every(num => isValidSlt(num))
    if (isValidMobile(mobileNumber) && allSltValid && !sltVerified && !loading) {
      console.log('OTP disabled: auto-verifying SLT numbers...')
      verifyAllSltNumbers()
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

  // Track step changes for debugging
  useEffect(() => {
    console.log(`Current Step: ${currentStep}`)
  }, [currentStep])

  // Auto-submit detection for all services after verification
  useEffect(() => {
    if (currentStep !== 4 || otpStep !== 'verified' || !otpToken) {
      setShouldAutoSubmit(false)
      return
    }

    if (selectedService === 'SVC002' || selectedService === 'BILL_PAYMENT') {
      // For bill payment services, require SLT verified + payment intent + payment method
      if (!sltVerified || !billPaymentIntent || !paymentMethod) {
        setShouldAutoSubmit(false)
        return
      }
    }
    
    console.log('SUCCESS: All conditions met, setting auto-submit')
    setShouldAutoSubmit(true)
  }, [selectedService, currentStep, otpStep, otpToken, sltVerified, billPaymentIntent, paymentMethod])

  // Separate useEffect to handle the actual submission when flag is set
  useEffect(() => {
    if (shouldAutoSubmit) {
      console.log('SUBMIT: Triggering auto-submit due to shouldAutoSubmit=true')
      const timer = setTimeout(() => {
        if (formRef.current) {
          formRef.current.dispatchEvent(new Event('submit', { bubbles: true }))
        }
        setShouldAutoSubmit(false) // Reset flag after submission
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [shouldAutoSubmit])

  // Partial payment validation removed


  // Handle service selection
  const handleServiceSelect = (serviceCode: string) => {
    console.log('Selecting service:', serviceCode)
    setSelectedService(serviceCode)
    
    // Check if this specific service requires OTP
    const service = services.find(s => s.code === serviceCode)
    const serviceRequiresOtp = service?.requireOtp === true
    const isBillPayment = isSltRequiredService(serviceCode)
    
    // If OTP is disabled for this service, AND it's NOT a bill payment service,
    // we can submit directly. Otherwise, we go to Step 3 to collect info (Mobile/SLT numbers).
    if (!serviceRequiresOtp && !isBillPayment) {
      // Submit token directly after brief visual feedback
      setTimeout(() => submitDirectRegistration(serviceCode), 300)
    } else {
      // Proceed to Step 3 (Mobile + SLT numbers + optional OTP)
      setTimeout(() => goToNextStep(), 300)
    }
  }

  // Check if service requires SLT number (Bill Payment or Billing Inquiry)
  const isSltRequiredService = (code: string) => {
    return code === 'BILL_PAYMENT' || code === 'SVC002'
  }

  // Get service title by code (localized for the two allowed services)
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

        // Auto-verify SLT numbers after mobile OTP (for bill payment)
        if (isSltRequiredService(selectedService) && sltTelephoneNumbers.length > 0 && !sltVerified) {
          console.log('Auto-verifying all SLT numbers:', sltTelephoneNumbers)
          await verifyAllSltNumbers()
        }

        // Auto-submit only for non-bill-payment services.
        // For bill payment, the user must first select payment intent and method.
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

  // Verify multiple SLT telephone numbers and combine results
  const verifyAllSltNumbers = async () => {
    if (sltTelephoneNumbers.length === 0) {
      setError("Please enter at least one SLT telephone number")
      return
    }

    setLoading(true)
    setError("")
    
    try {
      const verificationResults = []
      const allBills = []
      
      // Verify each SLT number
      for (const sltNumber of sltTelephoneNumbers) {
        console.log('Verifying SLT number:', sltNumber)
        try {
          const response = await api.get(`/bills/verify/${sltNumber}?force=true&mobileNumber=${encodeURIComponent(mobileNumber)}`)
          if (response.data.success && response.data.bill) {
            const bill = response.data.bill
            allBills.push({
              ...bill,
              telephoneNumber: sltNumber
            })
            verificationResults.push({
              sltNumber,
              success: true,
              bill,
              mobileNumber: bill.mobileNumber
            })
            console.log('SUCCESS: SLT verification successful for:', sltNumber)
          } else {
            verificationResults.push({
              sltNumber,
              success: false,
              error: 'No account found'
            })
            console.log('FAILED: SLT verification failed for:', sltNumber)
          }
        } catch (error) {
          const status = (error as any).response?.status
          const errMsg = (error as any).response?.data?.error || 'Verification failed'
          // Bubble up rate-limit errors immediately
          if (status === 429) {
            console.warn('Bill enquiry rate limit reached for this mobile number.')
            setBillRateLimited(true)
            setError(errMsg)
            setSltVerified(false)
            setVerifiedBills([])
            setLoading(false)
            return
          }
          verificationResults.push({
            sltNumber,
            success: false,
            error: errMsg
          })
          console.log('ERROR: SLT verification error for:', sltNumber, error)
        }
      }
      
      // Check if at least one verification was successful
      const successfulVerifications = verificationResults.filter(result => result.success)
      
      if (successfulVerifications.length > 0) {
        // Set verification as successful
        setSltVerified(true)
        setVerifiedBills(allBills)
        
        // Generate combined notification message
        setError("")
        console.log('SUCCESS: All SLT verifications completed:', successfulVerifications.length, 'successful')
      } else {
        // All verifications failed
        setError("No valid accounts found for the provided telephone numbers")
        setSltVerified(false)
        setVerifiedBills([])
        console.log('FAILED: All SLT verifications failed')
      }
      
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 429) {
        // Rate limit hit — expected, handled gracefully
        console.warn('Bill enquiry rate limit reached for this mobile number.')
        setBillRateLimited(true)
        setError(err?.response?.data?.error || t.billEnquiryLimitReached)
      } else {
        console.error('Multiple SLT verification error:', err)
        setError("Failed to verify telephone numbers")
      }
      setSltVerified(false)
      setVerifiedBills([])
    } finally {
      setLoading(false)
    }
  }

  // Direct registration when OTP is disabled
  const submitDirectRegistration = async (serviceCode: string) => {
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/customer/register', {
        name: 'Customer',
        mobileNumber: undefined,
        serviceTypes: [serviceCode],
        outletId: selectedOutlet,
        qrToken,
        verifiedMobileToken: undefined,
        preferredLanguages: preferredLanguage ? [preferredLanguage] : undefined,
      })
      if (response.data.success) {
        clearAllFormData()
        navigate(`/queue/${response.data.token.id}`)
      } else {
        setError('Registration failed. Please try again.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    setShouldAutoSubmit(false) // Reset auto-submit status on manual submit
    
    console.log('SUBMIT: Form submission started', {
      selectedService,
      sltVerified,
      verifiedBills: verifiedBills.length,
      otpStep,
      otpToken: !!otpToken
    })

    try {
      // When OTP is disabled globally AND for the service, skip OTP verification
      let tokenForSubmit: string | undefined = undefined

      if (effectiveOtpRequired) {
        let tok = otpToken
        if (otpStep !== 'verified' || !tok) {
          const vt = await verifyOtp()
          if (!vt) return
          tok = vt
        }
        tokenForSubmit = tok
      } else if (isSltRequiredService(selectedService) && !sltVerified) {
        // If OTP is disabled but SLT is required, verify SLT numbers now (to send due amount SMS)
        console.log('OTP disabled but SLT required - verifying SLT numbers before registration...')
        await verifyAllSltNumbers()
        // We don't block if SLT fails, but we try to send it
      }

      // Payment intent validation removed to simplify flow

      // Log the request data for debugging
      const requestData = {
        name: 'Customer',
        mobileNumber: mobileNumber || undefined,
        nicNumber: nicNumber || undefined,
        email: email || undefined,
        serviceTypes: [selectedService],
        outletId: selectedOutlet,
        qrToken,
        verifiedMobileToken: tokenForSubmit,
        preferredLanguages: preferredLanguage ? [preferredLanguage] : undefined,
        sltTelephoneNumber: isSltRequiredService(selectedService) && sltTelephoneNumbers.length > 0 ? sltTelephoneNumbers[0] : undefined, // Send first SLT number for backward compatibility
        sltTelephoneNumbers: isSltRequiredService(selectedService) ? sltTelephoneNumbers : undefined,
        billPaymentIntent: isSltRequiredService(selectedService) ? billPaymentIntent : undefined,
        billPaymentAmount: isSltRequiredService(selectedService) && billPaymentIntent === 'partial' ? billPaymentAmount : undefined,
        billPaymentMethod: isSltRequiredService(selectedService) ? paymentMethod : undefined,
      }
      
      console.log('SUBMIT: Request data being sent to backend:', JSON.stringify(requestData, null, 2))
      
      const response = await api.post("/customer/register", requestData)
      
      console.log('SUBMIT: Registration API response:', response.data)

      if (response.data.success) {
        console.log('SUCCESS: Registration successful, navigating to queue...')
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
      } else {
        console.log('ERROR: Registration failed - success=false')
        setError('Registration failed. Please try again.')
      }
    } catch (err: any) {
      console.error('ERROR: Registration failed:', err)
      console.log('ERROR: Full error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      })

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
    const newStep = Math.min(currentStep + 1, 3)
    console.log(`Step progression: ${currentStep} → ${newStep}`)
    setCurrentStep(newStep)
  }

  const goToPreviousStep = () => {
    if (currentStep === 2) {
      setPreferredLanguage("")
    }
    if (currentStep === 3) {
      setSelectedService("")
    }
    const newStep = Math.max(currentStep - 1, 1)
    console.log(`Step regression: ${currentStep} → ${newStep}`)
    setCurrentStep(newStep)
  }

  const isValidMobile = (m: string) => m.length === 10 && (m.startsWith('07') || m.startsWith('01'))
  const isValidSlt = (s: string) => /^\d{10}$/.test(s) && s.startsWith('0') && !s.startsWith('07')
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  // Check if user can receive OTP (basic details only)
  const canReceiveOtp = () => {
    return isValidMobile(mobileNumber)
  }

  // Check if basic details are filled to allow sending OTP (mobile + SLT numbers only)
  const canSendOtp = () => {
    const validMobile = isValidMobile(mobileNumber)
    if (selectedService === 'BILL_PAYMENT' || isSltRequiredService(selectedService)) {
      return validMobile && sltTelephoneNumbers.length > 0 && sltTelephoneNumbers.every(num => isValidSlt(num))
    }
    return validMobile
  }

  // Check if final submit is allowed (requires payment selections too for bill payment)
  const canProceedFromStep3 = () => {
    if (!canSendOtp()) return false
    if (selectedService === 'BILL_PAYMENT' || isSltRequiredService(selectedService)) {
      const paymentValid = !!billPaymentIntent && (billPaymentIntent === 'full' || (billPaymentIntent === 'partial' && !!billPaymentAmount)) && !!paymentMethod
      return sltVerified && paymentValid
    }
    return true
  }

  const translations = {
    en: {
      title: "Digital Queue Platform",
      subtitle: "Register to join the queue",

      mobile: "Mobile Number",
      optionalDetails: "Optional details",
      outlet: "Outlet",
      serviceType: "Service Type",
      billPayment: "Bill Payment",
      newService: "New Service",
      serviceComplaint: "Service Complaint",
      billDispute: "Bill Dispute",
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
      paymentIntentTitle: "How would you like to pay?",
      invalidMobile: "Enter a valid 10-digit number starting with 07 or 01",
      invalidSltNumber: "Enter a valid 10-digit SLT number (e.g. 011XXXXXXX)",
      invalidName: "Please enter your full name (at least 2 characters)",
      verifySltAccountNote: "We'll verify your SLT account after you verify your mobile number",
      billEnquiryLimitReached: "Daily bill enquiry limit reached. For your privacy, each mobile number can only request bill details 3 times per day. Please try again tomorrow."
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
      newService: "නව සේවාව",
      serviceComplaint: "සේවා පැමිණිල්ල",
      billDispute: "බිල්පත් ආරවුල",
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
      changeNumber: "වෙනත් අංකයක්",
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
      paymentIntentTitle: "ඔබ ගෙවීම සිදු කරන්නේ කෙසේද?",
      invalidMobile: "07 හෝ 01 න් ආරම්භ වන වලංගු අංක 10 කින් යුත් අංකයක් ඇතුළත් කරන්න",
      invalidSltNumber: "වලංගු අංක 10 කින් යුත් SLT දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 011XXXXXXX)",
      invalidName: "කරුණාකර ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න (අඩුම තරමින් අකුරු 2ක්)",
      verifySltAccountNote: "ඔබ ජංගම දුරකථන අංකය තහවුරු කළ පසු අපි ඔබේ SLT ගිණුම තහවුරු කරන්නෙමු",
      billEnquiryLimitReached: "දෛනික බිල් විමසීමේ සීමාව ළඟා වී ඇත. ඔබේ පෞද්ගලිකත්වය ආරක්ෂා කිරීම සඳහා, සෑම ජංගම අංකයකටම දිනකට 3 වතාවක් පමණ බිල් විස්තර ඉල්ලා ගත හැකිය. හෙට නැවත උත්සාහ කරන්න."
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
      newService: "புதிய சேவை",
      serviceComplaint: "சேவை புகார்",
      billDispute: "பில் சர்ச்சை",
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
      paymentIntentTitle: "நீங்கள் எவ்வாறு செலுத்த விரும்புகிறீர்கள்?",
      invalidMobile: "07 அல்லது 01 இல் ஆரம்பிக்கும் சரியான 10 இலக்க எண்ணை உள்ளிடவும்",
      invalidSltNumber: "சரியான 10 இலக்க SLT எண்ணை உள்ளிடவும் (உதாரணமாக 011XXXXXXX)",
      invalidName: "தயவுசெய்து உங்கள் முழு பெயரை உள்ளிடவும் (குறைந்தது 2 எழுத்துக்கள்)",
      verifySltAccountNote: "உங்கள் மொபைல் எண்ணை சரிபார்த்த பிறகு உங்கள் SLT கணக்கை சரிபார்ப்போம்",
      billEnquiryLimitReached: "தினசரி பில் விசாரணை வரம்பை எட்டிவிட்டது. உங்கள் தனியுரிமையைப் பாதுகாக்க, ஒவ்வொரு மொபைல் எண்ணும் ஒரு நாளைக்கு 3 முறை மட்டுமே பில் விவரங்களைக் கோரலாம். நாளை மீண்டும் முயற்சிக்கவும்."
    }
  }

  const t = translations[language]

  const selectedServiceData = services.find(s => s.code === selectedService)
  const serviceRequiresOtp = selectedServiceData?.requireOtp !== false // Default to true if not specified
  // OTP logic: Only depend on the specific service configuration as per user request
  const effectiveOtpRequired = serviceRequiresOtp;

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
            {/* Top language selector removed as it's redundant with Step 1 */}

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
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold transition-colors ${currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                        }`}
                    >
                      {step}
                    </div>
                    {step < 3 && (
                      <div
                        className={`w-8 sm:w-12 h-1 mx-1 transition-colors ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-gray-500">
                {t.step} {currentStep} {t.of} 3
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
                          className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm ${preferredLanguage === l.code ? "border-blue-600 bg-blue-50" : "border-slate-200"
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
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t.selectServiceTypesSubtitle}</p>
                  </div>

                  {/* Auto-submit feedback — spinner shown once all details are verified */}
                  {shouldAutoSubmit && otpStep === 'verified' && (isSltRequiredService(selectedService) ? sltVerified : true) && (
                    <div className="w-full bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      {loading ? t.registering : t.registering}
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

                        {sltVerified && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                            {/* Payment Intent (Full/Partial) */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                              <label className="block text-sm font-medium text-gray-700">{t.paymentIntentTitle}</label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setBillPaymentIntent('full')}
                                  className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${billPaymentIntent === 'full' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-200'}`}
                                >
                                  {t.payFullAmount}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBillPaymentIntent('partial')}
                                  className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${billPaymentIntent === 'partial' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-200'}`}
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={t.partialAmountPlaceholder}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Payment Method */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
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
                                    className={`py-2 px-2 rounded-lg text-xs font-medium border-2 transition-all ${paymentMethod === m.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-500 hover:border-indigo-100'}`}
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

                  {/* Name field removed as per user request to simplify flow */}

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
                      <p className="text-xs text-red-500 mt-1">{t.invalidMobile}</p>
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
                        type={effectiveOtpRequired ? "button" : "submit"}
                        onClick={effectiveOtpRequired ? sendOtp : undefined}
                        disabled={!qrValid || loading || !canSendOtp() || !selectedOutlet || !selectedService}
                        className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {effectiveOtpRequired ? (otpSending ? t.sendingOTP : t.verify) : (loading ? t.registering : t.register)}
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

                    {shouldAutoSubmit && otpStep === 'verified' && (isSltRequiredService(selectedService) ? sltVerified : true) && (
                      <div className="w-full mt-4 bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        {loading ? t.registering : t.registering}
                      </div>
                    )}

                    {!shouldAutoSubmit && (otpStep === 'sent' || otpStep === 'verified') && (
                      <button
                        type="submit"
                        disabled={
                          !qrValid || 
                          loading || 
                          !selectedOutlet || 
                          !selectedService || 
                          (otpStep === 'sent' && otpCode.length !== 4) ||
                          (otpStep === 'verified' && !canProceedFromStep3())
                        }
                        className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? t.registering : t.register}
                      </button>
                    )}
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
