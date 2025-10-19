"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Star, MessageSquare, CheckCircle, Send } from "lucide-react"
import api from "../config/api"
import type { Token } from "../types"
import { getServiceDisplayName } from "../utils/serviceUtils"

export default function FeedbackPage() {
  const { tokenId } = useParams()
  const navigate = useNavigate()
  const [token, setToken] = useState<Token | null>(null)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchToken()
  }, [tokenId])

  const fetchToken = async () => {
    try {
      const response = await api.get(`/customer/token/${tokenId}`)
      setToken(response.data.token)

      // Check if feedback already submitted
      if (response.data.token.feedback) {
        setSubmitted(true)
      }
    } catch (err) {
      console.error("Failed to fetch token:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      alert("Please select a rating")
      return
    }

    setLoading(true)
    try {
      await api.post("/feedback/submit", {
        tokenId,
        rating,
        comment: comment.trim() || undefined,
      })

      setSubmitted(true)
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to submit feedback")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-8">Your feedback has been submitted successfully.</p>

          <button
            onClick={() => {
              // Try to close the window/tab first
              if (window.opener) {
                window.close()
              } else {
                // If can't close, navigate to home page
                navigate("/")
              }
            }}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rate Your Experience</h1>
          <p className="text-gray-600">Help us improve our service</p>
        </div>

        {/* Service Summary */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Token Number</p>
              <p className="font-semibold text-gray-900 text-lg">#{token.tokenNumber}</p>
            </div>
            <div>
              <p className="text-gray-600">Outlet</p>
              <p className="font-semibold text-gray-900">{token.outlet?.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Service Type</p>
              <p className="font-semibold text-gray-900">
                {getServiceDisplayName(token.serviceType)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Served By</p>
              <p className="font-semibold text-gray-900">{token.officer?.name || "N/A"}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Rating Selection */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-4 text-center">
              How would you rate your experience?
            </label>
            <div className="flex items-center justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-12 h-12 ${
                      star <= (hoveredRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300 fill-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Rating Labels */}
            <div className="flex justify-between mt-4 px-2">
              <span className="text-sm text-gray-500">Poor</span>
              <span className="text-sm text-gray-500">Excellent</span>
            </div>

            {/* Selected Rating Display */}
            {rating > 0 && (
              <div className="text-center mt-4">
                <p className="text-2xl font-bold text-gray-900">
                  {rating === 1
                    ? "Poor"
                    : rating === 2
                      ? "Fair"
                      : rating === 3
                        ? "Good"
                        : rating === 4
                          ? "Very Good"
                          : "Excellent"}
                </p>
              </div>
            )}
          </div>

          {/* Comment Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Tell us more about your experience..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Your feedback helps us improve our services. Thank you for your time.
        </p>
      </div>
    </div>
  )
}
