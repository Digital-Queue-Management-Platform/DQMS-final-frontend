import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../config/api'
import { Eye, EyeOff, Copy, RefreshCw, Save, ExternalLink, Settings } from 'lucide-react'

export default function TeleshopManagerKioskSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [outlet, setOutlet] = useState<any>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showServiceTypeInQueue, setShowServiceTypeInQueue] = useState(false)
  const [togglingServiceType, setTogglingServiceType] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchOutletInfo()
    api.get('/queue/settings/show-service-type')
      .then(res => setShowServiceTypeInQueue(res.data.enabled ?? false))
      .catch(() => {})
  }, [])

  const fetchOutletInfo = async () => {
    try {
      const teleshopManager = localStorage.getItem('teleshopManager')
      if (!teleshopManager) {
        navigate('/teleshop-manager/login')
        return
      }

      const managerData = JSON.parse(teleshopManager)
      if (!managerData.branchId) {
        setError('You are not assigned to any outlet')
        setLoading(false)
        return
      }

      // Fetch outlet info including current password
      const response = await api.get(`/teleshop-manager/kiosk-settings`)
      setOutlet(response.data.outlet)
      setCurrentPassword(response.data.outlet.kioskPassword || '')
      setLoading(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load outlet information')
      setLoading(false)
    }
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }
    setNewPassword(password)
    setConfirmPassword(password)
  }

  const handleSavePassword = async () => {
    setError('')
    setSuccess('')

    if (!newPassword) {
      setError('Please enter a new password')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setSaving(true)
      await api.post('/teleshop-manager/kiosk-settings', {
        kioskPassword: newPassword
      })

      setCurrentPassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Kiosk password updated successfully!')
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const copyPassword = (password: string) => {
    navigator.clipboard.writeText(password)
    alert('Password copied to clipboard!')
  }

  const handleToggleServiceType = async (enabled: boolean) => {
    try {
      setTogglingServiceType(true)
      await api.patch('/queue/settings/show-service-type', { enabled })
      setShowServiceTypeInQueue(enabled)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update setting')
    } finally {
      setTogglingServiceType(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Walk-in Appoinment Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage kiosk password for your outlet staff
          </p>
        </div>

        {error && !success && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {outlet && (
          <div className="bg-white rounded-2xl shadow-sm-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{outlet.name}</h2>
                <p className="text-sm text-gray-600">{outlet.location}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Outlet ID:</span> <code className="bg-gray-100 px-2 py-0.5 rounded">{outlet.id}</code>
                </p>
              </div>
              <button
                onClick={() => window.open('/kiosk/login', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Kiosk Login
              </button>
            </div>

            {/* Current Password Display */}
            {currentPassword && (
              <div className="bg-gray-50 border border-slate-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Kiosk Password:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded font-mono text-lg">
                    {showPassword ? currentPassword : '••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-3 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => copyPassword(currentPassword)}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    title="Copy password"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Set New Password */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {currentPassword ? 'Update Kiosk Password' : 'Set Kiosk Password'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter new password"
                    />
                    <button
                      onClick={generateRandomPassword}
                      className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center gap-2 transition-colors"
                      title="Generate random password"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Generate
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="text"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Re-enter new password"
                  />
                </div>

                <button
                  onClick={handleSavePassword}
                  disabled={saving || !newPassword || newPassword !== confirmPassword}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : currentPassword ? 'Update Password' : 'Set Password'}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">📋 Instructions for Staff:</p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Go to the main page and click "Walk-in Appoinment" button</li>
                <li>Enter outlet ID: <code className="bg-blue-100 px-1 py-0.5 rounded font-semibold">{outlet.id}</code></li>
                <li>Enter the kiosk password (shown above)</li>
                <li>Generate tokens for customers who don't have smartphones</li>
                <li>Share this password only with authorized outlet staff</li>
              </ol>
            </div>

            {/* Security Warning */}
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-800 mb-2">⚠️ Security Note:</p>
              <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                <li>Keep this password confidential</li>
                <li>Only share with trusted outlet staff</li>
                <li>Change password if compromised</li>
                <li>All staff at your outlet will use the same password</li>
              </ul>
            </div>
          </div>
        )}

        {/* Queue Display Settings */}
        <div className="bg-white rounded-2xl shadow-sm-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-800">Queue Display Settings</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Control what information is visible to officers in the My Queue table.
          </p>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-800">Show Service Type in Queue</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When enabled, officers will see the service type column in their queue list.
                When disabled, service type is only shown in the Current Customer panel after calling.
              </p>
            </div>
            <button
              onClick={() => handleToggleServiceType(!showServiceTypeInQueue)}
              disabled={togglingServiceType}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                showServiceTypeInQueue ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={showServiceTypeInQueue}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showServiceTypeInQueue ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Current status: Service type is <strong>{showServiceTypeInQueue ? 'visible' : 'hidden'}</strong> in the officer queue list.
          </p>
        </div>
      </div>
    </div>
  )
}
