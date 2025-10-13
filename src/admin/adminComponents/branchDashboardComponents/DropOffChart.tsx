import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface ServiceDataItem {
  name: string
  count: number
}

interface HourlyDataItem {
  hour: string
  customers: number
}

interface RatingDataItem {
  rating: number
  count: number
}

interface TokenDataItem {
  hour: string
  issued: number
  completed: number
}

interface EnhancedTokenDataItem extends TokenDataItem {
  dropOffs: number
}

interface DropOffChartProps {
  serviceData: ServiceDataItem[]
  hourlyData: HourlyDataItem[]
  ratingData: RatingDataItem[]
  tokenData: TokenDataItem[]
}

const DropOffChart: React.FC<DropOffChartProps> = ({ 
  serviceData, 
  hourlyData, 
  ratingData, 
  tokenData 
}) => {
  // Calculate totals and percentages
  const totalRatings = ratingData.reduce((sum, item) => sum + item.count, 0)
  const COLORS = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336']

  const totalIssued = tokenData.reduce((sum, item) => sum + item.issued, 0)
  const totalCompleted = tokenData.reduce((sum, item) => sum + item.completed, 0)
  const totalDropOffs = totalIssued - totalCompleted
  const dropOffPercentage = ((totalDropOffs / totalIssued) * 100).toFixed(1)

  const enhancedTokenData: EnhancedTokenDataItem[] = tokenData.map(item => ({
    ...item,
    dropOffs: item.issued - item.completed,
  }))

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Analytics & Charts</h2>

      {/* Token Drop-off Trend */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h3 className="text-base font-medium text-gray-700">Token Drop-off Trend</h3>
          <div className="mt-2 md:mt-0 flex items-center space-x-4">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              <span className="text-sm text-gray-600">Issued</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              <span className="text-sm text-gray-600">Completed</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-red-400 mr-1"></span>
              <span className="text-sm text-gray-600">Drop-offs</span>
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={enhancedTokenData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'issued') return [`${value} Tokens`, 'Issued']
                  if (name === 'completed') return [`${value} Tokens`, 'Completed']
                  if (name === 'dropOffs') return [`${value} Customers`, 'No-shows']
                  return [value, name]
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="issued" stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="dropOffs" stroke="#F87171" strokeDasharray="5 5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-semibold">Total no-shows:</span> {totalDropOffs} customers ({dropOffPercentage}% of issued tokens)
          </div>
          <div className="text-sm text-gray-500 mt-1 md:mt-0">
            <span className="font-semibold">Completion rate:</span> {(100 - parseFloat(dropOffPercentage)).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bar Chart: Customers by Service Type */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-base font-medium text-gray-700 mb-4">Customers by Service Type</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3B82F6" name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart: Customer Flow */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-base font-medium text-gray-700 mb-4">Customer Flow Throughout the Day</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="customers" stroke="#3B82F6" fill="#93C5FD" name="Customers" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pie Chart: Customer Ratings */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-base font-medium text-gray-700 mb-4">Customer Rating Distribution</h3>
        <div className="h-72 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ratingData as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="rating"
                label={(props: any) => 
                  `${props.name} Stars: ${(props.percent * 100).toFixed(0)}%`
                }
              >
                {ratingData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => 
                  [`${value} customers (${((value / totalRatings) * 100).toFixed(1)}%)`, 'Count']
                } 
              />
              <Legend formatter={(value: string) => `${value} Stars`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default DropOffChart