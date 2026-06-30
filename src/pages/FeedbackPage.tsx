/**
 * FeedbackPage Component
 * 
 * Handles customer feedback submission after service completion.
 * After feedback submission, provides a close button that attempts to close the app
 * without redirecting to external URLs.
 * 
 * Close behavior:
 * 1. Tries to close if opened by another window
 * 2. Attempts to close current window/tab
 * 3. Handles mobile app contexts
 * 4. Detects PWA mode
 * 5. Falls back to browser history
 * 6. Shows manual close instruction as last resort
 */

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Star, MessageSquare, CheckCircle, Send, Clock } from "lucide-react"
import api from "../config/api"
import type { Token } from "../types"
import ServiceName from "../components/ServiceName"

export default function FeedbackPage() {
  const { tokenId } = useParams()
  const [token, setToken] = useState<Token | null>(null)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
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

  const translations = {
    en: {
      thankYou: "Thank You!",
      feedbackSuccess: "Your feedback has been submitted successfully.",
      appreciate: "We appreciate your time and feedback!",
      inputHelps: "Your input helps us improve our services for everyone.",
      closeInstruction: "You can now close this window or navigate away from this page.",
      loading: "Loading...",
      serviceInProgress: "Service in Progress",
      waitComplete: "We'd love your feedback, but please wait until your service is completed!",
      tokenNumber: "Token Number",
      viewStatus: "View Queue Status",
      rateExperience: "Rate Your Experience",
      helpImprove: "Help us improve our service",
      outlet: "Outlet",
      serviceType: "Service Type",
      servedBy: "Served By",
      rateQuestion: "How would you rate your experience?",
      poor: "Poor",
      fair: "Fair",
      good: "Good",
      veryGood: "Very Good",
      excellent: "Excellent",
      commentsLabel: "Additional Comments (Optional)",
      commentsPlaceholder: "Tell us more about your experience...",
      submitButton: "Submit Feedback",
      submitting: "Submitting...",
      privacyNote: "Your feedback helps us improve our services. Thank you for your time.",
      selectRating: "Please select a rating"
    },
    si: {
      thankYou: "ස්තූතියි!",
      feedbackSuccess: "ඔබේ ප්‍රතිපෝෂණය සාර්ථකව ඉදිරිපත් කරන ලදි.",
      appreciate: "ඔබේ කාලය සහ ප්‍රතිපෝෂණය අපි අගය කරමු!",
      inputHelps: "ඔබේ අදහස් අපට සැමට වඩා හොඳ සේවාවක් ලබා දීමට උපකාරී වේ.",
      closeInstruction: "දැන් ඔබට මෙම කවුළුව වසා දැමිය හැක හෝ මෙම පිටුවෙන් ඉවත් විය හැක.",
      loading: "පූරණය වෙමින්...",
      serviceInProgress: "සේවාව ක්‍රියාත්මක වෙමින් පවතී",
      waitComplete: "ඔබේ ප්‍රතිපෝෂණය ලබා ගැනීමට අපි කැමතියි, නමුත් කරුණාකර ඔබේ සේවාව අවසන් වන තෙක් රැඳී සිටින්න!",
      tokenNumber: "ටෝකන් අංකය",
      viewStatus: "පෝලිමේ තත්ත්වය බලන්න",
      rateExperience: "ඔබේ අත්දැකීම අගය කරන්න",
      helpImprove: "අපගේ සේවාව වැඩිදියුණු කිරීමට අපට උදව් කරන්න",
      outlet: "අලෙවිසැල",
      serviceType: "සේවා වර්ගය",
      servedBy: "සේවය කළේ",
      rateQuestion: "ඔබේ අත්දැකීම ඔබ අගය කරන්නේ කෙසේද?",
      poor: "දුර්වල",
      fair: "සාමාන්‍ය",
      good: "හොඳ",
      veryGood: "ඉතා හොඳ",
      excellent: "විශිෂ්ට",
      commentsLabel: "අමතර අදහස් (විකල්ප)",
      commentsPlaceholder: "ඔබේ අත්දැකීම ගැන වැඩි විස්තර අපට පවසන්න...",
      submitButton: "ප්‍රතිපෝෂණය ඉදිරිපත් කරන්න",
      submitting: "ඉදිරිපත් කරමින්...",
      privacyNote: "ඔබේ ප්‍රතිපෝෂණය අපගේ සේවාවන් වැඩිදියුණු කිරීමට උපකාරී වේ. ඔබගේ කාලය වෙනුවෙන් ස්තූතියි.",
      selectRating: "කරුණාකර තක්සේරුවක් තෝරන්න"
    },
    ta: {
      thankYou: "நன்றி!",
      feedbackSuccess: "உங்கள் கருத்து வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது.",
      appreciate: "உங்கள் நேரம் மற்றும் கருத்துக்கு நாங்கள் நன்றி கூறுகிறோம்!",
      inputHelps: "உங்கள் கருத்து அனைவருக்கும் எங்கள் சேவைகளை மேம்படுத்த உதவுகிறது.",
      closeInstruction: "இப்போது நீங்கள் இந்த சாளரத்தை மூடலாம் அல்லது இந்தப் பக்கத்திலிருந்து வெளியேறலாம்.",
      loading: "ஏற்றுகிறது...",
      serviceInProgress: "சேவை நடைபெறுகிறது",
      waitComplete: "நாங்கள் உங்கள் கருத்தை அறிய விரும்புகிறோம், ஆனால் தயவுசெய்து உங்கள் சேவை முடியும் வரை காத்திருங்கள்!",
      tokenNumber: "டோக்கன் எண்",
      viewStatus: "வரிசை நிலையைப் பார்க்கவும்",
      rateExperience: "உங்கள் அனுபவத்தை மதிப்பிடுங்கள்",
      helpImprove: "எங்கள் சேவையை மேம்படுத்த எங்களுக்கு உதவுங்கள்",
      outlet: "கிளை",
      serviceType: "சேவை வகை",
      servedBy: "சேவை செய்தவர்",
      rateQuestion: "உங்கள் அனுபவத்தை எப்படி மதிப்பிடுவீர்கள்?",
      poor: "மோசம்",
      fair: "பரவாயில்லை",
      good: "நல்லது",
      veryGood: "மிகவும் நல்லது",
      excellent: "சிறப்பானது",
      commentsLabel: "கூடுதல் கருத்துக்கள் (விருப்பம்)",
      commentsPlaceholder: "உங்கள் அனுபவத்தைப் பற்றி மேலும் எங்களிடம் கூறுங்கள்...",
      submitButton: "கருத்தைச் சமர்ப்பிக்கவும்",
      submitting: "சமர்ப்பிக்கப்படுகிறது...",
      privacyNote: "உங்கள் கருத்து எங்கள் சேவைகளை மேம்படுத்த உதவுகிறது. உங்கள் நேரத்திற்கு நன்றி.",
      selectRating: "தயவுசெய்து ஒரு மதிப்பீட்டைத் தேர்ந்தெடுக்கவும்"
    }
  }

  const t = translations[language]

  useEffect(() => {
    fetchToken()
  }, [tokenId])

  const fetchToken = async () => {
    try {
      const response = await api.get(`/customer/token/${tokenId}`)
      setToken(response.data.token)

      // Update language from token if available
      if (Array.isArray(response.data.token.preferredLanguages) && response.data.token.preferredLanguages.length > 0) {
        const pref = response.data.token.preferredLanguages[0].toLowerCase()
        if (['en', 'si', 'ta'].includes(pref)) {
          setLanguage(pref as 'en' | 'si' | 'ta')
        } else if (pref === 'english') {
          setLanguage('en')
        } else if (pref === 'sinhala') {
          setLanguage('si')
        } else if (pref === 'tamil') {
          setLanguage('ta')
        }
      }

      // Check if feedback already submitted
      if (response.data.token.feedback) {
        setSubmitted(true)
      }
    } catch (err) {
      console.error("Failed to fetch token:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      alert(t.selectRating)
      return
    }

    setLoading(true)
    try {
      await api.post("/feedback/submit", {
        tokenId,
        serviceType: "overall",
        rating,
        comment: comment.trim() || undefined,
      })

      setSubmitted(true)
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to submit feedback")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t.thankYou}</h1>
          <p className="text-gray-600 mb-4">{t.feedbackSuccess}</p>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <p className="text-green-800 text-sm font-medium">{t.appreciate}</p>
            <p className="text-green-700 text-xs mt-2">{t.inputHelps}</p>
          </div>
          <p className="text-xs text-gray-500 text-center">{t.closeInstruction}</p>
        </motion.div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    )
  }

  // Prevent feedback before service is completed
  if (token.status === "waiting" || token.status === "in_service") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-blue-600" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t.serviceInProgress}</h1>
          <p className="text-gray-600 mb-6">{t.waitComplete}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <p className="text-blue-800 text-sm font-medium">{t.tokenNumber} #{token.tokenNumber}</p>
            <p className="text-blue-700 text-xs mt-2">Redirect to your tracking page to see live updates.</p>
          </div>
          <button
            onClick={() => window.location.href = `/queue/${tokenId}`}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            {t.viewStatus}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.rateExperience}</h1>
          <p className="text-gray-600">{t.helpImprove}</p>
        </div>

        {/* Service Summary */}
        <div className="bg-slate-50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">{t.tokenNumber}</p>
              <p className="font-semibold text-gray-900 text-lg">#{token.tokenNumber}</p>
            </div>
            <div>
              <p className="text-gray-600">{t.outlet}</p>
              <p className="font-semibold text-gray-900">{token.outlet?.name}</p>
            </div>
            <div>
              <p className="text-gray-600">{t.serviceType}</p>
              <div className="font-semibold text-gray-900">
                {Array.isArray(token.serviceTypes) && token.serviceTypes.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {token.serviceTypes.map((stype: string) => (
                      <span key={stype} className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
                        <ServiceName serviceType={stype} />
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">---</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-gray-600">{t.servedBy}</p>
              <p className="font-semibold text-gray-900">{token.officer?.name || "---"}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Rating Selection */}
          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-4 text-center">
              {t.rateQuestion}
            </label>
            <div className="flex items-center justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className="focus:outline-none">
                  <Star
                    className={`w-12 h-12 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300 fill-gray-300"
                    }`}
                  />
                </motion.button>
              ))}
            </div>

            {/* Rating Labels */}
            <div className="flex justify-between mt-4 px-2">
              <span className="text-sm text-gray-500">{t.poor}</span>
              <span className="text-sm text-gray-500">{t.excellent}</span>
            </div>

            {/* Selected Rating Display */}
            {rating > 0 && (
              <div className="text-center mt-4">
                <p className="text-2xl font-bold text-gray-900">
                  {rating === 1
                    ? t.poor
                    : rating === 2
                      ? t.fair
                      : rating === 3
                        ? t.good
                        : rating === 4
                          ? t.veryGood
                          : t.excellent}
                </p>
              </div>
            )}
          </div>

          {/* Comment Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.commentsLabel}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder={t.commentsPlaceholder}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || rating === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            {loading ? t.submitting : t.submitButton}
          </button>
        </form>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 text-center mt-6">
          {t.privacyNote}
        </p>
      </motion.div>
    </div>
  )
}
