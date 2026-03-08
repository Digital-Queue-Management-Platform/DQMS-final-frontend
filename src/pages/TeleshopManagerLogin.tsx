"use client"
import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, LogIn, KeyRound, Store } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import api from "../config/api"

export default function TeleshopManagerLogin() {
  const navigate = useNavigate()
  const [mobileNumber, setMobileNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState<"mobile" | "otp">("mobile")
  const [managerName, setManagerName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const urlParams = new URLSearchParams(window.location.search)
  const returnTo = urlParams.get("returnTo") || "/teleshop-manager/dashboard"

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await api.post("/teleshop-manager/request-otp", { mobileNumber })
      if (response.data.success) {
        setManagerName(response.data.managerName)
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
      const response = await api.post("/teleshop-manager/login", { mobileNumber, otpCode })
      if (response.data.success) {
        localStorage.setItem("teleshopManager", JSON.stringify(response.data.teleshopManager))
        localStorage.setItem("teleshopManagerToken", response.data.token)
        localStorage.setItem("dq_role", "teleshop_manager")
        localStorage.setItem("dq_user", JSON.stringify({
          id: response.data.teleshopManager.id,
          mobileNumber: response.data.teleshopManager.mobileNumber,
          name: response.data.teleshopManager.name,
          role: "teleshop_manager"
        }))
        setTimeout(() => navigate(returnTo), 50)
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
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl p-8 shadow-xl shadow-sky-100/60 border border-sky-100">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 rounded-2xl mb-4"
            >
              <Store className="w-8 h-8 text-sky-600" />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900">Teleshop Manager Login</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {step === "mobile" ? "Enter your registered mobile number" : `OTP sent to ${mobileNumber}`}
            </p>
            <AnimatePresence>
              {step === "otp" && managerName && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-sm font-medium text-sky-700">
                  Welcome, {managerName}!
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === "mobile" ? (
              <motion.form key="mobile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }} onSubmit={handleRequestOTP} className="space-y-5">
                <div>
                  <label className="label">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)}
                      className="input pl-10" placeholder="07XXXXXXXX" pattern="[0-9]{10}" required />
                  </div>
                </div>
                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-200">
                  {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</> : <><LogIn className="w-4 h-4" /> Send OTP</>}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label className="label">Enter 4-Digit OTP</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="input pl-10 tracking-[0.35em] text-center text-xl font-bold"
                      placeholder="* * * *" maxLength={4} pattern="[0-9]{4}" required autoFocus />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">OTP expires in 5 minutes</p>
                </div>
                <motion.button type="submit" disabled={loading || otpCode.length !== 4}
                  whileHover={{ scale: (loading || otpCode.length !== 4) ? 1 : 1.01 }}
                  whileTap={{ scale: (loading || otpCode.length !== 4) ? 1 : 0.98 }}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-200">
                  {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</> : "Verify & Login"}
                </motion.button>
                <button type="button" onClick={handleBackToMobile}
                  className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-all">
                  Back to Mobile Number
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-6 text-center text-xs text-slate-400">Teleshop Manager Portal</p>
        </div>
      </motion.div>
    </div>
  )
}
