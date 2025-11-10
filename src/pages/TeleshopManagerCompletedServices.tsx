"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft, 
  Filter, 
  Calendar, 
  User, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw
} from "lucide-react"
import CompletedServiceCard from "../components/CompletedServiceCard"
import api, { WS_URL } from "../config/api"

interface CompletedService {
  id: string
  duration?: number
  notes?: string
  completedAt: string
  token: {
    tokenNumber: number
    customer: {
      id: string
      name: string
      mobileNumber: string
    }
  }
  service: {
    id: string
    code: string
    title: string
  }
  officer: {
    id: string
    name: string
    mobileNumber: string
    counterNumber?: number
  }
  outlet: {
    id: string
    name: string
    location: string
  }
}

interface Officer {
  id: string
  name: string
}

interface Outlet {
  id: string
  name: string
}

interface Stats {
  totalServices: number
  todayServices: number
  thisWeekServices: number
  avgDuration: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface TeleshopManager {
  id: string
  name: string
  mobileNumber: string
  regionName: string
}

export default function TeleshopManagerCompletedServices() {
  const navigate = useNavigate()
  const [teleshopManager, setTeleshopManager] = useState<TeleshopManager | null>(null)
  const [services, setServices] = useState<CompletedService[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filters
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    officerId: "",
    outletId: ""
  })
  const [officers, setOfficers] = useState<Officer[]>([])
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchTeleshopManagerData()
    fetchOfficersAndOutlets()
    fetchServices()
    
    // Auto-refresh every 60 seconds for completed services
    const interval = setInterval(() => {
      fetchServices()
    }, 60000)

    // WebSocket for real-time updates with better error handling
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isComponentMounted = true
    let connectionAttempts = 0
    const maxReconnectAttempts = 5
    
    const connectWebSocket = () => {
      if (!isComponentMounted || connectionAttempts >= maxReconnectAttempts) return
      
      try {
        // Check if WebSocket is already connected
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
          return
        }

        connectionAttempts++
        ws = new WebSocket(WS_URL)
        
        ws.onopen = () => {
          console.log('TeleshopManagerCompletedServices WebSocket connected')
          connectionAttempts = 0 // Reset attempts on successful connection
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "TOKEN_COMPLETED" || data.type === "SERVICE_COMPLETED") {
              fetchServices()
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('TeleshopManagerCompletedServices WebSocket error:', error)
        }
        
        ws.onclose = (event) => {
          console.log('TeleshopManagerCompletedServices WebSocket disconnected:', event.reason)
          if (isComponentMounted && connectionAttempts < maxReconnectAttempts) {
            const reconnectDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000) // Exponential backoff
            reconnectTimer = window.setTimeout(() => connectWebSocket(), reconnectDelay)
          }
        }
      } catch (error) {
        console.error('Failed to create TeleshopManagerCompletedServices WebSocket:', error)
        if (isComponentMounted && connectionAttempts < maxReconnectAttempts) {
          const reconnectDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000)
          reconnectTimer = window.setTimeout(() => connectWebSocket(), reconnectDelay)
        }
      }
    }

    // Delay initial connection to avoid React strict mode issues
    const initialConnectionTimer = setTimeout(() => connectWebSocket(), 1000)

    return () => {
      isComponentMounted = false
      clearInterval(interval)
      clearTimeout(initialConnectionTimer)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [currentPage, filters])

  const fetchTeleshopManagerData = async () => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const response = await api.get("/teleshop-manager/me", {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data?.teleshopManager) {
        setTeleshopManager({
          id: response.data.teleshopManager.id,
          name: response.data.teleshopManager.name,
          mobileNumber: response.data.teleshopManager.mobileNumber,
          regionName: response.data.teleshopManager.region?.name || 'Unknown Region'
        })
      }
    } catch (error) {
      console.error("Failed to fetch teleshop manager data:", error)
      navigate("/teleshop-manager/login")
    }
  }

  const fetchOfficersAndOutlets = async () => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const [officersRes, outletsRes] = await Promise.all([
        api.get("/teleshop-manager/officers", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api.get("/teleshop-manager/outlets", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      setOfficers(Array.isArray(officersRes.data) ? officersRes.data : [])
      setOutlets(Array.isArray(outletsRes.data) ? outletsRes.data : [])
    } catch (error) {
      console.error("Failed to fetch officers and outlets:", error)
    }
  }

  const fetchServices = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...filters
      })

      const response = await api.get(`/teleshop-manager/completed-services?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data) {
        setServices(response.data.services || [])
        setStats(response.data.stats || null)
        setPagination(response.data.pagination || null)
      }
    } catch (error: any) {
      console.error("Failed to fetch completed services:", error)
      if (error.response?.status === 401) {
        navigate("/teleshop-manager/login")
      } else {
        setError("Failed to load completed services")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      officerId: "",
      outletId: ""
    })
    setCurrentPage(1)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  if (loading || !teleshopManager) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading completed services...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/teleshop-manager/dashboard")}
              className="flex items-center text-purple-600 hover:text-purple-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Completed Services</h1>
              <p className="text-sm text-gray-500">Updates automatically every 60 seconds</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <button 
              onClick={fetchServices}
              disabled={loading}
              className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Services</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalServices}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Today</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.todayServices}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600 mb-2">This Week</h3>
              <p className="text-2xl font-bold text-green-600">{stats.thisWeekServices}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Duration</h3>
              <p className="text-2xl font-bold text-purple-600">{formatDuration(stats.avgDuration)}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Officer
              </label>
              <select
                value={filters.officerId}
                onChange={(e) => handleFilterChange("officerId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Officers</option>
                {Array.isArray(officers) && officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Outlet
              </label>
              <select
                value={filters.outletId}
                onChange={(e) => handleFilterChange("outletId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Outlets</option>
                {Array.isArray(outlets) && outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={fetchServices}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Services List */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : services.length > 0 ? (
          <>
            <div className="space-y-4 mb-6">
              {services.map((service) => (
                <CompletedServiceCard key={service.id} service={service} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  Showing page {pagination.page} of {pagination.totalPages} 
                  ({pagination.total} total services)
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-500">
                    Page {currentPage}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-100">
            <div className="text-gray-500 mb-4">No completed services found</div>
            <p className="text-sm text-gray-400">
              Services will appear here as officers complete customer requests
            </p>
          </div>
        )}
    </div>
  )
}