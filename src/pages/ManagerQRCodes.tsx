"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { QrCode, Eye, Copy, ExternalLink, Printer, RefreshCw } from "lucide-react"
import api from "../config/api"

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

export default function ManagerQRCodes() {
  const navigate = useNavigate()
  const [branches, setBranches] = useState<Branch[]>([])
  const [qrCodes, setQrCodes] = useState<Map<string, QRCodeData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [refreshingQR, setRefreshingQR] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [branchToRefresh, setBranchToRefresh] = useState<Branch | null>(null)
  const [confirmationText, setConfirmationText] = useState("")
  const [confirmError, setConfirmError] = useState("")
  const [copySuccess, setCopySuccess] = useState<string>("")

  useEffect(() => {
    fetchBranches()
    // Initialize QR codes for branches (read existing ones)
    initializeQRCodes()
  }, [navigate])

  const initializeQRCodes = () => {
    // Only read existing QR codes, don't create new ones automatically
    const storedQRCodes = localStorage.getItem('managerQRCodes')
    if (storedQRCodes) {
      const parsed = JSON.parse(storedQRCodes)
      const qrMap = new Map<string, QRCodeData>()
      Object.entries(parsed).forEach(([key, value]) => {
        qrMap.set(key, value as QRCodeData)
      })
      setQrCodes(qrMap)
    }
  }

  const generateNewQRToken = (): string => {
    // Generate a unique token for QR code
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const saveQRCodesToStorage = (qrMap: Map<string, QRCodeData>) => {
    const qrObj = Object.fromEntries(qrMap)
    localStorage.setItem('managerQRCodes', JSON.stringify(qrObj))
  }

  const fetchBranches = async () => {
    try {
      // Get manager-scoped outlets
      const storedManager = localStorage.getItem('manager')
      const managerData = storedManager ? JSON.parse(storedManager) : null
      const params: any = {}
      if (managerData?.email) params.email = managerData.email
      
      const meRes = await api.get('/manager/me', { params })
      const outlets = (meRes.data?.manager?.outlets || [])

      const branchData = await Promise.all(
        outlets.map(async (outlet: any) => {
          try {
            // Get queue data for each branch
            const queueRes = await api.get(`/queue/outlet/${outlet.id}`)
            const queueData = queueRes.data || {}

            // Get today's analytics
            const start = new Date()
            start.setHours(0,0,0,0)
            const end = new Date()
            end.setHours(23,59,59,999)

            const analyticsRes = await api.get('/admin/analytics', {
              params: { 
                outletId: outlet.id, 
                startDate: start.toISOString(), 
                endDate: end.toISOString() 
              }
            })
            const analytics = analyticsRes.data || {}

            const feedbackStats = analytics.feedbackStats || []
            const totalFeedback = feedbackStats.reduce((s: number, f: any) => s + (f._count || 0), 0)
            const avgRating = totalFeedback > 0 ? 
              feedbackStats.reduce((s: number, f: any) => s + (f.rating * (f._count || 0)), 0) / totalFeedback : 0

            return {
              id: outlet.id,
              name: outlet.name,
              location: outlet.location || 'N/A',
              isActive: outlet.isActive,
              counterCount: outlet.counterCount || 0,
              activeOfficers: queueData.availableOfficers || 0,
              totalWaiting: queueData.totalWaiting || 0,
              customersServed: analytics.totalTokens || 0,
              avgWaitingTime: analytics.avgWaitTime || 0,
              rating: Math.round((avgRating || 0) * 10) / 10
            } as Branch
          } catch (e) {
            console.error(`Failed to fetch data for outlet ${outlet.id}`, e)
            return {
              id: outlet.id,
              name: outlet.name,
              location: outlet.location || 'N/A',
              isActive: outlet.isActive,
              counterCount: outlet.counterCount || 0,
              activeOfficers: 0,
              totalWaiting: 0,
              customersServed: 0,
              avgWaitingTime: 0,
              rating: 0
            } as Branch
          }
        })
      )

      setBranches(branchData)
      
      // Don't automatically generate QR codes - let managers do it manually
      // This prevents unwanted QR refreshes on page load
      
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshQR = async (branchId: string) => {
    setRefreshingQR(branchId)
    try {
      // Generate new QR token
      const newToken = generateNewQRToken()
      const newQRData: QRCodeData = {
        outletId: branchId,
        token: newToken,
        generatedAt: new Date().toISOString()
      }
      
      const newQRMap = new Map(qrCodes)
      newQRMap.set(branchId, newQRData)
      setQrCodes(newQRMap)
      saveQRCodesToStorage(newQRMap)
      
      setCopySuccess("QR code refreshed successfully!")
      setTimeout(() => setCopySuccess(""), 3000)
    } catch (error) {
      console.error('Failed to refresh QR code:', error)
      setCopySuccess("Failed to refresh QR code")
      setTimeout(() => setCopySuccess(""), 3000)
    } finally {
      setRefreshingQR(null)
    }
  }

  const handleRefreshRequest = (branch: Branch) => {
    setBranchToRefresh(branch)
    setShowConfirmDialog(true)
    setConfirmationText("")
    setConfirmError("")
  }

  const handleConfirmRefresh = () => {
    const requiredText = "yes i need to refresh the qr code"
    
    if (confirmationText.toLowerCase().trim() !== requiredText) {
      setConfirmError(`Please type exactly: "${requiredText}"`)
      return
    }

    if (branchToRefresh) {
      handleRefreshQR(branchToRefresh.id)
      setShowConfirmDialog(false)
      setBranchToRefresh(null)
      setConfirmationText("")
      setConfirmError("")
    }
  }

  const handleCancelRefresh = () => {
    setShowConfirmDialog(false)
    setBranchToRefresh(null)
    setConfirmationText("")
    setConfirmError("")
  }

  const generateQRUrl = (branchId: string) => {
    const qrData = qrCodes.get(branchId)
    const token = qrData?.token || 'default'
    return `${window.location.origin}/qr/${branchId}?token=${token}`
  }

  const generateRegistrationUrl = (branchId: string) => {
    return `${window.location.origin}/register/${branchId}`
  }

  const getQRGeneratedTime = (branchId: string): string => {
    const qrData = qrCodes.get(branchId)
    if (!qrData) return "Not generated"
    
    const generatedAt = new Date(qrData.generatedAt)
    return generatedAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCopyUrl = async (url: string, type: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopySuccess(`${type} URL copied!`)
      setTimeout(() => setCopySuccess(""), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const handleViewQR = (branch: Branch) => {
    setSelectedBranch(branch)
    setShowQRModal(true)
  }

  const handlePrintQR = (branchId: string) => {
    const qrUrl = generateQRUrl(branchId)
    window.open(qrUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading QR codes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <QrCode className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">QR Code Management</h1>
          </div>
          <p className="text-gray-600">Generate and manage QR codes for customer registration at your branches</p>
        </div>

        {/* Success Message */}
        {copySuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium">{copySuccess}</p>
          </div>
        )}

        {/* Branches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* Branch Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{branch.name}</h3>
                  <p className="text-sm text-gray-600">{branch.location}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  branch.isActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {branch.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

              {/* Branch Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{branch.customersServed}</p>
                  <p className="text-xs text-gray-600">Served Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{branch.avgWaitingTime}m</p>
                  <p className="text-xs text-gray-600">Avg Wait</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{branch.totalWaiting}</p>
                  <p className="text-xs text-gray-600">Waiting</p>
                </div>
              </div>

              {/* QR Actions */}
              <div className="space-y-3">
                {/* QR Status and Actions */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">QR Status:</span>
                    {qrCodes.has(branch.id) ? (
                      <button
                        onClick={() => handleRefreshRequest(branch)}
                        disabled={refreshingQR === branch.id}
                        className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors disabled:bg-gray-400"
                        title="Generate new QR code"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshingQR === branch.id ? 'animate-spin' : ''}`} />
                        {refreshingQR === branch.id ? 'Refreshing...' : 'Refresh'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRefreshRequest(branch)}
                        disabled={refreshingQR === branch.id}
                        className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors disabled:bg-gray-400"
                        title="Generate first QR code"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshingQR === branch.id ? 'animate-spin' : ''}`} />
                        {refreshingQR === branch.id ? 'Generating...' : 'Generate QR'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-700">
                    {qrCodes.has(branch.id) ? getQRGeneratedTime(branch.id) : 'No QR code generated yet'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewQR(branch)}
                    disabled={!qrCodes.has(branch.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4" />
                    View QR
                  </button>
                  <button
                    onClick={() => handlePrintQR(branch.id)}
                    disabled={!qrCodes.has(branch.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyUrl(generateQRUrl(branch.id), "QR Page")}
                    disabled={!qrCodes.has(branch.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-4 h-4" />
                    Copy QR URL
                  </button>
                  <button
                    onClick={() => handleCopyUrl(generateRegistrationUrl(branch.id), "Registration")}
                    disabled={!qrCodes.has(branch.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Copy Reg URL
                  </button>
                </div>
              </div>

              {/* URL Display */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">QR Code URL:</p>
                <p className="text-xs font-mono text-gray-800 break-all">
                  {generateQRUrl(branch.id)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {branches.length === 0 && (
          <div className="text-center py-12">
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Branches Found</h3>
            <p className="text-gray-600">No branches are assigned to your region yet.</p>
          </div>
        )}

        {/* QR Modal */}
        {showQRModal && selectedBranch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">QR Code Preview</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-center mb-4">
                <h4 className="font-medium text-gray-900 mb-1">{selectedBranch.name}</h4>
                <p className="text-sm text-gray-600">{selectedBranch.location}</p>
              </div>

              {/* QR Generation Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-yellow-800 font-medium">QR Code Status</span>
                  <button
                    onClick={() => {
                      handleRefreshRequest(selectedBranch)
                    }}
                    disabled={refreshingQR === selectedBranch.id}
                    className="flex items-center gap-1 px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors disabled:bg-gray-400"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingQR === selectedBranch.id ? 'animate-spin' : ''}`} />
                    {refreshingQR === selectedBranch.id ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                <p className="text-xs text-yellow-700">Generated: {getQRGeneratedTime(selectedBranch.id)}</p>
                <p className="text-xs text-yellow-700 mt-1">Click refresh to generate a new QR code for security</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">QR Code URL:</p>
                <p className="text-sm font-mono text-gray-800 break-all bg-white p-2 rounded border">
                  {generateQRUrl(selectedBranch.id)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCopyUrl(generateQRUrl(selectedBranch.id), "QR Page")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Copy className="w-4 h-4" />
                  Copy URL
                </button>
                <button
                  onClick={() => {
                    handlePrintQR(selectedBranch.id)
                    setShowQRModal(false)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open QR Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && branchToRefresh && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-red-600">Confirm QR Code Refresh</h3>
                <button
                  onClick={handleCancelRefresh}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-800 mb-2">⚠️ Security Warning</h4>
                  <p className="text-sm text-red-700 mb-2">
                    You are about to refresh the QR code for <strong>{branchToRefresh.name}</strong>.
                  </p>
                  <p className="text-sm text-red-700">
                    This will invalidate the current QR code and generate a new one. All existing QR codes will stop working immediately.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To confirm, please type: <span className="font-mono bg-gray-100 px-1 rounded">"yes i need to refresh the qr code"</span>
                  </label>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => {
                      setConfirmationText(e.target.value)
                      setConfirmError("")
                    }}
                    placeholder="Type the confirmation text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    autoFocus
                  />
                  {confirmError && (
                    <p className="text-sm text-red-600 mt-1">{confirmError}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelRefresh}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRefresh}
                  disabled={!confirmationText.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Refresh QR Code
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}