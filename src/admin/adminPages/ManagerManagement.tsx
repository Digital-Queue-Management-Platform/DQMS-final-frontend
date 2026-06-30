import React, { useState, useEffect } from 'react'
import api from '../../config/api'

interface Manager {
  id: string
  name: string // Region name
  managerId: string // RTOM name
  managerEmail: string
  managerMobile?: string
  createdAt: string
  teleshopManagers?: {
    id: string
    name: string
    mobileNumber?: string
    isActive: boolean
  }[]
  dgm?: {
    id: string
    name: string
    gm?: {
      id: string
      name: string
    }
  }
  region?: {
    id: string
    name: string
  }
}

const ManagerManagement: React.FC = () => {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)


  useEffect(() => {
    fetchManagers()
  }, [])

  const fetchManagers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/rtoms')
      
      console.log('RTOM data received:', response.data.rtoms)
      
      // Transform RTOM data to match the expected Manager interface
      const transformedData = response.data.rtoms?.map((rtom: any) => ({
        id: rtom.id,
        name: rtom.region?.name || 'Unknown Region',
        managerId: rtom.name || `RTOM-${rtom.id.substring(0, 8)}`,  // Fallback to short ID if name is missing
        managerEmail: rtom.email || '',
        managerMobile: rtom.mobileNumber || '',
        createdAt: rtom.createdAt,
        outlets: [], // RTOMs don't directly have outlets, they have teleshop managers
        teleshopManagers: rtom.teleshopManagers || [],
        dgm: rtom.dgm,
        region: rtom.region
      })) || []
      
      setManagers(transformedData)
    } catch (err: any) {
      console.error('Failed to fetch RTOMs:', err)
      setError('Failed to load RTOMs')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = () => {
    // Since RTOMs login with mobile number only, this is just an info dialog
    // Simply close the dialog
    setShowResetDialog(false)
    setSelectedManager(null)
    setError('')
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
        <div className="text-slate-600">Loading RTOMs...</div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">RTOM Management</h1>
        <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">View and manage RTOM (Regional Telecommunication Office Manager) accounts</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[768px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base">Manager</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base hidden lg:table-cell">Region</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base hidden md:table-cell">Contact</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base">Teleshops</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base hidden xl:table-cell">Created</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {managers.map((manager) => (
                <tr key={manager.id} className="hover:bg-slate-50">
                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                    <div>
                      <div className="font-medium text-slate-900 text-sm sm:text-base">
                        {manager.managerId || 'Unnamed RTOM'}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 truncate max-w-[200px]">{manager.managerEmail}</div>
                      <div className="lg:hidden mt-1">
                        <div className="text-xs sm:text-sm text-slate-600">{manager.name}</div>
                      </div>
                      <div className="md:hidden mt-1">
                        <div className="text-xs text-slate-600">{manager.managerMobile || 'No mobile'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6 hidden lg:table-cell">
                    <div className="font-medium text-slate-900 text-sm sm:text-base">{manager.name}</div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6 hidden md:table-cell">
                    <div className="text-slate-700 text-sm sm:text-base">
                      {manager.managerMobile || 'No mobile'}
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                    <div className="text-slate-700 text-sm sm:text-base">
                      {manager.teleshopManagers?.length || 0} manager{(manager.teleshopManagers?.length || 0) !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500">
                      DGM: {manager.dgm?.name || 'Not assigned'}
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6 hidden xl:table-cell">
                    <div className="text-slate-700 text-sm">
                      {new Date(manager.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                    <button
                      onClick={() => openResetDialog(manager)}
                      className="bg-blue-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm hover:bg-blue-700 transition-colors"
                    >
                      <span className="hidden sm:inline">View Info</span>
                      <span className="sm:hidden">Info</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {managers.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <div className="text-slate-500 text-sm sm:text-base">No RTOMs found</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">
                Create regions with RTOMs in the Branches section
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Dialog */}
      {showResetDialog && selectedManager && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={closeResetDialog} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm sm:max-w-md w-full mx-4">
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4">
                  RTOM Login Information
                </h2>
                
                <div className="mb-3 sm:mb-4">
                  <p className="text-slate-600 text-sm sm:text-base">
                    RTOM: <strong>{selectedManager.managerId || 'Unnamed'}</strong>
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{selectedManager.managerEmail}</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="mb-4 sm:mb-6 bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-slate-600 text-sm mb-2 font-medium">
                    Login Method: Mobile Number Only
                  </p>
                  <p className="text-slate-600 text-xs sm:text-sm">
                    RTOMs login using their mobile number - no password required. Mobile: <strong>{selectedManager.managerMobile || 'Not set'}</strong>
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={closeResetDialog}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Got it
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