import React, { useEffect, useState } from 'react'
import api from '../../config/api'
import { Plus, Edit2, Trash2, Save, X, Package, Search } from 'lucide-react'

interface Service {
  id: string
  code: string
  title: string
  description?: string
  order?: number
  isActive?: boolean
  isPriorityService?: boolean
  requireOtp?: boolean
}

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [priorityFeatureEnabled, setPriorityFeatureEnabled] = useState(true)
  const [priorityFeatureLoading, setPriorityFeatureLoading] = useState(false)
  const [advanceApptEnabled, setAdvanceApptEnabled] = useState(true)
  const [advanceApptLoading, setAdvanceApptLoading] = useState(false)
  const [showServiceTypeEnabled, setShowServiceTypeEnabled] = useState(false)
  const [showServiceTypeLoading, setShowServiceTypeLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const servicesPerPage = 8

  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState<number>(999)
  const [isPriorityService, setIsPriorityService] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchPriorityFeatureSetting()
    fetchAdvanceApptSetting()
    fetchShowServiceTypeSetting()
    fetchServices()
  }, [])

  const fetchAdvanceApptSetting = async () => {
    try {
      const res = await api.get('/queue/settings/advance-appointment')
      setAdvanceApptEnabled(res.data?.enabled !== false)
    } catch (err) {
      console.error(err)
      setAdvanceApptEnabled(true)
    }
  }

  const fetchPriorityFeatureSetting = async () => {
    try {
      const res = await api.get('/queue/settings/priority-service')
      setPriorityFeatureEnabled(res.data?.enabled !== false)
    } catch (err) {
      console.error(err)
      setPriorityFeatureEnabled(true)
    }
  }

  const fetchShowServiceTypeSetting = async () => {
    try {
      const res = await api.get('/queue/settings/show-service-type')
      setShowServiceTypeEnabled(res.data?.enabled === true)
    } catch (err) {
      console.error(err)
      setShowServiceTypeEnabled(false)
    }
  }



  const fetchServices = async () => {
    setLoading(true)
    try {
      const res = await api.get('/queue/services?all=true')
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
        const res = await api.patch(`/queue/services/${editingId}`, { title, description, order, isPriorityService })
        setServices((prev) => prev.map((s) => (s.id === editingId ? res.data.service : s)))
        setEditingId(null)
      } else {
        const res = await api.post('/queue/services', { code, title, description, order, isPriorityService })
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
    setOrder(s.order || 999)
    setIsPriorityService(!!s.isPriorityService)
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

  const handleOtpPerServiceToggle = async (id: string, requireOtp: boolean) => {
    try {
      await api.patch(`/queue/services/${id}`, { requireOtp })
      setServices((prev) => prev.map(s =>
        s.id === id ? { ...s, requireOtp } : s
      ))
    } catch (err) {
      console.error(err)
      setError(`Failed to update OTP requirement for service`)
    }
  }

  const handlePriorityFeatureToggle = async (enabled: boolean) => {
    setPriorityFeatureLoading(true)
    setError('')
    try {
      const res = await api.patch('/queue/settings/priority-service', { enabled })
      setPriorityFeatureEnabled(res.data?.enabled === true)
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.error || 'Failed to update priority feature setting')
    } finally {
      setPriorityFeatureLoading(false)
    }
  }

  const handleAdvanceApptToggle = async (enabled: boolean) => {
    setAdvanceApptLoading(true)
    setError('')
    try {
      const res = await api.patch('/queue/settings/advance-appointment', { enabled })
      setAdvanceApptEnabled(res.data?.enabled === true)
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.error || 'Failed to update advance appointment setting')
    } finally {
      setAdvanceApptLoading(false)
    }
  }

  const handleShowServiceTypeToggle = async (enabled: boolean) => {
    setShowServiceTypeLoading(true)
    setError('')
    try {
      const res = await api.patch('/queue/settings/show-service-type', { enabled })
      setShowServiceTypeEnabled(res.data?.enabled === true)
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.error || 'Failed to update show service type setting')
    } finally {
      setShowServiceTypeLoading(false)
    }
  }



  const resetForm = () => {
    setCode('')
    setTitle('')
    setDescription('')
    setOrder(999)
    setIsPriorityService(false)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 lg:p-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Services</h1>
                <p className="text-gray-600 text-sm hidden sm:block">Manage your service offerings</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowForm(!showForm)
              }}
              className="px-4 sm:px-5 py-2 bg-gray-900 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Service</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
          <p className="text-gray-600 text-sm sm:hidden">Manage your service offerings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">New Service Priority Feature</h2>
              <p className="text-sm text-gray-600 mt-1 mb-4">
                When enabled, customers who select a service marked as priority are moved ahead in the live queue. When disabled, all customers follow the standard queue order.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 mt-auto">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityFeatureEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {priorityFeatureEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={() => handlePriorityFeatureToggle(!priorityFeatureEnabled)}
                disabled={priorityFeatureLoading}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${priorityFeatureEnabled ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {priorityFeatureLoading ? 'Saving...' : priorityFeatureEnabled ? 'Disable Feature' : 'Enable Feature'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">24-Hour Advance Booking Rule</h2>
              <p className="text-sm text-gray-600 mt-1 mb-4">
                When enabled, customers must book their appointments at least 24 hours in advance. When disabled, customers can schedule for any future time.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 mt-auto">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${advanceApptEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {advanceApptEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={() => handleAdvanceApptToggle(!advanceApptEnabled)}
                disabled={advanceApptLoading}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${advanceApptEnabled ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {advanceApptLoading ? 'Saving...' : advanceApptEnabled ? 'Disable Rule' : 'Enable Rule'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Queue Display Settings</h2>
              <p className="text-sm text-gray-600 mt-1 mb-4">
                Control what information is visible to officers in the My Queue table. When enabled, officers will see the service type column. When disabled, service type is only shown after calling the customer.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 mt-auto">
              <div className="flex flex-col">
                <span className={`w-fit px-3 py-1 rounded-full text-xs font-semibold ${showServiceTypeEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {showServiceTypeEnabled ? 'Visible' : 'Hidden'}
                </span>
                <p className="text-xs text-gray-400 mt-2">
                  Current status: Service type is <strong>{showServiceTypeEnabled ? 'visible' : 'hidden'}</strong> in the officer queue list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleShowServiceTypeToggle(!showServiceTypeEnabled)}
                disabled={showServiceTypeLoading}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${showServiceTypeEnabled ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {showServiceTypeLoading ? 'Saving...' : showServiceTypeEnabled ? 'Hide Service Type' : 'Show Service Type'}
              </button>
            </div>
          </div>

        </div>


        {/* Form Modal */}
        {showForm && (
          <div className="mb-4 sm:mb-6 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
                {editingId ? 'Edit Service' : 'Create New Service'}
              </h2>
            </div>

            <div className="p-4 sm:p-6">
              {error && (
                <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Service Code *
                  </label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={!!editingId}
                    placeholder="e.g., SVC001"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base"
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value) || 999)}
                    placeholder="e.g., 1, 2, 3..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm sm:text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first (e.g., 1 = first position)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Queue Priority
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-xl cursor-pointer hover:border-indigo-400 transition">
                    <input
                      type="checkbox"
                      checked={isPriorityService}
                      onChange={(e) => setIsPriorityService(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Auto-prioritize this service</p>
                      <p className="text-xs text-gray-500">Customers selecting this service will be placed ahead of normal waiting tokens.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the service..."
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none text-sm sm:text-base"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={(e) => handleCreateOrUpdate(e)}
                  className="px-4 sm:px-5 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Update Service' : 'Create Service'}
                </button>
                <button
                  onClick={() => {
                    resetForm()
                    setShowForm(false)
                  }}
                  className="px-4 sm:px-5 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4 sm:mb-6 bg-white rounded-xl shadow-md p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search services by code, title, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col space-y-3 mb-3 px-2 sm:px-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm text-gray-600">
              Showing {indexOfFirstService + 1}-{Math.min(indexOfLastService, filteredServices.length)} of {filteredServices.length} services
            </span>
          </div>

          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1.5 bg-white border border-gray-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            <div className="flex items-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700">
              {currentPage} of {totalPages}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="px-2 sm:px-3 py-1.5 bg-white border border-gray-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-black">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Service Title
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider hidden lg:table-cell">
                    Description
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    OTP Required
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-3 text-gray-600 text-sm sm:text-base">Loading services...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-base sm:text-lg">
                        {searchTerm ? 'No services match your search' : 'No services available'}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => setShowForm(true)}
                          className="mt-4 px-4 sm:px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                        >
                          Create First Service
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  currentServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-700">
                          {service.order || 999}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {service.code}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {service.title}
                        </div>
                        <div className="lg:hidden mt-1 text-xs text-gray-500 max-w-xs truncate">
                          {service.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                        <div className="text-sm text-gray-600 max-w-md truncate">
                          {service.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        {service.isPriorityService ? (
                          <span className="px-2 sm:px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            Priority
                          </span>
                        ) : (
                          <span className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          title={service.requireOtp ? 'OTP required for this service — click to disable' : 'OTP not required — click to enable'}
                          onClick={() => handleOtpPerServiceToggle(service.id, !service.requireOtp)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${
                            service.requireOtp
                              ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          {service.requireOtp ? 'OTP On' : 'OTP Off'}
                        </button>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        <select
                          value={service.isActive !== false ? 'active' : 'inactive'}
                          onChange={(e) => handleStatusChange(service.id, e.target.value === 'active')}
                          className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors ${service.isActive !== false
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                        >
                          <option value="active" className="bg-white text-black">Active</option>
                          <option value="inactive" className="bg-white text-black">Inactive</option>
                        </select>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <button
                            onClick={() => handleEdit(service)}
                            className="p-1.5 sm:p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="p-1.5 sm:p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
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