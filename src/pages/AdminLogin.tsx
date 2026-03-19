import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, AlertTriangle, Phone, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../config/api'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<1 | 2>(1) // 1: credentials, 2: OTP verification
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken')
    if (adminToken) {
      const returnTo = searchParams.get('returnTo') || '/admin'
      navigate(returnTo, { replace: true })
    }
  }, [navigate, searchParams])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setError('')
    try {
      if (step === 1) {
        // Phase 1: Check credentials + mobile, trigger OTP
        const response = await api.post('/admin/login', { email: email.trim(), password, mobileNumber: mobileNumber.trim() })
        if (response.data.needsOtp) {
          setStep(2)
        }
      } else {
        // Phase 2: Verify OTP and get token
        const response = await api.post('/admin/verify-login-otp', { email: email.trim(), password, mobileNumber: mobileNumber.trim(), otpCode })
        if (response.data.token) {
          localStorage.setItem('adminToken', response.data.token)
          if (response.data.user) {
            localStorage.setItem('dq_user', JSON.stringify(response.data.user))
          }
          const returnTo = searchParams.get('returnTo') || '/admin'
          navigate(returnTo, { replace: true })
        }
      }
    } catch (error: any) {
      if (error.response?.data?.error) setError(error.response.data.error)
      else setError('Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-trigger Step 1 (Credentials -> OTP)
  useEffect(() => {
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    const isMobileValid = mobileNumber.replace(/\D/g, '').length === 10
    
    if (step === 1 && isEmailValid && password.length >= 6 && isMobileValid && !isLoading) {
      handleSubmit()
    }
  }, [email, password, mobileNumber, step])

  // Auto-trigger Step 2 (OTP -> Dashboard)
  useEffect(() => {
    if (step === 2 && otpCode.length === 4 && !isLoading) {
      handleSubmit()
    }
  }, [otpCode, step])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f5f7ff 0%, #ffffff 50%, #f5f7ff 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-100/50 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white border border-indigo-50 rounded-2xl p-8 shadow-2xl shadow-indigo-100/50">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex items-center justify-center gap-5 mb-8"
            >
              <img src="/logo.png" alt="SLT-MOBITEL" className="h-10 w-auto object-contain" />
              <div className="h-8 w-[1px] bg-slate-200" />
              <img src="/Transzent Logo.png" alt="Transzent Logo" className="h-14 w-auto object-contain drop-shadow-[0_0_15px_rgba(79,70,229,0.2)]" />
            </motion.div>
            <p className="text-indigo-600 font-semibold text-xs tracking-widest uppercase mb-1">Welcome to the DQMS System</p>
            <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {step === 1 ? 'Authorized access only' : `Security code sent to ${mobileNumber}`}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="email" name="email" type="email" autoComplete="email" required
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                      placeholder="admindqms@slt.lk"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                      placeholder="Enter your password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile for Verification</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="mobile" name="mobile" type="tel" required
                      value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                      placeholder="e.g. 0771234567"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 text-center">Security Verification Code (OTP)</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="otp" name="otp" type="text" maxLength={4} required autoFocus
                      value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center text-xl font-bold tracking-[0.5em]"
                      placeholder="0000"
                    />
                  </div>
                  <button type="button" onClick={() => setStep(1)}
                    className="w-full mt-4 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                  >
                    Back to credentials
                  </button>
              </div>
            )}

            <motion.button
              type="submit" disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {step === 1 ? 'Sending OTP...' : 'Verifying...'}
                </span>
              ) : (step === 1 ? 'Send Security Code' : 'Verify & Sign In')}
            </motion.button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-500">Super Admin access only · Multi-factor authentication enabled</p>
        </div>
        <p className="mt-8 text-center text-[10px] text-slate-600 font-medium tracking-tight">
          © 2026 SLT-Mobitel Digital Platforms Section
        </p>
      </motion.div>
    </div>
  )
}

export default AdminLogin
