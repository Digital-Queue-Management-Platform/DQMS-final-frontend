"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, LogIn, KeyRound, UserCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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

  const urlParams = new URLSearchParams(window.location.search)
  const returnTo = urlParams.get("returnTo") || "/manager/dashboard"

  const handleRequestOTP = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (loading) return
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

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (loading) return
    setError("")
    setLoading(true)
    try {
      const response = await api.post("/manager/login", { mobileNumber, otpCode })
      if (response.data.success) {
        localStorage.setItem("manager", JSON.stringify(response.data.manager))
        localStorage.setItem("managerToken", response.data.token)
        localStorage.setItem("dq_role", "region_manager")
        localStorage.setItem("dq_user", JSON.stringify({
          id: response.data.manager.id,
          mobileNumber: response.data.manager.mobileNumber,
          name: response.data.manager.name || response.data.manager.id,
          role: "region_manager"
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

  useEffect(() => {
    if (mobileNumber.length === 10 && step === "mobile") {
      handleRequestOTP()
    }
  }, [mobileNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (otpCode.length === 4) {
      handleVerifyOTP()
    }
  }, [otpCode]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl p-8 shadow-xl shadow-emerald-100/60 border border-emerald-100">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4"
            >
              <UserCircle2 className="w-8 h-8 text-emerald-600" />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900">RTOM Manager Login</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {step === "mobile" ? "Enter your registered mobile number" : `OTP sent to ${mobileNumber}`}
            </p>
            <AnimatePresence>
              {step === "otp" && (managerName || regionName) && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-0.5">
                  {managerName && <p className="text-sm font-medium text-emerald-700">Welcome, {managerName}!</p>}
                  {regionName && <p className="text-xs text-slate-500">{regionName}</p>}
                </motion.div>
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
                    <input type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="input pl-10" placeholder="07XXXXXXXX" pattern="[0-9]{10}" required />
                  </div>
                </div>
                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-200">
                  {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending&hellip;</> : <><LogIn className="w-4 h-4" /> Send OTP</>}
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
                      placeholder="&bull; &bull; &bull; &bull;" maxLength={4} pattern="[0-9]{4}" required autoFocus />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">OTP expires in 5 minutes</p>
                </div>
                <motion.button type="submit" disabled={loading || otpCode.length !== 4}
                  whileHover={{ scale: (loading || otpCode.length !== 4) ? 1 : 1.01 }}
                  whileTap={{ scale: (loading || otpCode.length !== 4) ? 1 : 0.98 }}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-200">
                  {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying&hellip;</> : "Verify & Login"}
                </motion.button>
                <button type="button" onClick={handleBackToMobile}
                  className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-all">
                  &larr; Back to Mobile Number
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-6 text-center text-xs text-slate-400">Regional Territory Operations Manager Portal</p>
        </div>
      </motion.div>
    </div>
  )
}
