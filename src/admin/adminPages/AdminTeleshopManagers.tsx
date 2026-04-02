import React, { useState, useEffect } from 'react'
import api from '../../config/api'

interface TeleshopManager {
  id: string
  name: string
  mobileNumber: string
  email?: string
  isActive: boolean
  createdAt: string
  branchId?: string
  rtom?: {
    id: string
    name: string
    region: {
      id: string
      name: string
    }
    dgm?: {
      id: string
      name: string
      province?: {
        id: string
        name: string
      }
      gm?: {
        id: string
        name: string
      }
    }
  }
  branch?: {
    id: string
    name: string
    location: string
  }
  region?: {
    id: string
    name: string
  }
  officers?: {
    id: string
    name: string
    isActive: boolean
  }[]
}

const AdminTeleshopManagers: React.FC = () => {
  const [teleshopManagers, setTeleshopManagers] = useState<TeleshopManager[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedManager, setSelectedManager] = useState<TeleshopManager | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const adminToken = localStorage.getItem("adminToken") || localStorage.getItem("dq_jwt")

  const fetchTeleshopManagers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/teleshop-managers', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      setTeleshopManagers(response.data.teleshopManagers || [])
      setError("")
    } catch (err: any) {
      console.error('Failed to fetch teleshop managers:', err)
      setError('Failed to load teleshop managers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeleshopManagers()
  }, [])

  const openDetailDialog = (manager: TeleshopManager) => {
    setSelectedManager(manager)
    setShowDetailDialog(true)
  }

  const closeDetailDialog = () => {
    setSelectedManager(null)
    setShowDetailDialog(false)
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Loading teleshop managers...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Teleshop Managers</h1>
        <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">
          View and manage teleshop manager accounts across all regions
        </p>
      </div>

      {/* Stats */}
      <div className="mb-4 sm:mb-6 bg-blue-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg">
        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          <div className="font-medium text-blue-800">Total: {teleshopManagers.length}</div>
          <div className="text-blue-600">
            Active: {teleshopManagers.filter(m => m.isActive).length}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Teleshop Managers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[768px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base">Manager</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base hidden lg:table-cell">Region</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base hidden md:table-cell">RTOM</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base">Outlet</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base">Officers</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base hidden xl:table-cell">Status</th>
                <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {teleshopManagers.map((manager) => (
                <tr key={manager.id} className="hover:bg-slate-50">
                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                    <div>
                      <div className="font-medium text-slate-900 text-sm sm:text-base">
                        {manager.name}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 truncate max-w-[200px]">
                        {manager.email || 'No email'}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600">
                        {manager.mobileNumber}
                      </div>
                      <div className="lg:hidden mt-1">
                        <div className="text-xs sm:text-sm text-slate-600">
                          {manager.rtom?.region?.name || 'No region'}
                        </div>
                      </div>
                      <div className="md:hidden mt-1">
                        <div className="text-xs text-slate-600">
                          RTOM: {manager.rtom?.name || 'Not assigned'}
                        </div>
                      </div>
                      <div className="xl:hidden mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          manager.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {manager.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6 hidden lg:table-cell">
                    <div className="font-medium text-slate-900 text-sm sm:text-base">
                      {manager.rtom?.region?.name || 'No region'}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500">
                      Province: {manager.rtom?.dgm?.province?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6 hidden md:table-cell">
                    <div className="text-slate-700 text-sm sm:text-base">
                      {manager.rtom?.name || 'Not assigned'}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500">
                      DGM: {manager.rtom?.dgm?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                    <div className="text-slate-700 text-sm sm:text-base">
                      {manager.branch?.name || 'No outlet'}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500">
                      {manager.branch?.location || ''}
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                    <div className="text-slate-700 text-sm sm:text-base">
                      {manager.officers?.length || 0} officers
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500">
                      {manager.officers?.filter(o => o.isActive).length || 0} active
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6 hidden xl:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      manager.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {manager.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                    <button
                      onClick={() => openDetailDialog(manager)}
                      className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs sm:text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              
              {teleshopManagers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 sm:py-12">
                    <div className="text-slate-500 text-sm sm:text-base">No teleshop managers found</div>
                    <div className="text-xs sm:text-sm text-slate-400 mt-1">
                      Teleshop managers are created by RTOMs
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      {showDetailDialog && selectedManager && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={closeDetailDialog} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4">
                  Teleshop Manager Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-slate-700 mb-2">Manager Information</h3>
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
                      <div><strong>Name:</strong> {selectedManager.name}</div>
                      <div><strong>Mobile:</strong> {selectedManager.mobileNumber}</div>
                      <div><strong>Email:</strong> {selectedManager.email || 'Not provided'}</div>
                      <div><strong>Status:</strong> 
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          selectedManager.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedManager.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div><strong>Created:</strong> {new Date(selectedManager.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-slate-700 mb-2">Hierarchy</h3>
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
                      <div><strong>Region:</strong> {selectedManager.rtom?.region?.name || 'Not assigned'}</div>
                      <div><strong>Province:</strong> {selectedManager.rtom?.dgm?.province?.name || 'Not assigned'}</div>
                      <div><strong>GM:</strong> {selectedManager.rtom?.dgm?.gm?.name || 'Not assigned'}</div>
                      <div><strong>DGM:</strong> {selectedManager.rtom?.dgm?.name || 'Not assigned'}</div>
                      <div><strong>RTOM:</strong> {selectedManager.rtom?.name || 'Not assigned'}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-slate-700 mb-2">Outlet Information</h3>
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
                      <div><strong>Outlet:</strong> {selectedManager.branch?.name || 'Not assigned'}</div>
                      <div><strong>Location:</strong> {selectedManager.branch?.location || 'Not specified'}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-slate-700 mb-2">Officers ({selectedManager.officers?.length || 0})</h3>
                    <div className="bg-slate-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                      {selectedManager.officers && selectedManager.officers.length > 0 ? (
                        <div className="space-y-2 text-sm">
                          {selectedManager.officers.map((officer) => (
                            <div key={officer.id} className="flex items-center justify-between">
                              <span>{officer.name}</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                officer.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {officer.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 text-sm">No officers assigned</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={closeDetailDialog}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm sm:text-base"
                  >
                    Close
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

export default AdminTeleshopManagers