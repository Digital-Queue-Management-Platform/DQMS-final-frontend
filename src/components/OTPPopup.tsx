import { useState, useEffect } from "react"
import { X, Copy, Check } from "lucide-react"

interface OTPPopupProps {
  otpCode: string
  onClose: () => void
  autoCloseDuration?: number // in milliseconds
}

export default function OTPPopup({ otpCode, onClose, autoCloseDuration = 30000 }: OTPPopupProps) {
  const [remainingTime, setRemainingTime] = useState(Math.floor(autoCloseDuration / 1000))
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Auto-close timer
    const closeTimer = setTimeout(() => {
      onClose()
    }, autoCloseDuration)

    // Countdown timer for remaining time display
    const countdownInterval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearTimeout(closeTimer)
      clearInterval(countdownInterval)
    }
  }, [autoCloseDuration, onClose])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(otpCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">OTP Code (Demo)</h2>
          <p className="text-sm text-gray-600">
            Use this code to verify your mobile number
          </p>
        </div>

        {/* OTP Code Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Your OTP Code</p>
            <div className="flex items-center justify-center gap-3">
              <div className="text-4xl font-bold text-gray-900 tracking-widest font-mono">
                {otpCode}
              </div>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-6 h-6 text-green-600" />
                ) : (
                  <Copy className="w-6 h-6 text-gray-600" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 mt-2 font-semibold">Copied to clipboard!</p>
            )}
          </div>
        </div>

        {/* Auto-close info */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>Auto-closing in:</span>
          <span className="font-semibold text-blue-600">{remainingTime}s</span>
        </div>

        {/* Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800 text-center">
            <strong>Demo Mode:</strong> In production, OTP will be sent via SMS
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={onClose}
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}
