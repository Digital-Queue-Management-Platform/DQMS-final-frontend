"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  UserPlus,
  Phone,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import api from "../config/api"

interface TeleshopManager {
  id: string
  name: string
  mobileNumber: string
  isActive: boolean
  createdAt: string
  branchId?: string
  branch?: {
    id: string
    name: string
    location: string
  }
}

interface NewTeleshopManagerForm {
  name: string
  mobileNumber: string
  email: string
}

export default function ManagerTeleshopManagers() {
  const navigate = useNavigate()
  const [teleshopManagers, setTeleshopManagers] = useState<TeleshopManager[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successData, setSuccessData] = useState<{ name: string; mobile: string; email: string } | null>(null)
  const [formData, setFormData] = useState<NewTeleshopManagerForm>({
    name: "",
    mobileNumber: "",
    email: ""
  })
  const [branches, setBranches] = useState<Array<{ id: string, name: string, location: string }>>([])
  const [showAssignBranchModal, setShowAssignBranchModal] = useState(false)
  const [selectedTeleshopManager, setSelectedTeleshopManager] = useState<TeleshopManager | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)

  useEffect(() => {
    fetchTeleshopManagers()
    fetchBranches()
  }, [])

  const fetchTeleshopManagers = async () => {
    try {
      const token = localStorage.getItem("managerToken")
      if (!token) {
        navigate("/manager/login")
        return
      }

      const response = await api.get("/manager/teleshop-managers", {
        headers: { Authorization: `Bearer ${token}` }
      })

      setTeleshopManagers(response.data)
    } catch (error: any) {
      console.error("Failed to fetch teleshop managers:", error)
      if (error.response?.status === 401) {
        localStorage.removeItem("managerToken")
        localStorage.removeItem("manager")
        navigate("/manager/login")
      } else {
        setError("Failed to load teleshop managers")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("managerToken")
      if (!token) return

      const storedManager = localStorage.getItem('manager')
      const managerData = storedManager ? JSON.parse(storedManager) : null
      const params: any = {}
      if (managerData?.email) params.email = managerData.email

      const meRes = await api.get('/manager/me', { params })
      const outlets = meRes.data?.manager?.outlets || []
      setBranches(outlets)
    } catch (error) {
      console.error("Failed to fetch branches:", error)
    }
  }

  const handleAssignBranch = async () => {
    if (!selectedTeleshopManager) return

    try {
      const token = localStorage.getItem("managerToken")
      if (!token) {
        navigate("/manager/login")
        return
      }

      const response = await api.patch(
        `/manager/teleshop-managers/${selectedTeleshopManager.id}/assign-branch`,
        { branchId: selectedBranchId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        setTeleshopManagers(prev => prev.map(tm =>
          tm.id === selectedTeleshopManager.id
            ? { ...tm, branchId: selectedBranchId ?? undefined, branch: branches.find(b => b.id === selectedBranchId) }
            : tm
        ))
        setShowAssignBranchModal(false)
        setSelectedTeleshopManager(null)
        setSelectedBranchId(null)
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to assign branch")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("managerToken")
      if (!token) {
        navigate("/manager/login")
        return
      }

      const response = await api.post("/manager/teleshop-managers", formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setTeleshopManagers(prev => [...prev, response.data.teleshopManager])
        setSuccessData({
          name: formData.name,
          mobile: formData.mobileNumber,
          email: formData.email
        })
        setShowAddForm(false)
        setShowSuccessDialog(true)
        setFormData({ name: "", mobileNumber: "", email: "" })
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Failed to create teleshop manager"
      console.error("Teleshop manager creation error:", errorMessage)
      setError(errorMessage)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (teleshopManagerId: string, teleshopManagerName: string) => {
    if (!window.confirm(`Are you sure you want to delete teleshop manager "${teleshopManagerName}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem("managerToken")
      if (!token) {
        navigate("/manager/login")
        return
      }

      const response = await api.delete(`/manager/teleshop-managers/${teleshopManagerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setTeleshopManagers(prev => prev.filter(tm => tm.id !== teleshopManagerId))
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Failed to delete teleshop manager"
      console.error("Teleshop manager deletion error:", errorMessage)
      setError(errorMessage)
    }
  }

  const handleToggleStatus = async (teleshopManagerId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("managerToken")
      if (!token) {
        navigate("/manager/login")
        return
      }

      const response = await api.patch(`/manager/teleshop-managers/${teleshopManagerId}`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        setTeleshopManagers(prev => prev.map(tm =>
          tm.id === teleshopManagerId
            ? { ...tm, isActive: !currentStatus }
            : tm
        ))
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Failed to update teleshop manager"
      console.error("Teleshop manager update error:", errorMessage)
      setError(errorMessage)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", mobileNumber: "", email: "" })
    setShowAddForm(false)
    setError("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teleshop managers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Teleshop Managers</h1>
        <p className="text-gray-600">Manage teleshop managers in your region</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Add New Teleshop Manager Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddForm(true)}
          className="text-green-600 px-4 py-2 rounded-lg border-2 border-green-500 hover:text-white hover:bg-green-500 transition-colors flex items-center"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Add Teleshop Manager
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-sm-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Teleshop Manager</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter Teleshop Manager's name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="070XXXXXXX"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {formLoading ? "Creating..." : "Create Manager"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && successData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-sm-xl w-full max-w-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Teleshop Manager Created Successfully!
                </h3>
                <p className="text-sm text-gray-600">
                  The account has been created and login credentials have been sent to their email.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Account Details:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{successData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{successData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Login Mobile:</span>
                    <span className="font-medium font-mono">{successData.mobile}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>Welcome email sent!</strong><br />
                      The teleshop manager will receive login instructions at <strong>{successData.email}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSuccessDialog(false)}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teleshop Managers List */}
      {teleshopManagers.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Branch
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teleshopManagers.map((manager) => (
                  <tr key={manager.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {/*<div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                        </div>*/}
                        <div className="">
                          <div className="text-sm font-medium text-gray-900">{manager.name}</div>
                          <div className="text-sm text-gray-500">Teleshop Manager</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {manager.mobileNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {manager.branch ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{manager.branch.name}</div>
                          <div className="text-sm text-gray-500">{manager.branch.location}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not assigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${manager.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        }`}>
                        {manager.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(manager.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTeleshopManager(manager)
                          setSelectedBranchId(manager.branchId || null)
                          setShowAssignBranchModal(true)
                        }}
                        className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        {manager.branch ? 'Change Branch' : 'Assign Branch'}
                      </button>
                      <button
                        onClick={() => handleToggleStatus(manager.id, manager.isActive)}
                        className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${manager.isActive
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                      >
                        {manager.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(manager.id, manager.name)}
                        className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                        title="Delete Teleshop Manager"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Teleshop Managers</h3>
          <p className="text-gray-500 mb-4">You haven't added any teleshop managers yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Add First Teleshop Manager
          </button>
        </div>
      )}

      {/* Assign Branch Modal */}
      {showAssignBranchModal && selectedTeleshopManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-sm-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Assign Branch
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Teleshop Manager: <strong>{selectedTeleshopManager.name}</strong>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Branch
                </label>
                <select
                  value={selectedBranchId || ""}
                  onChange={(e) => setSelectedBranchId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                >
                  <option value="">No Branch (Unassign)</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignBranchModal(false)
                    setSelectedTeleshopManager(null)
                    setSelectedBranchId(null)
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignBranch}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {selectedBranchId ? 'Assign Branch' : 'Unassign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}