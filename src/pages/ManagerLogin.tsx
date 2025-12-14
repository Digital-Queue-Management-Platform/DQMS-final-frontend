"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, LogIn } from "lucide-react"
import api from "../config/api"

export default function ManagerLogin() {
  const navigate = useNavigate()
  const [mobileNumber, setMobileNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Get return URL from query params
  const urlParams = new URLSearchParams(window.location.search)
  const returnTo = urlParams.get('returnTo') || '/manager/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/manager/login", { mobileNumber })

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
      const errorMessage = err.response?.data?.error || "Login failed"
      console.error("RTOM login error:", errorMessage)
      
      // Provide specific feedback for session expiration
      if (errorMessage.includes("expired") || errorMessage.includes("Session")) {
        setError("Your session has expired. Please login again with your mobile number.")
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="rounded-xl sm:rounded-3xl bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 w-full max-w-sm sm:max-w-md p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-3 sm:mb-4">
            <LogIn className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">RTOM Login</h1>
          <p className="text-sm sm:text-base text-gray-600">Enter your mobile number to access regional dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
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
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
          <p>RTOM access only</p>
        </div>
      </div>
    </div>
  )
}