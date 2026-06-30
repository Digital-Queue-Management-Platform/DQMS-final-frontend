import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import api from "../config/api"

interface ProtectedTeleshopManagerRouteProps {
  children: React.ReactNode
}

export default function ProtectedTeleshopManagerRoute({ children }: ProtectedTeleshopManagerRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      
      if (!token) {
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      // Verify the token with the backend
      const response = await api.get("/teleshop-manager/me", {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.teleshopManager) {
        setIsAuthenticated(true)
        
        // Update localStorage with fresh data
        localStorage.setItem("teleshopManager", JSON.stringify(response.data.teleshopManager))
        localStorage.setItem("dq_role", "teleshop_manager")
        localStorage.setItem("dq_user", JSON.stringify({
          id: response.data.teleshopManager.id,
          mobileNumber: response.data.teleshopManager.mobileNumber,
          name: response.data.teleshopManager.name,
          role: "teleshop_manager"
        }))
      } else {
        throw new Error("Invalid teleshop manager data")
      }
    } catch (error: any) {
      console.error("Teleshop Manager authentication check failed:", error)
      
      // Clear invalid tokens
      localStorage.removeItem("teleshopManagerToken")
      localStorage.removeItem("teleshopManager")
      localStorage.removeItem("dq_role")
      localStorage.removeItem("dq_user")
      
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login with return path
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/teleshop-manager/login?returnTo=${returnTo}`} replace />
  }

  return <>{children}</>
}