import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
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

  const fetchSystemHealth = async () => {
    try {
      const response = await api.get('/admin/system-health');
      setServices(response.data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
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
      <div className="p-4">
        <div className="max-w-lg">
          <h1 className="text-lg font-semibold mb-6">
            System Health Status
          </h1>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-lg">
        <h1 className="text-lg font-semibold mb-6">
          System Health Status
        </h1>

        <div className="space-y-3">
          {services.map((service, index) => {
            const IconComponent = getIconComponent(service.icon);
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <IconComponent className={`w-4 h-4 ${service.iconColor}`} />
                  <span className="text-[#374151] text-sm font-medium">
                    {service.name}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${service.statusColor}`}
                  >
                    {service.status}
                  </span>
                  <span className="text-[#6b7280] text-sm">
                    {service.uptime} uptime
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SystemHealthStatus;