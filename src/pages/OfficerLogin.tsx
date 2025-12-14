"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, LogIn } from "lucide-react"
import api from "../config/api"

export default function OfficerLogin() {
  const navigate = useNavigate()
  const [mobileNumber, setMobileNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/officer/login", { mobileNumber })

      if (response.data.success) {
        // Store officer data and token in localStorage
        localStorage.setItem("officer", JSON.stringify(response.data.officer))
        if (response.data.token) {
          localStorage.setItem("officerToken", response.data.token)
        }
        navigate("/officer/queue")
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="rounded-xl sm:rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-100 border-2 border-yellow-300 w-full max-w-sm sm:max-w-md p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-yellow-100 rounded-full mb-3 sm:mb-4">
            <LogIn className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Officer Login</h1>
          <p className="text-sm sm:text-base text-gray-600">Enter your mobile number to continue</p>
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
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base"
                placeholder="07XXXXXXXX"
                pattern="[0-9]{10}"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
          <p>Authorized officers only</p>
        </div>
      </div>
    </div>
  )
}
