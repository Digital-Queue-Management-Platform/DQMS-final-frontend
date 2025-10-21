"use client"

import React from "react"
import { useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import api from "../config/api"

type Manager = {
  id: string
  name: string
  email: string
  mobile?: string
  regionId: string
  regionName?: string
  outlets?: any[]
}

type Props = {
  manager: Manager
  title?: string
}

export default function ManagerTopBar({ manager, title = "Regional Manager" }: Props) {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = React.useState(new Date())

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/manager/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and redirect regardless of API success
      localStorage.removeItem('manager')
      localStorage.removeItem('managerToken')
      localStorage.removeItem('dq_role')
      localStorage.removeItem('dq_user')
      navigate('/manager/login')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        {/* Logo and Page Title Section */}
        <div className="min-w-0 flex-1 mr-4 flex items-center gap-3">
          <img 
            src="/logo.jpg" 
            alt="System Logo" 
            className="w-10 h-10 rounded-lg object-contain hidden sm:block"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate leading-tight">{title}</h1>
            <p className="text-sm text-gray-600 mt-0.5 truncate leading-tight">
              {manager.name || manager.id || 'Manager'} • {manager.regionName ? `${manager.regionName} Region` : 'Unknown Region'} • {manager.outlets?.length || 0} branches
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-10 flex-shrink-0">
          {/* Region Badge */}
          <div className="hidden sm:block px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-700">
            <span className="hidden md:inline">{manager.regionName ? `${manager.regionName} ` : ''}</span>Manager
          </div>

          {/* Current Time */}
          <div className="hidden xl:flex flex-col items-end text-sm text-gray-600 min-w-0">
            <div className="font-medium text-xs leading-tight">
              {currentTime.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className="text-xs leading-tight font-mono">
              {currentTime.toLocaleString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>

          {/* Manager Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm sm:text-base font-medium text-white">
                {(manager.name || manager.id || 'M')?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="hidden lg:flex flex-col justify-center min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate leading-tight">{manager.name || manager.id || 'Manager'}</p>
              <p className="text-xs text-gray-500 truncate leading-tight">{manager.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-gray-500 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}