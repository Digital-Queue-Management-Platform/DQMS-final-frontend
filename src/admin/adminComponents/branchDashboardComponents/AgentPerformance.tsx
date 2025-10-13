import React from 'react';
import { UserIcon } from 'lucide-react';

interface Agent {
  id: string | number;
  name: string;
  status: 'active' | 'break' | 'offline';
  tokensHandled: number;
  avgServiceTime: number;
  avgRating: number;
}

interface AgentPerformanceProps {
  agents: Agent[];
}

const AgentPerformance: React.FC<AgentPerformanceProps> = ({ agents }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Agent Performance
        </h2>
        <button className="text-sm text-blue-600 hover:text-blue-800">
          View All
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <UserIcon size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{agent.name}</h3>
                <div className="flex items-center">
                  <span
                    className={`h-2 w-2 rounded-full mr-1.5 ${
                      agent.status === 'active'
                        ? 'bg-green-500'
                        : agent.status === 'break'
                        ? 'bg-amber-500'
                        : 'bg-gray-400'
                    }`}
                  ></span>
                  <span className="text-xs text-gray-500 capitalize">
                    {agent.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Tokens</div>
                <div className="font-semibold">{agent.tokensHandled}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Avg. Time</div>
                <div className="font-semibold">{agent.avgServiceTime} min</div>
              </div>
              <div className="bg-gray-50 p-2 rounded col-span-2">
                <div className="text-gray-500">Customer Rating</div>
                <div className="flex items-center">
                  <span className="font-semibold mr-1">
                    {agent.avgRating.toFixed(1)}
                  </span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(agent.avgRating)
                            ? 'text-amber-400'
                            : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentPerformance;