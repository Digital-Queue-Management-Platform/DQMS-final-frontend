import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://dqms-final-backend.onrender.com/api"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

// WebSocket connection
export const WS_URL = import.meta.env.VITE_WS_URL || "wss://dqms-final-backend.onrender.com"

export default api
