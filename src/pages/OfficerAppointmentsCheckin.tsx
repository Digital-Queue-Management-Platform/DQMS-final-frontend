"use client"

import { useState, useEffect } from "react"
import { Calendar, CheckCircle, Clock, User, Phone, AlertTriangle, RefreshCw } from "lucide-react"
import api from "../config/api"
import ServiceName from "../components/ServiceName"
import { getServiceColor } from "../utils/serviceUtils"

interface Appointment {
  id: string
  name: string
  mobileNumber: string
  outletId: string
  serviceTypes: string[]
  preferredLanguage?: string
  appointmentAt: string
  status: string
  tokenId?: string
  notes?: string
  sltTelephoneNumber?: string
  billPaymentIntent?: string
  billPaymentAmount?: number
  billPaymentMethod?: string
  createdAt: string
}

export default function OfficerAppointmentsCheckin() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [officer, setOfficer] = useState<any>(null)

  useEffect(() => {
    fetchOfficer()
  }, [])

  const fetchOfficer = async () => {
    try {
      const res = await api.get('/officer/me')
      setOfficer(res.data.officer)
      if (res.data.officer?.outletId) {
        fetchTodaysAppointments(res.data.officer.outletId)
      }
    } catch (err) {
      setError("Failed to load officer details")
    }
  }

  const fetchTodaysAppointments = async (outletId: string) => {
    try {
      setLoading(true)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const res = await api.get(`/appointment/outlet/${outletId}`, {
        params: {
          startDate: today.toISOString(),
          endDate: tomorrow.toISOString()
        }
      })

      // Filter for booked appointments only (not yet checked in)
      const booked = res.data.filter((a: Appointment) => a.status === 'booked')
      setAppointments(booked)
    } catch (err: any) {
      setError("Failed to load appointments")
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = async (appointmentId: string) => {
    try {
      setCheckingIn(appointmentId)
      setError("")
      setSuccess("")

      const res = await api.post(`/appointment/${appointmentId}/checkin`)

      if (res.data.success) {
        setSuccess(`Appointment checked in successfully! Token #${res.data.token.tokenNumber}`)
        // Remove from list
        setAppointments(prev => prev.filter(a => a.id !== appointmentId))
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to check in appointment")
    } finally {
      setCheckingIn(null)
    }
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const isUpcoming = (appointmentAt: string) => {
    const apptTime = new Date(appointmentAt).getTime()
    const now = Date.now()
    const twoHoursFromNow = now + (2 * 60 * 60 * 1000)
    return apptTime <= twoHoursFromNow && apptTime >= now
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-indigo-600" />
                Today's Appointments
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Check in customers who have booked appointments
              </p>
            </div>
            <button
              onClick={() => officer && fetchTodaysAppointments(officer.outletId)}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Appointments List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-slate-600 mt-4">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Appointments Today</h3>
              <p className="text-slate-600">
                All appointments have been checked in or there are no bookings for today.
              </p>
            </div>
          ) : (
            appointments.map((appt) => {
              const upcoming = isUpcoming(appt.appointmentAt)
              return (
                <div
                  key={appt.id}
                  className={`bg-white rounded-2xl shadow-sm border p-6 transition-all ${
                    upcoming
                      ? 'border-indigo-200 bg-indigo-50/30'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left Side - Customer Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {appt.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {appt.mobileNumber}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDateTime(appt.appointmentAt)}
                            </div>
                          </div>
                          
                          {/* Services */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {appt.serviceTypes.map((serviceType) => (
                              <span
                                key={serviceType}
                                className={`px-3 py-1 rounded-full text-xs font-bold ${getServiceColor(serviceType)}`}
                              >
                                <ServiceName serviceType={serviceType} />
                              </span>
                            ))}
                          </div>

                          {/* Additional Info */}
                          {(appt.sltTelephoneNumber || appt.billPaymentIntent) && (
                            <div className="mt-2 text-xs text-slate-600">
                              {appt.sltTelephoneNumber && (
                                <div>SLT Tel: {appt.sltTelephoneNumber}</div>
                              )}
                              {appt.billPaymentIntent && (
                                <div className="capitalize">
                                  Payment: {appt.billPaymentIntent}
                                  {appt.billPaymentIntent === 'partial' && appt.billPaymentAmount && 
                                    ` (Rs. ${appt.billPaymentAmount.toFixed(2)})`
                                  }
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Check-in Button */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleCheckin(appt.id)}
                        disabled={checkingIn === appt.id}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                          upcoming
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                            : 'bg-slate-600 hover:bg-slate-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {checkingIn === appt.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Checking In...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Check In
                          </>
                        )}
                      </button>
                      {upcoming && (
                        <p className="text-xs text-indigo-600 font-medium mt-2 text-center">
                          Appointment time approaching
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
