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
        return <AlertTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'info':
        return <InfoIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InfoIcon className="h-5 w-5 text-gray-500" />;
    }
  };
  return <div className="h-full">
      <div className="border-b border-slate-200 py-4 px-6">
        <div className="flex items-center">
          <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100%-60px)]">
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            className={`px-6 py-4 border-b border-gray-100 transition-colors ${
              alert.type === 'error' ? 'bg-red-50 hover:bg-red-100' :
              alert.type === 'warning' ? 'bg-orange-50 hover:bg-orange-100' :
              alert.type === 'success' ? 'bg-emerald-50 hover:bg-emerald-100' :
              'bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 mt-1 p-2 rounded-lg ${
                alert.type === 'error' ? 'bg-red-100 text-red-600' :
                alert.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                alert.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs font-bold uppercase tracking-wider ${
                    alert.type === 'error' ? 'text-red-700' :
                    alert.type === 'warning' ? 'text-orange-700' :
                    alert.type === 'success' ? 'text-emerald-700' :
                    'text-blue-700'
                  }`}>
                    {alert.branch === 'All' ? 'Global Alert' : alert.branch}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">{alert.time}</p>
                </div>
                <p className={`text-sm leading-relaxed ${
                  alert.type === 'error' ? 'text-red-900 font-medium' :
                  alert.type === 'warning' ? 'text-orange-900 font-medium' :
                  'text-slate-700'
                }`}>
                  {alert.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>;
}