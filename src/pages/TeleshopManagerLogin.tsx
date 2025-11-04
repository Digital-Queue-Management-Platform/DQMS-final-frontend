"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone } from "lucide-react"
import api from "../config/api"

export default function TeleshopManagerLogin() {
  const navigate = useNavigate()
  const [mobileNumber, setMobileNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Get return URL from query params
  const urlParams = new URLSearchParams(window.location.search)
  const returnTo = urlParams.get('returnTo') || '/teleshop-manager/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/teleshop-manager/login", { mobileNumber })

      if (response.data.success) {
        // Store teleshop manager data and JWT token in localStorage
        localStorage.setItem("teleshopManager", JSON.stringify(response.data.teleshopManager))
        localStorage.setItem("teleshopManagerToken", response.data.token)
        // Set role in UserContext
        localStorage.setItem("dq_role", "teleshop_manager")
        localStorage.setItem("dq_user", JSON.stringify({
          id: response.data.teleshopManager.id,
          mobileNumber: response.data.teleshopManager.mobileNumber,
          name: response.data.teleshopManager.name,
          role: "teleshop_manager"
        }))
        
        // Add a small delay to ensure localStorage is fully written before navigation
        setTimeout(() => {
          navigate(returnTo)
        }, 50)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Login failed"
      console.error("Teleshop Manager login error:", errorMessage)
      
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4">
            <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Teleshop Manager Login</h1>
          <p className="text-sm sm:text-base text-gray-600">Enter your mobile number to access your dashboard</p>
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
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="070XXXXXXX"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Enter your registered mobile number</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
          <p>RTOM access only</p>
          <p className="mt-1">Contact your administrator if you need assistance</p>
        </div>
      </div>
    </div>
  )
}