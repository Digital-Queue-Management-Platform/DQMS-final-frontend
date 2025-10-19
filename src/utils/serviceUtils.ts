// Service type mapping utility
export const getServiceDisplayName = (serviceType: string): string => {
  const serviceMap: { [key: string]: string } = {
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
  
  // Return mapped name or format the serviceType if not found
  return serviceMap[serviceType] || serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Get service type color for UI consistency
export const getServiceColor = (serviceType: string): string => {
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
  
  return colorMap[serviceType] || 'bg-gray-100 text-gray-800'
}