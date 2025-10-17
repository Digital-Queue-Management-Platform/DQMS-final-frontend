import React, { useEffect, useState } from 'react'
import api from '../../config/api'
import { Plus, Edit2, Trash2, Save, X, Package, Search } from 'lucide-react'

interface Service {
  id: string
  code: string
  title: string
  description?: string
  isActive?: boolean
}

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const servicesPerPage = 8

  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    setLoading(true)
    try {
      const res = await api.get('/queue/services')
      setServices(res.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')
    if (!code || !title) return setError('Code and title are required')

    try {
      if (editingId) {
        const res = await api.patch(`/queue/services/${editingId}`, { title, description })
        setServices((prev) => prev.map((s) => (s.id === editingId ? res.data.service : s)))
        setEditingId(null)
      } else {
        const res = await api.post('/queue/services', { code, title, description })
        setServices((prev) => [res.data.service, ...prev])
      }

      resetForm()
      setShowForm(false)
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.error || 'Failed to save service')
    }
  }

  const handleEdit = (s: Service) => {
    setEditingId(s.id)
    setCode(s.code)
    setTitle(s.title)
    setDescription(s.description || '')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this service? This action cannot be undone.')) return
    try {
      await api.delete(`/queue/services/${id}`)
      // Remove the service from local state (hard delete)
      setServices((prev) => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error(err)
      setError('Failed to delete service')
    }
  }

  const handleStatusChange = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/queue/services/${id}`, { isActive })
      // Update the service status in local state
      setServices((prev) => prev.map(s => 
        s.id === id ? { ...s, isActive } : s
      ))
    } catch (err) {
      console.error(err)
      setError(`Failed to ${isActive ? 'activate' : 'deactivate'} service`)
    }
  }

  const resetForm = () => {
    setCode('')
    setTitle('')
    setDescription('')
    setEditingId(null)
    setError('')
  }

  const filteredServices = services.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const indexOfLastService = currentPage * servicesPerPage
  const indexOfFirstService = indexOfLastService - servicesPerPage
  const currentServices = filteredServices.slice(indexOfFirstService, indexOfLastService)
  const totalPages = Math.ceil(filteredServices.length / servicesPerPage)

  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Services</h1>
                <p className="text-gray-600 text-sm">Manage your service offerings</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowForm(!showForm)
              }}
              className="px-5 py-2 bg-gray-900 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Service
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="mb-6 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? 'Edit Service' : 'Create New Service'}
              </h2>
            </div>
            
            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Service Code *
                  </label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={!!editingId}
                    placeholder="e.g., SVC001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Service Title *
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Account Opening"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the service..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={(e) => handleCreateOrUpdate(e)}
                  className="px-5 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Update Service' : 'Create Service'}
                </button>
                <button
                  onClick={() => {
                    resetForm()
                    setShowForm(false)
                  }}
                  className="px-5 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search services by code, title, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col space-y-3 mb-3 px-4 md:flex-row md:justify-between md:items-center md:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Showing {indexOfFirstService + 1}-{Math.min(indexOfLastService, filteredServices.length)} of {filteredServices.length} services
            </span>
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <button 
              onClick={goToPrevPage} 
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700">
              {currentPage} of {totalPages}
            </div>
            
            <button 
              onClick={goToNextPage} 
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-black">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Service Title
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-3 text-gray-600">Loading services...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentServices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        {searchTerm ? 'No services match your search' : 'No services available'}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => setShowForm(true)}
                          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Create First Service
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  currentServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {service.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {service.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-md truncate">
                          {service.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <select
                          value={service.isActive !== false ? 'active' : 'inactive'}
                          onChange={(e) => handleStatusChange(service.id, e.target.value === 'active')}
                          className={`px-3 py-1 text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                            service.isActive !== false
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          <option value="active" className="bg-white text-black">Active</option>
                          <option value="inactive" className="bg-white text-black">Inactive</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(service)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServicesPage