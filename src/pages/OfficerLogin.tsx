"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, LogIn, KeyRound } from "lucide-react"
import api from "../config/api"

export default function OfficerLogin() {
  const navigate = useNavigate()
  const [mobileNumber, setMobileNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState<"mobile" | "otp">("mobile")
  const [officerName, setOfficerName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/officer/request-otp", { mobileNumber })

      if (response.data.success) {
        setOfficerName(response.data.officerName)
        setStep("otp")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/officer/login", { mobileNumber, otpCode })

      if (response.data.success) {
        // Store officer data and token in localStorage
        localStorage.setItem("officer", JSON.stringify(response.data.officer))
        if (response.data.token) {
          localStorage.setItem("officerToken", response.data.token)
        }
        navigate("/officer/queue")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleBackToMobile = () => {
    setStep("mobile")
    setOtpCode("")
    setError("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="rounded-xl sm:rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-100 border-2 border-yellow-300 w-full max-w-sm sm:max-w-md p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-yellow-100 rounded-full mb-3 sm:mb-4">
            {step === "mobile" ? (
              <LogIn className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
            ) : (
              <KeyRound className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Officer Login</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {step === "mobile" 
              ? "Enter your mobile number to continue"
              : `Enter the OTP sent to ${mobileNumber}`
            }
          </p>
          {step === "otp" && officerName && (
            <p className="text-sm text-yellow-700 mt-2">Welcome, {officerName}!</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {step === "mobile" ? (
          <form onSubmit={handleRequestOTP} className="space-y-5 sm:space-y-6">
            {/* Mobile Number Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="07XXXXXXXX"
                  pattern="[0-9]{10}"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-5 sm:space-y-6">
            {/* OTP Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter 4-Digit OTP</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base tracking-widest text-center text-xl font-semibold"
                  placeholder="----"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">OTP expires in 5 minutes</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || otpCode.length !== 4}
              className="w-full bg-yellow-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={handleBackToMobile}
              className="w-full bg-gray-200 text-gray-700 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base"
            >
              Back to Mobile Number
            </button>
          </form>
        )}

        <div className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
          <p>Authorized officers only</p>
        </div>
      </div>
    </div>
  )
}
