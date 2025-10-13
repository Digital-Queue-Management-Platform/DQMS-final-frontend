import React, { useEffect, useState } from 'react'
import api from '../../config/api'
import { Users, Hash, CheckCircle2, XCircle, Search, UserCog } from 'lucide-react'

interface Officer {
  id: string
  name: string
  mobileNumber: string
  outletId: string
  assignedServices?: any
  counterNumber?: number | null
}

const AdminOfficers: React.FC = () => {
  const [officers, setOfficers] = useState<Officer[]>([])
  const [services, setServices] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchOfficers()
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const res = await api.get('/queue/services')
      const list = (res.data || []).map((s: any) => ({ id: s.id, title: s.title }))
      setServices(list)
    } catch (err) {
      console.error('Failed to fetch services', err)
    }
  }

  const fetchOfficers = async () => {
    try {
      const res = await api.get('/admin/officers')
      setOfficers(res.data)
    } catch (err) {
      console.error('Failed to fetch officers', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
               <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Officers Management</h1>
              <p className="text-gray-600 text-sm">Overview of officer assignments and services</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Officers</p>
                <p className="text-3xl font-bold text-slate-800">{officers.length}</p>
              </div>
              <div className="p-3 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">With Counters</p>
                <p className="text-3xl font-bold text-slate-800">{officers.filter(o => o.counterNumber).length}</p>
              </div>
              <div className="p-3 rounded-lg">
                <Hash className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Active Services</p>
                <p className="text-3xl font-bold text-slate-800">{services.length}</p>
              </div>
              <div className="p-3 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Unassigned</p>
                <p className="text-3xl font-bold text-slate-800">{officers.filter(o => !o.assignedServices || o.assignedServices.length === 0).length}</p>
              </div>
              <div className="p-3rounded-lg">
                <XCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search officers by name, mobile number, or outlet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">Detailed officer management has moved to the Manager portal.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminOfficers