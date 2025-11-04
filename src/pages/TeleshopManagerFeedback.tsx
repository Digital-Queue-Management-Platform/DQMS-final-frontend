"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft, 
  Filter, 
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import FeedbackCard from "../components/FeedbackCard"
import api from "../config/api"

interface Feedback {
  id: string
  rating: number
  comment?: string
  isResolved: boolean
  createdAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionComment?: string
  token: {
    tokenNumber: number
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
  customer: {
    id: string
    name: string
    mobileNumber: string
  }
}

interface Stats {
  totalFeedback: number
  unresolvedFeedback: number
  resolvedFeedback: number
  todayFeedback: number
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

export default function TeleshopManagerFeedback() {
  const navigate = useNavigate()
  const [teleshopManager, setTeleshopManager] = useState<TeleshopManager | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filters
  const [filters, setFilters] = useState({
    resolved: "false", // Show unresolved by default
    startDate: "",
    endDate: ""
  })
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchTeleshopManagerData()
    fetchFeedback()
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

  const fetchFeedback = async () => {
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

      const response = await api.get(`/teleshop-manager/feedback?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data) {
        setFeedback(response.data.feedback || [])
        setStats(response.data.stats || null)
        setPagination(response.data.pagination || null)
      }
    } catch (error: any) {
      console.error("Failed to fetch feedback:", error)
      if (error.response?.status === 401) {
        navigate("/teleshop-manager/login")
      } else {
        setError("Failed to load feedback")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResolveFeedback = async (feedbackId: string, resolutionComment: string) => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (!token) {
        navigate("/teleshop-manager/login")
        return
      }

      await api.patch(`/teleshop-manager/feedback/${feedbackId}/resolve`, {
        resolutionComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Refresh feedback list
      fetchFeedback()
    } catch (error: any) {
      console.error("Failed to resolve feedback:", error)
      alert("Failed to resolve feedback. Please try again.")
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      resolved: "false",
      startDate: "",
      endDate: ""
    })
    setCurrentPage(1)
  }

  if (loading || !teleshopManager) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading feedback...</div>
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
            <h1 className="text-2xl font-bold text-gray-900">3-Star Feedback</h1>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex items-center">
                <MessageSquare className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Total Feedback</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFeedback}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Unresolved</h3>
                  <p className="text-2xl font-bold text-red-600">{stats.unresolvedFeedback}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Resolved</h3>
                  <p className="text-2xl font-bold text-green-600">{stats.resolvedFeedback}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Today</h3>
                  <p className="text-2xl font-bold text-blue-600">{stats.todayFeedback}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.resolved}
                onChange={(e) => handleFilterChange("resolved", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="false">Unresolved Only</option>
                <option value="true">Resolved Only</option>
                <option value="">All Feedback</option>
              </select>
            </div>

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
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={fetchFeedback}
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

        {/* Feedback List */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : feedback.length > 0 ? (
          <>
            <div className="space-y-4 mb-6">
              {feedback.map((item) => (
                <FeedbackCard
                  key={item.id}
                  feedback={item}
                  onResolve={!item.isResolved ? handleResolveFeedback : undefined}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  Showing page {pagination.page} of {pagination.totalPages} 
                  ({pagination.total} total feedback)
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
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 mb-2">No feedback found</div>
            <p className="text-sm text-gray-400">
              3-star customer feedback will appear here for your review and resolution
            </p>
          </div>
        )}
    </div>
  )
}