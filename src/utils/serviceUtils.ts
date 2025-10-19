// Service type mapping utility
import api from '../config/api'

// Cache for dynamic services from API
let cachedServices: { [key: string]: string } = {}
let servicesLoaded = false

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

// Load services from API and cache them
const loadServices = async () => {
  if (servicesLoaded) return
  
  try {
    const response = await api.get('/queue/services')
    const services = response.data || []
    
    // Create mapping from service code to title
    services.forEach((service: any) => {
      if (service.code && service.title) {
        cachedServices[service.code] = service.title
      }
    })
    
    servicesLoaded = true
  } catch (error) {
    console.warn('Failed to load services for display names:', error)
  }
}

// Initialize service loading
loadServices()

// Function to refresh services cache (useful for when services are updated)
export const refreshServices = async () => {
  servicesLoaded = false
  cachedServices = {}
  await loadServices()
}

export const getServiceDisplayName = (serviceType: string): string => {
  // Try dynamic services first (for database codes like SVC002)
  if (cachedServices[serviceType]) {
    return cachedServices[serviceType]
  }
  
  // Fallback to static mapping (for hardcoded types like bill_payment)
  if (staticServiceMap[serviceType]) {
    return staticServiceMap[serviceType]
  }
  
  // If not found, format the serviceType nicely
  return serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Get service type color for UI consistency
export const getServiceColor = (serviceType: string): string => {
  // Static color mapping for known service types
  const colorMap: { [key: string]: string } = {
    'bill_payment': 'bg-green-100 text-green-800',
    'new_connection': 'bg-blue-100 text-blue-800',
    'technical_support': 'bg-orange-100 text-orange-800',
    'billing_inquiry': 'bg-yellow-100 text-yellow-800',
    'service_upgrade': 'bg-purple-100 text-purple-800',
    'service_downgrade': 'bg-gray-100 text-gray-800',
    'account_closure': 'bg-red-100 text-red-800',
    'complaint': 'bg-red-100 text-red-800',
    'other': 'bg-gray-100 text-gray-800',
    'general_inquiry': 'bg-cyan-100 text-cyan-800',
    'payment_plan': 'bg-indigo-100 text-indigo-800',
    'reconnection': 'bg-emerald-100 text-emerald-800',
    'address_change': 'bg-teal-100 text-teal-800',
    'ownership_transfer': 'bg-pink-100 text-pink-800'
  }
  
  // For static service types, use predefined colors
  if (colorMap[serviceType]) {
    return colorMap[serviceType]
  }
  
  // For dynamic service codes (like SVC002), generate colors based on the code
  const serviceColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-orange-100 text-orange-800',
    'bg-cyan-100 text-cyan-800',
    'bg-indigo-100 text-indigo-800',
    'bg-teal-100 text-teal-800',
    'bg-emerald-100 text-emerald-800'
  ]
  
  // Generate a consistent color based on service code hash
  let hash = 0
  for (let i = 0; i < serviceType.length; i++) {
    hash = serviceType.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colorIndex = Math.abs(hash) % serviceColors.length
  
  return serviceColors[colorIndex]
}