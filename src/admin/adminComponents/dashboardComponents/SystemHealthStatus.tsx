import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../../config/api';

interface Service {
  name: string;
  status: string;
  uptime: string;
  icon: string;
  statusColor: string;
  iconColor: string;
}

const SystemHealthStatus: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const getIconComponent = (iconName: string): LucideIcon => {
    switch (iconName) {
      case 'CheckCircle':
        return CheckCircle;
      case 'AlertTriangle':
        return AlertTriangle;
      case 'XCircle':
        return XCircle;
      default:
        return CheckCircle;
    }
  };

  // Determine icon color classes based on icon type or status
  const getIconColorClass = (iconNameOrStatus: string | undefined): string => {
    if (!iconNameOrStatus) return 'text-slate-400';
    const key = iconNameOrStatus.toLowerCase();
    if (key.includes('check') || key.includes('ok') || key.includes('healthy')) {
      return 'text-green-500';
    }
    if (key.includes('alert') || key.includes('warn') || key.includes('triangle')) {
      return 'text-yellow-500';
    }
    if (key.includes('x') || key.includes('error') || key.includes('fail')) {
      return 'text-red-500';
    }
    return 'text-slate-400';
  };

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/system-health');
      setServices(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      //setError('Failed to get system health data');
      // Fallback to some default data in case of error
      setServices([
        {
          name: "Application Server",
          status: "Error",
          uptime: "0%",
          icon: "XCircle",
          statusColor: "bg-[#fee2e2] text-[#991b1b]",
          iconColor: "text-[#ef4444]",
        },
        {
          name: "Database Connection", 
          status: "Error",
          uptime: "0%",
          icon: "XCircle",
          statusColor: "bg-[#fee2e2] text-[#991b1b]",
          iconColor: "text-[#ef4444]",
        },
        {
          name: "SMS Gateway",
          status: "Error",
          uptime: "0%",
          icon: "XCircle",
          statusColor: "bg-[#fee2e2] text-[#991b1b]",
          iconColor: "text-[#ef4444]",
        },
        {
          name: "Email Service",
          status: "Error",
          uptime: "0%",
          icon: "XCircle",
          statusColor: "bg-[#fee2e2] text-[#991b1b]",
          iconColor: "text-[#ef4444]",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
    
    // Refresh system health every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
  return (
    <div className="p-4 rounded-2xl border-2 border-slate-200 bg-white">
  <div className="w-full flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12 px-4 md:px-20">

    {/* LEFT COLUMN */}
    <div className="flex flex-col justify-center w-full md:w-auto text-center md:text-left">
      <h1 className="font-semibold text-4xl sm:text-5xl md:text-6xl leading-tight sm:leading-tight md:leading-tight">
        <span className="block">System</span>
        <span className="block">Health</span>
        <span className="block">Status</span>
      </h1>

      <div className="mt-4 flex justify-center md:justify-start items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</span>
      </div>
    </div>

    {/* RIGHT COLUMN */}
    <div className="w-full md:flex-1 flex justify-center">
      <div className="space-y-6 w-full max-w-md">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 animate-pulse"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-4 h-4 bg-gray-300 rounded flex-shrink-0"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-4 bg-gray-300 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    </div>

  </div>
</div>

  );
}


  return (
    <div className="p-4 rounded-2xl border-2 border-slate-200 bg-white">
      <div className="w-full flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12 px-4 md:px-20">

        {/* LEFT COLUMN */}
        <div className="flex flex-col justify-center w-full md:w-auto text-center md:text-left">
          <h1 className="font-medium text-4xl sm:text-5xl md:text-6xl leading-tight sm:leading-tight md:leading-tight">
            <span className="block">System</span>
            <span className="block">Health</span>
            <span className="block">Status</span>
          </h1>

          <div className="mt-4 flex flex-wrap justify-center md:justify-start items-center gap-3 text-xs text-slate-600">
            {loading && (
              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</span>
            )}
            <span>Last Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full md:flex-1 flex justify-center">
          <div className="space-y-4 w-full max-w-md">
            {services.map((service, index) => {
              const IconComponent = getIconComponent(service.icon);
              const iconColorClass = getIconColorClass(
                service.icon ?? service.status
              );

              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComponent className={`w-4 h-4 flex-shrink-0 ${iconColorClass}`} />
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {service.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${service.statusColor}`}
                    >
                      {service.status}
                    </span>
                    <span className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">
                      {service.uptime} uptime
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthStatus;