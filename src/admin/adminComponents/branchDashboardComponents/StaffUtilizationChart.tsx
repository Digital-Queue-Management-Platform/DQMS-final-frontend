import React, { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  time: string
  activeCounters: number
  customerDemand: number
}

import api from '../../../config/api'

const StaffUtilizationChart: React.FC<{ outletId?: string | null }> = ({ outletId = null }) => {
  const [showCustomerDemand, setShowCustomerDemand] = useState<boolean>(false)
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    // Build hourly data for the workday using /admin/analytics (best-effort)
    const build = async () => {
      const todayStart = new Date()
      todayStart.setHours(0,0,0,0)
      const points: DataPoint[] = []
      for (let hour = 8; hour <= 18; hour++) {
        const s = new Date(todayStart)
        s.setHours(hour,0,0,0)
        const e = new Date(todayStart)
        e.setHours(hour,59,59,999)
        try {
          const res = await api.get('/admin/analytics', { params: { outletId, startDate: s.toISOString(), endDate: e.toISOString() } })
          const a = res.data || {}
          // a.officerPerformance may contain tokensHandled per officer; active counters = number of distinct officers active in that hour (best-effort)
          let activeCounters = 0
          if (Array.isArray(a.officerPerformance) && a.officerPerformance.length > 0) {
            activeCounters = a.officerPerformance.length
          } else if (a.officersCount) {
            activeCounters = a.officersCount
          }
          // customerDemand approximate via totalTokens (completed) + waiting tokens for that hour
          const customerDemand = a.totalTokens || 0
          const timeOfDay = hour < 10 ? `0${hour}:00` : `${hour}:00`
          points.push({ time: timeOfDay, activeCounters, customerDemand })
        } catch (err) {
          const timeOfDay = hour < 10 ? `0${hour}:00` : `${hour}:00`
          points.push({ time: timeOfDay, activeCounters: 0, customerDemand: 0 })
        }
      }
      setData(points)
    }

    build()
  }, [outletId])

  const handleToggle = (): void => {
    setShowCustomerDemand(!showCustomerDemand)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Staff Utilization Trend</h2>
        <div className="flex items-center">
          <div 
            className="inline-flex items-center cursor-pointer"
            onClick={handleToggle}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            <div className={`relative w-11 h-6 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${showCustomerDemand ? 'bg-blue-600 after:translate-x-full' : 'bg-gray-200'}`}></div>
            <span className="ms-3 text-sm font-medium text-gray-600">Show Customer Demand</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fill: '#666' }} axisLine={{ stroke: '#e0e0e0' }} tickLine={{ stroke: '#e0e0e0' }} label={{ value: 'Time of Day', position: 'insideBottom', offset: -15, fill: '#666' }} />
            <YAxis yAxisId="left" tick={{ fill: '#666' }} axisLine={{ stroke: '#e0e0e0' }} tickLine={{ stroke: '#e0e0e0' }} label={{ value: 'Active Counters', angle: -90, position: 'insideLeft', fill: '#666' }} />
            {showCustomerDemand && (
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#666' }} axisLine={{ stroke: '#e0e0e0' }} tickLine={{ stroke: '#e0e0e0' }} label={{ value: 'Customer Demand', angle: 90, position: 'insideRight', fill: '#666' }} />
            )}
            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
            <Legend verticalAlign="top" height={36} />
            <Line yAxisId="left" type="monotone" dataKey="activeCounters" stroke="#2563eb" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Active Counters" />
            {showCustomerDemand && (
              <Line yAxisId="right" type="monotone" dataKey="customerDemand" stroke="#f97316" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Customer Demand" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>This chart shows the number of active service counters throughout the day compared to customer demand.</p>
        <p>Use this data to optimize staff allocation during peak hours.</p>
      </div>
    </div>
  )
}

export default StaffUtilizationChart