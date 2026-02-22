"use client"

import { useState, useEffect } from "react"
//import { useNavigate } from "react-router-dom"
import {
    Users,
    Hash,
    Search,
    AlertCircle,
    CheckCircle,
    Coffee,
    Phone,
    MapPin,
    RefreshCw,
    ChevronDown,
    X,
    Building2
} from "lucide-react"
import api, { WS_URL } from "../config/api"

interface Officer {
    id: string
    name: string
    mobileNumber: string
    counterNumber?: number | null
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
    assignedServices?: any
    languages?: any
}

interface Branch {
    id: string
    name: string
    location: string
    counterCount?: number
}

export default function ManagerOfficerAssignment() {
    //const navigate = useNavigate()
    const [branches, setBranches] = useState<Branch[]>([])
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
    const [officers, setOfficers] = useState<Officer[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null)
    const [counterNumber, setCounterNumber] = useState<string>('')
    const [assigning, setAssigning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => {
        fetchBranches()

        // WebSocket for real-time updates
        let ws: WebSocket | null = null
        let reconnectTimer: number | null = null
        let isComponentMounted = true

        const connectWebSocket = () => {
            if (!isComponentMounted) return

            try {
                ws = new WebSocket(WS_URL)

                ws.onopen = () => {
                    console.log('ManagerOfficerAssignment WebSocket connected')
                }

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)
                        if (data.type === "OFFICER_UPDATED" || data.type === "OFFICER_STATUS_CHANGE") {
                            // Refresh officers if a branch is selected
                            if (selectedBranch) {
                                fetchOfficers(selectedBranch.id)
                            }
                        }
                    } catch (error) {
                        console.error('WebSocket message parsing error:', error)
                    }
                }

                ws.onerror = (error) => {
                    console.error('ManagerOfficerAssignment WebSocket error:', error)
                }

                ws.onclose = (event) => {
                    console.log('ManagerOfficerAssignment WebSocket disconnected')
                    if (!event.wasClean && isComponentMounted) {
                        reconnectTimer = window.setTimeout(connectWebSocket, 5000)
                    }
                }
            } catch (error) {
                console.error('Failed to create WebSocket:', error)
            }
        }

        connectWebSocket()

        return () => {
            isComponentMounted = false
            if (reconnectTimer) {
                clearTimeout(reconnectTimer)
            }
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close()
            }
        }
    }, [selectedBranch])

    const fetchBranches = async () => {
        try {
            const response = await api.get('/manager/me')
            const manager = response.data.manager
            if (manager && manager.outlets) {
                setBranches(manager.outlets)
            }
        } catch (err: any) {
            console.error('Failed to fetch branches:', err)
            setError('Failed to load branches')
        }
    }

    const fetchOfficers = async (branchId: string) => {
        try {
            setLoading(true)
            setError(null)
            const response = await api.get(`/manager/branch/${branchId}/officers`)
            setOfficers(response.data.officers || [])
        } catch (err: any) {
            console.error('Failed to fetch officers:', err)
            setError('Failed to load officers for this branch')
            setOfficers([])
        } finally {
            setLoading(false)
        }
    }

    const handleBranchSelect = (branch: Branch) => {
        setSelectedBranch(branch)
        setSearchTerm('')
        fetchOfficers(branch.id)
    }

    const handleOpenAssignCounter = (officer: Officer) => {
        setSelectedOfficer(officer)
        setCounterNumber(officer.counterNumber?.toString() || '')
        setAssignModalOpen(true)
        setError(null)
        setSuccess(null)
    }

    const handleAssignCounter = async () => {
        if (!selectedOfficer) return

        try {
            setAssigning(true)
            setError(null)

            const counterValue = counterNumber.trim() === '' ? null : parseInt(counterNumber)

            await api.patch(`/manager/officers/${selectedOfficer.id}/assign-counter`, {
                counterNumber: counterValue
            })

            setSuccess(counterValue === null
                ? `Successfully unassigned ${selectedOfficer.name} from counter`
                : `Successfully assigned ${selectedOfficer.name} to counter ${counterValue}`)

            setAssignModalOpen(false)
            setSelectedOfficer(null)
            setCounterNumber('')

            // Refresh officers
            if (selectedBranch) {
                fetchOfficers(selectedBranch.id)
            }

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            console.error('Failed to assign counter:', err)
            setError(err.response?.data?.error || 'Failed to assign counter')
        } finally {
            setAssigning(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            available: { label: 'Available', color: 'bg-green-100 text-green-700 border-green-200' },
            serving: { label: 'Serving', color: 'bg-blue-100 text-blue-700 border-blue-200' },
            on_break: { label: 'On Break', color: 'bg-orange-100 text-orange-700 border-orange-200' },
            break: { label: 'On Break', color: 'bg-orange-100 text-orange-700 border-orange-200' },
            offline: { label: 'Offline', color: 'bg-gray-100 text-gray-700 border-gray-200' },
            busy: { label: 'Busy', color: 'bg-red-100 text-red-700 border-red-200' }
        }

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                {config.label}
            </span>
        )
    }

    const filteredOfficers = officers.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.mobileNumber.includes(searchTerm)
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Officer Counter Assignment</h1>
                    <p className="text-gray-600">Assign officers to counters across all branches in your region</p>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-green-800">{success}</p>
                    </div>
                )}

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Branch Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        <Building2 className="w-4 h-4 inline-block mr-2" />
                        Select Branch
                    </label>
                    <div className="relative">
                        <select
                            value={selectedBranch?.id || ''}
                            onChange={(e) => {
                                const branch = branches.find(b => b.id === e.target.value)
                                if (branch) handleBranchSelect(branch)
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                        >
                            <option value="">-- Select a branch --</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name} - {branch.location}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Officers Section */}
                {selectedBranch && (
                    <>
                        {/* Search */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search officers by name or mobile number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600 mb-1">Total Officers</p>
                                        <p className="text-3xl font-bold text-slate-800">{officers.length}</p>
                                    </div>
                                    <Users className="w-8 h-8 text-purple-600" />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600 mb-1">Assigned to Counters</p>
                                        <p className="text-3xl font-bold text-slate-800">
                                            {officers.filter(o => o.counterNumber).length}
                                        </p>
                                    </div>
                                    <Hash className="w-8 h-8 text-blue-600" />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600 mb-1">Available Counters</p>
                                        <p className="text-3xl font-bold text-slate-800">
                                            {selectedBranch.counterCount || 0}
                                        </p>
                                    </div>
                                    <Building2 className="w-8 h-8 text-emerald-600" />
                                </div>
                            </div>
                        </div>

                        {/* Officers List */}
                        {loading ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                                <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-spin" />
                                <p className="text-slate-600">Loading officers...</p>
                            </div>
                        ) : filteredOfficers.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-600 text-lg">
                                    {searchTerm ? 'No officers found matching your search' : 'No officers in this branch'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredOfficers.map((officer) => (
                                    <div
                                        key={officer.id}
                                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center font-semibold text-lg text-purple-600">
                                                    {officer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-800 text-lg">{officer.name}</h3>
                                                    <div className="flex items-center gap-1 text-sm text-slate-500">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        {officer.mobileNumber}
                                                    </div>
                                                </div>
                                            </div>
                                            {getStatusBadge(officer.status)}
                                        </div>

                                        <div className="space-y-3 mb-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin className="w-4 h-4 text-slate-400" />
                                                <span className="text-slate-600">{officer.outlet.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Hash className="w-4 h-4 text-slate-400" />
                                                <span className="text-slate-600">
                                                    Counter:{' '}
                                                    {officer.counterNumber ? (
                                                        <span className="font-semibold text-slate-800">#{officer.counterNumber}</span>
                                                    ) : (
                                                        <span className="text-slate-400">Not assigned</span>
                                                    )}
                                                </span>
                                            </div>
                                            {officer.activeBreak && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Coffee className="w-4 h-4 text-orange-500" />
                                                    <span className="text-orange-600">Currently on break</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleOpenAssignCounter(officer)}
                                            className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                                        >
                                            <Hash className="w-4 h-4" />
                                            {officer.counterNumber ? 'Change Counter' : 'Assign Counter'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {!selectedBranch && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 text-lg">Please select a branch to view and assign officers</p>
                    </div>
                )}
            </div>

            {/* Assign Counter Modal */}
            {assignModalOpen && selectedOfficer && (
                <>
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                        onClick={() => setAssignModalOpen(false)}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-slate-800">Assign Counter</h2>
                                <button
                                    onClick={() => setAssignModalOpen(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="mb-6">
                                <p className="text-sm text-slate-600 mb-1">Officer</p>
                                <p className="font-semibold text-slate-800">{selectedOfficer.name}</p>
                                <p className="text-sm text-slate-500">{selectedOfficer.mobileNumber}</p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Counter Number
                                </label>
                                <input
                                    type="number"
                                    value={counterNumber}
                                    onChange={(e) => setCounterNumber(e.target.value)}
                                    placeholder="Enter counter number (leave empty to unassign)"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    min="1"
                                    max={selectedOfficer.outlet.counterCount || 999}
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    Available counters: 1 - {selectedOfficer.outlet.counterCount || 'N/A'}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAssignModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignCounter}
                                    disabled={assigning}
                                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {assigning ? 'Assigning...' : counterNumber.trim() === '' ? 'Unassign' : 'Assign'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
