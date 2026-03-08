"use client"

import React from "react"
import { useNavigate } from "react-router-dom"
import { Coffee, Play, LogOut } from "lucide-react"
import { motion } from "framer-motion"
import ConfirmDialog from "./ConfirmDialog"
import api from "../config/api"
import type { Officer } from "../types"

type Props = {
  officer: Officer
  onOfficerUpdate?: (officer: Officer) => void
  onAfterStatusChange?: (status: string) => void
}

export default function OfficerTopBar({ officer, onOfficerUpdate, onAfterStatusChange }: Props) {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmLoading, setConfirmLoading] = React.useState(false)

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleStatusChange = async (status: string) => {
    try {
      if (status === 'on_break') {
        // Use dedicated break start endpoint
        await api.post('/officer/break/start', { officerId: officer.id })
      } else if (status === 'available' && officer.status === 'on_break') {
        // Use dedicated break end endpoint
        await api.post('/officer/break/end', { officerId: officer.id })
      } else {
        // Use general status endpoint for other status changes
        await api.post('/officer/status', { officerId: officer.id, status })
      }
      
      const updated: Officer = { ...officer, status }
      onOfficerUpdate?.(updated)
      onAfterStatusChange?.(status)
      if (status === 'offline') {
        try { await api.post('/officer/logout') } catch {}
        navigate('/officer/login')
      }
    } catch (err: any) {
      console.error('Failed to update status:', err)
      const errorMessage = err.response?.data?.error || 'Failed to update status'
      alert(errorMessage)
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate leading-tight">Service Officer</h1>
            <p className="text-sm text-gray-600 mt-0.5 truncate leading-tight">
              Counter {officer.counterNumber ?? '-'} • {officer.outlet?.name ?? ''}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-1 sm:space-x-10 flex-shrink-0">
          <div className="flex sm:flex-row sm:items-center sm:space-x-3">
            {/* Status Badge */}
            <motion.div
              key={officer.status}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                officer.status === 'available'
                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                  : officer.status === 'serving'
                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                    : officer.status === 'on_break'
                      ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                      : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                officer.status === 'available' ? 'bg-emerald-500' :
                officer.status === 'serving' ? 'bg-blue-500' :
                officer.status === 'on_break' ? 'bg-amber-500' : 'bg-slate-400'
              }`} />
              {officer.status === 'available' ? 'Available' :
               officer.status === 'serving' ? 'Serving' :
               officer.status === 'on_break' ? 'On Break' : 'Offline'}
            </motion.div>

            {/* Status Controls */}
            {officer.status === 'available' && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setConfirmOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-xs font-medium border border-amber-200"
              >
                <Coffee className="w-3.5 h-3.5" />
                Break
              </motion.button>
            )}

            {officer.status === 'on_break' && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleStatusChange('available')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-medium border border-emerald-200"
              >
                <Play className="w-3.5 h-3.5" />
                Resume
              </motion.button>
            )}
          </div>

          {/* Current Time */}
          <div className="hidden lg:flex flex-col items-end text-sm text-gray-600 min-w-0">
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

          {/* User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-amber-200">
              <span className="text-sm sm:text-base font-semibold text-white">
                {officer.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="hidden md:flex flex-col justify-center min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate leading-tight">{officer.name}</p>
              <p className="text-xs text-gray-500 truncate leading-tight">Counter {officer.counterNumber ?? '-'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Logout Button */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => handleStatusChange('offline')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Confirm take break */}
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmLoading(true)
          try {
            await handleStatusChange('on_break')
            setConfirmOpen(false)
          } finally {
            setConfirmLoading(false)
          }
        }}
        loading={confirmLoading}
        title="Take a break?"
        description={
          <span>
            You are about to set your status to <span className="font-semibold">On Break</span>. Customers will not be called while on break.
          </span>
        }
        confirmText="Yes, take break"
        cancelText="Not now"
      />
    </header>
  )
}
