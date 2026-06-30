import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface Props { children: React.ReactNode }

const ProtectedDGMRoute: React.FC<Props> = ({ children }) => {
    const location = useLocation()
    const dgmToken = localStorage.getItem('dgmToken')
    const dgm = localStorage.getItem('dgm')
    if (!dgmToken || !dgm) {
        return <Navigate to={`/dgm/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
    }
    return <>{children}</>
}

export default ProtectedDGMRoute
