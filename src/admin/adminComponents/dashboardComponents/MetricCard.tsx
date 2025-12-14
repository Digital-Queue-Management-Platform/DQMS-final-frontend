//import React from 'react';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendLabel?: string;
  detail?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
  detail
}) => {
  return (
    <div className="p-6 rounded-2xl border border-gray-200 bg-white">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="mt-1 flex items-baseline">
            <p className="text-xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <span
                className={`ml-2 flex items-center text-xs font-medium ${trend === 'up'
                    ? title.includes('Waiting')
                      ? 'text-red-600'
                      : 'text-green-600'
                    : title.includes('Waiting')
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
        <div className="p-2 rounded-full">{icon}</div>
      </div>
    </div>
  );
};

export default MetricCard;