import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface Props { children: React.ReactNode }

const ProtectedGMRoute: React.FC<Props> = ({ children }) => {
    const location = useLocation()
    const gmToken = localStorage.getItem('gmToken')
    const gm = localStorage.getItem('gm')
    if (!gmToken || !gm) {
        return <Navigate to={`/gm/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
    }
    return <>{children}</>
}

export default ProtectedGMRoute
