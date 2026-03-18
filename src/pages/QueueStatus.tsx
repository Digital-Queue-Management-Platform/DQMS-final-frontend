"use client"

import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Users, CheckCircle, AlertTriangle, XCircle, Trash2, ArrowLeft, Banknote, CreditCard, FileText, Landmark } from "lucide-react"
import api, { WS_URL } from "../config/api"
import type { Token } from "../types"
import ServiceName from "../components/ServiceName"

export default function QueueStatus() {
  const { tokenId } = useParams()
  const navigate = useNavigate()
  const [token, setToken] = useState<Token | null>(null)
  const [position, setPosition] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Bill payment states — shown when token is in_service for bill payment services
  const [billData, setBillData] = useState<any>(null)
  const [paymentIntent, setPaymentIntent] = useState<'full' | 'partial' | null>(null)
  const [paymentCustomAmount, setPaymentCustomAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'cheque' | 'bank_transfer' | null>(null)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [language] = useState<'en' | 'si' | 'ta'>(() => {
    try {
      const saved = localStorage.getItem('dq_lang') as 'en' | 'si' | 'ta' | null
      if (saved) return saved
    } catch { }
    const nav = (navigator?.language || 'en').toLowerCase()
    if (nav.startsWith('si')) return 'si'
    if (nav.startsWith('ta')) return 'ta'
    return 'en'
  })

  const translations = {
    en: {
      yourToken: "Your Token Number",
      positionInQueue: "Position in Queue",
      waitTurn: "Please wait for your turn. You will be notified when called.",
      waitPriority: "You have been moved to a priority queue. Please wait to be called.",
      proceedToCounter: "Please Proceed to Counter",
      serviceReady: "Your service is ready to begin",
      servingOfficer: "Serving Officer",
      skippedTitle: "Your turn was skipped",
      skippedMessage: "Please contact the counter or wait until calls your token again.",
      cancelledTitle: "Token Cancelled",
      cancelledMessage: "This token has been cancelled. If this was a mistake, please register again.",
      name: "Name",
      mobile: "Mobile",
      serviceTypes: "Service Types",
      registeredAt: "Registered At",
      cancelToken: "Cancel My Token",
      confirmCancelTitle: "Cancel Token?",
      confirmCancelMsg: "Are you sure you want to leave the queue and cancel your token?",
      yesCancel: "Yes, Cancel",
      keepToken: "No, Keep it",
      backHome: "Back to Home",
      tokenNotFound: "Token not found",
      loading: "Loading...",
      transferredTitle: "Token Transferred & Prioritized",
      transferredWait: "Please wait for Counter {n}. You are in the priority queue.",
      transferredWaitGen: "Your token has been transferred for further processing. Please wait for the next available counter.",
      paymentIntentTitle: "How would you like to pay?",
      payFullAmount: "Pay Full Amount",
      payPartialAmount: "Pay Partial Amount",
      partialAmountLabel: "Enter Amount to Pay (Rs.)",
      partialAmountPlaceholder: "Enter amount",
      partialAmountHint: "Due amount: Rs.",
      paymentMethodTitle: "Payment Method",
      payByCash: "Cash",
      payByCard: "Card",
      payByCheque: "Cheque",
      payByBankTransfer: "Bank Transfer",
      confirmPayment: "Confirm Payment Method",
      paymentConfirmedMsg: "Payment method recorded. Please proceed to the counter.",
      submittingPayment: "Saving..."
    },
    si: {
      yourToken: "ඔබේ ටෝකන් අංකය",
      positionInQueue: "පෝලිමේ ස්ථානය",
      waitTurn: "කරුණාකර ඔබේ වාරය එනතෙක් රැඳී සිටින්න. ඔබව කැඳවූ විට දැනුම් දෙනු ලැබේ.",
      waitPriority: "ඔබ ප්‍රමුඛතා පෝලිමකට මාරු කර ඇත. කරුණාකර කැඳවන තෙක් රැඳී සිටින්න.",
      proceedToCounter: "කරුණාකර කවුන්ටරය වෙත යන්න",
      serviceReady: "ඔබේ සේවාව ආරම්භ කිරීමට සූදානම්",
      servingOfficer: "සේවා නිලධාරියා",
      skippedTitle: "ඔබේ වාරය මඟ හැරී ඇත",
      skippedMessage: "කරුණාකර කවුන්ටරය අමතන්න හෝ නැවත කැඳවන තෙක් රැඳී සිටින්න.",
      cancelledTitle: "ටෝකනය අවලංගු කරන ලදි",
      cancelledMessage: "මෙම ටෝකනය අවලංගු කර ඇත. මෙය වැරදීමක් නම්, කරුණාකර නැවත ලියාපදිංචි වන්න.",
      name: "නම",
      mobile: "ජංගම දුරකථනය",
      serviceTypes: "සේවා වර්ග",
      registeredAt: "ලියාපදිංචි වූ වේලාව",
      cancelToken: "ටෝකනය අවලංගු කරන්න",
      confirmCancelTitle: "ටෝකනය අවලංගු කරන්නද?",
      confirmCancelMsg: "ඔබට පෝලිමෙන් ඉවත් වී ඔබේ ටෝකනය අවලංගු කිරීමට අවශ්‍ය බව සහතිකද?",
      yesCancel: "ඔව්, අවලංගු කරන්න",
      keepToken: "නැත, තබා ගන්න",
      backHome: "මුල් පිටුවට",
      tokenNotFound: "ටෝකනය සොයාගත නොහැකි විය",
      loading: "පූරණය වෙමින්...",
      transferredTitle: "ටෝකනය මාරු කර ප්‍රමුඛතාවය ලබා දී ඇත",
      transferredWait: "කරුණාකර කවුන්ටරය {n} වෙතින් කැඳවන තෙක් රැඳී සිටින්න.",
      transferredWaitGen: "ඔබේ ටෝකනය වැඩිදුර සැකසීම සඳහා මාරු කර ඇත. කරුණාකර ඊළඟ පවතින කවුන්ටරය සඳහා රැඳී සිටින්න.",
      paymentIntentTitle: "ඔබ ගෙවීම සිදු කරන්නේ කෙසේද?",
      payFullAmount: "සම්පූර්ණ ගෙවීම",
      payPartialAmount: "අර්ධ ගෙවීම",
      partialAmountLabel: "ගෙවිය යුතු මුදල (රු.)",
      partialAmountPlaceholder: "මුදල ඇතුළත් කරන්න",
      partialAmountHint: "ශේෂ මුදල: රු.",
      paymentMethodTitle: "ගෙවීමේ ක්‍රමය",
      payByCash: "මුදල්",
      payByCard: "කාඩ්",
      payByCheque: "චෙකක්",
      payByBankTransfer: "බැංකු හුළමාරුව",
      confirmPayment: "ගෙවීමේ ක්‍රමය තහවුරු කරන්න",
      paymentConfirmedMsg: "ගෙවීමේ ක්‍රමය සටහන් කර ඇත. කරුණාකර කවුන්ටරයට යන්න.",
      submittingPayment: "සුරකිමින්..."
    },
    ta: {
      yourToken: "உங்கள் டோக்கன் எண்",
      positionInQueue: "வரிசையில் இடம்",
      waitTurn: "தயவுசெய்து உங்கள் முறை வரும் வரை காத்திருங்கள். அழைக்கும் போது உங்களுக்கு அறிவிக்கப்படும்.",
      waitPriority: "நீங்கள் முன்னுரிமை வரிசைக்கு மாற்றப்பட்டுள்ளீர்கள். தயவுசெய்து அழைக்கும் வரை காத்திருக்கவும்.",
      proceedToCounter: "தயவுசெய்து கவுண்டருக்குச் செல்லவும்",
      serviceReady: "உங்கள் சேவை தொடங்க தயாராக உள்ளது",
      servingOfficer: "சேவை அதிகாரி",
      skippedTitle: "உங்கள் முறை தவிர்க்கப்பட்டது",
      skippedMessage: "தயவுசெய்து கவுண்டரைத் தொடர்பு கொள்ளுங்கள் அல்லது மீண்டும் அழைக்கும் வரை காத்திருங்கள்.",
      cancelledTitle: "டோக்கன் ரத்து செய்யப்பட்டது",
      cancelledMessage: "இந்த டோக்கன் ரத்து செய்யப்பட்டுள்ளது. தவறாக நடந்தால், மீண்டும் பதிவு செய்யவும்.",
      name: "பெயர்",
      mobile: "மொபைல்",
      serviceTypes: "சேவை வகைகள்",
      registeredAt: "பதிவு செய்யப்பட்ட நேரம்",
      cancelToken: "டோக்கனை ரத்து செய்",
      confirmCancelTitle: "டோக்கனை ரத்து செய்யவா?",
      confirmCancelMsg: "நீங்கள் வரிசையில் இருந்து வெளியேறி உங்கள் டோக்கனை ரத்து செய்ய விரும்புகிறீர்களா?",
      yesCancel: "ஆம், ரத்து செய்",
      keepToken: "இல்லை, அப்படியே இருக்கட்டும்",
      backHome: "முகப்புக்குச் செல்ல",
      tokenNotFound: "டோக்கன் கிடைக்கவில்லை",
      loading: "ஏற்றுகிறது...",
      transferredTitle: "டோக்கன் மாற்றப்பட்டு முன்னுரிமை அளிக்கப்பட்டது",
      transferredWait: "தயவுசெய்து கவுண்டர் {n} காத்திருங்கள்.",
      transferredWaitGen: "உங்கள் டோக்கன் மேலதிக செயலாக்கத்திற்கு மாற்றப்பட்டது. தயவுசெய்து அடுத்த கவுண்டருக்காக காத்திருங்கள்.",
      paymentIntentTitle: "நீங்கள் எவ்வாறு செலுத்த விரும்புகிறீர்கள்?",
      payFullAmount: "முழு தொகை செலுத்துங்கள்",
      payPartialAmount: "பகுதி தொகை செலுத்துங்கள்",
      partialAmountLabel: "செலுத்த வேண்டிய தொகை (ரூ.)",
      partialAmountPlaceholder: "தொகையை உள்ளிடவும்",
      partialAmountHint: "நிலுவை தொகை: ரூ.",
      paymentMethodTitle: "கட்டண முறை",
      payByCash: "பணம்",
      payByCard: "அட்டை",
      payByCheque: "காசோலை",
      payByBankTransfer: "வங்கி பரிமாற்றம்",
      confirmPayment: "கட்டண முறையை உறுதிப்படுத்தவும்",
      paymentConfirmedMsg: "கட்டண முறை பதிவு செய்யப்பட்டது. தயவுசெய்து கவுண்டருக்குச் செல்லவும்.",
      submittingPayment: "சேமிக்கிறது..."
    }
  }

  const t = translations[language]

  useEffect(() => {
    fetchTokenStatus()
    const interval = setInterval(fetchTokenStatus, 15000)

    const ws = new WebSocket(WS_URL)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "TOKEN_CALLED" && data.data.id === tokenId) {
        fetchTokenStatus()
      } else if (data.type === "TOKEN_COMPLETED" && data.data.id === tokenId) {
        navigate(`/feedback/${tokenId}`)
      } else if (data.type === "TOKEN_SKIPPED" && data.data.id === tokenId) {
        fetchTokenStatus()
      } else if (data.type === "TOKEN_CANCELLED" && data.data.id === tokenId) {
        fetchTokenStatus()
      }
    }

    return () => {
      clearInterval(interval)
      ws.close()
    }
  }, [tokenId])

  const fetchTokenStatus = async () => {
    try {
      const response = await api.get(`/customer/token/${tokenId}`)
      setToken(response.data.token)
      setPosition(response.data.position)

      if (response.data.token.status === "completed") {
        navigate(`/feedback/${tokenId}`)
      }
    } catch (err) {
      console.error("Failed to fetch token status:", err)
    } finally {
      setLoading(false)
    }
  }

  // Determine if this token requires bill payment selection
  const isBillPaymentToken = (t: Token) =>
    Array.isArray(t.serviceTypes) &&
    t.serviceTypes.some((s) => s === 'BILL_PAYMENT' || s === 'SVC002') &&
    !!t.sltTelephoneNumber

  // Fetch bill data when token transitions to in_service (for bill payment)
  useEffect(() => {
    if (token?.status === 'in_service' && isBillPaymentToken(token) && !billData && !paymentConfirmed) {
      api.get(`/bills/verify/${token.sltTelephoneNumber}`)
        .then((res) => { if (res.data?.success && res.data?.bill) setBillData(res.data.bill) })
        .catch(() => { /* bill data not critical, continue */ })
    }
  }, [token?.status, token?.sltTelephoneNumber])

  // Initialise confirmed state from token if already set
  useEffect(() => {
    if (token?.billPaymentMethod) setPaymentConfirmed(true)
  }, [token?.billPaymentMethod])

  const handleConfirmPayment = async () => {
    if (!paymentIntent || !paymentMethod || !tokenId) return
    setPaymentSubmitting(true)
    try {
      await api.patch(`/customer/token/${tokenId}/payment-method`, {
        billPaymentIntent: paymentIntent,
        billPaymentAmount: paymentIntent === 'partial' ? parseFloat(paymentCustomAmount) || undefined : undefined,
        billPaymentMethod: paymentMethod,
      })
      setPaymentConfirmed(true)
    } catch (err: any) {
      console.error("Failed to save payment method:", err)
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!tokenId) return
    try {
      setCancelling(true)
      await api.post(`/customer/token/${tokenId}/cancel`)
      await fetchTokenStatus()
      setShowCancelConfirm(false)
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to cancel token")
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">{t.loading}</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full border border-gray-100">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-900 font-bold text-lg mb-2">{t.tokenNotFound}</p>
          <button onClick={() => navigate("/")} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mx-auto">
            <ArrowLeft className="w-4 h-4" /> {t.backHome}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Top language selector removed as it's redundant with selection during registration/booking */}

      <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col">
        {/* Header/Branch Title */}
        <div className="p-6 text-center border-b border-gray-100 bg-white">
          <h1 className="text-xl font-extrabold text-blue-900 mb-1">{token.outlet?.name}</h1>
          <p className="text-gray-500 text-sm font-medium">{token.outlet?.location}</p>
        </div>

        {/* Token Card */}
        <div className="p-8">
          <div className={`rounded-2xl p-8 text-center mb-8 shadow-sm transition-all ${token.status === 'cancelled' ? 'bg-gray-100' : 'bg-gradient-to-br from-blue-700 to-indigo-800'}`}>
            <p className={`text-sm font-bold uppercase tracking-widest mb-2 ${token.status === 'cancelled' ? 'text-gray-500' : 'text-blue-100'}`}>{t.yourToken}</p>
            <p className={`text-8xl font-black ${token.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-white'}`}>{token.tokenNumber}</p>
          </div>

          {/* Status Content */}
          <div className="space-y-6">
            {token.status === "waiting" && (
              <>
                {token.isTransferred && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-blue-900 shadow-sm animate-pulse">
                    <div className="flex items-center gap-2 font-bold text-base mb-2">
                      <Users className="w-5 h-5" /> {t.transferredTitle}
                    </div>
                    <div className="text-sm font-medium leading-relaxed">
                      {token.counterNumber
                        ? t.transferredWait.replace("{n}", String(token.counterNumber))
                        : t.transferredWaitGen
                      }
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <div className="bg-slate-50 rounded-2xl p-6 text-center w-full max-w-[280px] border border-gray-100">
                    <Users className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                    <p className="text-xs text-gray-400 uppercase font-black tracking-widest mb-1">{t.positionInQueue}</p>
                    <p className="text-5xl font-black text-slate-900">{position}</p>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-amber-800 text-center text-sm font-bold leading-relaxed">
                    {token.isTransferred ? t.waitPriority : t.waitTurn}
                  </p>
                </div>

                {/* Cancel Button */}
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-4 px-6 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-bold transition-all border border-red-100 group"
                >
                  <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {t.cancelToken}
                </button>
              </>
            )}

            {token.status === "in_service" && (
              <div className="bg-green-50 border border-green-100 rounded-3xl p-8 text-center shadow-sm">
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6 animate-bounce" />
                <p className="text-lg font-bold text-green-900 mb-2">{t.proceedToCounter} <span className="text-4xl block mt-2 text-green-600 font-black">{token.counterNumber}</span></p>
                <p className="text-green-700 font-medium">{t.serviceReady}</p>

                {token.officer && (
                  <div className="mt-8 pt-6 border-t border-green-100">
                    <p className="text-xs text-green-600 uppercase font-black tracking-widest mb-1">{t.servingOfficer}</p>
                    <p className="text-lg font-bold text-green-900">{token.officer.name}</p>
                  </div>
                )}

                {/* Bill Payment method selection — shown after officer calls the customer */}
                {isBillPaymentToken(token) && !paymentConfirmed && (
                  <div className="mt-8 pt-6 border-t border-green-100 text-left">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <h3 className="text-sm font-semibold text-amber-900">{t.paymentIntentTitle}</h3>
                    </div>

                    {billData && (
                      <div className="bg-white rounded-xl p-3 border border-amber-100 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Due Amount</span>
                          <span className="text-base font-bold text-red-600">Rs. {Number(billData.currentBill).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => { setPaymentIntent('full'); setPaymentCustomAmount('') }}
                        className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all text-left ${paymentIntent === 'full' ? 'border-green-600 bg-green-600 text-white' : 'border-green-300 bg-white text-green-700 hover:border-green-500'}`}
                      >
                        ✓ {t.payFullAmount}{billData ? ` — Rs. ${Number(billData.currentBill).toFixed(2)}` : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentIntent('partial')}
                        className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all text-left ${paymentIntent === 'partial' ? 'border-blue-600 bg-blue-600 text-white' : 'border-blue-300 bg-white text-blue-700 hover:border-blue-500'}`}
                      >
                        ◑ {t.payPartialAmount}
                      </button>
                      {paymentIntent === 'partial' && (
                        <div className="mt-1 space-y-1">
                          <label className="block text-xs font-medium text-gray-700">{t.partialAmountLabel}</label>
                          <input
                            type="number"
                            value={paymentCustomAmount}
                            onChange={(e) => setPaymentCustomAmount(e.target.value)}
                            min="1"
                            step="0.01"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t.partialAmountPlaceholder}
                          />
                          {billData && <p className="text-xs text-gray-500">{t.partialAmountHint} {Number(billData.currentBill).toFixed(2)}</p>}
                        </div>
                      )}
                    </div>

                    {paymentIntent && (
                      <div className="space-y-2 mb-4">
                        <div className="text-xs font-semibold text-amber-900">{t.paymentMethodTitle}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {(['cash', 'card', 'cheque', 'bank_transfer'] as const).map((method) => {
                            const labels: Record<string, string> = { cash: t.payByCash, card: t.payByCard, cheque: t.payByCheque, bank_transfer: t.payByBankTransfer }
                            const icons: Record<string, React.ReactNode> = { cash: <Banknote className="w-4 h-4" />, card: <CreditCard className="w-4 h-4" />, cheque: <FileText className="w-4 h-4" />, bank_transfer: <Landmark className="w-4 h-4" /> }
                            return (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setPaymentMethod(method)}
                                className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-2 ${paymentMethod === method ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400'}`}
                              >
                                <span>{icons[method]}</span>
                                <span>{labels[method]}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {paymentIntent && paymentMethod && (
                      <button
                        onClick={handleConfirmPayment}
                        disabled={paymentSubmitting || (paymentIntent === 'partial' && !paymentCustomAmount)}
                        className="w-full py-3 bg-amber-500 text-white rounded-2xl font-black shadow-lg hover:bg-amber-600 transition-all disabled:opacity-50"
                      >
                        {paymentSubmitting ? t.submittingPayment : t.confirmPayment}
                      </button>
                    )}
                  </div>
                )}

                {isBillPaymentToken(token) && paymentConfirmed && (
                  <div className="mt-6 pt-5 border-t border-green-100">
                    <p className="text-sm font-semibold text-green-700">{t.paymentConfirmedMsg}</p>
                  </div>
                )}
              </div>
            )}

            {token.status === "skipped" && (
              <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <p className="text-2xl font-black text-amber-900 mb-2">{t.skippedTitle}</p>
                <p className="text-amber-700 font-medium">{t.skippedMessage}</p>
                <button onClick={() => navigate("/")} className="mt-6 w-full py-3 bg-white border border-amber-200 text-amber-800 rounded-xl font-bold">
                  {t.backHome}
                </button>
              </div>
            )}

            {token.status === "cancelled" && (
              <div className="bg-slate-100 border border-slate-200 rounded-3xl p-8 text-center">
                <XCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-2xl font-black text-slate-800 mb-2">{t.cancelledTitle}</p>
                <p className="text-slate-500 font-medium">{t.cancelledMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Details Footer */}
        <div className="bg-slate-50 p-8 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{t.name}</p>
              <p className="font-bold text-gray-900 text-sm truncate">{token.customer.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{t.mobile}</p>
              <p className="font-bold text-gray-900 text-sm">{token.customer.mobileNumber}</p>
            </div>
            <div className="space-y-2 col-span-2">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{t.serviceTypes}</p>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(token.serviceTypes) && token.serviceTypes.length > 0 ? (
                  token.serviceTypes.map((stype: string) => (
                    <span key={stype} className="px-3 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text- slate-700 shadow-sm">
                      <ServiceName serviceType={stype} />
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">---</span>
                )}
              </div>
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{t.registeredAt}</p>
              <p className="font-bold text-gray-900 text-sm">
                {new Date(token.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
      {showCancelConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-center text-slate-900 mb-3">{t.confirmCancelTitle}</h3>
            <p className="text-center text-slate-500 font-medium mb-8 leading-relaxed">
              {t.confirmCancelMsg}
            </p>
            <div className="space-y-3">
              <button
                disabled={cancelling}
                onClick={handleCancel}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {cancelling ? t.loading : t.yesCancel}
              </button>
              <button
                disabled={cancelling}
                onClick={() => setShowCancelConfirm(false)}
                className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
              >
                {t.keepToken}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
