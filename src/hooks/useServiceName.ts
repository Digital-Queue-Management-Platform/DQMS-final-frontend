import { useState, useEffect } from 'react'
import { getServiceDisplayName, getServiceDisplayNameSync } from '../utils/sharedServiceCache'

// Hook to get service name with automatic loading
export const useServiceName = (serviceCode: string): string => {
  const [serviceName, setServiceName] = useState<string>(getServiceDisplayNameSync(serviceCode))

  useEffect(() => {
    if (!serviceCode) {
      setServiceName('Unknown Service')
      return
    }

    const getServiceName = async () => {
      const name = await getServiceDisplayName(serviceCode)
      setServiceName(name)
    }

    getServiceName()
  }, [serviceCode])

  return serviceName || getServiceDisplayNameSync(serviceCode)
}

// Re-export for backward compatibility
export { getServiceDisplayName, getServiceDisplayNameSync }