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
  detail,
}) => {
  return (
    <div className="p-3 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500 leading-tight truncate">{title}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1">
            <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">{value}</p>
            {trend && (
              <span
                className={`flex items-center text-[10px] sm:text-xs font-medium ${
                  trend === 'up'
                    ? title.includes('Waiting')
                      ? 'text-red-600'
                      : 'text-green-600'
                    : title.includes('Waiting')
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {trend === 'up' ? (
                  <TrendingUpIcon className="h-3 w-3 mr-0.5" />
                ) : (
                  <TrendingDownIcon className="h-3 w-3 mr-0.5" />
                )}
                <span className="hidden sm:inline">{trendLabel}</span>
              </span>
            )}
          </div>
          {detail && (
            <p className="mt-1 text-[10px] sm:text-xs text-gray-400 leading-snug line-clamp-2">
              {detail}
            </p>
          )}
        </div>
        <div className="p-1.5 sm:p-2 rounded-full flex-shrink-0 bg-slate-50">{icon}</div>
      </div>
    </div>
  );
};

export default MetricCard;