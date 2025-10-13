"use client"

import React from "react"
import { useNavigate } from "react-router-dom"
import { Coffee, Play, LogOut } from "lucide-react"
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
      await api.post('/officer/status', { officerId: officer.id, status })
      const updated: Officer = { ...officer, status }
      onOfficerUpdate?.(updated)
      onAfterStatusChange?.(status)
      if (status === 'offline') {
        try { await api.post('/officer/logout') } catch {}
        navigate('/officer/login')
      }
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('Failed to update status')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        {/* Logo and Page Title Section */}
        <div className="min-w-0 flex-1 mr-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-lg hidden sm:flex items-center justify-center p-1">
            <img 
              src="/logo.jpg" 
              alt="System Logo" 
              className="w-full h-full object-contain"
            />
          </div>
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
            <div
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${
                officer.status === 'available'
                  ? 'bg-green-100 text-green-700'
                  : officer.status === 'serving'
                    ? 'bg-blue-100 text-blue-700'
                    : officer.status === 'on_break'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
              }`}
            >
              {officer.status === 'available'
                ? 'Available'
                : officer.status === 'serving'
                  ? 'Serving'
                  : officer.status === 'on_break'
                    ? 'On Break'
                    : 'Offline'}
            </div>

            {/* Status Controls */}
            {officer.status === 'available' && (
              <button
                onClick={() => setConfirmOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
              >
                <Coffee className="w-3 h-3" />
                Break
              </button>
            )}

            {officer.status === 'on_break' && (
              <button
                onClick={() => handleStatusChange('available')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
              >
                <Play className="w-3 h-3" />
                Resume
              </button>
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
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm sm:text-base font-medium text-white">
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
            <button
              onClick={() => handleStatusChange('offline')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
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
