//import React from 'react';
import { BellIcon, CheckCircleIcon, AlertCircleIcon, InfoIcon, AlertTriangleIcon } from 'lucide-react';
interface Alert {
  id: string | number;
  type: 'success' | 'error' | 'warning' | 'info';
  branch: string;
  message: string;
  time: string;
}
interface AlertsPanelProps {
  alerts: Alert[];
}
export function AlertsPanel({
  alerts
}: AlertsPanelProps) {
  // Function to get the appropriate icon based on alert type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <InfoIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InfoIcon className="h-5 w-5 text-gray-500" />;
    }
  };
  return <div className="h-full">
      <div className="border-b border-gray-200 py-4 px-6">
        <div className="flex items-center">
          <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100%-60px)]">
        {alerts.map(alert => <div key={alert.id} className="px-6 py-4 border-b border-gray-100 hover:bg-gray-50">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {alert.branch === 'All' ? 'All Branches' : alert.branch}
                </p>
                <p className="mt-1 text-sm text-gray-500">{alert.message}</p>
                <p className="mt-1 text-xs text-gray-400">{alert.time}</p>
              </div>
            </div>
          </div>)}
      </div>
    </div>;
}