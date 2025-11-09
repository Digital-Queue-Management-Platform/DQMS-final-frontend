import React from 'react';
import { MapPinIcon, UsersIcon, ClockIcon, StarIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface Branch {
  id: string | number;
  name: string;
  customersServed: number;
  avgWaitingTime: number;
  rating: number;
  avgServiceTime: number;
  trend: 'up' | 'down';
}

interface SriLankaMapProps {
  branchData: Branch[];
}

const SriLankaMap: React.FC<SriLankaMapProps> = ({ branchData }) => {
  // Group branches by region
  const regions: Record<string, string[]> = {
    Western: ['Colombo', 'Negombo'],
    Central: ['Kandy'],
    Southern: ['Galle'],
    Northern: ['Jaffna'],
    Eastern: ['Batticaloa', 'Trincomalee'],
    'North Central': ['Anuradhapura'],
  };

  // Function to determine the color based on waiting time
  const getWaitTimeColor = (waitingTime: number): string => {
    if (waitingTime <= 10) return 'bg-green-500';
    if (waitingTime <= 15) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Function to determine the color based on rating
  const getRatingColor = (rating: number): string => {
    if (rating >= 4.3) return 'text-green-600';
    if (rating >= 3.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {branchData.map((branch) => (
          <div
            key={branch.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-3 sm:p-4 border-b border-gray-100">
              <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 sm:gap-0">
                <div className="flex items-center min-w-0 flex-1">
                  <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2 flex-shrink-0" />
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                    {branch.name}
                  </h4>
                </div>
                <div
                  className={`flex items-center text-xs font-medium flex-shrink-0 ${
                    branch.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {branch.trend === 'up' ? (
                    <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  )}
                  <span className="hidden sm:inline">{branch.trend === 'up' ? 'Improving' : 'Declining'}</span>
                  <span className="sm:hidden">{branch.trend === 'up' ? '↗' : '↘'}</span>
                </div>
              </div>
              {/* Find region for this branch */}
              {Object.entries(regions).map(
                ([region, cities]) =>
                  cities.includes(branch.name) && (
                    <div key={region} className="text-xs text-gray-500 mt-1">
                      {region} Region
                    </div>
                  )
              )}
            </div>

            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-2 sm:p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-1" />
                </div>
                <div className="text-sm sm:text-lg font-semibold text-gray-800">
                  {branch.customersServed}
                </div>
                <div className="text-xs text-gray-500">Customers</div>
              </div>

              <div className="p-2 sm:p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-1" />
                </div>
                <div className="flex justify-center">
                  <span
                    className={`text-sm sm:text-lg font-semibold px-1.5 py-1 sm:px-2 rounded-full ${getWaitTimeColor(
                      branch.avgWaitingTime
                    )} text-white`}
                  >
                    {branch.avgWaitingTime}
                  </span>
                </div>
                <div className="text-xs text-gray-500">Wait (min)</div>
              </div>

              <div className="p-2 sm:p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <StarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-1" />
                </div>
                <div className={`text-sm sm:text-lg font-semibold ${getRatingColor(branch.rating)}`}>
                  {branch.rating.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Rating</div>
              </div>
            </div>

            <div className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Service: {branch.avgServiceTime}min
                </div>
                <div className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                  <span className="hidden sm:inline">View details →</span>
                  <span className="sm:hidden">Details</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend - Responsive */}
      <div className="mt-6 sm:mt-8 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 text-xs">
          {/* Wait time indicators */}
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-green-500 mr-2 flex-shrink-0"></div>
            <span>Wait &lt; 10 min</span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2 flex-shrink-0"></div>
            <span>Wait 10-15 min</span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-red-500 mr-2 flex-shrink-0"></div>
            <span>Wait &gt; 15 min</span>
          </div>
          
          {/* Trend indicators */}
          <div className="flex items-center">
            <TrendingUpIcon className="h-3 w-3 text-green-600 mr-1 flex-shrink-0" />
            <span>Improving</span>
          </div>
          <div className="flex items-center">
            <TrendingDownIcon className="h-3 w-3 text-red-600 mr-1 flex-shrink-0" />
            <span>Declining</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SriLankaMap;