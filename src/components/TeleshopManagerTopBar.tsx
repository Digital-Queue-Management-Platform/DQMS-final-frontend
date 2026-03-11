"use client"

import React from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, Phone, Bell } from "lucide-react"
import { motion } from "framer-motion"
import api from "../config/api"

type TeleshopManager = {
  id: string
  name: string
  mobileNumber: string
  regionName?: string
  officers?: any[]
}

type Props = {
  teleshopManager: TeleshopManager
  title?: string
  unreadAlertCount?: number
  onNotificationClick?: () => void
}

export default function TeleshopManagerTopBar({ 
  teleshopManager, 
  title = "Teleshop Manager",
  unreadAlertCount = 0,
  onNotificationClick
}: Props) {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = React.useState(new Date())

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("teleshopManagerToken")
      if (token) {
        await api.post("/teleshop-manager/logout", {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      // Clear local storage and redirect regardless of API success
      localStorage.removeItem("teleshopManager")
      localStorage.removeItem("teleshopManagerToken")
      localStorage.removeItem("dq_role")
      localStorage.removeItem("dq_user")
      navigate("/teleshop-manager/login")
    }
  }

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm px-4 sm:px-6 py-3.5 sticky top-0 z-30">
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
              {teleshopManager.name} • {teleshopManager.regionName ? `${teleshopManager.regionName} Region` : 'Unknown Region'} • {teleshopManager.officers?.length || 0} officers
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-10 flex-shrink-0">
          {/* 3-Star Feedback Alerts Notification Bell */}
          {onNotificationClick && (
            <button
              onClick={onNotificationClick}
              className="relative p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="3-Star Feedback Alerts"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-xl flex items-center justify-center text-[10px]">
                  {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                </span>
              )}
            </button>
          )}

          {/* Role Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 ring-1 ring-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span className="hidden md:inline">Teleshop </span>Manager
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
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-sky-200">
              <span className="text-sm sm:text-base font-semibold text-white">
                {teleshopManager.name?.charAt(0)?.toUpperCase() || 'T'}
              </span>
            </div>
            <div className="hidden lg:flex flex-col justify-center min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate leading-tight">{teleshopManager.name}</p>
              <p className="text-xs text-gray-500 truncate leading-tight flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                {teleshopManager.mobileNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Logout Button */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all text-xs font-medium"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  )
}