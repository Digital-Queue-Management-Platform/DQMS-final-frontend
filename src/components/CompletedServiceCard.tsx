import { Clock, User, MapPin, FileText, CheckCircle } from "lucide-react"

interface CompletedServiceCardProps {
  service: {
    id: string
    duration?: number
    notes?: string
    completedAt: string
    token: {
      tokenNumber: number
      customer: {
        id: string
        name: string
        mobileNumber: string
      }
    }
    service: {
      id: string
      code: string
      title: string
    }
    officer: {
      id: string
      name: string
      mobileNumber: string
      counterNumber?: number
    }
    outlet: {
      id: string
      name: string
      location: string
    }
  }
}

import React from 'react'
function CompletedServiceCardComponent({ service }: CompletedServiceCardProps) {
  const calculateDuration = (service: any) => {
    // If explicit duration exists
    if (service.duration) return service.duration;
    // Otherwise calculate from startedAt and completedAt if available remotely
    if (service.startedAt && service.completedAt) {
      return Math.floor((new Date(service.completedAt).getTime() - new Date(service.startedAt).getTime()) / 60000);
    }
    return undefined;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes && minutes !== 0) return "N/A"
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">{service.service.title}</h3>
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
              {service.service.code}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">Customer</span>
              </div>
              <p className="text-gray-700">{service.token.customer.name}</p>
              <p className="text-gray-500 text-xs">{service.token.customer.mobileNumber}</p>
              <p className="text-gray-500 text-xs">Token #{service.token.tokenNumber}</p>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">Officer</span>
              </div>
              <p className="text-gray-700">{service.officer.name}</p>
              <p className="text-gray-500 text-xs">
                Counter {service.officer.counterNumber || 'N/A'}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">Location</span>
              </div>
              <p className="text-gray-700">{service.outlet.name}</p>
              <p className="text-gray-500 text-xs">{service.outlet.location}</p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(calculateDuration(service))}</span>
          </div>
          <p className="text-xs text-gray-500">
            {new Date(service.completedAt).toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(service.completedAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {service.notes && (
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Notes</span>
          </div>
          <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
            {service.notes}
          </p>
        </div>
      )}
    </div>
  )
}

// Memoize since props are stable objects from list mapping; prevents re-renders
const CompletedServiceCard = React.memo(CompletedServiceCardComponent)
export default CompletedServiceCard