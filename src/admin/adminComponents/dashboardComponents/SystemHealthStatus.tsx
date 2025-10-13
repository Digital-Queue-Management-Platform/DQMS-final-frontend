import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Service {
  name: string;
  status: string;
  uptime: string;
  icon: LucideIcon;
  statusColor: string;
  iconColor: string;
}

const SystemHealthStatus: React.FC = () => {
  const services: Service[] = [
    {
      name: "Application Server",
      status: "Healthy",
      uptime: "99.9%",
      icon: CheckCircle,
      statusColor: "bg-[#dcfce7] text-[#166534]",
      iconColor: "text-[#22c55e]",
    },
    {
      name: "Database Connection",
      status: "Healthy",
      uptime: "99.7%",
      icon: CheckCircle,
      statusColor: "bg-[#dcfce7] text-[#166534]",
      iconColor: "text-[#22c55e]",
    },
    {
      name: "SMS Gateway",
      status: "Warning",
      uptime: "95.2%",
      icon: AlertTriangle,
      statusColor: "bg-[#fef9c3] text-[#854d0e]",
      iconColor: "text-[#eab308]",
    },
    {
      name: "Email Service",
      status: "Healthy",
      uptime: "99.8%",
      icon: CheckCircle,
      statusColor: "bg-[#dcfce7] text-[#166534]",
      iconColor: "text-[#22c55e]",
    },
  ];

  return (
    <div className="p-4">
      <div className="max-w-lg">
        <h1 className="text-lg font-semibold mb-6">
          System Health Status
        </h1>

        <div className="space-y-3">
          {services.map((service, index) => {
            const IconComponent = service.icon;
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