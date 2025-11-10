"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  Coffee,
  Phone,
  MapPin,
  RefreshCw
} from "lucide-react"
import api, { WS_URL } from "../config/api"

interface Officer {
  id: string
  name: string
  mobileNumber: string
  counterNumber?: number
  status: 'available' | 'serving' | 'on_break' | 'break' | 'offline' | 'busy'
  outlet: {
    id: string
    name: string
    location: string
  }
  totalBreaks: number
  totalMinutes: number
  activeBreak?: {
    id: string
    startTime: string
  }
  createdAt: string
}

export default function TeleshopManagerOfficers() {
  const navigate = useNavigate()
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "serving" | "on_break" | "offline">("all")
  
  useEffect(() => {
    fetchOfficers()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOfficers, 30000)

    // WebSocket for real-time updates with better error handling
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isComponentMounted = true
    
    const connectWebSocket = () => {
      if (!isComponentMounted) return
      
      try {
        ws = new WebSocket(WS_URL)
        
        ws.onopen = () => {
          console.log('TeleshopManagerOfficers WebSocket connected')
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "OFFICER_STATUS_CHANGE" || data.type === "BREAK_STATUS_CHANGE" || data.type === "OFFICER_UPDATED") {
              fetchOfficers()
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('TeleshopManagerOfficers WebSocket error:', error)
        }
        
        ws.onclose = (event) => {
          console.log('TeleshopManagerOfficers WebSocket disconnected:', event.reason)
          if (!event.wasClean && isComponentMounted) {
            reconnectTimer = window.setTimeout(connectWebSocket, 5000)
          }
        }
      } catch (error) {
        console.error('Failed to create TeleshopManagerOfficers WebSocket:', error)
      }
    }

    connectWebSocket()

    return () => {
      isComponentMounted = false
      clearInterval(interval)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [])

  const fetchOfficers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("teleshopManagerToken")
      
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const response = await api.get("/teleshop-manager/officers", {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Handle both response formats: { success: true, officers: [...] } or direct array [...]
      if (response.data.success && response.data.officers) {
        setOfficers(response.data.officers)
      } else if (Array.isArray(response.data)) {
        setOfficers(response.data)
      } else {
        setError("Failed to fetch officers data")
      }
    } catch (error: any) {
      console.error("Failed to fetch officers:", error)
      
      if (error.response?.status === 401) {
        localStorage.removeItem("teleshopManagerToken")
        localStorage.removeItem("teleshopManager")
        navigate("/teleshop-manager/login")
      } else {
        setError(error.response?.data?.error || "Failed to fetch officers data")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOfficer = async (officerId: string, officerName: string) => {
    if (!confirm(`Are you sure you want to delete ${officerName}? This action cannot be undone.`)) {
      return
    }

    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const response = await api.delete(`/teleshop-manager/officers/${officerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setOfficers(prev => prev.filter(officer => officer.id !== officerId))
      } else {
        alert("Failed to delete officer")
      }
    } catch (error: any) {
      console.error("Failed to delete officer:", error)
      if (error.response?.status === 401) {
        localStorage.removeItem("teleshopManagerToken")
        localStorage.removeItem("teleshopManager")
        navigate("/teleshop-manager/login")
      } else {
        alert(error.response?.data?.error || "Failed to delete officer")
      }
    }
  }

  const filteredOfficers = officers.filter(officer => {
    const matchesSearch = officer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         officer.mobileNumber.includes(searchTerm) ||
                         officer.outlet.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesStatus = true
    if (statusFilter !== "all") {
      if (statusFilter === "on_break") {
        matchesStatus = officer.status === "on_break" || officer.status === "break"
      } else {
        matchesStatus = officer.status === statusFilter
      }
    }
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Available" },
      serving: { color: "bg-blue-100 text-blue-800", icon: CheckCircle, label: "Serving" },
      on_break: { color: "bg-yellow-100 text-yellow-800", icon: Coffee, label: "On Break" },
      break: { color: "bg-yellow-100 text-yellow-800", icon: Coffee, label: "On Break" },
      offline: { color: "bg-gray-100 text-gray-800", icon: Clock, label: "Offline" },
      busy: { color: "bg-orange-100 text-orange-800", icon: Clock, label: "Busy" }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading officers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Officers</h1>
            <p className="text-sm text-gray-500">
              View and manage officers in your outlets. Updates automatically every 30 seconds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <button
              onClick={fetchOfficers}
              disabled={loading}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/teleshop-manager/officers/add')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add New Officer
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{officers.length}</div>
          <div className="text-sm text-gray-600">Total Officers</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {officers.filter(o => o.status === 'available').length}
          </div>
          <div className="text-sm text-gray-600">Online</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {officers.filter(o => o.status === 'break').length}
          </div>
          <div className="text-sm text-gray-600">On Break</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">
            {officers.filter(o => o.status === 'offline').length}
          </div>
          <div className="text-sm text-gray-600">Offline</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search officers by name, phone, or outlet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="serving">Serving</option>
            <option value="on_break">On Break</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Officers List */}
      {filteredOfficers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {searchTerm || statusFilter !== "all" ? "No officers match your filters" : "No officers found"}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {officers.length === 0 ? "Start by adding your first officer" : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredOfficers.map((officer) => (
            <div key={officer.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{officer.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {officer.mobileNumber}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {officer.outlet.name}
                        </div>
                        {officer.counterNumber && (
                          <span>Counter #{officer.counterNumber}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-auto">
                      {getStatusBadge(officer.status)}
                    </div>
                  </div>

                  {/* Officer Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-sm text-blue-600 font-medium">Total Breaks</div>
                      <div className="text-lg font-semibold text-blue-900">{officer.totalBreaks}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-sm text-green-600 font-medium">Total Break Time</div>
                      <div className="text-lg font-semibold text-green-900">{formatDuration(officer.totalMinutes)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600 font-medium">Registered</div>
                      <div className="text-lg font-semibold text-gray-900">{formatDate(officer.createdAt)}</div>
                    </div>
                  </div>

                  {/* Active Break Info */}
                  {officer.activeBreak && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Currently on break</span>
                        <span className="text-sm text-yellow-600">
                          (Started: {new Date(officer.activeBreak.startTime).toLocaleTimeString()})
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="ml-6 flex flex-col gap-2">
                  <button
                    onClick={() => navigate(`/teleshop-manager/officers/${officer.id}/edit`)}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteOfficer(officer.id, officer.name)}
                    className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


    </div>
  )
}