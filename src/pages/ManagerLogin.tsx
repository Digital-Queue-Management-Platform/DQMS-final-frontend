"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, LogIn, KeyRound } from "lucide-react"
import api from "../config/api"

export default function ManagerLogin() {
  const navigate = useNavigate()
  const [mobileNumber, setMobileNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState<"mobile" | "otp">("mobile")
  const [managerName, setManagerName] = useState("")
  const [regionName, setRegionName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Get return URL from query params
  const urlParams = new URLSearchParams(window.location.search)
  const returnTo = urlParams.get('returnTo') || '/manager/dashboard'

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/manager/request-otp", { mobileNumber })

      if (response.data.success) {
        setManagerName(response.data.managerName)
        setRegionName(response.data.regionName)
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
      const response = await api.post("/manager/login", { mobileNumber, otpCode })

      if (response.data.success) {
        // Store manager data and JWT token in localStorage
        localStorage.setItem("manager", JSON.stringify(response.data.manager))
        localStorage.setItem("managerToken", response.data.token)
        // Set role in UserContext - be consistent with role naming
        localStorage.setItem("dq_role", "region_manager")
        localStorage.setItem("dq_user", JSON.stringify({
          id: response.data.manager.id,
          mobileNumber: response.data.manager.mobileNumber,
          name: response.data.manager.name || response.data.manager.id,
          role: "region_manager"
        }))
        
        // Add a small delay to ensure localStorage is fully written before navigation
        setTimeout(() => {
          navigate(returnTo)
        }, 50)
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
      <div className="rounded-xl sm:rounded-3xl bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 w-full max-w-sm sm:max-w-md p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-3 sm:mb-4">
            {step === "mobile" ? (
              <LogIn className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            ) : (
              <KeyRound className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">RTOM Login</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {step === "mobile" 
              ? "Enter your mobile number to access regional dashboard"
              : `Enter the OTP sent to ${mobileNumber}`
            }
          </p>
          {step === "otp" && managerName && (
            <p className="text-sm text-green-700 mt-2">Welcome, {managerName}!</p>
          )}
          {step === "otp" && regionName && (
            <p className="text-xs text-gray-600 mt-1">{regionName}</p>
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
                  className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="Enter your mobile number"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
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
                  className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base tracking-widest text-center text-xl font-semibold"
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
              className="w-full bg-green-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
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
          <p>RTOM access only</p>
        </div>
      </div>
    </div>
  )
}