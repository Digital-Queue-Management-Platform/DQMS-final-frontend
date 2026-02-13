import { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface Outlet {
  id: string
  name: string
  location: string
  regionName: string
  regionId: string
  isActive: boolean
  kioskPassword: string | null
  counterCount: number
  officerCount: number
  createdAt: string
}

export default function AdminOutletPasswords() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})
  const [resettingPassword, setResettingPassword] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)

  useEffect(() => {
    loadOutlets()
  }, [])

  const loadOutlets = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch(`${API_URL}/admin/outlets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load outlets')
      }

      const data = await response.json()
      setOutlets(data)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load outlets')
      setLoading(false)
    }
  }

  const handleResetPassword = async (outletId: string) => {
    if (!confirm('Are you sure you want to reset the kiosk password for this outlet?')) {
      return
    }

    setResettingPassword(outletId)
    setNewPassword(null)

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch(`${API_URL}/admin/outlets/${outletId}/reset-kiosk-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to reset password')
      }

      const data = await response.json()
      setNewPassword(data.newPassword)

      // Reload outlets to get updated password
      await loadOutlets()
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setResettingPassword(null)
    }
  }

  const togglePasswordVisibility = (outletId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [outletId]: !prev[outletId]
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Password copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Outlet Kiosk Passwords</h1>
        <p className="text-gray-600 mt-2">
          Manage walk-in kiosk passwords for all outlets. These passwords are used by staff to access the walk-in token generation system.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {newPassword && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-green-800">Password Reset Successful</h3>
              <div className="mt-2 text-sm text-green-700">
                <p className="mb-2">New kiosk password has been generated:</p>
                <div className="bg-white border border-green-300 rounded px-4 py-3 font-mono text-lg flex items-center justify-between">
                  <span className="text-gray-800">{newPassword}</span>
                  <button
                    onClick={() => copyToClipboard(newPassword)}
                    className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-2 text-xs">Please share this password securely with the outlet staff.</p>
              </div>
            </div>
            <button
              onClick={() => setNewPassword(null)}
              className="ml-3 text-green-600 hover:text-green-800"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outlet
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Region
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kiosk Password
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {outlets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No outlets found
                </td>
              </tr>
            ) : (
              outlets.map(outlet => (
                <tr key={outlet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{outlet.name}</div>
                    <div className="text-sm text-gray-500">ID: {outlet.id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {outlet.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {outlet.regionName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {outlet.isActive ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {outlet.kioskPassword ? (
                      <div className="flex items-center space-x-2">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {showPassword[outlet.id] ? outlet.kioskPassword : '••••••••'}
                        </code>
                        <button
                          onClick={() => togglePasswordVisibility(outlet.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title={showPassword[outlet.id] ? 'Hide password' : 'Show password'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showPassword[outlet.id] ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                          </svg>
                        </button>
                        <button
                          onClick={() => copyToClipboard(outlet.kioskPassword!)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy password"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleResetPassword(outlet.id)}
                      disabled={resettingPassword === outlet.id}
                      className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resettingPassword === outlet.id ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">About Kiosk Passwords</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Kiosk passwords are automatically generated when a new outlet is created</li>
                <li>These passwords protect the walk-in token generation dashboard at each outlet</li>
                <li>Staff members use these passwords to help customers without smartphones generate tokens</li>
                <li>You can reset passwords at any time if they are compromised</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
