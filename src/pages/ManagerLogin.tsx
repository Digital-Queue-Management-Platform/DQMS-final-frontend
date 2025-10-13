"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Mail, LogIn } from "lucide-react"
import api from "../config/api"

export default function ManagerLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/manager/login", { email })

      if (response.data.success) {
        // Store manager data and JWT token in localStorage
        localStorage.setItem("manager", JSON.stringify(response.data.manager))
        localStorage.setItem("managerToken", response.data.token)
        // Set role in UserContext
        localStorage.setItem("dq_role", "region_manager")
        localStorage.setItem("dq_user", JSON.stringify({
          id: response.data.manager.id,
          email: response.data.manager.email,
          role: "region_manager"
        }))
        navigate("/manager/dashboard")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-3 sm:mb-4">
            <LogIn className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Manager Login</h1>
          <p className="text-sm sm:text-base text-gray-600">Enter your email to access regional dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                placeholder="manager@company.com"
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
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
          <p>Regional manager access only</p>
        </div>
      </div>
    </div>
  )
}