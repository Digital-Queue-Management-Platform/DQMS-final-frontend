import { useEffect, useState } from 'react'
import api from '../config/api'
import { Users, Hash, CheckCircle2, XCircle, Edit3, X, Search, Phone, MapPin, Save } from 'lucide-react'

interface Officer {
  id: string
  name: string
  mobileNumber: string
  outletId: string
  outlet?: any
  counterNumber?: number | null
  assignedServices?: any
  status?: string
  languages?: string[] | any
}

export default function ManagerOfficers() {
  const [officers, setOfficers] = useState<Officer[]>([])
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
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
      const res = await api.get('/manager/officers')
      setOfficers(res.data)
    } catch (err) {
      console.error('Failed to fetch officers', err)
    }
  }

  const openEditor = (officer: Officer) => {
    setSelectedOfficer({ ...officer })
  }

  const toggleService = (serviceId: string) => {
    if (!selectedOfficer) return
    const assigned = selectedOfficer.assignedServices || []
    const exists = assigned.includes(serviceId)
    const next = exists ? assigned.filter((s: string) => s !== serviceId) : [...assigned, serviceId]
    setSelectedOfficer({ ...selectedOfficer, assignedServices: next })
  }

  const saveOfficer = async () => {
    if (!selectedOfficer) return
    setSaving(true)
    try {
      await api.patch(`/manager/officer/${selectedOfficer.id}`, {
        name: selectedOfficer.name,
        counterNumber: selectedOfficer.counterNumber,
        assignedServices: selectedOfficer.assignedServices || [],
      })
      await fetchOfficers()
      setSelectedOfficer(null)
    } catch (err) {
      console.error('Failed to save officer', err)
    } finally {
      setSaving(false)
    }
  }

  const filteredOfficers = officers.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.mobileNumber.includes(searchTerm) ||
    o.outlet?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getServiceNames = (officer: Officer) => {
    const serviceIds = (officer.assignedServices || []) as string[]
    return serviceIds.map(sid => {
      const svc = services.find(s => s.id === sid)
      return svc ? svc.title : sid
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto">
        {/* Header Section in Body */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Officers Management</h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{/* Existing content continues */}
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOfficers.map((o) => {
            const serviceNames = getServiceNames(o)
            const langs = Array.isArray(o.languages) ? (o.languages as string[]) : []
            const langLabel = (c: string) => c === 'en' ? 'EN' : c === 'si' ? 'SI' : c === 'ta' ? 'TA' : c.toUpperCase()
            return (
              <div key={o.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 border border-slate-500 rounded-full flex items-center justify-center font-semibold text-lg">
                      {o.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg">{o.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Phone className="w-3.5 h-3.5" />
                        {o.mobileNumber}
                      </div>
                      {langs.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {langs.map((c) => (
                            <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-full border border-slate-200">
                              {langLabel(c)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-md font-bold border border-slate-200">
                    <span className={`${o.status === 'available' || o.status === 'serving' ? 'text-green-500' : o.status === 'on_break' ? 'text-orange-500' : 'text-red-500'}`}>
                      {o.status === 'available' ? 'Online' : o.status === 'serving' ? 'Online' : o.status === 'on_break' ? 'At Break' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{o.outlet?.name || 'No outlet'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Counter: {o.counterNumber ? <span className="font-semibold text-slate-800">{o.counterNumber}</span> : <span className="text-slate-400">Not assigned</span>}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-medium text-slate-500 mb-2">Assigned Services</div>
                  {serviceNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {serviceNames.map((name, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">{name}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 italic">No services assigned</div>
                  )}
                </div>

                <div className='flex justify-end'>
                  <button onClick={() => openEditor(o)} className="flex items-center justify-center gap-4 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    <Edit3 className="w-4 h-4" />
                    Edit Officer
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredOfficers.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">{searchTerm ? 'No officers found matching your search' : 'No officers available'}</p>
          </div>
        )}
      </div>

      {selectedOfficer && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSelectedOfficer(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Edit3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-800">Edit Officer</h2>
                </div>
                <button onClick={() => setSelectedOfficer(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Officer Name</label>
                <input value={selectedOfficer.name} onChange={(e) => setSelectedOfficer({ ...selectedOfficer, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Enter officer name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Counter Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="number" value={selectedOfficer.counterNumber ?? ''} onChange={(e) => setSelectedOfficer({ ...selectedOfficer, counterNumber: e.target.value ? parseInt(e.target.value) : null })} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g., 1, 2, 3..." />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">Assigned Services</label>
                  <span className="text-xs text-slate-500">{(selectedOfficer.assignedServices || []).length} selected</span>
                </div>
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 max-h-96 overflow-y-auto">
                  {services.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No services available</p>
                  ) : (
                    <div className="space-y-2">
                      {services.map((s) => {
                        const assigned = (selectedOfficer.assignedServices || []).includes(s.id)
                        return (
                          <label key={s.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-purple-300 cursor-pointer transition-colors">
                            <input type="checkbox" checked={assigned} onChange={() => toggleService(s.id)} className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" />
                            <span className="text-sm font-medium text-slate-700 flex-1">{s.title}</span>
                            {assigned && (<CheckCircle2 className="w-4 h-4 text-purple-600" />)}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6">
              <div className="flex gap-3">
                <button onClick={() => setSelectedOfficer(null)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={saveOfficer} disabled={saving} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  <Save className="w-4 h-4 inline-block mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
