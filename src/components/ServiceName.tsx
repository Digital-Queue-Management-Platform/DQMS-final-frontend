import React from 'react'
import { useServiceName } from '../hooks/useServiceName'

interface ServiceNameProps {
  serviceType: string
  className?: string
}

const ServiceName: React.FC<ServiceNameProps> = ({ serviceType, className = '' }) => {
  const serviceName = useServiceName(serviceType)
  
  // Show loading state only if we have the original service code (not formatted yet)
  const isLoading = serviceName === serviceType && serviceName.includes('SVC')
  
  if (isLoading) {
    return <span className={className}>Loading...</span>
  }
  
  return <span className={className}>{serviceName}</span>
}

export default ServiceName