import { useState, useEffect } from 'react'
import { api } from '../config/api'

// Cache for services - initialize with common fallbacks
let servicesCache: { [key: string]: string } = {
  'SVC001': 'Account Opening',
  'SVC002': 'Bill Payment', 
  'SVC003': 'Loan Processing',
  'SVC004': 'Money Transfer',
  'SVC005': 'Foreign Exchange',
  'SVC006': 'Check Clearing',
  'SVC007': 'Credit Card Services',
  'SVC008': 'Investment Services',
}
let isLoading = false
let isLoaded = false

// Static fallback mapping for hardcoded service types
const staticServiceMap: { [key: string]: string } = {
  'bill_payment': 'Bill Payment',
  'new_connection': 'New Connection',
  'technical_support': 'Technical Support',
  'billing_inquiry': 'Billing Inquiry',
  'service_upgrade': 'Service Upgrade',
  'service_downgrade': 'Service Downgrade',
  'account_closure': 'Account Closure',
  'complaint': 'Complaint',
  'other': 'Other Services',
  'general_inquiry': 'General Inquiry',
  'payment_plan': 'Payment Plan',
  'reconnection': 'Reconnection',
  'address_change': 'Address Change',
  'ownership_transfer': 'Ownership Transfer',
  'service_request': 'Service Request',
  'maintenance': 'Maintenance Request',
  'installation': 'Installation',
  'repair': 'Repair Request'
}

// Load services from API
const loadServices = async (): Promise<{ [key: string]: string }> => {
  if (isLoaded) return servicesCache
  if (isLoading) {
    // Wait for current loading to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    return servicesCache
  }

  isLoading = true
  
  try {
    console.log('Loading services from API...')
    const response = await api.get('/queue/services')
    const services = response.data || []
    
    console.log('Loaded services:', services)
    
    // Create mapping from service code to title
    services.forEach((service: any) => {
      if (service.code && service.title) {
        servicesCache[service.code] = service.title
        console.log(`Mapped ${service.code} -> ${service.title}`)
      }
    })
    
    console.log('Services cache:', servicesCache)
    isLoaded = true
  } catch (error) {
    console.error('Failed to load services for display names:', error)
  } finally {
    isLoading = false
  }
  
  return servicesCache
}

// Hook to get service name with automatic loading
export const useServiceName = (serviceCode: string): string => {
  // Initialize with immediate fallback
  const getInitialValue = (code: string): string => {
    if (!code) return 'Unknown Service'
    
    // Check static mapping first
    if (staticServiceMap[code]) return staticServiceMap[code]
    
    // Check cache
    if (servicesCache[code]) return servicesCache[code]
    
    // Format code nicely as fallback
    return code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const [serviceName, setServiceName] = useState<string>(getInitialValue(serviceCode))

  useEffect(() => {
    if (!serviceCode) {
      setServiceName('Unknown Service')
      return
    }

    const getServiceName = async () => {
      // Try static mapping first
      if (staticServiceMap[serviceCode]) {
        setServiceName(staticServiceMap[serviceCode])
        return
      }

      // Check if already cached
      if (servicesCache[serviceCode]) {
        setServiceName(servicesCache[serviceCode])
        return
      }

      // Load services and get name
      const services = await loadServices()
      if (services[serviceCode]) {
        setServiceName(services[serviceCode])
      } else {
        // Format the code nicely as fallback
        setServiceName(serviceCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
      }
    }

    getServiceName()
  }, [serviceCode])

  return serviceName || getInitialValue(serviceCode)
}

// Function to get service name synchronously (may return code initially)
export const getServiceDisplayName = (serviceType: string): string => {
  // Try static mapping first
  if (staticServiceMap[serviceType]) {
    return staticServiceMap[serviceType]
  }
  
  // Try cached services
  if (servicesCache[serviceType]) {
    return servicesCache[serviceType]
  }
  
  // If not loaded yet, trigger loading for next time and return formatted code
  if (!isLoaded && !isLoading) {
    loadServices()
  }
  
  // Return formatted version as fallback
  return serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Initialize loading
loadServices()