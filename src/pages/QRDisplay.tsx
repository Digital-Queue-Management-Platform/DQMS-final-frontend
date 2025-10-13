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
        const res = await api.get(`/customer/qr-token/${outletId}`)
        if (!mounted) return
        setQrToken(res.data.token)
        setError("")
      } catch (err) {
        console.error("Failed to get QR token", err)
        if (!mounted) return
        setError("Unable to generate QR. Please check server.")
      }
    }

    // initial and periodic refresh before expiry (every 4 minutes)
    fetchToken()
    timer = setInterval(fetchToken, 4 * 60 * 1000)

    return () => {
      mounted = false
      if (timer) clearInterval(timer)
    }
  }, [outletId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to SLTMobitel</h1>
        <p className="text-xl text-gray-600 mb-8">Scan QR Code to Join the Queue</p>

        <div className="bg-white p-8 rounded-2xl inline-block shadow-lg mb-8">
          <QRCodeSVG value={registrationUrl} size={300} level="H" />
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-4">{error}</div>
        )}

        <div className="space-y-4">
          <p className="text-lg text-gray-700 font-medium">Scan with your mobile camera</p>
          <p className="text-sm text-gray-500">Register online and track your queue position in real-time</p>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400">Digital Queue Platform by SLTMobitel</p>
        </div>
      </div>
    </div>
  )
}
