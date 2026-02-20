import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config/api'

export default function KioskLogin() {
  const [outletId, setOutletId] = useState('')
  const [outletName, setOutletName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPreFilled, setIsPreFilled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Only auto-fill if Teleshop Manager is currently logged in (has valid token)
    const teleshopManagerToken = localStorage.getItem('teleshopManagerToken')
    const teleshopManager = localStorage.getItem('teleshopManager')
    
    // Auto-fill only if BOTH token and data exist (meaning they're actively logged in)
    if (teleshopManagerToken && teleshopManager) {
      try {
        const managerData = JSON.parse(teleshopManager)
        if (managerData.branchId) {
          setOutletId(managerData.branchId)
          setOutletName(managerData.branchName || '')
          setIsPreFilled(true)
        }
      } catch (err) {
        console.error('Failed to parse teleshop manager data:', err)
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/kiosk/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outletId, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store the token and outlet info
      localStorage.setItem('kioskToken', data.token)
      localStorage.setItem('kioskOutlet', JSON.stringify(data.outlet))

      // Navigate to kiosk dashboard
      navigate('/kiosk/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Walk-in Appoinment</h1>
          <p className="text-gray-600 mt-2">SLT Queue Management System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {isPreFilled && outletName && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Your Outlet:</span> {outletName}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="outletId" className="block text-sm font-medium text-gray-700 mb-2">
              Outlet ID {isPreFilled && <span className="text-xs text-blue-600">(Auto-filled)</span>}
            </label>
            <input
              type="text"
              id="outletId"
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isPreFilled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="Enter outlet ID"
              required
              readOnly={isPreFilled}
              disabled={isPreFilled}
            />
            {!isPreFilled && (
              <p className="mt-1 text-xs text-gray-500">Get this from your manager</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Kiosk Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter kiosk password"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Password is case-sensitive</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>For assistance, please contact your regional manager</p>
        </div>
      </div>
    </div>
  )
}
