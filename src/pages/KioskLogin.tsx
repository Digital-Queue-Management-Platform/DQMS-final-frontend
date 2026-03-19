import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Lock, Hash, LogIn } from "lucide-react"
import { motion } from "framer-motion"
import { API_URL } from "../config/api"

export default function KioskLogin() {
  const [outletId, setOutletId] = useState("")
  const [outletName, setOutletName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isPreFilled, setIsPreFilled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const teleshopManagerToken = localStorage.getItem("teleshopManagerToken")
    const teleshopManager = localStorage.getItem("teleshopManager")
    if (teleshopManagerToken && teleshopManager) {
      try {
        const managerData = JSON.parse(teleshopManager)
        if (managerData.branchId) {
          setOutletId(managerData.branchId)
          setOutletName(managerData.branchName || "")
          setIsPreFilled(true)
        }
      } catch (err) {
        console.error("Failed to parse teleshop manager data:", err)
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/kiosk/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Login failed")
      localStorage.setItem("kioskToken", data.token)
      localStorage.setItem("kioskOutlet", JSON.stringify(data.outlet))
      navigate("/kiosk/dashboard")
    } catch (err: any) {
      setError(err.message || "An error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 60%, #e2e8f0 100%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex items-center justify-center gap-5 mb-8"
            >
              <img src="/logo.png" alt="SLT-MOBITEL" className="h-10 w-auto object-contain" />
              <div className="h-8 w-[1px] bg-slate-200" />
              <img src="/Transzent Logo.png" alt="Transzent Logo" className="h-14 w-auto object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.2)]" />
            </motion.div>
            <p className="text-indigo-600 font-semibold text-xs tracking-widest uppercase mb-1">Welcome to the DQMS System</p>
            <h1 className="text-2xl font-bold text-slate-900">Kiosk Station Login</h1>
            <p className="mt-1.5 text-sm text-slate-500">Walk-in Customer Service Terminal</p>
          </div>

          {isPreFilled && outletName && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700">
              <p className="text-sm">
                <span className="font-semibold text-indigo-900">Outlet:</span> {outletName}
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Outlet ID {isPreFilled && <span className="text-xs text-indigo-600">(Auto-filled)</span>}
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={outletId} onChange={(e) => !isPreFilled && setOutletId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Enter outlet ID" required readOnly={isPreFilled} disabled={isPreFilled} />
              </div>
              {!isPreFilled && <p className="text-xs text-slate-500 mt-1.5">Get this from your branch manager</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kiosk Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  placeholder="Enter kiosk password" required />
              </div>
            </div>

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 mt-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</> : <><LogIn className="w-4 h-4" /> Start Kiosk Session</>}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">Authorized kiosk terminals only</p>
        </div>
        <p className="mt-8 text-center text-[10px] text-slate-600 font-medium tracking-tight">
          © 2026 SLT-Mobitel Digital Platforms Section
        </p>
      </motion.div>
    </div>
  )
}
