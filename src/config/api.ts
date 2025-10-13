import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://dqms-final-backend.onrender.com/api"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

// Add request interceptor to include authentication tokens
api.interceptors.request.use(
  (config) => {
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
      // Handle unauthorized errors by clearing tokens and redirecting
      if (error.config?.url?.startsWith('/manager/')) {
        localStorage.removeItem('manager')
        localStorage.removeItem('managerToken')
        localStorage.removeItem('dq_role')
        localStorage.removeItem('dq_user')
        window.location.href = '/manager/login'
      } else if (error.config?.url?.startsWith('/officer/')) {
        localStorage.removeItem('officer')
        localStorage.removeItem('officerToken')
        window.location.href = '/officer/login'
      }
    }
    return Promise.reject(error)
  }
)

// WebSocket connection
export const WS_URL = import.meta.env.VITE_WS_URL || "wss://dqms-final-backend.onrender.com"

export default api
