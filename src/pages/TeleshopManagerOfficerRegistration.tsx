"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { UserPlus, ArrowLeft, Phone, User, MapPin, Languages, Briefcase } from "lucide-react"
import api from "../config/api"

interface Outlet {
  id: string
  name: string
  location: string
  counterCount: number
}



const availableLanguages = [
  { code: "sinhala", name: "Sinhala" },
  { code: "tamil", name: "Tamil" },
  { code: "english", name: "English" }
]
// Use only these static services for assignment
const STATIC_SERVICES = [
  { id: 'BILL_PAYMENT', code: 'BILL_PAYMENT', title: 'Bill Payment', isActive: true },
  { id: 'OTHERS', code: 'OTHERS', title: 'Others', isActive: true },
]

export default function TeleshopManagerOfficerRegistration() {
  const navigate = useNavigate()
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingOutlets, setLoadingOutlets] = useState(true)
  const [error, setError] = useState("")
  
  
  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: "",
    outletId: "",
    counterNumber: "",
    isTraining: false,
    languages: [] as string[],
    assignedServices: [] as string[]
  })

  useEffect(() => {
    fetchOutlets()
  }, [])

  const fetchOutlets = async () => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const response = await api.get("/teleshop-manager/outlets", {
        headers: { Authorization: `Bearer ${token}` }
      })

      setOutlets(response.data)
    } catch (error: any) {
      console.error("Failed to fetch outlets:", error)
      if (error.response?.status === 401) {
        localStorage.removeItem("teleshopManagerToken")
        navigate("/teleshop-manager/login")
      } else {
        setError("Failed to load outlets")
      }
    } finally {
      setLoadingOutlets(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const submitData = {
        ...formData,
        counterNumber: formData.counterNumber ? parseInt(formData.counterNumber) : undefined
      }

      const response = await api.post("/teleshop-manager/officers", submitData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        navigate("/teleshop-manager/dashboard")
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Failed to create officer"
      console.error("Officer creation error:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleLanguage = (languageCode: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(languageCode)
        ? prev.languages.filter(l => l !== languageCode)
        : [...prev.languages, languageCode]
    }))
  }

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      // Store service IDs to align with Manager flows and backend usage
      assignedServices: prev.assignedServices.includes(serviceId)
        ? prev.assignedServices.filter(s => s !== serviceId)
        : [...prev.assignedServices, serviceId]
    }))
  }

  const selectedOutlet = outlets.find(outlet => outlet.id === formData.outletId)
  const counterOptions = selectedOutlet 
    ? Array.from({ length: selectedOutlet.counterCount }, (_, i) => i + 1)
    : []

  if (loadingOutlets) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading outlets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate("/teleshop-manager/dashboard")}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <UserPlus className="w-6 h-6 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Add New Officer</h1>
            </div>
          </div>
          <p className="text-gray-600">Register a new customer service officer under your management</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Personal Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Officer Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter officer's full name"
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
                    onChange={(e) => handleInputChange("mobileNumber", e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="070XXXXXXX"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Work Assignment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              Work Assignment
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outlet *
                </label>
                <select
                  value={formData.outletId}
                  onChange={(e) => handleInputChange("outletId", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select an outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} - {outlet.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Counter Number
                </label>
                <select
                  value={formData.counterNumber}
                  onChange={(e) => handleInputChange("counterNumber", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!formData.outletId}
                >
                  <option value="">Select counter (optional)</option>
                  {counterOptions.map((counter) => (
                    <option key={counter} value={counter.toString()}>
                      Counter {counter}
                    </option>
                  ))}
                </select>
                {!formData.outletId && (
                  <p className="text-sm text-gray-500 mt-1">Select an outlet first</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isTraining}
                  onChange={(e) => handleInputChange("isTraining", e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Officer is currently in training</span>
              </label>
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Languages className="w-5 h-5 mr-2 text-blue-600" />
              Language Capabilities
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableLanguages.map((language) => (
                <label key={language.code} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.languages.includes(language.code)}
                    onChange={() => toggleLanguage(language.code)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{language.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
              Assigned Services
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STATIC_SERVICES.map((service) => (
                <label key={service.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.assignedServices.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{service.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/teleshop-manager/dashboard")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Officer"}
            </button>
          </div>
        </form>
      </div>
  )
}