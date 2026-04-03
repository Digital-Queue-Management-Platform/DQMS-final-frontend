import React, { useEffect, useState } from 'react'
import api from '../../config/api'
import { MapPin, Plus, X, Edit2, Trash2, Building2, Search } from 'lucide-react'

interface Outlet {
  id: string
  name: string
  location: string
  region?: any
  province?: any
  provinceId?: string
  rtoms?: Array<{id: string, name: string, mobileNumber: string}>
  dgmName?: string
  counterCount?: number
  isActive?: boolean
}

interface Region {
  id: string
  name: string
  managerId?: string
  managerEmail?: string
  managerMobile?: string
  gmId?: string
  gm?: any
}

interface Province {
  id: string
  name: string
  regionId: string
  region?: Region
  dgm?: any
}

const BranchesPage: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'outlets' | 'regions' | 'provinces'>('regions')

  // Forms
  const [showRegionForm, setShowRegionForm] = useState(false)
  const [showProvinceForm, setShowProvinceForm] = useState(false)
  const [showOutletForm, setShowOutletForm] = useState(false)

  // Region form
  const [regionName, setRegionName] = useState('')
  const [regionLoading, setRegionLoading] = useState(false)
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null)

  // Province form
  const [provinceName, setProvinceName] = useState('')
  const [selectedRegionForProvince, setSelectedRegionForProvince] = useState('')
  const [provinceLoading, setProvinceLoading] = useState(false)
  const [editingProvinceId, setEditingProvinceId] = useState<string | null>(null)

  // Outlet form
  const [outletName, setOutletName] = useState('')
  const [outletLocation, setOutletLocation] = useState('')
  const [outletProvinceId, setOutletProvinceId] = useState('')
  const [outletRegionId, setOutletRegionId] = useState('')
  const [counterCount, setCounterCount] = useState<number>(0)
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    await Promise.all([fetchOutlets(), fetchRegions(), fetchProvinces()])
  }

  const fetchOutlets = async () => {
    try {
      const res = await api.get('/admin/outlets')
      setOutlets(res.data || [])
    } catch (err) {
      console.error('Failed to fetch outlets', err)
    }
  }

  const fetchRegions = async () => {
    try {
      const res = await api.get('/admin/regions')
      setRegions(res.data.regions || [])
    } catch (err) {
      console.error('Failed to fetch regions', err)
    }
  }

  const fetchProvinces = async () => {
    try {
      const res = await api.get('/admin/provinces')
      setProvinces(res.data.provinces || [])
    } catch (err) {
      console.error('Failed to fetch provinces', err)
    }
  }

  // Region Management
  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regionName.trim()) return setError('Region name is required')
    setRegionLoading(true)
    setError('')
    try {
      if (editingRegionId) {
        // Update existing region
        await api.patch(`/admin/regions/${editingRegionId}`, { name: regionName })
      } else {
        // Create new region
        await api.post('/admin/register-region', { name: regionName })
      }
      await fetchRegions()
      resetRegionForm()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setError(`Failed to ${editingRegionId ? 'update' : 'create'} region: ` + msg)
    } finally {
      setRegionLoading(false)
    }
  }

  const handleDeleteRegion = async (regionId: string, regionName: string) => {
    if (!confirm(`Are you sure you want to delete "${regionName}" region?`)) return
    try {
      await api.delete(`/admin/regions/${regionId}`)
      await fetchAll()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setError('Failed to delete region: ' + msg)
    }
  }

  const handleEditRegion = (region: Region) => {
    setEditingRegionId(region.id)
    setRegionName(region.name)
    setShowRegionForm(true)
  }

  const resetRegionForm = () => {
    setEditingRegionId(null)
    setRegionName('')
    setShowRegionForm(false)
    setError('')
  }

  // Province Management
  const handleCreateProvince = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!provinceName.trim()) return setError('Province name is required')
    if (!selectedRegionForProvince) return setError('Please select a region')
    setProvinceLoading(true)
    setError('')
    try {
      const payload = {
        name: provinceName,
        regionId: selectedRegionForProvince
      }
      
      if (editingProvinceId) {
        // Update existing province
        await api.patch(`/admin/provinces/${editingProvinceId}`, payload)
      } else {
        // Create new province
        await api.post('/admin/provinces', payload)
      }
      await fetchProvinces()
      resetProvinceForm()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setError(`Failed to ${editingProvinceId ? 'update' : 'create'} province: ` + msg)
    } finally {
      setProvinceLoading(false)
    }
  }

  const handleDeleteProvince = async (provinceId: string, provinceName: string) => {
    if (!confirm(`Are you sure you want to delete "${provinceName}" province?`)) return
    try {
      await api.delete(`/admin/provinces/${provinceId}`)
      await fetchProvinces()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setError('Failed to delete province: ' + msg)
    }
  }

  const handleEditProvince = (province: Province) => {
    setEditingProvinceId(province.id)
    setProvinceName(province.name)
    setSelectedRegionForProvince(province.regionId)
    setShowProvinceForm(true)
  }

  const resetProvinceForm = () => {
    setEditingProvinceId(null)
    setProvinceName('')
    setSelectedRegionForProvince('')
    setShowProvinceForm(false)
    setError('')
  }

  // Outlet Management
  const handleCreateOrUpdateOutlet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!outletName || !outletLocation || !outletProvinceId) return setError('All fields are required')
    setError('')
    try {
      const payload = {
        name: outletName,
        location: outletLocation,
        provinceId: outletProvinceId,
        counterCount
      }
      
      if (editingOutletId) {
        const res = await api.patch(`/queue/outlets/${editingOutletId}`, payload)
        setOutlets((prev) => prev.map((o) => (o.id === editingOutletId ? res.data.outlet : o)))
        setEditingOutletId(null)
      } else {
        const res = await api.post('/queue/outlets', payload)
        setOutlets((prev) => [res.data.outlet, ...prev])
      }
      resetOutletForm()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setError('Failed to save outlet: ' + msg)
    }
  }

  const handleEditOutlet = (outlet: Outlet) => {
    setEditingOutletId(outlet.id)
    setOutletName(outlet.name)
    setOutletLocation(outlet.location)
    setOutletProvinceId(outlet.provinceId || '')
    // Set region based on the outlet's province
    const outletProvince = provinces.find(p => p.id === outlet.provinceId)
    setOutletRegionId(outletProvince?.regionId || outlet.region?.id || '')
    setCounterCount((outlet as any).counterCount || 0)
    setShowOutletForm(true)
  }

  const handleDeleteOutlet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this outlet?')) return
    try {
      await api.delete(`/queue/outlets/${id}`)
      setOutlets((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      setError('Failed to delete outlet')
    }
  }

  const resetOutletForm = () => {
    setEditingOutletId(null)
    setOutletName('')
    setOutletLocation('')
    setOutletProvinceId('')
    setOutletRegionId('')
    setCounterCount(0)
    setShowOutletForm(false)
    setError('')
  }

  // Filter data
  const filteredOutlets = outlets.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.region?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredRegions = regions.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProvinces = provinces.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.region?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getViewTitle = () => {
    switch (viewMode) {
      case 'outlets': return 'All Outlets'
      case 'provinces': return 'All Provinces'
      default: return 'All Regions'
    }
  }

  const getSearchPlaceholder = () => {
    switch (viewMode) {
      case 'outlets': return "Search outlets by name, location, or region..."
      case 'provinces': return "Search provinces by name or region..."
      default: return "Search regions by name..."
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto p-3 sm:p-4 lg:p-6 xl:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Branch Management</h1>
              <p className="text-slate-600 text-sm">Manage your outlet locations, regions, and provinces</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Provinces</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{provinces.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          {/* Header Section */}
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 sm:gap-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800">{getViewTitle()}</h2>
                <select 
                  value={viewMode} 
                  onChange={(e) => setViewMode(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="regions">View Regions</option>
                  <option value="provinces">View Provinces</option>
                  <option value="outlets">View Outlets</option>
                </select>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setShowRegionForm(true)}
                  className="bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Region</span>
                </button>
                <button 
                  onClick={() => setShowProvinceForm(true)}
                  className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Province</span>
                </button>
                <button 
                  onClick={() => setShowOutletForm(true)}
                  className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Outlet</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4 sm:p-6">
            <>
              {/* Error Display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Regions View */}
                {viewMode === 'regions' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRegions.map((region) => (
                      <div key={region.id} className="bg-slate-50 border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-800 text-lg">{region.name}</h3>
                          {region.gm ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">GM: {region.gm.name}</span>
                          ) : (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">No GM</span>
                          )}
                        </div>
                        
                        <div className="text-sm text-slate-600 space-y-1 mb-3">
                          <div>Outlets: <span className="font-medium text-slate-800">{outlets.filter(o => o.region?.id === region.id).length}</span></div>
                          <div>Provinces: <span className="font-medium text-slate-800">{provinces.filter(p => p.regionId === region.id).length}</span></div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-slate-200">
                          <button 
                            onClick={() => handleEditRegion(region)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteRegion(region.id, region.name)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Provinces View */}
                {viewMode === 'provinces' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProvinces.map((province) => (
                      <div key={province.id} className="bg-slate-50 border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all">
                        <h3 className="font-semibold text-slate-800 text-lg mb-2">{province.name}</h3>
                        
                        <div className="text-sm text-slate-600 space-y-1 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>Region: {province.region?.name}</span>
                          </div>
                          {province.dgm ? (
                            <div className="text-blue-600 font-medium">DGM: {province.dgm.name}</div>
                          ) : (
                            <div className="text-orange-600">No DGM assigned</div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-slate-200">
                          <button 
                            onClick={() => handleEditProvince(province)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteProvince(province.id, province.name)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outlets View */}
                {viewMode === 'outlets' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOutlets.map((outlet) => (
                      <div key={outlet.id} className="bg-slate-50 border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all">
                        <h3 className="font-semibold text-slate-800 text-lg mb-2">{outlet.name}</h3>
                        
                        <div className="text-sm text-slate-600 space-y-1 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{outlet.location}</span>
                          </div>
                          {outlet.province ? (
                            <div>Province: <span className="font-medium text-slate-800">{outlet.province.name}</span></div>
                          ) : outlet.region && (
                            <div>Region: <span className="font-medium text-slate-800">{outlet.region.name}</span></div>
                          )}
                          {outlet.rtoms && outlet.rtoms.length > 0 ? (
                            <div>RTOM: <span className="font-medium text-slate-800">{outlet.rtoms[0].name}</span></div>
                          ) : (
                            <div>RTOM: <span className="font-medium text-orange-600">Not Assigned</span></div>
                          )}
                          <div>Counters: <span className="font-medium text-slate-800">{(outlet as any).counterCount ?? 0}</span></div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-slate-200">
                          <button 
                            onClick={() => handleEditOutlet(outlet)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteOutlet(outlet.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty States */}
                {((viewMode === 'regions' && filteredRegions.length === 0) ||
                  (viewMode === 'provinces' && filteredProvinces.length === 0) ||
                  (viewMode === 'outlets' && filteredOutlets.length === 0)) && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      {viewMode === 'outlets' ? <Building2 className="w-6 h-6 text-slate-400" /> : <MapPin className="w-6 h-6 text-slate-400" />}
                    </div>
                    <p className="text-slate-600">
                      {searchTerm ? `No ${viewMode} found matching your search` : `No ${viewMode} yet`}
                    </p>
                  </div>
                )}
              </>
            </div>
          </div>
        </div>

      {/* Region Form Modal */}
      {showRegionForm && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={resetRegionForm} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">
                  {editingRegionId ? 'Edit Region' : 'Add New Region'}
                </h2>
                <button onClick={resetRegionForm} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateRegion} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Region Name</label>
                  <input 
                    value={regionName} 
                    onChange={(e) => setRegionName(e.target.value)} 
                    placeholder="Enter region name (e.g., Metro, Region 1)"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit" 
                    disabled={regionLoading}
                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors"
                  >
                    {regionLoading ? (editingRegionId ? 'Updating...' : 'Creating...') : (editingRegionId ? 'Update Region' : 'Create Region')}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetRegionForm}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Province Form Modal */}
      {showProvinceForm && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={resetProvinceForm} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">
                  {editingProvinceId ? 'Edit Province' : 'Add New Province'}
                </h2>
                <button onClick={resetProvinceForm} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateProvince} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Province Name</label>
                  <input 
                    value={provinceName} 
                    onChange={(e) => setProvinceName(e.target.value)} 
                    placeholder="Enter province name (e.g., Metro 1, Western Province North)"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Region</label>
                  <select 
                    value={selectedRegionForProvince} 
                    onChange={(e) => setSelectedRegionForProvince(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Select a region</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit" 
                    disabled={provinceLoading}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  >
                    {provinceLoading ? (editingProvinceId ? 'Updating...' : 'Creating...') : (editingProvinceId ? 'Update Province' : 'Create Province')}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetProvinceForm}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Outlet Form Modal */}
      {showOutletForm && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={resetOutletForm} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">
                  {editingOutletId ? 'Edit Outlet' : 'Add New Outlet'}
                </h2>
                <button onClick={resetOutletForm} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateOrUpdateOutlet} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Outlet Name</label>
                  <input 
                    value={outletName} 
                    onChange={(e) => setOutletName(e.target.value)} 
                    placeholder="Enter outlet name"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                  <input 
                    value={outletLocation} 
                    onChange={(e) => setOutletLocation(e.target.value)} 
                    placeholder="Enter location address"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Region</label>
                  <select 
                    value={outletRegionId} 
                    onChange={(e) => {
                      setOutletRegionId(e.target.value)
                      // Reset province selection when region changes
                      setOutletProvinceId('')
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select a region</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Province</label>
                  <select 
                    value={outletProvinceId} 
                    onChange={(e) => setOutletProvinceId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    required
                    disabled={!outletRegionId}
                  >
                    <option value="">Select a province</option>
                    {provinces
                      .filter(p => !outletRegionId || p.regionId === outletRegionId)
                      .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Number of Counters</label>
                  <input 
                    type="number" 
                    min={0} 
                    value={counterCount}
                    onChange={(e) => setCounterCount(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="Number of counters"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    {editingOutletId ? 'Update Outlet' : 'Create Outlet'}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetOutletForm}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default BranchesPage