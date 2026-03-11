import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Monitor, Lock, Hash, LogIn } from "lucide-react"
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
      style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #1e1b4b 100%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="bg-white/8 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/20 rounded-2xl mb-4 border border-indigo-400/30"
            >
              <Monitor className="w-8 h-8 text-indigo-300" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Kiosk Station Login</h1>
            <p className="mt-1.5 text-sm text-slate-400">Walk-in Customer Service Terminal</p>
          </div>

          {isPreFilled && outletName && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-indigo-500/15 border border-indigo-400/30 rounded-xl">
              <p className="text-sm text-indigo-200">
                <span className="font-semibold">Outlet:</span> {outletName}
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-500/15 border border-red-400/30 rounded-xl text-red-300 text-sm">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Outlet ID {isPreFilled && <span className="text-xs text-indigo-400">(Auto-filled)</span>}
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" value={outletId} onChange={(e) => !isPreFilled && setOutletId(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.08)', WebkitTextFillColor: '#ffffff', caretColor: '#ffffff' }}
                  className="dark-input w-full pl-10 pr-4 py-3 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400/50 transition disabled:opacity-60"
                  placeholder="Enter outlet ID" required readOnly={isPreFilled} disabled={isPreFilled} />
              </div>
              {!isPreFilled && <p className="text-xs text-slate-500 mt-1.5">Get this from your branch manager</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Kiosk Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.08)', WebkitTextFillColor: '#ffffff', caretColor: '#ffffff' }}
                  className="dark-input w-full pl-10 pr-4 py-3 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400/50 transition"
                  placeholder="Enter kiosk password" required />
              </div>
            </div>

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/40 mt-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</> : <><LogIn className="w-4 h-4" /> Start Kiosk Session</>}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">Authorized kiosk terminals only</p>
        </div>
      </motion.div>
    </div>
  )
}
