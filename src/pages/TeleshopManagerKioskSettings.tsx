import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../config/api'
import { Eye, EyeOff, Copy, RefreshCw, Save, ExternalLink, MonitorPlay, CheckCircle2, Upload, Video, Trash2 } from 'lucide-react'

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
  const [kioskLaunched, setKioskLaunched] = useState(false)
  const [promoVideoUrl, setPromoVideoUrl] = useState('')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchOutletInfo()
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
      
      let videoUrl = response.data.outlet.displaySettings?.promoVideoUrl || ''
      const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '') || ''
      if (videoUrl.includes('localhost:') && baseUrl && !baseUrl.includes('localhost:')) {
        videoUrl = videoUrl.replace(/http:\/\/localhost:\d+/, baseUrl)
      }
      setPromoVideoUrl(videoUrl)
      
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

  const copyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd)
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.includes('mp4')) {
      setError('Only MP4 videos are supported')
      return
    }

    if (file.size > 200 * 1024 * 1024) {
      setError('Video must be less than 200MB')
      return
    }

    try {
      setUploadingVideo(true)
      setError('')
      setSuccess('')

      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await api.post('/teleshop-manager/upload-promo-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // Ensure the URL works across different network boundaries
      // by constructing it from the known working API_URL
      const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '') || ''
      const newUrl = baseUrl + uploadRes.data.relativeUrl

      await api.post('/teleshop-manager/kiosk-settings', {
        promoVideoUrl: newUrl
      })

      setPromoVideoUrl(newUrl)
      setSuccess('Promo video uploaded successfully!')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload video')
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleRemoveVideo = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await api.post('/teleshop-manager/kiosk-settings', {
        promoVideoUrl: null
      })

      setPromoVideoUrl('')
      setSuccess('Promo video removed successfully!')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove video')
    } finally {
      setSaving(false)
    }
  }

  // Save outlet credentials to localStorage so the Kiosk PC auto-logs in
  const launchKioskSetup = () => {
    if (!outlet || !currentPassword) {
      setError('Please set a kiosk password before launching the kiosk.')
      return
    }
    // Store credentials for the kiosk PC to auto-fill
    localStorage.setItem('kioskSavedCredentials', JSON.stringify({
      outletId: outlet.id,
      outletName: outlet.name,
      password: currentPassword,
      savedAt: new Date().toISOString()
    }))
    setKioskLaunched(true)
    setTimeout(() => setKioskLaunched(false), 4000)
    window.open('/kiosk/login', '_blank')
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
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{outlet.name}</h2>
                <p className="text-sm text-gray-600">{outlet.location}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Outlet ID:</span> <code className="bg-gray-100 px-2 py-0.5 rounded">{outlet.id}</code>
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={launchKioskSetup}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow"
                  title="Saves credentials and opens the kiosk login — staff won't need to type anything"
                >
                  {kioskLaunched
                    ? <><CheckCircle2 className="w-4 h-4" /> Launched!</>
                    : <><MonitorPlay className="w-4 h-4" /> Launch Kiosk on This PC</>}
                </button>
                <button
                  onClick={() => window.open('/kiosk/login', '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Login Page Only
                </button>
              </div>
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
                    title="Copy password to clipboard"
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
                  <div className="flex flex-col sm:flex-row gap-2">
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

            {/* Promo Video Settings */}
            <div className="border-t border-slate-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                Kiosk Idle Screensaver Video
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload a promotional video to play on the Kiosk when it's idle. This will act as the "Home Page" screensaver. Customers can tap the screen to dismiss the video and join the queue.
              </p>

              <div className="bg-gray-50 border border-slate-200 rounded-xl p-6">
                {promoVideoUrl ? (
                  <div className="space-y-4">
                    <div className="aspect-video w-full max-w-md bg-black rounded-lg overflow-hidden relative shadow-sm">
                      <video 
                        src={promoVideoUrl} 
                        controls 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors text-sm font-medium">
                        <Upload className="w-4 h-4" />
                        {uploadingVideo ? 'Uploading...' : 'Replace Video'}
                        <input 
                          type="file" 
                          accept="video/mp4" 
                          className="hidden" 
                          onChange={handleVideoUpload}
                          disabled={uploadingVideo}
                        />
                      </label>
                      <button
                        onClick={handleRemoveVideo}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Video
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                    <MonitorPlay className="w-12 h-12 text-gray-400 mb-3" />
                    <h4 className="text-sm font-medium text-gray-900 mb-1">No Video Configured</h4>
                    <p className="text-xs text-gray-500 mb-4 text-center">
                      Upload an MP4 video (max 200MB) to be displayed on the idle Kiosk screen.
                    </p>
                    <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors font-medium text-sm shadow-sm">
                      <Upload className="w-4 h-4" />
                      {uploadingVideo ? 'Uploading...' : 'Upload Video'}
                      <input 
                        type="file" 
                        accept="video/mp4" 
                        className="hidden" 
                        onChange={handleVideoUpload}
                        disabled={uploadingVideo}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">📋 Setup Instructions:</p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Set a kiosk password above (or generate one)</li>
                <li>On the <strong>central kiosk PC</strong>, click <span className="font-semibold text-indigo-700">"Launch Kiosk on This PC"</span></li>
                <li>The kiosk login will open and auto-fill the outlet ID and password</li>
                <li>Staff just click <strong>"Start Kiosk Session"</strong> — no typing needed</li>
                <li>The browser will also offer to save the password for future logins</li>
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

      </div>
    </div>
  )
}
