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

  // form state
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [regionId, setRegionId] = useState('')
  const [counterCount, setCounterCount] = useState<number>(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [regions, setRegions] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  
  // Region form state
  const [showRegionForm, setShowRegionForm] = useState(false)
  const [regionName, setRegionName] = useState('')
  const [managerName, setManagerName] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
  const [managerMobile, setManagerMobile] = useState('')
  const [regionLoading, setRegionLoading] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null)

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
    if (!regionName) return setError('Region name is required')
    if (!managerEmail) return setError('Manager email is required')
    
    setRegionLoading(true)
    setError('')
    try {
      const response = await api.post('/admin/register-region', {
        name: regionName,
        managerName,
        managerEmail,
        managerMobile,
      })
      
      // Show generated credentials to admin
      if (response.data.credentials) {
        setGeneratedCredentials({
          email: response.data.credentials.email,
          password: response.data.credentials.temporaryPassword
        })
      }
      
      // Refresh regions list
      await fetchRegions()
      
      // Reset form but keep credentials dialog open
      setRegionName('')
      setManagerName('')
      setManagerEmail('')
      setManagerMobile('')
      setShowRegionForm(false)
    } catch (err: any) {
      console.error('Failed to create region', err)
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setError('Failed to create region: ' + msg)
    } finally {
      setRegionLoading(false)
    }
  }

  const handleCancelRegion = () => {
    setRegionName('')
    setManagerName('')
    setManagerEmail('')
    setManagerMobile('')
    setShowRegionForm(false)
    setError('')
  }

  const filteredOutlets = outlets.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.region?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Branch Management</h1>
              <p className="text-slate-600 text-sm">Manage your outlet locations and regions</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Outlets</p>
                <p className="text-3xl font-bold text-slate-800">{outlets.length}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Building2 className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Active Regions</p>
                <p className="text-3xl font-bold text-slate-800">{regions.length}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <MapPin className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          {showForm && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-800">
                    {editingId ? 'Edit Outlet' : 'New Outlet'}
                  </h2>
                  <button 
                    onClick={handleCancel}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Outlet Name
                    </label>
                    <input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter outlet name"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location
                    </label>
                    <input 
                      value={location} 
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter location address"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Region
                    </label>
                    <select 
                      value={regionId} 
                      onChange={(e) => setRegionId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="">Select a region</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Counters
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={counterCount}
                      onChange={(e) => setCounterCount(Math.max(0, parseInt(e.target.value || '0')))}
                      placeholder="Number of counters"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="submit"
                      className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      {editingId ? 'Update Outlet' : 'Create Outlet'}
                    </button>
                    <button 
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Outlets List */}
          <div className={showForm ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              {/* Search Header */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-800">All Outlets</h2>
                  {!showForm && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowRegionForm(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Region
                      </button>
                      <button 
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Outlet
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search outlets by name, location, or region..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Outlets List */}
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="text-slate-600 mt-3">Loading outlets...</p>
                  </div>
                ) : filteredOutlets.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">
                      {searchTerm ? 'No outlets found matching your search' : 'No outlets yet'}
                    </p>
                    {!searchTerm && !showForm && (
                      <button 
                        onClick={() => setShowForm(true)}
                        className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Create your first outlet
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredOutlets.map((o) => (
                      <div 
                        key={o.id} 
                        className="group bg-slate-50 border border-slate-200 rounded-lg p-5 hover:shadow-md hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-800 text-lg mb-1">
                              {o.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              {o.location}
                            </div>
                            {o.region && (
                              <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                {o.region.name}
                              </span>
                            )}
                            <div className="text-sm text-slate-600 mt-2">
                              Counters: <span className="font-medium text-slate-800">{(o as any).counterCount ?? 0}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                          <button 
                            onClick={() => handleEdit(o)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(o.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Region Registration Modal */}
      {showRegionForm && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={handleCancelRegion}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-800">Register New Region</h2>
                  <button
                    onClick={handleCancelRegion}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <form onSubmit={handleCreateRegion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Region Name *
                    </label>
                    <input 
                      value={regionName} 
                      onChange={(e) => setRegionName(e.target.value)}
                      placeholder="Enter region name"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Manager Name
                    </label>
                    <input 
                      value={managerName} 
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Enter manager name"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Manager Email *
                    </label>
                    <input 
                      type="email"
                      value={managerEmail} 
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="Enter manager email"
                      required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Manager Mobile
                    </label>
                    <input 
                      value={managerMobile} 
                      onChange={(e) => setManagerMobile(e.target.value)}
                      placeholder="Enter manager mobile"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={handleCancelRegion}
                      className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={regionLoading}
                      className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {regionLoading ? 'Creating...' : 'Create Region'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manager Credentials Dialog */}
      {generatedCredentials && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setGeneratedCredentials(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h2 className="text-xl font-semibold text-slate-800 text-center mb-4">
                  Regional Manager Account Created
                </h2>
                
                <p className="text-slate-600 text-center mb-6">
                  Please provide these login credentials to the regional manager:
                </p>
                
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <div className="flex items-center">
                        <input 
                          type="text" 
                          value={generatedCredentials.email} 
                          readOnly 
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(generatedCredentials.email)}
                          className="ml-2 p-2 text-slate-500 hover:text-slate-700"
                          title="Copy email"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                      <div className="flex items-center">
                        <input 
                          type="text" 
                          value={generatedCredentials.password} 
                          readOnly 
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 font-mono"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(generatedCredentials.password)}
                          className="ml-2 p-2 text-slate-500 hover:text-slate-700"
                          title="Copy password"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Important:</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Ask the manager to change this password after their first login for security.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const text = `Login Credentials:\nEmail: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`;
                      navigator.clipboard.writeText(text);
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Copy Both
                  </button>
                  <button
                    onClick={() => setGeneratedCredentials(null)}
                    className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Done
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

export default BranchesPage