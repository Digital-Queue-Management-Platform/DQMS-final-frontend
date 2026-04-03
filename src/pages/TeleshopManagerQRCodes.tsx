"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { QrCode, Eye, ExternalLink, RefreshCw, Download } from "lucide-react"
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
          isActive: teleshopManager.branch.isActive ?? true,
          counterCount: teleshopManager.branch.counterCount || 0,
          activeOfficers: teleshopManager.branch.activeOfficers || 0,
          totalWaiting: teleshopManager.branch.totalWaiting || 0,
          customersServed: teleshopManager.branch.customersServed || 0,
          avgWaitingTime: teleshopManager.branch.avgWaitingTime || 0,
          rating: teleshopManager.branch.rating || 0
        })
        
        // Load existing QR code from backend
        await loadExistingQRCode()
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

  const loadExistingQRCode = async () => {
    try {
      const response = await api.get("/teleshop-manager/qr-code")
      if (response.data.qrCode) {
        setQrCode(response.data.qrCode)
      }
    } catch (error: any) {
      console.error("Failed to load existing QR code:", error)
      // If no QR code exists, it's not an error
    }
  }

  const generateQRCode = async () => {
    if (!branch) return
    
    try {
      setRefreshingQR(true)
      
      // Generate QR code using backend endpoint
      const response = await api.post("/teleshop-manager/generate-qr")
      
      if (response.data.success && response.data.qrCode) {
        setQrCode(response.data.qrCode)
      } else {
        throw new Error("Backend did not return QR code data")
      }
    } catch (error: any) {
      console.error("Failed to generate QR code:", error)
      alert(error.response?.data?.error || "Failed to generate QR code. Please try again.")
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

  const handleViewQR = () => {
    setShowQRModal(true)
  }

  const handleCopyRegistrationUrl = () => {
    if (!branch || !qrCode) return

    const baseUrl = window.location.origin
    const url = `${baseUrl}/register/${branch.id}?qr=${encodeURIComponent(qrCode.token)}`

    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess('Registration URL copied!')
      setTimeout(() => setCopySuccess(''), 3000)
    }).catch(() => {
      alert(`Failed to copy URL: ${url}`)
    })
  }

  const handleDownloadPDF = async () => {
    if (!branch || !qrCode) return

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // Header with white background (increased height for better logo spacing)
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, 210, 70, 'F')
      
      // Logo specifications for better alignment
      const logoSize = 30 // Reduced size for better proportion
      const leftLogoX = 20 // More padding from left edge
      const rightLogoX = 160 // Better positioned from right edge
      const logoY = 15 // Consistent Y position for both logos
      
      // Add SLT logo (left side)
      try {
        const logoImg = new Image()
        logoImg.src = '/logo.png'
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
        })
        pdf.addImage(logoImg, 'PNG', leftLogoX, logoY, logoSize, logoSize)
      } catch {
        // Fallback: SLT blue circle (matching the increased size)
        pdf.setFillColor(0, 100, 200)
        pdf.circle(leftLogoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(14)
        pdf.text('SLT', leftLogoX + logoSize/2 - 8, logoY + logoSize/2 + 3, { align: 'center' })
      }

      // Add Transzent logo (right side)
      try {
        const transzenttLogoImg = new Image()
        transzenttLogoImg.src = '/Transzent Logo.png'
        await new Promise((resolve, reject) => {
          transzenttLogoImg.onload = resolve
          transzenttLogoImg.onerror = reject
        })
        pdf.addImage(transzenttLogoImg, 'PNG', rightLogoX, logoY, logoSize, logoSize)
      } catch {
        // Fallback: Transzent green circle (matching the increased size)
        pdf.setFillColor(0, 150, 100)
        pdf.circle(rightLogoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.text('TZ', rightLogoX + logoSize/2 - 6, logoY + logoSize/2 + 3, { align: 'center' })
      }

      // Company title section (positioned to align with logo center)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 100, 200) // SLT Blue
      pdf.setFontSize(22)
      pdf.text('Sri Lanka Telecom PLC', 105, 28, { align: 'center' })
      
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(60, 60, 60) // Dark gray
      pdf.setFontSize(14)
      pdf.text('Digital Queue Management Platform', 105, 38, { align: 'center' })

      // Horizontal separator line (moved down to provide space)
      pdf.setDrawColor(200, 200, 200) // Light gray
      pdf.setLineWidth(0.5)
      pdf.line(30, 58, 180, 58) // Horizontal line from x:30 to x:180 at y:58

      // Teleshop information section
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0) // Black
      pdf.setFontSize(20)
      pdf.text(branch.name, 105, 78, { align: 'center' })
      
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(80, 80, 80) // Medium gray
      pdf.setFontSize(14)
      pdf.text(branch.location, 105, 91, { align: 'center' })

      // QR Code with border
      const registrationUrl = `${window.location.origin}/register/${branch.id}?qr=${encodeURIComponent(qrCode.token)}`
      
      // QR Code border (draw before QR code)
      pdf.setDrawColor(0, 0, 0) // Black border
      pdf.setLineWidth(2)
      pdf.rect(40, 105, 130, 130, 'S') // Border around QR code area
      
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
        
        // QR Code with padding inside border
        pdf.addImage(qrImage, 'PNG', 45, 110, 120, 120)
      } catch {
        // Fallback: Simple black rectangle with border
        pdf.setFillColor(0, 0, 0)
        pdf.rect(45, 110, 120, 120, 'F')
        
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(16)
        pdf.text('QR Code', 105, 165, { align: 'center' })
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(12)
        pdf.text('(Scan to Register)', 105, 175, { align: 'center' })
      }

      // Instructions
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 100, 200) // SLT Blue
      pdf.setFontSize(16)
      pdf.text('Scan to Join Digital Queue', 105, 250, { align: 'center' })

      // Footer
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(120, 120, 120) // Light gray
      const now = new Date()
      pdf.text(`Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 105, 275, { align: 'center' })

      // Save PDF
      const filename = `QR_Display_${branch.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading teleshop information...</p>
        </div>
      </div>
    )
  }

  if (!branch) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md mx-auto">
          <QrCode className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-400" />
          <h1 
            className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2"
            style={{ fontSize: `clamp(1.125rem, 4vw, 1.5rem)` }}
          >
            No Branch Assigned
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">You are not assigned to any teleshop branch.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-screen-2xl mx-auto w-full overflow-hidden flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 mb-4 sm:mb-6">
        <div>
          <h1 
            className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1"
            style={{ fontSize: `clamp(1.25rem, 4vw, 2rem)` }}
          >
            QR Code Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Manage QR codes for customer registration at your teleshop</p>
        </div>
      </div>

      {copySuccess && (
        <div className="flex-shrink-0 bg-green-50 border border-green-200 text-green-800 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 sm:mb-6">
          <span className="text-sm sm:text-base">{copySuccess}</span>
        </div>
      )}

      {/* Branch Information Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 sm:mb-6">
          <div className="mb-4 sm:mb-0">
            <h2 
              className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-1"
              style={{ fontSize: `clamp(1.125rem, 3vw, 1.5rem)` }}
            >
              {branch.name}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-2">{branch.location}</p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
              <span>Counters: {branch.counterCount}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                branch.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {branch.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Grid - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="text-center p-3 sm:p-4 rounded-xl border border-blue-100 bg-blue-50">
            <p 
              className="font-bold text-blue-600 tabular-nums mb-1"
              style={{ fontSize: `clamp(1.25rem, 3vw, 2rem)` }}
            >
              {branch.customersServed}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Served Today</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl border border-orange-100 bg-orange-50">
            <p 
              className="font-bold text-orange-600 tabular-nums mb-1"
              style={{ fontSize: `clamp(1.25rem, 3vw, 2rem)` }}
            >
              {branch.totalWaiting}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Currently Waiting</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl border border-green-100 bg-green-50">
            <p 
              className="font-bold text-green-600 tabular-nums mb-1"
              style={{ fontSize: `clamp(1.25rem, 3vw, 2rem)` }}
            >
              {branch.avgWaitingTime}min
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Avg Wait Time</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl border border-purple-100 bg-purple-50">
            <p 
              className="font-bold text-purple-600 tabular-nums mb-1"
              style={{ fontSize: `clamp(1.25rem, 3vw, 2rem)` }}
            >
              {branch.activeOfficers}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Active Officers</p>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="border-t border-gray-100 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">QR Code</h3>
            {qrCode && (
              <div className="text-xs sm:text-sm text-gray-500">
                Generated: {new Date(qrCode.generatedAt).toLocaleDateString()} at {new Date(qrCode.generatedAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {qrCode ? (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={handleViewQR}
                className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
              >
                <Eye className="h-4 w-4" />
                View QR
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              
              <button
                onClick={handleCopyRegistrationUrl}
                className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base font-medium"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Copy Registration URL</span>
                <span className="sm:hidden">Copy URL</span>
              </button>
              
              <button
                onClick={refreshQRCode}
                disabled={refreshingQR}
                className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm sm:text-base font-medium"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingQR ? 'animate-spin' : ''}`} />
                Refresh QR
              </button>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <QrCode className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-400" />
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">No QR code generated yet</p>
              <button
                onClick={generateQRCode}
                disabled={refreshingQR}
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base font-medium"
              >
                <QrCode className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshingQR ? 'animate-spin' : ''}`} />
                Generate QR Code
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal - Responsive */}
      {showQRModal && qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full p-4 sm:p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-4">
                QR Code - {branch.name}
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-light flex-shrink-0"
              >
                ×
              </button>
            </div>
            
            <div className="text-center">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-xl inline-block border">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/register/${branch.id}?qr=${encodeURIComponent(qrCode.token)}`)}`}
                  alt="QR Code"
                  className="mx-auto w-40 h-40 sm:w-48 sm:h-48"
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-3 sm:mt-4 leading-relaxed">
                Customers can scan this QR code to join the digital queue
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Confirmation Dialog - Responsive */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full p-4 sm:p-6 shadow-2xl">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">Confirm QR Code Refresh</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 leading-relaxed">
              Refreshing the QR code will invalidate the current QR code and generate a new one. 
              Any existing printed QR codes will stop working.
            </p>
            <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2">
              Type exactly: <code className="bg-gray-100 px-1 py-0.5 sm:px-2 sm:py-1 rounded text-xs sm:text-sm">yes i need to refresh the qr code</code>
            </p>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 text-sm sm:text-base"
              placeholder="Type confirmation text..."
            />
            {confirmError && (
              <p className="text-red-600 text-xs sm:text-sm mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-lg p-2">{confirmError}</p>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false)
                  setConfirmationText("")
                  setConfirmError("")
                }}
                className="px-3 py-2 sm:px-4 sm:py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmRefresh}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium order-1 sm:order-2"
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