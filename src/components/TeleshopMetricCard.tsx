import React from 'react'
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react'

interface TeleshopMetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down'
  trendLabel?: string
  detail?: string
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red'
}

const TeleshopMetricCard: React.FC<TeleshopMetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendLabel, 
  detail,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="mt-1 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <span
                className={`ml-2 flex items-center text-xs font-medium ${
                  trend === 'up'
                    ? title.includes('Breaks') || title.includes('Break')
                      ? 'text-red-600'
                      : 'text-green-600'
                    : title.includes('Breaks') || title.includes('Break')
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {trend === 'up' ? (
                  <TrendingUpIcon className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDownIcon className="h-3 w-3 mr-1" />
                )}
                {trendLabel}
              </span>
            )}
          </div>
          {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default TeleshopMetricCard