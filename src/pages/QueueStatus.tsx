"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Clock, Users, CheckCircle, AlertTriangle } from "lucide-react"
import api, { WS_URL } from "../config/api"
import type { Token } from "../types"

export default function QueueStatus() {
  const { tokenId } = useParams()
  const navigate = useNavigate()
  const [token, setToken] = useState<Token | null>(null)
  const [position, setPosition] = useState(0)
  const [estimatedWait, setEstimatedWait] = useState(0)
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<Array<{ id: string; code: string; title: string; isActive?: boolean }>>([])

  useEffect(() => {
    fetchTokenStatus()
    fetchServices()
    const interval = setInterval(fetchTokenStatus, 10000) // Update every 10 seconds

    // WebSocket connection for real-time updates
    const ws = new WebSocket(WS_URL)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "TOKEN_CALLED" && data.data.id === tokenId && data.data.status === "in_service") {
        fetchTokenStatus()
      } else if (data.type === "TOKEN_COMPLETED" && data.data.id === tokenId) {
        navigate(`/feedback/${tokenId}`)
      } else if (data.type === "TOKEN_SKIPPED" && data.data.id === tokenId) {
        fetchTokenStatus()
      }
    }

    return () => {
      clearInterval(interval)
      ws.close()
    }
  }, [tokenId])

  const fetchTokenStatus = async () => {
    try {
      const response = await api.get(`/customer/token/${tokenId}`)
      setToken(response.data.token)
      setPosition(response.data.position)
      setEstimatedWait(response.data.estimatedWaitMinutes)

      // Redirect to feedback if completed
      if (response.data.token.status === "completed") {
        navigate(`/feedback/${tokenId}`)
      }
    } catch (err) {
      console.error("Failed to fetch token status:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await api.get("/queue/services")
      const list = Array.isArray(response.data) ? response.data : []
      setServices(list.filter((s: any) => s?.isActive !== false))
    } catch (err) {
      // keep empty on failure
      setServices([])
    }
  }

  const formatService = (code: string) =>
    code
      ? code
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : ""

  const getServiceTitle = () => {
    const code = token?.serviceType
    if (!code) return ""
    const svc = services.find((s) => s.code === code)
    return svc?.title || formatService(code)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <p className="text-gray-600">Token not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{token.outlet?.name}</h1>
          <p className="text-gray-600">{token.outlet?.location}</p>
        </div>

        {/* Token Number Display */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center mb-8">
          <p className="text-white text-sm font-medium mb-2">Your Token Number</p>
          <p className="text-white text-7xl font-bold mb-2">{token.tokenNumber}</p>
          <p className="text-blue-100 text-sm">Token ID: {token.id.slice(0, 8)}</p>
        </div>

        {/* Status Display */}
        {token.status === "waiting" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-6 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Position in Queue</p>
                <p className="text-3xl font-bold text-gray-900">{position}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-6 text-center">
                <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Estimated Wait</p>
                <p className="text-3xl font-bold text-gray-900">{estimatedWait}</p>
                <p className="text-sm text-gray-600">minutes</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-800 text-center font-medium">
                Please wait for your turn. You will be notified when called.
              </p>
            </div>
          </div>
        )}

        {token.status === "in_service" && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-2xl font-bold text-green-900 mb-2">Please Proceed to Counter {token.counterNumber}</p>
              <p className="text-green-700">Your service is ready to begin</p>
            </div>

            {token.officer && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 text-center">
                  Serving Officer: <span className="font-semibold">{token.officer.name}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {token.status === "skipped" && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <AlertTriangle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <p className="text-2xl font-bold text-amber-900 mb-2">Your turn was skipped</p>
              <p className="text-amber-700">Please contact the counter or wait until calls your token again.</p>
            </div>
          </div>
        )}

        {/* Customer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Name</p>
              <p className="font-semibold text-gray-900">{token.customer.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Mobile</p>
              <p className="font-semibold text-gray-900">{token.customer.mobileNumber}</p>
            </div>
            <div>
              <p className="text-gray-600">Service Type</p>
              <p className="font-semibold text-gray-900">{getServiceTitle()}</p>
            </div>
            <div>
              <p className="text-gray-600">Registered At</p>
              <p className="font-semibold text-gray-900">{new Date(token.createdAt).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
