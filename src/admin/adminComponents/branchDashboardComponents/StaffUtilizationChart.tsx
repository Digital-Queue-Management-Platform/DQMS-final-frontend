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



interface StaffUtilizationChartProps {
  data: DataPoint[]
}

const StaffUtilizationChart: React.FC<StaffUtilizationChartProps> = ({ data }) => {
  const [showCustomerDemand, setShowCustomerDemand] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)

  // Handle responsive sizing
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    <div className="w-full p-3 sm:p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-slate-100 border border-slate-200">
      {/* Header Section - Responsive */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">Staff Utilization Trend</h2>
          <div className="flex items-center">
            <div 
              className="inline-flex items-center cursor-pointer p-1"
              onClick={handleToggle}
              role="button"
              tabIndex={0}
              onKeyDown={handleKeyDown}
            >
              <div className={`relative w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all ${showCustomerDemand ? 'bg-blue-600 after:translate-x-full' : 'bg-gray-200'}`}></div>
              <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium text-gray-600">Show Customer Demand</span>
            </div>
          </div>
        </div>
        
        {/* Mobile-friendly legend when customer demand is shown */}
        {showCustomerDemand && isMobile && (
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-600"></div>
              <span className="text-gray-600">Active Counters</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-600"></div>
              <span className="text-gray-600">Customer Demand</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Container - Improved Responsive Layout */}
      <div className={`w-full ${isMobile ? 'h-64' : 'h-80 md:h-96 lg:h-[400px]'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data} 
            margin={{ 
              top: isMobile && showCustomerDemand ? 5 : 20,
              right: showCustomerDemand && !isMobile ? 60 : isMobile ? 10 : 20, 
              left: isMobile ? 35 : 50, 
              bottom: isMobile ? 40 : 50 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              tick={{ 
                fill: '#666', 
                fontSize: isMobile ? 10 : 12 
              }} 
              axisLine={{ stroke: '#e0e0e0' }} 
              tickLine={{ stroke: '#e0e0e0' }} 
              label={!isMobile ? { 
                value: 'Time of Day', 
                position: 'insideBottom', 
                offset: -10, 
                fill: '#666',
                fontSize: 12
              } : undefined}
              interval={isMobile ? 2 : 0}
            />
            <YAxis 
              yAxisId="left" 
              tick={{ 
                fill: '#666', 
                fontSize: isMobile ? 9 : 11 
              }} 
              axisLine={{ stroke: '#e0e0e0' }} 
              tickLine={{ stroke: '#e0e0e0' }} 
              label={!isMobile ? { 
                value: 'Active Counters', 
                angle: -90, 
                position: 'insideLeft', 
                fill: '#666',
                fontSize: 11
              } : undefined}
              width={isMobile ? 30 : 50}
            />
            {showCustomerDemand && !isMobile && (
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ 
                  fill: '#666', 
                  fontSize: 11 
                }} 
                axisLine={{ stroke: '#e0e0e0' }} 
                tickLine={{ stroke: '#e0e0e0' }} 
                label={{ 
                  value: 'Customer Demand', 
                  angle: 90, 
                  position: 'insideRight', 
                  fill: '#666',
                  fontSize: 11
                }}
                width={50}
              />
            )}
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e0e0e0', 
                borderRadius: 8, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: isMobile ? '11px' : '13px',
                padding: isMobile ? '6px 8px' : '10px 12px'
              }}
              labelStyle={{ fontSize: isMobile ? '10px' : '12px' }}
            />
            {!isMobile && (
              <Legend 
                verticalAlign="top" 
                height={36} 
                wrapperStyle={{
                  fontSize: '13px',
                  paddingBottom: '12px'
                }}
              />
            )}
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="activeCounters" 
              stroke="#2563eb" 
              strokeWidth={isMobile ? 1.5 : 2} 
              dot={{ 
                r: isMobile ? 2 : 3, 
                strokeWidth: isMobile ? 1 : 1.5 
              }} 
              activeDot={{ 
                r: isMobile ? 4 : 5 
              }} 
              name="Active Counters" 
            />
            {showCustomerDemand && (
              <Line 
                yAxisId={isMobile ? "left" : "right"} 
                type="monotone" 
                dataKey="customerDemand" 
                stroke="#f97316" 
                strokeWidth={isMobile ? 1.5 : 2} 
                dot={{ 
                  r: isMobile ? 2 : 3, 
                  strokeWidth: isMobile ? 1 : 1.5 
                }} 
                activeDot={{ 
                  r: isMobile ? 4 : 5 
                }} 
                name="Customer Demand" 
                strokeDasharray={isMobile ? "5,5" : "0"}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Description Section - Responsive Typography */}
      <div className="mt-3 sm:mt-4 md:mt-6 text-xs sm:text-sm text-gray-500 space-y-1 sm:space-y-2">
        <p className="leading-relaxed">This chart shows the number of active service counters throughout the day{showCustomerDemand ? ' compared to customer demand' : ''}.</p>
        <p className="leading-relaxed font-medium text-gray-600">Use this data to optimize staff allocation during peak hours.</p>
        {isMobile && showCustomerDemand && (
          <p className="text-xs text-gray-400 italic">On mobile: Customer demand shown as dashed line using same scale as counters.</p>
        )}
      </div>
    </div>
  )
}

export default StaffUtilizationChart