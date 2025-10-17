import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface ProtectedAdminRouteProps {
  children: React.ReactNode
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const location = useLocation()
  const adminToken = localStorage.getItem('adminToken')

  if (!adminToken) {
    // Redirect to admin login with return url
    return <Navigate to={`/admin/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <>{children}</>
}

export default ProtectedAdminRoute