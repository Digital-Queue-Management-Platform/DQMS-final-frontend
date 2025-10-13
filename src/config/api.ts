import axios from "axios"

const API_BASE_URL = "http://localhost:3001/api"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

// WebSocket connection
export const WS_URL = "ws://localhost:3001"

export default api
