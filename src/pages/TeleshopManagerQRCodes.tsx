"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { QrCode, Eye, Copy, ExternalLink, Printer, RefreshCw, Download } from "lucide-react"
import api from "../config/api"
import jsPDF from "jspdf"

interface Branch {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  counterCount: number;
  activeOfficers: number;
  totalWaiting: number;
  customersServed: number;
  avgWaitingTime: number;
  rating: number;
}

interface QRCodeData {
  outletId: string;
  token: string;
  generatedAt: string;
  expiresAt?: string;
}

export default function TeleshopManagerQRCodes() {
  const navigate = useNavigate()
  const [branch, setBranch] = useState<Branch | null>(null)
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshingQR, setRefreshingQR] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmationText, setConfirmationText] = useState("")
  const [confirmError, setConfirmError] = useState("")
  const [copySuccess, setCopySuccess] = useState("")

  useEffect(() => {
    fetchTeleshopBranch()
  }, [navigate])

  const fetchTeleshopBranch = async () => {
    try {
      const response = await api.get("/teleshop-manager/me")
      const teleshopManager = response.data.teleshopManager
      
      if (teleshopManager?.branch) {
        setBranch({
          id: teleshopManager.branch.id,
          name: teleshopManager.branch.name,
          location: teleshopManager.branch.location,
          isActive: teleshopManager.branch.isActive,
          counterCount: teleshopManager.branch.counterCount || 0,
          activeOfficers: 0, // TODO: Calculate from officers
          totalWaiting: 0, // TODO: Calculate from queue
          customersServed: 0, // TODO: Calculate from served today
          avgWaitingTime: 0, // TODO: Calculate average
          rating: 0 // TODO: Calculate from feedback
        })
        
        // Check if QR code already exists
        loadExistingQRCode(teleshopManager.branch.id)
      }
    } catch (error: any) {
      console.error("Failed to fetch teleshop branch:", error)
      if (error.response?.status === 401) {
        navigate("/teleshop-manager/login")
      }
    } finally {
      setLoading(false)
    }
  }

  const loadExistingQRCode = (outletId: string) => {
    const storedQRCodes = localStorage.getItem('managerQRCodes')
    if (storedQRCodes) {
      const qrCodesMap = JSON.parse(storedQRCodes)
      if (qrCodesMap[outletId]) {
        setQrCode(qrCodesMap[outletId])
      }
    }
  }

  const generateQRCode = async () => {
    if (!branch) return
    
    try {
      setRefreshingQR(true)
      const newToken = generateRandomToken()
      const generatedAt = new Date().toISOString()

      const qrCodeData: QRCodeData = {
        outletId: branch.id,
        token: newToken,
        generatedAt,
      }

      // Save to localStorage
      const storedQRCodes = localStorage.getItem('managerQRCodes')
      const qrCodesMap = storedQRCodes ? JSON.parse(storedQRCodes) : {}
      qrCodesMap[branch.id] = qrCodeData
      localStorage.setItem('managerQRCodes', JSON.stringify(qrCodesMap))

      // Register with backend
      try {
        await api.post("/customer/manager-qr-token", {
          outletId: branch.id,
          token: newToken,
          generatedAt
        })
      } catch (apiError) {
        console.warn("Failed to register QR token with backend:", apiError)
        // Continue anyway as localStorage is the primary storage
      }

      setQrCode(qrCodeData)
    } catch (error) {
      console.error("Failed to generate QR code:", error)
      alert("Failed to generate QR code. Please try again.")
    } finally {
      setRefreshingQR(false)
    }
  }

  const refreshQRCode = () => {
    setShowConfirmDialog(true)
    setConfirmationText("")
    setConfirmError("")
  }

  const confirmRefresh = () => {
    if (confirmationText.toLowerCase() !== "yes i need to refresh the qr code") {
      setConfirmError("Please type exactly: 'yes i need to refresh the qr code'")
      return
    }

    setShowConfirmDialog(false)
    generateQRCode()
    setConfirmationText("")
    setConfirmError("")
  }

  const generateRandomToken = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleViewQR = () => {
    setShowQRModal(true)
  }

  const handleCopyQRUrl = (type: 'display' | 'registration') => {
    if (!branch || !qrCode) return

    const baseUrl = window.location.origin
    let url: string

    if (type === 'display') {
      url = `${baseUrl}/qr/${branch.id}`
    } else {
      url = `${baseUrl}/register/${branch.id}?qr=${encodeURIComponent(qrCode.token)}`
    }

    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(type === 'display' ? 'QR Display URL copied!' : 'Registration URL copied!')
      setTimeout(() => setCopySuccess(''), 3000)
    }).catch(() => {
      alert(`Failed to copy URL: ${url}`)
    })
  }

  const handlePrintQR = () => {
    if (!branch) return
    
    const qrDisplayUrl = `${window.location.origin}/qr/${branch.id}`
    const printWindow = window.open(qrDisplayUrl, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 1000)
      }
    }
  }

  const handleDownloadPDF = async () => {
    if (!branch || !qrCode) return

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // Header with white background
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, 210, 60, 'F')
      
      // Add logos (fallback to colored circles if images not found)
      try {
        const logoImg = new Image()
        logoImg.src = '/logo.png'
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
        })
        pdf.addImage(logoImg, 'PNG', 15, 15, 35, 35)
      } catch {
        // Fallback: SLT blue circle
        pdf.setFillColor(0, 100, 200)
        pdf.circle(32.5, 32.5, 17.5, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(12)
        pdf.text('SLT', 25, 36)
      }

      try {
        const transzenttLogoImg = new Image()
        transzenttLogoImg.src = '/Transzent Logo.png'
        await new Promise((resolve, reject) => {
          transzenttLogoImg.onload = resolve
          transzenttLogoImg.onerror = reject
        })
        pdf.addImage(transzenttLogoImg, 'PNG', 160, 15, 35, 35)
      } catch {
        // Fallback: Transzent green circle
        pdf.setFillColor(0, 150, 100)
        pdf.circle(177.5, 32.5, 17.5, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(10)
        pdf.text('TZ', 172, 36)
      }

      // Company title
      pdf.setTextColor(0, 100, 200)
      pdf.setFontSize(20)
      pdf.text('Sri Lanka Telecom PLC', 105, 25, { align: 'center' })
      
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(16)
      pdf.text('Digital Queue Management Platform', 105, 35, { align: 'center' })

      // Teleshop information
      pdf.setFontSize(24)
      pdf.text(branch.name, 105, 80, { align: 'center' })
      
      pdf.setFontSize(16)
      pdf.setTextColor(100, 100, 100)
      pdf.text(branch.location, 105, 95, { align: 'center' })

      // QR Code
      const registrationUrl = `${window.location.origin}/register/${branch.id}?qr=${encodeURIComponent(qrCode.token)}`
      
      try {
        // Try QR Server API first
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(registrationUrl)}`
        const qrImage = new Image()
        qrImage.src = qrApiUrl
        qrImage.crossOrigin = 'anonymous'
        
        await new Promise((resolve, reject) => {
          qrImage.onload = resolve
          qrImage.onerror = reject
        })
        
        pdf.addImage(qrImage, 'PNG', 45, 110, 120, 120)
      } catch {
        // Fallback: Simple black rectangle
        pdf.setFillColor(0, 0, 0)
        pdf.rect(45, 110, 120, 120, 'F')
        
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(12)
        pdf.text('QR Code', 105, 170, { align: 'center' })
        pdf.text('(Scan to Register)', 105, 180, { align: 'center' })
      }

      // Instructions
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(18)
      pdf.text('Scan to Join Digital Queue', 105, 250, { align: 'center' })

      // Footer
      pdf.setFontSize(10)
      pdf.setTextColor(128, 128, 128)
      const now = new Date()
      pdf.text(`Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 105, 280, { align: 'center' })

      // Save PDF
      const filename = `QR_Display_${branch.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teleshop information...</p>
        </div>
      </div>
    )
  }

  if (!branch) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Branch Assigned</h1>
          <p className="text-gray-600">You are not assigned to any teleshop branch.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
          <p className="text-gray-600">Manage QR codes for customer registration at your teleshop</p>
        </div>
      </div>

      {copySuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
          {copySuccess}
        </div>
      )}

      {/* Branch Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{branch.name}</h2>
            <p className="text-gray-600">{branch.location}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Counters: {branch.counterCount}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                branch.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {branch.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{branch.customersServed}</p>
            <p className="text-sm text-gray-600">Served Today</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{branch.totalWaiting}</p>
            <p className="text-sm text-gray-600">Currently Waiting</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{branch.avgWaitingTime}min</p>
            <p className="text-sm text-gray-600">Avg Wait Time</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{branch.activeOfficers}</p>
            <p className="text-sm text-gray-600">Active Officers</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">QR Code</h3>
            {qrCode && (
              <div className="text-sm text-gray-500">
                Generated: {new Date(qrCode.generatedAt).toLocaleDateString()} at {new Date(qrCode.generatedAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {qrCode ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleViewQR}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Eye className="h-4 w-4" />
                View QR
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              
              <button
                onClick={handlePrintQR}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              
              <button
                onClick={() => handleCopyQRUrl('display')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <Copy className="h-4 w-4" />
                Copy QR URL
              </button>
              
              <button
                onClick={() => handleCopyQRUrl('registration')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <ExternalLink className="h-4 w-4" />
                Copy Registration URL
              </button>
              
              <button
                onClick={refreshQRCode}
                disabled={refreshingQR}
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingQR ? 'animate-spin' : ''}`} />
                Refresh QR
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">No QR code generated yet</p>
              <button
                onClick={generateQRCode}
                disabled={refreshingQR}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <QrCode className={`h-5 w-5 ${refreshingQR ? 'animate-spin' : ''}`} />
                Generate QR Code
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code - {branch.name}</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/register/${branch.id}?qr=${encodeURIComponent(qrCode.token)}`)}`}
                  alt="QR Code"
                  className="mx-auto"
                />
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Customers can scan this QR code to join the digital queue
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Confirm QR Code Refresh</h3>
            <p className="text-gray-600 mb-4">
              Refreshing the QR code will invalidate the current QR code and generate a new one. 
              Any existing printed QR codes will stop working.
            </p>
            <p className="text-sm font-medium text-gray-900 mb-2">
              Type exactly: <code className="bg-gray-100 px-2 py-1 rounded">yes i need to refresh the qr code</code>
            </p>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              placeholder="Type confirmation text..."
            />
            {confirmError && (
              <p className="text-red-600 text-sm mb-4">{confirmError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false)
                  setConfirmationText("")
                  setConfirmError("")
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRefresh}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Refresh QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}