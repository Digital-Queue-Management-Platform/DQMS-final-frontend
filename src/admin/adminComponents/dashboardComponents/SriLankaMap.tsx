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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {branchData.map((branch) => (
          <div
            key={branch.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-800">
                    {branch.name}
                  </h4>
                </div>
                <div
                  className={`flex items-center text-xs font-medium ${
                    branch.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {branch.trend === 'up' ? (
                    <TrendingUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {branch.trend === 'up' ? 'Improving' : 'Declining'}
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
              <div className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <UsersIcon className="h-4 w-4 text-gray-400 mr-1" />
                </div>
                <div className="text-lg font-semibold text-gray-800">
                  {branch.customersServed}
                </div>
                <div className="text-xs text-gray-500">Customers</div>
              </div>

              <div className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                </div>
                <div className="flex justify-center">
                  <span
                    className={`text-lg font-semibold px-2 py-1 rounded-full ${getWaitTimeColor(
                      branch.avgWaitingTime
                    )} text-white`}
                  >
                    {branch.avgWaitingTime}
                  </span>
                </div>
                <div className="text-xs text-gray-500">Wait (min)</div>
              </div>

              <div className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <StarIcon className="h-4 w-4 text-gray-400 mr-1" />
                </div>
                <div className={`text-lg font-semibold ${getRatingColor(branch.rating)}`}>
                  {branch.rating.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Rating</div>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Service time: {branch.avgServiceTime} min
                </div>
                <div className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                  View details →
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 bg-white p-3 rounded-lg shadow-sm flex items-center justify-between text-xs border border-gray-200">
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
          <span>Wait &lt; 10 min</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
          <span>Wait 10-15 min</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
          <span>Wait &gt; 15 min</span>
        </div>
        <div className="flex items-center ml-4 pl-4 border-l border-gray-200">
          <TrendingUpIcon className="h-3 w-3 text-green-600 mr-1" />
          <span>Improving</span>
        </div>
        <div className="flex items-center ml-4">
          <TrendingDownIcon className="h-3 w-3 text-red-600 mr-1" />
          <span>Declining</span>
        </div>
      </div>
    </div>
  );
}

export default SriLankaMap;