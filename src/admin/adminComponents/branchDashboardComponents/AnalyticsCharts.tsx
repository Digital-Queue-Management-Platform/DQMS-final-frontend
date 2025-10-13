import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import StaffUtilizationChart from './StaffUtilizationChart';

interface HourlyWaitingTime {
  hour: string;
  waitTime: number;
}

interface ServiceType {
  name: string;
  count: number;
}

interface RatingDistribution {
  rating: number;
  count: number;
}

interface TokenDataItem {
  hour: string;
  issued: number;
  completed: number;
}

interface EnhancedTokenDataItem extends TokenDataItem {
  dropOffs: number;
}

interface AnalyticsData {
  hourlyWaitingTimes: HourlyWaitingTime[];
  serviceTypes: ServiceType[];
  ratingDistribution: RatingDistribution[];
}

interface AnalyticsChartsProps {
  data: AnalyticsData;
  tokenData: TokenDataItem[];
  outletId?: string | null;
}

type TimeRange = 'daily' | 'weekly' | 'monthly';

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data, tokenData, outletId = null }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const totalIssued = tokenData.reduce((sum, item) => sum + item.issued, 0);
  const totalCompleted = tokenData.reduce((sum, item) => sum + item.completed, 0);
  const totalDropOffs = totalIssued - totalCompleted;
  const dropOffPercentage = ((totalDropOffs / totalIssued) * 100).toFixed(1);

  const enhancedTokenData: EnhancedTokenDataItem[] = tokenData.map(item => ({
    ...item,
    dropOffs: item.issued - item.completed,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Branch Analytics
        </h2>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === 'daily'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
            onClick={() => setTimeRange('daily')}
          >
            Daily
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === 'weekly'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
            onClick={() => setTimeRange('weekly')}
          >
            Weekly
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === 'monthly'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
            onClick={() => setTimeRange('monthly')}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Line Chart */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Waiting Times Throughout the Day
          </h3>
          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.hourlyWaitingTimes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" />
                <YAxis unit=" min" />
                <Tooltip formatter={(value) => [`${value} min`, 'Wait Time']} />
                <Line
                  type="monotone"
                  dataKey="waitTime"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Services Availed
          </h3>
          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.serviceTypes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Token Drop-off Trend */}
      <div className="mt-8">
        <div className=" p-4 mb-6">
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
                  formatter={(value, name) => {
                    if (name === 'issued') return [`${value} Tokens`, 'Issued'];
                    if (name === 'completed') return [`${value} Tokens`, 'Completed'];
                    if (name === 'dropOffs') return [`${value} Customers`, 'No-shows'];
                    return [value, name];
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
      </div>

      <div className="mt-14">
        <StaffUtilizationChart outletId={outletId} />
      </div>

      {/* Pie Chart */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Customer Rating Distribution
        </h3>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.ratingDistribution as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="rating"
                label={({ name, percent }) =>
                  `${name}★: ${(percent as any * 100).toFixed(0)}%`
                }
              >
                {data.ratingDistribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${value} customers`,
                  `${name}★ Rating`,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;