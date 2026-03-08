import React, { useEffect, useState } from 'react'
import api from '../../config/api'
import { MapPin, Plus, X, Edit2, Trash2, Building2, Search } from 'lucide-react'

interface Outlet {
  id: string
  name: string
  location: string
  region?: any
  counterCount?: number
  isActive?: boolean
}

const BranchesPage: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'outlets' | 'regions'>('outlets')

  // Outlet form state
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [regionId, setRegionId] = useState('')
  const [counterCount, setCounterCount] = useState<number>(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [regions, setRegions] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)

  // Region form state — name only
  const [showRegionForm, setShowRegionForm] = useState(false)
  const [regionName, setRegionName] = useState('')
  const [regionLoading, setRegionLoading] = useState(false)

  useEffect(() => {
    fetchOutlets()
    fetchRegions()
  }, [])

  const fetchOutlets = async () => {
    setLoading(true)
    try {
      const res = await api.get('/queue/outlets')
      setOutlets(res.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load outlets')
    } finally {
      setLoading(false)
    }
  }

  const fetchRegions = async () => {
    try {
      const res = await api.get('/queue/regions')
      setRegions(res.data || [])
    } catch (err) {
      console.error('Failed to fetch regions', err)
    }
  }

  const handleCreateOrUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')
    if (!name || !location || !regionId) return setError('All fields are required')

    try {
      if (editingId) {
        const res = await api.patch(`/queue/outlets/${editingId}`, { name, location, regionId, counterCount })
        setOutlets((prev) => prev.map((o) => (o.id === editingId ? res.data.outlet : o)))
        setEditingId(null)
      } else {
        const res = await api.post('/queue/outlets', { name, location, regionId, counterCount })
        setOutlets((prev) => [res.data.outlet, ...prev])
      }
      setName('')
      setLocation('')
      setRegionId('')
      setCounterCount(0)
      setShowForm(false)
    } catch (err: any) {
      console.error('Failed to save outlet', err)
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setError('Failed to save outlet: ' + msg)
    }
  }

  const handleEdit = (o: Outlet) => {
    setEditingId(o.id)
    setName(o.name)
    setLocation(o.location)
    setRegionId(o.region?.id || '')
    setCounterCount((o as any).counterCount || 0)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this outlet?')) return
    try {
      await api.delete(`/queue/outlets/${id}`)
      setOutlets((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      console.error(err)
      setError('Failed to delete outlet')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setName('')
    setLocation('')
    setRegionId('')
    setShowForm(false)
    setError('')
  }

  const handleCreateRegion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!regionName.trim()) return setError('Region name is required')
    setRegionLoading(true)
    setError('')
    try {
      await api.post('/admin/register-region', { name: regionName })
      await fetchRegions()
      setRegionName('')
      setShowRegionForm(false)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setError('Failed to create region: ' + msg)
    } finally {
      setRegionLoading(false)
    }
  }

  const handleCancelRegion = () => {
    setRegionName('')
    setShowRegionForm(false)
    setError('')
  }

  const handleDeleteRegion = async (regionId: string, regionName: string) => {
    if (!confirm(`Are you sure you want to delete "${regionName}" region? This will also affect all outlets in this region.`)) return
    try {
      await api.delete(`/admin/regions/${regionId}`)
      await Promise.all([fetchRegions(), fetchOutlets()])
    } catch (err: any) {
      console.error('Failed to delete region', err)
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setError('Failed to delete region: ' + msg)
    }
  }

  const filteredOutlets = outlets.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.region?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredRegions = regions.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.managerId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto p-3 sm:p-4 lg:p-6 xl:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Branch Management</h1>
              <p className="text-slate-600 text-sm hidden sm:block">Manage your outlet locations and regions</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm sm:hidden">Manage your outlet locations and regions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Outlets</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{outlets.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg">
                <Building2 className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Active Regions</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{regions.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-emerald-100 rounded-lg">
                <MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Outlet Form Section */}
          {showForm && (
            <div className="xl:col-span-1 order-1 xl:order-none">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                    {editingId ? 'Edit Outlet' : 'New Outlet'}
                  </h2>
                  <button onClick={handleCancel} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Outlet Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter outlet name"
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter location address"
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Region</label>
                    <select value={regionId} onChange={(e) => setRegionId(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white text-sm sm:text-base">
                      <option value="">Select a region</option>
                      {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Counters</label>
                    <input type="number" min={0} value={counterCount}
                      onChange={(e) => setCounterCount(Math.max(0, parseInt(e.target.value || '0')))}
                      placeholder="Number of counters"
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base" />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm sm:text-base">
                      {editingId ? 'Update Outlet' : 'Create Outlet'}
                    </button>
                    <button type="button" onClick={handleCancel}
                      className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm sm:text-base">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* List */}
          <div className={showForm ? "xl:col-span-2 order-2 xl:order-none" : "xl:col-span-3"}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200">
              <div className="p-4 sm:p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 sm:gap-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                      {viewMode === 'outlets' ? 'All Outlets' : 'All Regions'}
                    </h2>
                    <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'outlets' | 'regions')}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white w-full sm:w-auto">
                      <option value="outlets">View Outlets</option>
                      <option value="regions">View Regions</option>
                    </select>
                  </div>
                  {!showForm && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button onClick={() => setShowRegionForm(true)}
                        className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Region</span>
                        <span className="sm:hidden">Region</span>
                      </button>
                      <button onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Outlet</span>
                        <span className="sm:hidden">Outlet</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <input type="text"
                    placeholder={viewMode === 'outlets' ? "Search outlets by name, location, or region..." : "Search regions by name or RTOM..."}
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base" />
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-indigo-600"></div>
                    <p className="text-slate-600 mt-3 text-sm sm:text-base">Loading {viewMode}...</p>
                  </div>
                ) : viewMode === 'outlets' ? (
                  filteredOutlets.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 text-sm sm:text-base">
                        {searchTerm ? 'No outlets found matching your search' : 'No outlets yet'}
                      </p>
                      {!searchTerm && !showForm && (
                        <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm sm:text-base">
                          Create your first outlet
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {filteredOutlets.map((o) => (
                        <div key={o.id} className="group bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5 hover:shadow-md hover:border-indigo-300 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-800 text-base sm:text-lg mb-1 truncate">{o.name}</h3>
                              <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{o.location}</span>
                              </div>
                              {o.region && (
                                <span className="inline-block px-2 sm:px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                  {o.region.name}
                                </span>
                              )}
                              <div className="text-sm text-slate-600 mt-2">
                                Counters: <span className="font-medium text-slate-800">{(o as any).counterCount ?? 0}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                            <button onClick={() => handleEdit(o)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs sm:text-sm font-medium">
                              <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" /> Edit
                            </button>
                            <button onClick={() => handleDelete(o.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs sm:text-sm font-medium">
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  filteredRegions.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 text-sm sm:text-base">
                        {searchTerm ? 'No regions found matching your search' : 'No regions yet'}
                      </p>
                      {!searchTerm && (
                        <button onClick={() => setShowRegionForm(true)} className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm sm:text-base">
                          Create your first region
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {filteredRegions.map((r) => (
                        <div key={r.id} className="group bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5 hover:shadow-md hover:border-green-300 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-slate-800 text-base sm:text-lg truncate">{r.name}</h3>
                                {r.managerId ? (
                                  <span className="shrink-0 inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">RTOM Assigned</span>
                                ) : (
                                  <span className="shrink-0 inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">No RTOM</span>
                                )}
                              </div>
                              {r.managerId && (
                                <div className="text-sm text-slate-600 space-y-0.5">
                                  <div><span className="font-medium">RTOM:</span> {r.managerId}</div>
                                  {r.managerMobile && <div><span className="font-medium">Mobile:</span> {r.managerMobile}</div>}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                                <span><span className="font-medium text-slate-800">{outlets.filter(o => o.region?.id === r.id).length}</span> outlets</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                            <button onClick={() => { setSearchTerm(r.name); setViewMode('outlets') }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs sm:text-sm font-medium">
                              <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">View Outlets</span>
                              <span className="sm:hidden">Outlets</span>
                            </button>
                            <button onClick={() => handleDeleteRegion(r.id, r.name)}
                              className="px-2 sm:px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs sm:text-sm font-medium">
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Region Creation Modal — name only */}
      {showRegionForm && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={handleCancelRegion} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">Add New Region</h2>
                <button onClick={handleCancelRegion} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <form onSubmit={handleCreateRegion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Region Name *</label>
                    <input value={regionName} onChange={(e) => setRegionName(e.target.value)}
                      placeholder="e.g. Western Province" autoFocus required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" />
                    <p className="text-xs text-slate-500 mt-1.5">RTOMs can be assigned to this region later via the DGM portal.</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleCancelRegion}
                      className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={regionLoading}
                      className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                      {regionLoading ? 'Creating...' : 'Create Region'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default BranchesPage