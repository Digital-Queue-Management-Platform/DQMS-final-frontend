// Shared service mapping utility to eliminate race conditions
import api from '../config/api'

// Global shared cache for services
let sharedServicesCache: { [key: string]: string } = {}
let isLoading = false
let isLoaded = false
let loadPromise: Promise<{ [key: string]: string }> | null = null

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
  'repair': 'Repair Request',
  // Add common service codes as fallbacks
  'SVC001': 'Bill Payments',
  'SVC002': 'New Connections', 
  'SVC003': 'Plan Changes',
  'SVC004': 'Device Issues',
  'SVC005': 'Account Management'
}

// Load services from API and cache them globally
const loadServices = async (): Promise<{ [key: string]: string }> => {
  if (isLoaded) return sharedServicesCache
  if (isLoading && loadPromise) {
    return loadPromise
  }

  isLoading = true
  loadPromise = (async () => {
    try {
      console.log('Loading services from API...')
      const response = await api.get('/queue/services')
      const services = response.data || []
      
      console.log('Loaded services:', services)
      
      // Create mapping from service code to title
      services.forEach((service: any) => {
        if (service.code && service.title) {
          sharedServicesCache[service.code] = service.title
          console.log(`Mapped ${service.code} -> ${service.title}`)
        }
      })
      
      console.log('Shared services cache:', sharedServicesCache)
      isLoaded = true
    } catch (error) {
      console.error('Failed to load services for display names:', error)
    } finally {
      isLoading = false
    }
    
    return sharedServicesCache
  })()

  return loadPromise
}

// Get service name with automatic loading
export const getServiceDisplayName = async (serviceCode: string): Promise<string> => {
  if (!serviceCode) return 'Unknown Service'
  
  // Try static mapping first
  if (staticServiceMap[serviceCode]) {
    return staticServiceMap[serviceCode]
  }
  
  // Try cached services
  if (sharedServicesCache[serviceCode]) {
    return sharedServicesCache[serviceCode]
  }
  
  // Load services and get name
  const services = await loadServices()
  if (services[serviceCode]) {
    return services[serviceCode]
  }
  
  // Return formatted version as fallback
  return serviceCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Get service name synchronously (may return code initially)
export const getServiceDisplayNameSync = (serviceCode: string): string => {
  if (!serviceCode) return 'Unknown Service'
  
  // Try static mapping first
  if (staticServiceMap[serviceCode]) {
    return staticServiceMap[serviceCode]
  }
  
  // Try cached services
  if (sharedServicesCache[serviceCode]) {
    return sharedServicesCache[serviceCode]
  }
  
  // If not loaded yet, trigger loading for next time
  if (!isLoaded && !isLoading) {
    loadServices()
  }
  
  // Return formatted version as fallback
  return serviceCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Initialize loading
loadServices()

// Export the cache for direct access if needed
export { sharedServicesCache }
