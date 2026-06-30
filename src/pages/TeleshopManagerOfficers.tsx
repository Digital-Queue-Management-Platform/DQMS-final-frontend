"use client"

import {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"
import {
  Users,
  UserPlus,
  Edit,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  Coffee,
  Phone,
  MapPin,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import api, {WS_URL} from "../config/api"
import {AnimatedDropdown} from "../components/AnimatedDropdown"

interface Officer {
  id: string
  name: string
  mobileNumber: string
  counterNumber?: number
  isActive?: boolean
  status: 'available' | 'serving' | 'on_break' | 'break' | 'offline' | 'busy'
  outlet: {
    id: string
    name: string
    location: string
    counterCount?: number
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
  const navigate= useNavigate()
  const [officers, setOfficers]= useState<Officer[]>([])
  const [loading, setLoading]= useState(true)
  const [error, setError]= useState("")
  const [searchTerm, setSearchTerm]= useState("")
  const [statusFilter, setStatusFilter]= useState<"all" | "available" | "serving" | "on_break" | "offline">("all")
  const [showAssignCounterModal, setShowAssignCounterModal]= useState(false)
  const [selectedOfficerForCounter, setSelectedOfficerForCounter]= useState<Officer | null>(null)
  const [selectedCounter, setSelectedCounter]= useState<number | null>(null)
  const [expandedOfficers, setExpandedOfficers]= useState<Set<string>>(new Set())
  const [counters, setCounters]= useState<any[]>([])
  const [activeTab, setActiveTab]= useState<'officers' | 'counters'>('officers')

  useEffect(()=> {
    // Initial load should show full-screen loader
    fetchOfficers(true)

    // Auto-refresh every 30 seconds (silent, no full-screen loader)
    const interval= setInterval(()=> fetchOfficers(false), 30000)

    // WebSocket for real-time updates with better error handling
    let ws: WebSocket | null= null
    let reconnectTimer: number | null= null
    let isComponentMounted= true

    const connectWebSocket= ()=> {
      if (!isComponentMounted) return

      try {
        ws= new WebSocket(WS_URL)

        ws.onopen= ()=> {
          console.log('TeleshopManagerOfficers WebSocket connected')
       }

        ws.onmessage= (event)=> {
          try {
            const data= JSON.parse(event.data)
            if (data.type=== "OFFICER_STATUS_CHANGE" ||
              data.type=== "BREAK_STATUS_CHANGE" ||
              data.type=== "OFFICER_UPDATED" ||
              data.type=== "DAILY_RESET") {
              // Refresh silently when updates arrive
              fetchOfficers(false)
           }
         } catch (error) {
            console.error('WebSocket message parsing error:', error)
         }
       }

        ws.onerror= (error)=> {
          console.error('TeleshopManagerOfficers WebSocket error:', error)
       }

        ws.onclose= (event)=> {
          console.log('TeleshopManagerOfficers WebSocket disconnected:', event.reason)
          if (!event.wasClean && isComponentMounted) {
            reconnectTimer= window.setTimeout(connectWebSocket, 5000)
         }
       }
     } catch (error) {
        console.error('Failed to create TeleshopManagerOfficers WebSocket:', error)
     }
   }

    connectWebSocket()

    return ()=> {
      isComponentMounted= false
      clearInterval(interval)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
     }
      if (ws && ws.readyState=== WebSocket.OPEN) {
        ws.close()
     }
   }
 }, [])

  // Centralized auth error handler
  const handleAuthError= (error: any)=> {
    if (error.response?.status=== 401 || error.response?.status=== 403) {
      localStorage.removeItem("teleshopManagerToken")
      localStorage.removeItem("teleshopManager")
      navigate("/teleshop-manager/login")
      return true // Handled
   }
    return false // Not handled
 }

  const fetchOfficers= async (showLoading= true)=> {
    try {
      if (showLoading) setLoading(true)

      const response= await api.get("/teleshop-manager/officers")

      // Handle both response formats: {success: true, officers: [...]} or direct array [...]
      if (response.data.success && response.data.officers) {
        const sorted= response.data.officers.sort((a: Officer, b: Officer)=> a.name.localeCompare(b.name))
        setOfficers(sorted)
        if (sorted.length> 0 && sorted[0].outlet.id) {
          fetchOutletCounters(sorted[0].outlet.id)
       }
     } else if (Array.isArray(response.data)) {
        const sorted= response.data.sort((a: any, b: any)=> a.name.localeCompare(b.name))
        setOfficers(sorted)
        if (sorted.length> 0 && sorted[0].outlet.id) {
          fetchOutletCounters(sorted[0].outlet.id)
       }
     } else {
        setError("Failed to fetch officers data")
     }
   } catch (error: any) {
      console.error("Failed to fetch officers:", error)

      if (!handleAuthError(error)) {
        setError(error.response?.data?.error || "Failed to fetch officers. Please try again.")
     }
   } finally {
      if (showLoading) setLoading(false)
   }
 }

  const fetchOutletCounters= async (outletId: string)=> {
    try {
      const resp= await api.get(`/queue/outlet/${outletId}/counters`)
      setCounters(resp.data || [])
   } catch (err) {
      console.error("Failed to fetch counters", err)
   }
 }

  const handleClearAllCounters= async ()=> {
    if (!confirm(
      "⚠️ IMPORTANT: Counter assignments are now PERMANENT and persist across days.\n\n" +
      "Are you sure you want to manually clear ALL counter assignments for all officers?\n\n" +
      "You will need to reassign each officer to their counter manually after this."
    )) return

    setLoading(true)
    try {
      let successCount= 0
      for (const officer of officers) {
        if (officer.counterNumber) {
          await api.patch(`/teleshop-manager/officers/${officer.id}/assign-counter`, {counterNumber: null})
          successCount++
        }
      }
      alert(`Cleared ${successCount} counter assignments.`)
      fetchOfficers(true)
    } catch (err) {
      console.error("Failed to clear counters", err)
      alert("An error occurred while clearing counters.")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (officerId: string, currentStatus: boolean, officerName: string) => {
    const action = currentStatus ? "suspend" : "activate";
    if (!confirm(`Are you sure you want to ${action} ${officerName}?`)) return;

    try {
      const response = await api.patch(`/teleshop-manager/officers/${officerId}/active`, {
        isActive: !currentStatus
      });

      if (response.data.success) {
        setOfficers(prev => prev.map(o => 
          o.id === officerId ? { ...o, isActive: !currentStatus } : o
        ));
        fetchOfficers(false);
      } else {
        alert(`Failed to ${action} officer`);
      }
    } catch (error: any) {
      console.error(`Failed to ${action} officer:`, error);
      if (!handleAuthError(error)) {
        alert(error.response?.data?.error || `Failed to ${action} officer. Please try again.`);
      }
    }
  }

  const handleOpenAssignCounter= (officer: Officer)=> {
    setSelectedOfficerForCounter(officer)
    setSelectedCounter(officer.counterNumber || null)
    setShowAssignCounterModal(true)
 }

  const handleAssignCounter= async ()=> {
    if (!selectedOfficerForCounter) return


    try {
      const response= await api.patch(
        `/teleshop-manager/officers/${selectedOfficerForCounter.id}/assign-counter`,
        {counterNumber: selectedCounter}
      )

      if (response.data.success) {
        // Update local state
        setOfficers(prev=> prev.map(o=>
          o.id=== selectedOfficerForCounter.id
            ? {...o, counterNumber: selectedCounter ?? undefined}
            : o
        ))
        setShowAssignCounterModal(false)
        setSelectedOfficerForCounter(null)
        setSelectedCounter(null)
        // Refresh counters view
        if (officers.length> 0) {
          fetchOutletCounters(officers[0].outlet.id)
       }
     }
   } catch (err: any) {
      if (!handleAuthError(err)) {
        alert(err.response?.data?.error || "Failed to assign counter. Please try again.")
     }
   }
 }

  const toggleOfficerExpanded= (officerId: string)=> {
    setExpandedOfficers(prev=> {
      const newSet= new Set(prev)
      if (newSet.has(officerId)) {
        newSet.delete(officerId)
     } else {
        newSet.add(officerId)
     }
      return newSet
   })
 }

  const filteredOfficers= officers.filter(officer=> {
    const matchesSearch= officer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.mobileNumber.includes(searchTerm) ||
      officer.outlet.name.toLowerCase().includes(searchTerm.toLowerCase())

    let matchesStatus= true
    if (statusFilter !== "all") {
      if (statusFilter=== "on_break") {
        matchesStatus= officer.status=== "on_break" || officer.status=== "break"
     } else {
        matchesStatus= officer.status=== statusFilter
     }
   }

    return matchesSearch && matchesStatus
 })

  const getStatusBadge= (status: string, isActive?: boolean)=> {
    if (isActive === false) {
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800`}>
          <AlertCircle className="w-3 h-3 mr-1" />
          Suspended
        </span>
      )
    }

    const statusConfig={
      available: {color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Available"},
      serving: {color: "bg-blue-100 text-blue-800", icon: CheckCircle, label: "Serving"},
      on_break: {color: "bg-yellow-100 text-yellow-800", icon: Coffee, label: "On Break"},
      break: {color: "bg-yellow-100 text-yellow-800", icon: Coffee, label: "On Break"},
      offline: {color: "bg-gray-100 text-gray-800", icon: Clock, label: "Offline"},
      busy: {color: "bg-orange-100 text-orange-800", icon: Clock, label: "Busy"}
   }

    const config= statusConfig[status as keyof typeof statusConfig] || statusConfig.offline
    const Icon= config.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
 }

  const formatDate= (dateString: string)=> {
    return new Date(dateString).toLocaleDateString()
 }

  const formatDuration= (minutes: number)=> {
    const hours= Math.floor(minutes / 60)
    const mins= minutes % 60
    return hours> 0 ? `${hours}h ${mins}m` : `${mins}m`
 }

  const CounterInfo= ({
    officer,
    onAssign,
 }: {
    officer: Officer
    onAssign: (officer: Officer)=> void
 })=> {
    if (officer.counterNumber) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-green-600 font-medium">
            Counter #{officer.counterNumber}
          </span>
          <button
            onClick={()=> onAssign(officer)}
            className="text-xs text-blue-600 hover:text-blue-700 ml-2"
         >
            Change
          </button>
        </div>
      )
   }

    return (
      <div className="flex items-center gap-1">
        <span className="text-gray-400 italic">No Counter</span>
        <button
          onClick={()=> onAssign(officer)}
          className="text-xs text-purple-600 hover:text-purple-700 ml-2 font-medium"
       >
          Assign Counter
        </button>
      </div>
    )
 }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Officers</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <button
              onClick={()=> fetchOfficers(true)}
              disabled={loading}
              className={`px-2 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-700 flex items-center gap-2 ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
           >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={()=> navigate('/teleshop-manager/officers/add')}
              className="text-blue-600 border-2 px-2 py-1.5 rounded-lg hover:border-blue-600 flex items-center gap-2"
           >
              <UserPlus className="w-4 h-4" />
              Add New Officer
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-4xl mx-auto mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{officers.length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wider font-semibold">Total</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {officers.filter(o=> o.status=== 'available').length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wider font-semibold">Online</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {officers.filter(o=> o.status=== 'break' || o.status=== 'on_break').length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wider font-semibold">On Break</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-600">
            {officers.filter(o=> o.status=== 'offline').length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wider font-semibold">Offline</div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex flex-col sm:flex-row gap-1 bg-gray-100 p-1.5 rounded-2xl mb-8 sm:self-start shadow-inner">
        <button
          onClick={()=> setActiveTab('officers')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab=== 'officers' ? 'bg-white text-purple-600 shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
       >
          Officers List
        </button>
        <button
          onClick={()=> setActiveTab('counters')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab=== 'counters' ? 'bg-white text-purple-600 shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
       >
          Counter Dashboard
        </button>
      </div>

      {activeTab=== 'counters' && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-purple-600" />
              Counter Overview
            </h2>
            <button
              onClick={handleClearAllCounters}
              className="text-xs text-red-600 hover:text-white hover:bg-red-600 font-bold px-4 py-2 rounded-xl bg-red-50 border border-red-100 transition-all duration-200 shadow-sm"
           >
              Clear All Assignments
            </button>
          </div>
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
            <div className="text-blue-500 mt-0.5 flex-shrink-0"></div>
            <p className="text-sm text-blue-700 font-medium">
              Counter assignments are <span className="font-bold">permanent</span> — they are saved until you manually change or unassign them. Officers will retain their assigned counter across days.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
{
  counters.map(c=> (
    <div key={c.number} className={`group relative p-5 rounded-3xl border-2 transition-all duration-300 transform hover:-translate-y-1 ${c.isStaffed ? 'bg-white border-purple-100 shadow-lg' : 'bg-gray-50 border-gray-100 border-dashed hover:border-purple-200 hover:bg-purple-50/30'}`}>
      <div className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">Counter #{c.number}</div>
                {
      c.isStaffed ? (
        <div className="space-y-3">
        <div className="font-bold text-gray-900 text-lg line-clamp-1">{c.officer.name}</div>
        <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${c.officer.status=== 'available' ? 'bg-green-500' : 'bg-blue-500'}`} />
          <div className="text-xs text-gray-600 uppercase font-bold tracking-wider">{c.officer.status}</div>
                    </div>
  <button
    onClick={()=> {
      setSelectedOfficerForCounter(c.officer as any)
      setSelectedCounter(null)
      handleAssignCounter() // This will call update with counterNumber: null
   }}
    className="w-full mt-2 text-xs text-red-500 hover:text-white hover:bg-red-500 font-bold bg-white border border-red-100 rounded-xl py-2 transition-all duration-200"
     >
      Unassign
                    </button>
                  </div>
                ) : (
  <div className="flex flex-col items-center justify-center h-28">
    <button
onClick={()=> {
  const unassigned= officers.find(o=> !o.counterNumber && o.status !== 'offline')
  if (unassigned) {
    setSelectedOfficerForCounter(unassigned)
    setSelectedCounter(c.number)
    setShowAssignCounterModal(true)
 } else {
    alert("No available unassigned officers found. All online officers are currently assigned to counters.")
                       }
}}
className="text-xs text-purple-600 hover:text-white hover:bg-purple-600 font-bold border-2 border-purple-100 px-5 py-2.5 rounded-2xl bg-white transition-all duration-200 shadow-sm"
 >
  Assign Officer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

{/* Officers List Content */}
      <div className={activeTab=== 'officers' ? 'block animate-in fade-in duration-300' : 'hidden'}>
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone or counter..."
              value={searchTerm}
              onChange={(e)=> setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <AnimatedDropdown
            options={[
              {value: "all", label: "All Status"},
              {value: "available", label: "Available"},
              {value: "serving", label: "Serving"},
              {value: "on_break", label: "On Break"},
              {value: "offline", label: "Offline"},
            ]}
            value={statusFilter}
            onChange={(value)=> setStatusFilter(value as any)}
            icon={<Filter className="w-4 h-4" />}
className="w-48"
  />
        </div>

{
  loading?(
          <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-50 p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-6 text-gray-500 font-medium">Synchronizing officer data...</p>
            </div>
          </div>
        ) : error ? (
  <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-50 p-12">
    <div className="text-center">
      <AlertCircle className="h-14 w-14 text-red-500 mx-auto mb-6" />
        <p className="text-red-600 font-bold mb-6 text-lg">{error}</p>
          <button
onClick={()=> {
  setError(""); fetchOfficers(true);}}
                className="bg-purple-600 text-white px-8 py-3 rounded-2xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all"
 >
  Retry Request
              </button>
            </div>
          </div>
        ) : filteredOfficers.length=== 0 ? (
    <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-slate-200">
      <Users className="h-16 w-16 text-gray-300 mx-auto mb-6" />
        <p className="text-gray-500 text-xl font-bold">No officers match your search</p>
          <p className="text-gray-400 mt-2">Try adjusting your filters or search terms</p>
          </div>
        ) : (
    <div className="grid gap-4">
  {
    filteredOfficers.map((officer)=> {
      const isExpanded= expandedOfficers.has(officer.id)
      return (
        <div key={officer.id} className="group bg-white rounded-2xl shadow-sm border-2 border-gray-50 p-4 transition-all hover:border-purple-100 hover:shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
      {
        !isExpanded && (
          <div className="flex items-start gap-5">
            <button onClick={()=> toggleOfficerExpanded(officer.id)
     } className="mt-1 text-gray-400 hover:text-purple-600 transition-colors">
        <ChevronDown className="w-6 h-6" />
                          </button>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{officer.name}</h3>
            <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-gray-500">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{officer.mobileNumber}</div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{officer.outlet.name}</div>
                  <CounterInfo officer={officer} onAssign={handleOpenAssignCounter} />
                    {getStatusBadge(officer.status, officer.isActive)}
                            </div>
                          </div>
                        </div>
                      )
}
{
  isExpanded && (
    <div className="animate-in slide-in-from-left-2 duration-200">
      <div className="flex items-center gap-5 mb-5">
        <button onClick={()=> toggleOfficerExpanded(officer.id)
} className="text-purple-600 hover:text-purple-800 transition-colors">
  <ChevronUp className="w-6 h-6" />
                            </button>
                            <div>
                              <h3 className="text-xl font-black text-gray-900">{officer.name}</h3>
                              <div className="flex items-center gap-5 mt-1 text-sm font-bold text-gray-500">
  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{officer.mobileNumber}</div>
    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{officer.outlet.name}</div>
      <CounterInfo officer={officer} onAssign={handleOpenAssignCounter} />
                              </div>
                            </div>
  <div className="ml-auto">{getStatusBadge(officer.status, officer.isActive)}</div>
                          </div>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-4 sm:ml-11">
    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
      <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Total Breaks</div>
        <div className="text-xl font-black text-blue-900">{officer.totalBreaks}</div>
                            </div>
  <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100">
    <div className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Total Break Time</div>
      <div className="text-xl font-black text-green-900">{formatDuration(officer.totalMinutes)}</div>
                            </div>
  <div className="bg-gray-100/50 rounded-2xl p-4 border border-slate-200">
    <div className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-1">Registered On</div>
      <div className="text-xl font-black text-gray-900">{formatDate(officer.createdAt)}</div>
                            </div>
                          </div>
{
  officer.activeBreak && (
    <div className="mt-5 sm:ml-11 p-4 bg-yellow-50 border-2 border-yellow-100 rounded-2xl flex items-center gap-4 animate-pulse">
    <div className="bg-yellow-100 p-2 rounded-xl">
    <Coffee className="w-6 h-6 text-yellow-700" />
                              </div>
  <span className="text-sm font-bold text-yellow-800">Currently on break (Started: {new Date(officer.activeBreak.startTime).toLocaleTimeString()})</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
  <div className={`gap-3 flex ${isExpanded ?"flex-col" : "flex-row"} sm:ml-6 w-full md:w-auto mt-2 md:mt-0`}>
    <button onClick={()=> navigate(`/teleshop-manager/officers/${officer.id}/edit`)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-bold text-gray-700 hover:border-purple-600 hover:text-purple-600 transition-all"><Edit className="w-4 h-4" />Edit</button>
    <button onClick={()=> handleToggleActive(officer.id, officer.isActive ?? true, officer.name)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${officer.isActive === false ? 'text-green-600 border-green-200 hover:border-green-600 hover:bg-green-50' : 'text-orange-500 border-orange-200 hover:border-orange-500 hover:bg-orange-50'}`}>
      {officer.isActive === false ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {officer.isActive === false ? "Activate" : "Suspend"}
    </button>
                    </div>
                  </div>
                </div>
              )
           })}
          </div>
        )}
      </div>

  {/* Assign Counter Modal */}
{
  showAssignCounterModal && selectedOfficerForCounter && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-purple-600 p-6 text-white">
          <h3 className="text-xl font-black">Assign Station</h3>
            <p className="text-purple-100 text-sm mt-1">Assign Counter for {selectedOfficerForCounter.name}</p>
            </div>
    <div className="p-8">
      <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase">Outlet</span>
            <span className="text-sm font-black text-gray-900">{selectedOfficerForCounter.outlet.name}</span>
                </div>
              </div>

    <div className="mb-8">
      <label className="block text-sm font-bold text-gray-700 mb-3">Select Counter Number</label>
        <select
  value={selectedCounter || ""}
  onChange={(e)=> setSelectedCounter(e.target.value ? Number(e.target.value) : null)
}
className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all font-bold text-gray-900 bg-gray-50"
 >
  <option value="">Unassigned (Pool Queue)</option>
{
  Array.from({length: selectedOfficerForCounter.outlet.counterCount || 10}, (_, i)=> i + 1).map(num=> (
    <option key={num} value={num}>Counter Assignment #{num}</option>
  ))
}
                </select>
              </div>

  <div className="flex gap-4">
    <button
onClick={()=> {setShowAssignCounterModal(false); setSelectedOfficerForCounter(null); setSelectedCounter(null);}}
className="flex-1 px-6 py-4 text-gray-500 font-bold border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all"
 >
  Dismiss
                </button>
  <button
    onClick={handleAssignCounter}
    className="flex-[2] px-6 py-4 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all transform active:scale-95"
     >
      {selectedCounter? 'Apply Assignment': 'Clear Station'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}