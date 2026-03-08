import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, Lock, Mail, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../config/api'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const response = await api.post('/admin/login', { email, password })
      if (response.data.token) {
        localStorage.setItem('adminToken', response.data.token)
        const returnTo = searchParams.get('returnTo') || '/admin'
        navigate(returnTo, { replace: true })
      }
    } catch (error: any) {
      if (error.response?.data?.error) setError(error.response.data.error)
      else setError('Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252545 50%, #1e1e2e 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg"
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">System Administrator</h1>
            <p className="mt-1.5 text-sm text-slate-400">Enter your credentials to access the admin panel</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2.5 p-3.5 bg-red-500/15 border border-red-400/30 rounded-xl text-red-300 text-sm"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3.5 flex items-center text-slate-400 hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <motion.button
              type="submit" disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </motion.button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-500">Admin access only · Unauthorized access is prohibited</p>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminLogin
