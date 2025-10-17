"use client"

import { useParams } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useMemo, useState } from "react"
import api from "../config/api"

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
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-3xl mx-auto">
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 text-center">
          {/* Header Section */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 leading-tight">
              Welcome to Queue Management Platform
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600 px-2 sm:px-4">
              Scan QR Code to Join the Queue
            </p>
          </div>

          {/* QR Code Section - Responsive container */}
          <div className="bg-white p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl inline-block shadow-lg mb-4 sm:mb-6 md:mb-8 mx-auto">
            <div className="flex items-center justify-center">
              <div className="relative">
                <QRCodeSVG 
                  value={registrationUrl} 
                  size={200}
                  level="H" 
                  className="w-32 h-32 xs:w-36 xs:h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 2xl:w-72 2xl:h-72 max-w-[90vw] max-h-[40vh] object-contain"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-600 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 p-2 sm:p-3 md:p-4 bg-red-50 rounded-lg border border-red-200 mx-2 sm:mx-4">
              {error}
            </div>
          )}

          {/* Instructions Section */}
          <div className="space-y-2 sm:space-y-3 md:space-y-4 mb-4 sm:mb-6 md:mb-8">
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-700 font-medium px-2 sm:px-4">
              Scan with your mobile camera
            </p>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 px-2 sm:px-4 leading-relaxed">
              Register online and track your queue position in real-time
            </p>
          </div>

          {/* Footer */}
          <div className="pt-3 sm:pt-4 md:pt-6 lg:pt-8 border-t border-gray-200">
            <p className="text-xs sm:text-sm md:text-base text-gray-400">
              Digital Queue Management Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
