"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Building2, Users, Clock, Star, AlertCircle, Plus, Pencil, Trash2, X } from "lucide-react"
// ManagerTopBar is provided globally from Layout for manager routes
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

export default function ManagerBranches() {
  const navigate = useNavigate()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState<null | { mode: 'add' } | { mode: 'edit', branch: Branch }>(null)
  const [form, setForm] = useState({ name: '', location: '', counterCount: 0, isActive: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Manager authentication is handled globally by Layout
    fetchBranches()
  }, [navigate])

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
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setForm({ name: '', location: '', counterCount: 0, isActive: true })
    setShowModal({ mode: 'add' })
  }

  const openEdit = (branch: Branch) => {
    setForm({
      name: branch.name,
      location: branch.location,
      counterCount: branch.counterCount,
      isActive: branch.isActive,
    })
    setShowModal({ mode: 'edit', branch })
  }

  const submitForm = async () => {
    try {
      setSaving(true)
      if (showModal?.mode === 'add') {
        await api.post('/manager/outlets', {
          name: form.name.trim(),
          location: form.location.trim(),
          counterCount: form.counterCount,
        })
      } else if (showModal?.mode === 'edit') {
        await api.patch(`/manager/outlets/${showModal.branch.id}`, {
          name: form.name.trim(),
          location: form.location.trim(),
          counterCount: form.counterCount,
          isActive: form.isActive,
        })
      }
      setShowModal(null)
      await fetchBranches()
    } catch (e) {
      console.error('Failed to save outlet', e)
      // Optional: surface toast
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async (branch: Branch) => {
    if (!window.confirm(`Delete (soft) outlet "${branch.name}"?`)) return
    try {
      await api.delete(`/manager/outlets/${branch.id}`)
      await fetchBranches()
    } catch (e) {
      console.error('Failed to delete outlet', e)
    }
  }

  // handleLogout moved to ManagerTopBar

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading branches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Branches</h2>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Outlet
          </button>
        </div>
        {/* Branch Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Building2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                    <p className="text-sm text-gray-600">{branch.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {branch.isActive ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                  <button
                    onClick={() => openEdit(branch)}
                    title="Edit"
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => confirmDelete(branch)}
                    title="Delete"
                    className="p-2 rounded-md hover:bg-red-50 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Branch Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="w-4 h-4 text-gray-400 mr-1" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{branch.customersServed}</p>
                  <p className="text-xs text-gray-600">Served Today</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="w-4 h-4 text-gray-400 mr-1" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{branch.avgWaitingTime}m</p>
                  <p className="text-xs text-gray-600">Avg Wait</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{branch.rating}</p>
                  <p className="text-xs text-gray-600">Rating</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <AlertCircle className="w-4 h-4 text-gray-400 mr-1" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{branch.totalWaiting}</p>
                  <p className="text-xs text-gray-600">Waiting</p>
                </div>
              </div>

              {/* Branch Details */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Counters:</span>
                  <span className="font-medium text-gray-900">{branch.counterCount}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Active Officers:</span>
                  <span className="font-medium text-gray-900">{branch.activeOfficers}</span>
                </div>
              </div>

              {/* Alert Indicators */}
              {branch.avgWaitingTime > 20 && (
                <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    High wait times detected
                  </p>
                </div>
              )}
              
              {branch.totalWaiting > 10 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-700 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Queue backlog alert
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {branches.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No branches found</h3>
            <p className="text-gray-600">No branches are assigned to your region.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(null)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {showModal.mode === 'add' ? 'Add Outlet' : 'Edit Outlet'}
              </h3>
              <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => setShowModal(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Outlet name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Address or area"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Counters</label>
                <input
                  type="number"
                  min={0}
                  value={form.counterCount}
                  onChange={(e) => setForm((f) => ({ ...f, counterCount: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                />
              </div>
              {showModal.mode === 'edit' && (
                <div className="flex items-center gap-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(null)} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
              <button
                onClick={submitForm}
                disabled={saving || !form.name.trim() || !form.location.trim()}
                className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : showModal.mode === 'add' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}