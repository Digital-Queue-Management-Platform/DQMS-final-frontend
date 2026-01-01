"use client"

import { useParams } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useMemo, useState } from "react"
import api from "../config/api"
import { Smartphone, CheckCircle, Clock } from "lucide-react"

export default function QRDisplay() {
  const { outletId } = useParams()
  const [qrToken, setQrToken] = useState<string>("")
  const [error, setError] = useState<string>("")

  const registrationUrl = useMemo(() => {
    const base = `${window.location.origin}/register/${outletId}`
    return qrToken ? `${base}?qr=${encodeURIComponent(qrToken)}` : base
  }, [outletId, qrToken])

  useEffect(() => {
    let mounted = true
    let timer: any

    const fetchToken = async () => {
      if (!outletId) return

      try {
        // First priority: Check for manager-generated QR codes in localStorage
        const storedQRCodes = localStorage.getItem('managerQRCodes')
        if (storedQRCodes) {
          try {
            const parsed = JSON.parse(storedQRCodes)
            const managerQRCode = parsed[outletId]
            if (managerQRCode) {
              if (!mounted) return
              setQrToken(managerQRCode.token)
              setError("")
              console.log('Using manager QR token:', managerQRCode.token)
              return
            }
          } catch (parseError) {
            console.error('Error parsing stored QR codes:', parseError)
          }
        }

        // Fallback: Use backend API for legacy QR tokens
        const res = await api.get(`/customer/qr-token/${outletId}`)
        if (!mounted) return
        setQrToken(res.data.token)
        setError("")
        console.log('Using backend QR token:', res.data.token)
      } catch (err) {
        console.error("Failed to get QR token", err)
        if (!mounted) return
        setError("Unable to generate QR. Please check server.")
      }
    }

    // Initial fetch
    fetchToken()

    // Set up periodic refresh for localStorage monitoring (check every 5 seconds)
    timer = setInterval(() => {
      fetchToken()
    }, 5000)

    return () => {
      mounted = false
      if (timer) clearInterval(timer)
    }
  }, [outletId])

  return (
    <div className="h-screen w-full bg-gray-50 flex items-center justify-center overflow-hidden p-4">
      {/* Main Content Container - Fixed height to prevent scrolling */}
      <div className="w-full max-w-5xl h-full max-h-screen flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl w-full p-8 lg:p-12 border border-gray-300">
          <div className="grid lg:grid-cols-2 gap-8 items-center h-full">

            {/* Left Side - QR Code */}
            <div className="flex flex-col items-center justify-center">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl shadow-lg mb-4">
                <QRCodeSVG
                  value={registrationUrl}
                  size={280}
                  level="H"
                  className="w-full h-full"
                  style={{ maxWidth: '280px', maxHeight: '280px' }}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-red-600 text-sm bg-red-50 rounded-lg border border-red-200 px-4 py-2">
                  {error}
                </div>
              )}
            </div>

            {/* Right Side - Content */}
            <div className="flex flex-col justify-center space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight">
                  Join the Queue
                </h1>
                <p className="text-xl text-gray-600">
                  Skip the wait, scan to register
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl">
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-indigo-600" />
                      Scan with Your Phone
                    </h3>
                    <p className="text-sm text-gray-600">Use your mobile camera to scan the QR code</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                      Register Online
                    </h3>
                    <p className="text-sm text-gray-600">Fill in your details and get your queue number</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Track in Real-Time
                    </h3>
                    <p className="text-sm text-gray-600">Monitor your position in the queue on your device</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center lg:text-left">
                  Digital Queue Management Platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
