import axios from "axios"

const isLocal = typeof window !== 'undefined' && (/localhost|127\.0\.0\.1|^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./).test(window.location.hostname)

const API_BASE_URL = isLocal
  ? "http://127.0.0.1:3001/api"
  : (import.meta.env.VITE_API_URL || "https://digital-queue-management-platform-fbdnbcddgzgka0dz.southeastasia-01.azurewebsites.net/api")

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json; charset=UTF-8",
  },
  withCredentials: true,
})

// Add request interceptor to include authentication tokens
api.interceptors.request.use(
  (config) => {
    // Check for admin token for admin routes
    if (config.url?.startsWith('/admin/')) {
      const adminToken = localStorage.getItem('adminToken')
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`
      }
    }

    // Check for manager token for manager routes
    if (config.url?.startsWith('/manager/')) {
      const managerToken = localStorage.getItem('managerToken')
      if (managerToken) {
        config.headers.Authorization = `Bearer ${managerToken}`
      }
    }

    // Check for officer token for officer routes
    if (config.url?.startsWith('/officer/')) {
      const officerToken = localStorage.getItem('officerToken')
      if (officerToken) {
        config.headers.Authorization = `Bearer ${officerToken}`
      }
    }

    // Check for teleshop manager token for teleshop-manager routes
    if (config.url?.startsWith('/teleshop-manager/')) {
      const teleshopManagerToken = localStorage.getItem('teleshopManagerToken')
      if (teleshopManagerToken) {
        config.headers.Authorization = `Bearer ${teleshopManagerToken}`
      }
    }

    // Check for GM token for GM routes
    if (config.url?.startsWith('/gm/')) {
      const gmToken = localStorage.getItem('gmToken')
      if (gmToken) {
        config.headers.Authorization = `Bearer ${gmToken}`
      }
    }

    // Check for DGM token for DGM routes
    if (config.url?.startsWith('/dgm/')) {
      const dgmToken = localStorage.getItem('dgmToken')
      if (dgmToken) {
        config.headers.Authorization = `Bearer ${dgmToken}`
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized errors by clearing tokens
      const currentPath = window.location.pathname
      const requestUrl = error.config?.url || ''

      console.log('401 error on:', requestUrl, 'current path:', currentPath)

      // Only clear tokens, don't redirect - let the app handle navigation
      if (requestUrl.startsWith('/admin/') || currentPath.startsWith('/admin')) {
        localStorage.removeItem('adminToken')
      }
      else if (requestUrl.startsWith('/manager/') || currentPath.startsWith('/manager')) {
        localStorage.removeItem('manager')
        localStorage.removeItem('managerToken')
        localStorage.removeItem('dq_role')
        localStorage.removeItem('dq_user')
      }
      else if (requestUrl.startsWith('/officer/') || currentPath.startsWith('/officer')) {
        localStorage.removeItem('officer')
        localStorage.removeItem('officerToken')
      }
      else if (requestUrl.startsWith('/teleshop-manager/') || currentPath.startsWith('/teleshop-manager')) {
        localStorage.removeItem('teleshopManager')
        localStorage.removeItem('teleshopManagerToken')
        localStorage.removeItem('dq_role')
        localStorage.removeItem('dq_user')
      }
      else if (requestUrl.startsWith('/gm/') || currentPath.startsWith('/gm')) {
        localStorage.removeItem('gm')
        localStorage.removeItem('gmToken')
        localStorage.removeItem('dq_role')
        localStorage.removeItem('dq_user')
      }
      else if (requestUrl.startsWith('/dgm/') || currentPath.startsWith('/dgm')) {
        localStorage.removeItem('dgm')
        localStorage.removeItem('dgmToken')
        localStorage.removeItem('dq_role')
        localStorage.removeItem('dq_user')
      }
      else {
        // Default: check user role from localStorage and clear appropriate tokens
        const userRole = localStorage.getItem('dq_role')
        if (userRole === 'admin') {
          localStorage.removeItem('adminToken')
        } else if (userRole === 'region_manager') {
          localStorage.removeItem('manager')
          localStorage.removeItem('managerToken')
          localStorage.removeItem('dq_role')
          localStorage.removeItem('dq_user')
        } else if (userRole === 'teleshop_manager') {
          localStorage.removeItem('teleshopManager')
          localStorage.removeItem('teleshopManagerToken')
          localStorage.removeItem('dq_role')
          localStorage.removeItem('dq_user')
        } else if (userRole === 'officer') {
          localStorage.removeItem('officer')
          localStorage.removeItem('officerToken')
        } else if (userRole === 'gm') {
          localStorage.removeItem('gm')
          localStorage.removeItem('gmToken')
          localStorage.removeItem('dq_role')
          localStorage.removeItem('dq_user')
        } else if (userRole === 'dgm') {
          localStorage.removeItem('dgm')
          localStorage.removeItem('dgmToken')
          localStorage.removeItem('dq_role')
          localStorage.removeItem('dq_user')
        }
      }
    }
    return Promise.reject(error)
  }
)

// WebSocket connection
export const WS_URL = isLocal
  ? "ws://127.0.0.1:3001"
  : (import.meta.env.VITE_WS_URL || "wss://digital-queue-management-platform-fbdnbcddgzgka0dz.southeastasia-01.azurewebsites.net")

// Export API_URL for use in fetch calls
export const API_URL = API_BASE_URL

export default api
