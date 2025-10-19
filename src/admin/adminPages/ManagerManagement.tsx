import React, { useState, useEffect } from 'react'
import api from '../../config/api'

interface Manager {
  id: string
  name: string
  managerId: string
  managerEmail: string
  managerMobile?: string
  createdAt: string
  outlets: {
    id: string
    name: string
    location: string
    isActive: boolean
  }[]
}

const ManagerManagement: React.FC = () => {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    fetchManagers()
  }, [])

  const fetchManagers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/managers')
      setManagers(response.data.managers || [])
    } catch (err: any) {
      console.error('Failed to fetch managers:', err)
      setError('Failed to load regional managers')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedManager) return
    
    setResetLoading(true)
    setError('')
    
    try {
      const response = await api.post(`/admin/managers/${selectedManager.id}/reset-password`)
      
      setShowResetDialog(false)
      setSelectedManager(null)
      setError('')
      
      // Show success message with email status
      if (response.data.emailSent) {
        alert('Password reset successfully! New password has been sent to the manager\'s email.')
      } else {
        alert(`Password reset successfully! ${response.data.message}\n\nNew password: ${response.data.temporaryPassword}\n\nPlease provide this password to the manager manually.`)
      }
    } catch (err: any) {
      console.error('Failed to reset password:', err)
      setError(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setResetLoading(false)
    }
  }

  const openResetDialog = (manager: Manager) => {
    setSelectedManager(manager)
    setShowResetDialog(true)
    setError('')
  }

  const closeResetDialog = () => {
    setShowResetDialog(false)
    setSelectedManager(null)
    setError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading regional managers...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Regional Manager Management</h1>
        <p className="text-slate-600 mt-2">View and manage regional manager accounts</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-slate-700">Manager</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700">Region</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700">Contact</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700">Outlets</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700">Created</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {managers.map((manager) => (
                <tr key={manager.id} className="hover:bg-slate-50">
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-slate-900">
                        {manager.managerId || 'N/A'}
                      </div>
                      <div className="text-sm text-slate-500">{manager.managerEmail}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-slate-900">{manager.name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-slate-700">
                      {manager.managerMobile || 'No mobile'}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-slate-700">
                      {manager.outlets.length} outlet{manager.outlets.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-slate-500">
                      {manager.outlets.filter(o => o.isActive).length} active
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-slate-700">
                      {new Date(manager.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => openResetDialog(manager)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 transition-colors"
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {managers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-500">No regional managers found</div>
              <div className="text-sm text-slate-400 mt-1">
                Create regions with managers in the Branches section
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Dialog */}
      {showResetDialog && selectedManager && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={closeResetDialog} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">
                  Reset Manager Password
                </h2>
                
                <div className="mb-4">
                  <p className="text-slate-600">
                    Reset password for: <strong>{selectedManager.managerId}</strong>
                  </p>
                  <p className="text-sm text-slate-500">{selectedManager.managerEmail}</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="mb-6">
                  <p className="text-slate-600 text-sm">
                    A new secure password will be automatically generated and sent to the manager's email address.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={closeResetDialog}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ManagerManagement