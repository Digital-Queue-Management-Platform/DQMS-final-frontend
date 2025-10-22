// Service type mapping utility - now uses shared cache
import { getServiceDisplayNameSync } from './sharedServiceCache'

// Re-export the shared service display function for backward compatibility
export const getServiceDisplayName = getServiceDisplayNameSync

// Legacy function name for backward compatibility
export const getServiceName = getServiceDisplayNameSync

// Get color classes for service type badges
export const getServiceColor = (serviceType: string): string => {
  // Map service types to consistent color schemes
  const colorMap: { [key: string]: string } = {
    'SVC001': 'bg-blue-100 text-blue-800',
    'SVC002': 'bg-green-100 text-green-800', 
    'SVC003': 'bg-purple-100 text-purple-800',
    'SVC004': 'bg-orange-100 text-orange-800',
    'SVC005': 'bg-indigo-100 text-indigo-800',
    'bill_payment': 'bg-blue-100 text-blue-800',
    'new_connection': 'bg-green-100 text-green-800',
    'technical_support': 'bg-purple-100 text-purple-800',
    'billing_inquiry': 'bg-orange-100 text-orange-800',
    'service_upgrade': 'bg-indigo-100 text-indigo-800',
    'service_downgrade': 'bg-red-100 text-red-800',
    'account_closure': 'bg-gray-100 text-gray-800',
    'complaint': 'bg-red-100 text-red-800',
    'other': 'bg-gray-100 text-gray-800',
    'general_inquiry': 'bg-yellow-100 text-yellow-800',
    'payment_plan': 'bg-teal-100 text-teal-800',
    'reconnection': 'bg-green-100 text-green-800',
    'address_change': 'bg-blue-100 text-blue-800',
    'ownership_transfer': 'bg-purple-100 text-purple-800',
    'service_request': 'bg-indigo-100 text-indigo-800',
    'maintenance': 'bg-orange-100 text-orange-800',
    'installation': 'bg-green-100 text-green-800',
    'repair': 'bg-red-100 text-red-800'
  }

  // Return mapped color or default
  return colorMap[serviceType] || 'bg-gray-100 text-gray-800'
}