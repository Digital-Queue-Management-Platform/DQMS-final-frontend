// Removed unused billData state
"use client"

import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, MapPin, Phone, AlertTriangle, Ban } from "lucide-react"
import api from "../config/api"
import type { Outlet } from "../types"
import OTPInput from "../components/OTPInput"
import OTPPopup from "../components/OTPPopup"
import BranchClosedModal from "../components/BranchClosedModal"
import NoticeModal from "../components/NoticeModal"
import MultiTelephoneNumberInput from "../components/MultiTelephoneNumberInput"
import { useBranchStatus } from "../hooks/useBranchStatus"
import { useOutletNotices } from "../hooks/useOutletNotices"

interface Service {
  id: string
  code: string
  title: string
  description?: string
  isActive?: boolean
  isPriorityService?: boolean
  requireOtp?: boolean
}

export default function AppointmentBooking() {
  const navigate = useNavigate()
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [outletId, setOutletId] = useState("")
  // Name unused, passing externally
  const [mobileNumber, setMobileNumber] = useState("")
  const [selectedService, setSelectedService] = useState<string>('')
  const [datetime, setDatetime] = useState("") // yyyy-MM-ddTHH:mm

  const [advanceApptRequired, setAdvanceApptRequired] = useState(true)

  // Get minimum date/time
  const getMinDateTime = () => {
    const now = new Date()
    // Add 24 hours if advanced appointment is required, else just a small 5 min buffer
    const minTime = new Date(now.getTime() + (advanceApptRequired ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000))
    const year = minTime.getFullYear()
    const month = String(minTime.getMonth() + 1).padStart(2, '0')
    const day = String(minTime.getDate()).padStart(2, '0')
    const hours = String(minTime.getHours()).padStart(2, '0')
    const minutes = String(minTime.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Validate appointment time
  const isValidAppointmentTime = (datetimeStr: string) => {
    if (!datetimeStr) return true
    const selectedTime = new Date(datetimeStr)
    const now = new Date()
    const hoursUntil = (selectedTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return advanceApptRequired ? hoursUntil >= 24 : hoursUntil >= 0
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
  const [preferredLanguage, setPreferredLanguage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // OTP state
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>("idle")
  const [otpCode, setOtpCode] = useState("")
  const [otpToken, setOtpToken] = useState<string>("")
  const [otpError, setOtpError] = useState("")
  const [otpSending, setOtpSending] = useState(false)
  const [autoSendingOtp, setAutoSendingOtp] = useState(false)
  const [showOtpPopup, setShowOtpPopup] = useState(false)
  const [devOtpCode, setDevOtpCode] = useState<string>("")
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false)
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
  // Legacy state variables (keeping for potential backward compatibility)
  // const [sltTelephoneNumber, setSltTelephoneNumber] = useState("")
  // Removed unused billData state
  // Removed unused billData state
  // Payment intent state variables removed

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1)
  // Branch closed dismissal (for "right now" status modal on AppointmentBooking)
  const [closedDismissed, setClosedDismissed] = useState(false)
  const branchStatus = useBranchStatus(outletId || null)
  const { notices: activeNotices, dismiss: dismissNotice } = useOutletNotices(outletId || null)
  // Error shown when selected appointment date/time is on a closed day
  const [closedOnDateError, setClosedOnDateError] = useState<string | null>(null)
  const [checkingDate, setCheckingDate] = useState(false)

  useEffect(() => {
    fetchOutlets()
    fetchServices()
    fetchAdvanceApptSetting()
  }, [])

  const fetchAdvanceApptSetting = async () => {
    try {
      const res = await api.get('/queue/settings/advance-appointment')
      setAdvanceApptRequired(res.data?.enabled !== false)
    } catch (e) {
      console.error('Failed to load advance appointment setting:', e)
      setAdvanceApptRequired(true)
    }
  }

  // Auto-advance from step 3 when mobile number is complete
  useEffect(() => {
    if (currentStep === 3 && isValidMobile(mobileNumber) && canProceedFromStep3() && otpStep === 'idle' && !otpSending && !autoSendingOtp) {
      setAutoSendingOtp(true);
      const timer = setTimeout(async () => {
        await goToNextStep();
        setAutoSendingOtp(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [mobileNumber, currentStep])

  // Auto-send OTP when entering step 4
  useEffect(() => {
    if (currentStep === 4 && otpStep === 'idle' && !otpSending && isValidMobile(mobileNumber)) {
      const timer = setTimeout(() => {
        sendOtp();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentStep, otpStep])

  // Auto-submit form after OTP verification (non-SLT services)
  useEffect(() => {
    if (shouldAutoSubmit && otpStep === 'verified' && otpToken) {
      setShouldAutoSubmit(false)
      if (formRef.current) {
        formRef.current.dispatchEvent(new Event('submit', { bubbles: true }))
      }
    }
  }, [shouldAutoSubmit, otpStep, otpToken])

  // Interactive validation for closure checks
  useEffect(() => {
    if (currentStep !== 3 || !datetime || !outletId || !isValidAppointmentTime(datetime)) {
      setClosedOnDateError(null)
      return
    }

    let isMounted = true
    const validateDate = async () => {
      setCheckingDate(true)
      setClosedOnDateError(null)
      try {
        const dt = new Date(datetime)
        const res = await api.get(`/branch-status/${outletId}`, { params: { at: dt.toISOString() } })
        if (isMounted && res.data?.isClosed) {
          setClosedOnDateError(res.data.reason || "The branch is closed on the selected date/time.")
        }
      } catch {
        if (isMounted) console.warn('Branch status check failed; allowing step proceed')
      } finally {
        if (isMounted) setCheckingDate(false)
      }
    }

    const timer = setTimeout(validateDate, 600)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [datetime, outletId, currentStep])

  // Auto-submit for bill payment after SLT verification
  useEffect(() => {
    if (selectedService === 'SVC002' || selectedService === 'BILL_PAYMENT') {
      if (verifiedBills.length > 0 && otpStep === 'verified') {
        const timer = setTimeout(() => {
          if (formRef.current) {
            formRef.current.dispatchEvent(new Event('submit', { bubbles: true }))
          }
        }, 800)
        return () => clearTimeout(timer)
      }
    }
  }, [selectedService, verifiedBills, otpStep])

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
        const activeServices = res.data.filter((s: Service) => s.isActive !== false)
        setServices(activeServices)
      }
    } catch (e) {
      console.error('Failed to load services:', e)
      setServices([])
    }
  }



  const isSltRequiredService = (code: string) => {
    // SVC002 and BILL_PAYMENT require SLT telephone number
    return code === 'SVC002' || code === 'BILL_PAYMENT'
  }

  const handleServiceSelect = (code: string) => {
    setSelectedService(code)
    // Always advance to step 3 (booking details) regardless of OTP setting
    setTimeout(() => goToNextStep(), 300)
  }

  const getServiceTitle = (code: string) => {
    // Check by code first
    const upperCode = code.toUpperCase()
    if (upperCode === 'BILL_PAYMENT') return t.billPayment
    if (upperCode === 'OTHERS' || upperCode === 'OTHER') return t.others
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
    if (title.includes('other')) return t.others

    return service.title
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
      newService: 'New Service',
      serviceComplaint: 'Service Complaint',
      billDispute: 'Bill Dispute',
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
      notificationSent: "Notification Sent",
      paymentIntentTitle: "Payment Details",
      payFullAmount: "Pay Full Amount",
      payPartialAmount: "Partial Payment",
      partialAmountLabel: "Enter Partial Amount (Rs.)",
      partialAmountPlaceholder: "Enter amount",
      partialAmountHint: "Max:",
      paymentMethodTitle: "Select Payment Method",
      payByCash: "Cash",
      payByCard: "Card",
      payByCheque: "Cheque",
      payByBankTransfer: "Bank Transfer",
      dueAmountNote: "Please ask the account holder to confirm the due amount with the officer at the counter."
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
      newService: 'නව සේවාව',
      serviceComplaint: 'සේවා පැමිණිල්ල',
      billDispute: 'බිල්පත් ආරවුල',
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
      notificationSent: "දැනුම්දීම යවා ඇත",
      paymentIntentTitle: "ගෙවීම් විස්තර",
      payFullAmount: "සම්පූර්ණ ගෙවීම",
      payPartialAmount: "අර්ධ ගෙවීම",
      partialAmountLabel: "අර්ධ මුදල ඇතුළත් කරන්න (රු.)",
      partialAmountPlaceholder: "මුදල ඇතුළත් කරන්න",
      partialAmountHint: "උපරිම:",
      paymentMethodTitle: "ගෙවීම් ක්‍රමය තෝරන්න",
      payByCash: "මුදල්",
      payByCard: "කාඩ්",
      payByCheque: "චෙක්",
      payByBankTransfer: "බැංකු හැරීම",
      dueAmountNote: "ගිණුම් හිමිකරුගෙන් ගෙවිය යුතු නිවැරදි මුදල ශාලාවේ නිලධාරීට ලබා දෙන ලෙස කරුණාකර ඉල්ලා සිටින්න."
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
      newService: 'புதிய சேவை',
      serviceComplaint: 'சேவை புகார்',
      billDispute: 'பில் சர்ச்சை',
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
      notificationSent: "அறிவிப்பு அனுப்பப்பட்டது",
      paymentIntentTitle: "கட்டண விவரங்கள்",
      payFullAmount: "முழு தொகை செலுத்து",
      payPartialAmount: "பகுதி கட்டணம்",
      partialAmountLabel: "பகுதி தொகையை உள்ளிடவும் (ரூ.)",
      partialAmountPlaceholder: "தொகையை உள்ளிடவும்",
      partialAmountHint: "அதிகபட்சம்:",
      paymentMethodTitle: "கட்டண முறையைத் தேர்வுசெய்க",
      payByCash: "பணம்",
      payByCard: "அட்டை",
      payByCheque: "காசோலை",
      payByBankTransfer: "வங்கி பரிமாற்றம்",
      dueAmountNote: "கணக்கு வைத்திருப்பவர் கவுண்டரில் உள்ள அதிகாரியிடம் நிலுவைத் தொகையை உறுதிப்படுத்துமாறு கேட்கவும்."
    },
  } as const

  const t = translations[language]
  const selectedServiceData = services.find(s => s.code === selectedService)
  const serviceRequiresOtp = selectedServiceData?.requireOtp !== false

  const sendOtpWithCheck = async () => {
    setClosedOnDateError(null)
    setCheckingDate(true)
    const closedMsg = await checkAppointmentDateClosed()
    setCheckingDate(false)
    if (closedMsg) {
      setClosedOnDateError(closedMsg)
      return // Block progression
    }
    await sendOtp()
  }

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
        if (isSltRequiredService(selectedService) && sltTelephoneNumbers.length > 0 && verifiedBills.length === 0) {
          await verifySltNumbers()
        }

        // Auto-submit enabled for all services
        setShouldAutoSubmit(true)

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

        // Removed legacy bill data set
      }
    } catch (err: any) {
      console.error('SLT verification error:', err)
      const errMsg = err?.response?.data?.error || 'Failed to verify SLT numbers. Please try again.'
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  // Legacy single number verification removed in favor of multi-number approach

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      // Only enforce OTP when the specific service requires it
      let tokenForSubmit: string | undefined = undefined
      if (serviceRequiresOtp) {
        let tok = otpToken
        if (otpStep !== 'verified' || !tok) {
          const vt = await verifyOtp()
          if (!vt) {
            setLoading(false)
            return
          }
          tok = vt
        }
        tokenForSubmit = tok
      }

      // Convert datetime-local to ISO
      const appointmentAt = new Date(datetime)
      if (Number.isNaN(appointmentAt.getTime())) {
        setError('Please select a valid date and time')
        return
      }

      // Final validation: verify time requirement (backend will also check)
      if (!isValidAppointmentTime(datetime)) {
        setError(advanceApptRequired ? t.minBookingTime : "Appointments cannot be booked in the past.")
        return
      }

      const res = await api.post('/appointment/book', {
        name: 'Customer',
        mobileNumber: mobileNumber || undefined,
        outletId,
        serviceTypes: [selectedService],
        preferredLanguage,
        appointmentAt: appointmentAt.toISOString(),
        verifiedMobileToken: tokenForSubmit,
        sltTelephoneNumbers: isSltRequiredService(selectedService) ? sltTelephoneNumbers : undefined,
        billPaymentIntent: undefined,
        billPaymentAmount: undefined,
        billPaymentMethod: undefined,
        billPaymentCustomAmounts: undefined,
      })

      if (res.data?.success) {
        setSuccess('Appointment booked successfully! You will be auto-added to the queue on the day.')
        // Navigate to "My Appointments" page (only when mobile was collected)
        setTimeout(() => {
          if (mobileNumber) {
            navigate(`/appointment/my?mobileNumber=${mobileNumber}`)
          } else {
            navigate('/')
          }
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
    // Client-side Saturday ≥ 12:30 PM check REMOVED as requested.
    // Branch status is now controlled dynamically via 'Closure Notices' on the backend.
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
    setCurrentStep(prev => Math.min(prev + 1, 3))
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

  // const canProceedFromStep1 = preferredLanguage !== ''
  // const canProceedFromStep2 = selectedService !== ''
  const canProceedFromStep3 = () => {
    const hasBasicInfo = outletId && datetime && isValidMobile(mobileNumber) && isValidAppointmentTime(datetime) && !closedOnDateError && !checkingDate
    if (isSltRequiredService(selectedService)) {
      return hasBasicInfo && sltTelephoneNumbers.length > 0 && sltTelephoneNumbers.every(num => isValidSlt(num))
    }
    return hasBasicInfo
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm sticky top-0 z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          {/* Logos */}
          <div className="flex items-center gap-4 sm:gap-6">
            <img src="/logo.png" alt="SLT-Mobitel Logo" className="h-8 sm:h-10 object-contain" />
            <div className="w-px h-8 bg-slate-300 hidden sm:block"></div>
            <img src="/Transzent Logo.png" alt="Transzent Logo" className="h-[80px] sm:h-[90px] object-contain hidden sm:block -my-6" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          {/* Branch Closed Modal */}
          {outletId && branchStatus.isClosed && !closedDismissed && (
            <BranchClosedModal
              reason={branchStatus.reason}
              activeNotice={branchStatus.activeNotice}
              onDismiss={() => setClosedDismissed(true)}
            />
          )}
          {/* Standard notices – dismissable */}
          {outletId && !branchStatus.isClosed && activeNotices.length > 0 && (
            <NoticeModal notices={activeNotices} onDismiss={dismissNotice} />
          )}

          <div className="bg-white rounded-xl shadow-xl w-full p-6">
        {/* Top language selector removed as it's redundant with Step 1 */}

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.title}</h1>
        <p className="text-sm text-gray-600 mb-6">{t.subtitle}</p>

        {/* Progress Indicator */}
        {!success && (
          <div className="mb-6">
            <div className="flex justify-center items-center gap-2 mb-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold ${currentStep === step
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
              Step {currentStep} of 3
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

        <form ref={formRef} onSubmit={handleBook} className="space-y-4">

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
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400 ${preferredLanguage === l.code ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                        }`}
                    >
                      <input
                        type="radio"
                        name="preferredLanguage"
                        value={l.code}
                        checked={preferredLanguage === l.code}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPreferredLanguage(val);
                          setLanguage(val as 'en' | 'si' | 'ta');
                          try { localStorage.setItem('dq_lang', val) } catch { }
                          // Auto advance to next step after a tiny delay for visual feedback
                          setTimeout(() => goToNextStep(), 300);
                        }}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-base font-medium">{l.label}</span>
                    </label>
                  ))}
                </div>
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
                  {t.serviceTypesLabel}
                </label>

                <div className="space-y-3">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400 ${selectedService === service.code ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
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
                          <span className="text-base font-medium">
                            {getServiceTitle(service.code)}
                          </span>
                        </div>
                      </div>
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
                {/* Next button removed as per user request for auto-advance */}
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

              {/* Bill Payment - Collect SLT Numbers (will verify after mobile OTP) */}
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
                    <p className="text-xs text-blue-600 mt-2">{t.enterSltNumber}</p>
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${datetime && !isValidAppointmentTime(datetime)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                      }`}
                    required
                  />
                </div>
                {datetime && !isValidAppointmentTime(datetime) && (
                  <p className="flex items-center gap-1.5 text-sm text-red-600 mt-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {t.minBookingTime}</p>
                )}
              </div>

              {/* Customer Details - only shown when OTP is required */}
              {serviceRequiresOtp && (
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
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder={t.mobilePh}
                        maxLength={10}
                        required
                      />
                    </div>
                    {mobileNumber.length > 0 && !isValidMobile(mobileNumber) && (
                      <p className="text-xs text-red-500 mt-1">Enter a valid 10-digit number starting with 07 or 01</p>
                    )}
                  </div>
                </div>
              )}

              {/* Closed-date error */}
              {closedOnDateError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <Ban className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{closedOnDateError}</span>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  {t.back}
                </button>
                {!serviceRequiresOtp ? (
                  <button
                    type="submit"
                    disabled={loading || !outletId || !datetime || !isValidAppointmentTime(datetime) || !!closedOnDateError}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? t.booking : t.book}
                  </button>
                ) : (
                  otpStep === 'idle' && (
                    <button
                      type="button"
                      onClick={sendOtpWithCheck}
                      disabled={otpSending || !canProceedFromStep3()}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {checkingDate ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          Checking…
                        </>
                      ) : otpSending ? t.sendingOTP : t.verify}
                    </button>
                  )
                )}
              </div>

                {/* verification alerts removed as per user request to streamline flow */}
                <div className="space-y-4">
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
                    </div>
                  )}

                  {/* Manual button hidden when OTP verified - auto-submit takes over */}
                  {!shouldAutoSubmit && (otpStep === 'sent' || otpStep === 'verified') && (
                    <button
                      type="submit"
                      disabled={loading || !selectedService || (otpStep === 'sent' && otpCode.length !== 4)}
                      className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? t.booking : t.step4Subtitle}
                    </button>
                  )}

                {/* Auto-submit feedback spinner */}
                {shouldAutoSubmit && otpStep === 'verified' && (isSltRequiredService(selectedService) ? (verifiedBills.length > 0) : true) && (
                  <div className="w-full mt-4 bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    {loading ? t.booking : t.booking}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
      </div>
      </div>

      {/* OTP Popup for Demo Mode */}
      {showOtpPopup && devOtpCode && (
        <OTPPopup
          otpCode={devOtpCode}
          onClose={() => setShowOtpPopup(false)}
          autoCloseDuration={30000}
        />
      )}

      {/* Footer Copyright */}
      <div className="w-full text-center text-sm text-slate-500 pb-6 pt-4 mt-auto flex flex-col items-center gap-3">
        <p>&copy; 2026 SLT-Mobitel Digital Platforms Section</p>
        <div className="flex items-center gap-2 sm:hidden opacity-50">
          <span className="text-xs">Powered by</span>
          <img src="/Transzent Logo.png" alt="Transzent Logo" className="h-[60px] object-contain -mt-5 -mb-5" />
        </div>
      </div>
    </div>
  )
}
