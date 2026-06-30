"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  User,
  Phone,
  MapPin,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import api from "../config/api"
import { Briefcase } from "lucide-react"


interface Officer {
  id: string
  name: string
  mobileNumber: string
  email?: string
  counterNumber?: number
  outlet: {
    id: string
    name: string
    location: string
  }
  assignedServices?: string[]
}
interface Service {
  id: string
  code: string
  title: string
  description?: string | null
  isActive?: boolean
}

interface Outlet {
  id: string
  name: string
  location: string
  counterCount: number
}



export default function TeleshopManagerEditOfficer() {
  const navigate = useNavigate()
  const { officerId } = useParams()
  const [officer, setOfficer] = useState<Officer | null>(null)
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [allOfficers, setAllOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [services, setServices] = useState<Service[]>([])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    counterNumber: "",
    outletId: "",
    assignedServices: [] as string[],
  })

  useEffect(() => {
    fetchOfficerData()
    fetchOutlets()
    fetchServices()
  }, [officerId])
  const fetchServices = async () => {
    try {
      const response = await api.get('/queue/services')
      const data = Array.isArray(response.data) ? response.data : []
      setServices(data)
    } catch (err) {
      setServices([])
    }
  }

  const fetchOfficerData = async () => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/officers")
        return
      }

      const response = await api.get("/teleshop-manager/officers", {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        const officersList: Officer[] = response.data.officers
        setAllOfficers(officersList)
        const foundOfficer = officersList.find((o: Officer) => o.id === officerId)
        if (foundOfficer) {
          setOfficer(foundOfficer)
          setFormData({
            name: foundOfficer.name,
            email: foundOfficer.email || "",
            counterNumber: foundOfficer.counterNumber?.toString() || "",
            outletId: foundOfficer.outlet.id,
            assignedServices: foundOfficer.assignedServices || [],
          })
        } else {
          setError("Officer not found")
        }
      } else {
        setError("Failed to fetch officer data")
      }
    } catch (error: any) {
      console.error("Failed to fetch officer:", error)
      if (error.response?.status === 401) {
        localStorage.removeItem("teleshopManagerToken")
        localStorage.removeItem("teleshopManager")
        navigate("/teleshop-manager/login")
      } else {
        setError(error.response?.data?.error || "Failed to fetch officer data")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchOutlets = async () => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) return
      const resp = await api.get('/teleshop-manager/outlets', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setOutlets(resp.data)
    } catch (err) {
      console.error('Failed to fetch outlets:', err)
    }
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const updateData: any = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        assignedServices: formData.assignedServices,
      }

      if (formData.counterNumber) {
        updateData.counterNumber = parseInt(formData.counterNumber)
      }

      const response = await api.patch(`/teleshop-manager/officers/${officerId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setSuccess("Officer updated successfully!")
        setTimeout(() => {
          navigate("/teleshop-manager/officers")
        }, 1500)
      } else {
        setError("Failed to update officer")
      }
    } catch (error: any) {
      console.error("Failed to update officer:", error)
      if (error.response?.status === 401) {
        localStorage.removeItem("teleshopManagerToken")
        localStorage.removeItem("teleshopManager")
        navigate("/teleshop-manager/login")
      } else {
        setError(error.response?.data?.error || "Failed to update officer")
      }
    } finally {
      setSaving(false)
    }
  }
  const toggleService = (serviceCode: string) => {
    setFormData(prev => ({
      ...prev,
      assignedServices: prev.assignedServices.includes(serviceCode)
        ? prev.assignedServices.filter(s => s !== serviceCode)
        : [...prev.assignedServices, serviceCode]
    }))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading officer data...</p>
        </div>
      </div>
    )
  }

  if (error && !officer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/teleshop-manager/officers")}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Back to Officers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/teleshop-manager/officers")}
          className="flex items-center gap-2 text-gray-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Officers
        </button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Officer</h1>
          <p className="text-sm text-gray-500">
            Update officer information
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Edit Form */}
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Officer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Officer Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter officer name"
              required
            />
          </div>

          {/* Officer Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Officer Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter officer email (optional)"
            />
          </div>

          {/* Mobile Number (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Mobile Number
            </label>
            <input
              type="tel"
              value={officer?.mobileNumber || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Mobile number cannot be changed</p>
          </div>

          {/* Outlet (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Outlet
            </label>
            <input
              type="text"
              value={officer?.outlet ? `${officer.outlet.name} - ${officer.outlet.location}` : ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Outlet assignment cannot be changed</p>
          </div>

          {/* Counter Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Counter Number (Optional)
            </label>
            <select
              value={formData.counterNumber}
              onChange={(e) => handleInputChange('counterNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={!formData.outletId || outlets.length === 0}
            >
              <option value="">Select counter (optional)</option>
              {(() => {
                const selectedOutlet = outlets.find(o => o.id === formData.outletId)
                if (!selectedOutlet) return null

                // Counters already assigned to other officers in this outlet
                const assignedCounters = allOfficers
                  .filter(o => o.outlet.id === selectedOutlet.id && o.counterNumber != null && o.id !== officerId)
                  .map(o => o.counterNumber as number)

                const options = Array.from({ length: selectedOutlet.counterCount }, (_, i) => i + 1)
                  .filter(c => !assignedCounters.includes(c) || (officer && officer.counterNumber === c))

                return options.map(counter => (
                  <option key={counter} value={counter.toString()}>
                    Counter {counter}
                  </option>
                ))
              })()}
            </select>
            {!formData.outletId && (
              <p className="text-sm text-gray-500 mt-1">Select an outlet first</p>
            )}
          </div>

          {/* Assigned Services */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
              Assigned Services
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => (
                <label key={service.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.assignedServices.includes(service.code)}
                    onChange={() => toggleService(service.code)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{service.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/teleshop-manager/officers")}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}