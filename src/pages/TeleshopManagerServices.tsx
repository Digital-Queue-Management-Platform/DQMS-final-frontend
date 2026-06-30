import React, { useState, useEffect } from 'react'
import { Settings, AlertCircle } from 'lucide-react'
import api from '../config/api'

interface Service {
  id: string
  code: string
  title: string
  description: string | null
  requireOtp: boolean
  isActive: boolean
  isCustomized?: boolean
}

const TeleshopManagerServices: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const res = await api.get('/teleshop-manager/services')
      setServices(res.data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch services:', err)
      setError('Failed to load services. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleOtp = async (serviceId: string, currentVal: boolean) => {
    try {
      setUpdating(serviceId)
      const newVal = !currentVal
      
      await api.put(`/teleshop-manager/services/${serviceId}`, {
        requireOtp: newVal
      })

      setServices(prev => prev.map(s => {
        if (s.id === serviceId) {
          return { ...s, requireOtp: newVal, isCustomized: true }
        }
        return s
      }))
    } catch (err: any) {
      console.error('Failed to update service:', err)
      alert('Failed to update setting. Please try again.')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-600" />
          Service Configuration
        </h1>
        <p className="text-gray-600 mt-1">
          Manage how services behave for your specific outlet.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-gray-600 font-semibold">Service</th>
              <th className="p-4 text-gray-600 font-semibold text-center">Collect Mobile Number</th>
              <th className="p-4 text-gray-600 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map(service => (
              <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-gray-800">{service.title}</div>
                  <div className="text-sm text-gray-500">{service.code}</div>
                </td>
                <td className="p-4 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={service.requireOtp}
                      onChange={() => handleToggleOtp(service.id, service.requireOtp)}
                      disabled={updating === service.id}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                  {updating === service.id && (
                    <div className="text-xs text-purple-600 mt-1">Saving...</div>
                  )}
                </td>
                <td className="p-4 text-center">
                  {service.isCustomized ? (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                      Customized
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Global Default
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">
                  No services found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TeleshopManagerServices
