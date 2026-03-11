import React, { useEffect, useState } from 'react'
import api, { WS_URL } from '../../config/api'
import { Users, Hash, CheckCircle2, XCircle, Search, UserCog } from 'lucide-react'

interface Officer {
  id: string
  name: string
  mobileNumber: string
  outletId: string
  assignedServices?: any
  counterNumber?: number | null
}

const AdminOfficers: React.FC = () => {
  const [officers, setOfficers] = useState<Officer[]>([])
  const [services, setServices] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchOfficers()
    fetchServices()
    
    // Auto-refresh every 30 seconds for admin officer overview
    const interval = setInterval(() => {
      fetchOfficers()
    }, 30000)

    // WebSocket for real-time officer updates with better error handling
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isComponentMounted = true
    
    const connectWebSocket = () => {
      if (!isComponentMounted) return
      
      try {
        ws = new WebSocket(WS_URL)
        
        ws.onopen = () => {
          console.log('AdminOfficers WebSocket connected')
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "OFFICER_STATUS_CHANGE" || data.type === "OFFICER_ASSIGNMENT_CHANGE" || data.type === "BREAK_STATUS_CHANGE") {
              fetchOfficers()
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('AdminOfficers WebSocket error:', error)
        }
        
        ws.onclose = (event) => {
          console.log('AdminOfficers WebSocket disconnected:', event.reason)
          if (!event.wasClean && isComponentMounted) {
            reconnectTimer = window.setTimeout(connectWebSocket, 5000)
          }
        }
      } catch (error) {
        console.error('Failed to create AdminOfficers WebSocket:', error)
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

  const fetchServices = async () => {
    try {
      const res = await api.get('/queue/services')
      const list = (res.data || []).map((s: any) => ({ id: s.id, title: s.title }))
      setServices(list)
    } catch (err) {
      console.error('Failed to fetch services', err)
    }
  }

  const fetchOfficers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/officers')
      setOfficers(res.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch officers', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto p-3 sm:p-4 lg:p-6 xl:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center">
               <UserCog className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Officers Management</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-gray-600 text-sm">Overview of officer assignments and services</p>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  {loading && <span className="flex items-center gap-1">Refreshing...</span>}
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-sm sm:hidden">Overview of officer assignments and services</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Officers</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{officers.length}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">With Counters</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{officers.filter(o => o.counterNumber).length}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg">
                <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Active Services</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{services.length}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Unassigned</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{officers.filter(o => !o.assignedServices || o.assignedServices.length === 0).length}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search officers by name, mobile number, or outlet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">Detailed officer management has moved to the Manager portal.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminOfficers