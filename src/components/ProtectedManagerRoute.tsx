import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface ProtectedManagerRouteProps {
  children: React.ReactNode
}

const ProtectedManagerRoute: React.FC<ProtectedManagerRouteProps> = ({ children }) => {
  const location = useLocation()
  const managerToken = localStorage.getItem('managerToken')
  const manager = localStorage.getItem('manager')

  if (!managerToken || !manager) {
    // Redirect to manager login with return url
    return <Navigate to={`/manager/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <>{children}</>
}

export default ProtectedManagerRoute