import React, { useState, useEffect } from 'react'
import { Settings, AlertCircle, CheckCircle2, Save, Loader2 } from 'lucide-react'
import api from '../config/api'

interface Service {
  id: string
  code: string
  title: string
  description: string | null
  requireOtp: boolean
  isActive: boolean
  isCustomized?: boolean
}

const TeleshopManagerSettings: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [initialServices, setInitialServices] = useState<Service[]>([])
  const [enableBillPaymentOptions, setEnableBillPaymentOptions] = useState(true)
  const [initialBillPaymentOptions, setInitialBillPaymentOptions] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch both services (OTP requirement) and kiosk settings (Bill Payment Options)
      const [servicesRes, kioskRes] = await Promise.all([
        api.get('/teleshop-manager/services').catch(() => ({ data: [] })),
        api.get('/teleshop-manager/kiosk-settings').catch(() => ({ data: { outlet: { displaySettings: {} } } }))
      ])
      
      const fetchedServices = servicesRes.data || []
      setServices(fetchedServices)
      setInitialServices(JSON.parse(JSON.stringify(fetchedServices)))
      
      const displaySettings = kioskRes.data?.outlet?.displaySettings || {}
      const fetchedBillOptions = displaySettings.enableBillPaymentOptions === true
      setEnableBillPaymentOptions(fetchedBillOptions)
      setInitialBillPaymentOptions(fetchedBillOptions)
    } catch (err: any) {
      console.error('Failed to fetch settings:', err)
      setError('Failed to load settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleOtp = (serviceId: string) => {
    setServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        return { ...s, requireOtp: !s.requireOtp, isCustomized: true }
      }
      return s
    }))
    setSuccess(null)
  }

  const handleToggleBillPaymentOptions = () => {
    setEnableBillPaymentOptions(prev => !prev)
    setSuccess(null)
  }

  const hasUnsavedChanges = 
    enableBillPaymentOptions !== initialBillPaymentOptions || 
    JSON.stringify(services) !== JSON.stringify(initialServices);

  const saveSettings = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const promises: Promise<any>[] = []

      // Check if bill payment option changed
      if (enableBillPaymentOptions !== initialBillPaymentOptions) {
        promises.push(api.post('/teleshop-manager/kiosk-settings', {
          enableBillPaymentOptions
        }))
      }

      // Check for changed services
      services.forEach(service => {
        const initialService = initialServices.find(s => s.id === service.id)
        if (initialService && initialService.requireOtp !== service.requireOtp) {
          promises.push(api.put(`/teleshop-manager/services/${service.id}`, {
            requireOtp: service.requireOtp
          }))
        }
      })

      if (promises.length > 0) {
        await Promise.all(promises)
      }

      setInitialBillPaymentOptions(enableBillPaymentOptions)
      setInitialServices(JSON.parse(JSON.stringify(services)))
      setSuccess('Settings saved successfully!')
    } catch (err: any) {
      console.error('Failed to save settings:', err)
      setError('Failed to save some settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outlet Settings</h1>
            <p className="text-gray-500 text-sm mt-1">
              Configure how services and queues behave for your specific outlet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {hasUnsavedChanges && (
            <span className="text-amber-600 text-sm font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              Unsaved changes
            </span>
          )}
          <button
            onClick={saveSettings}
            disabled={!hasUnsavedChanges || saving}
            className={`flex items-center px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm
              ${(!hasUnsavedChanges || saving)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
              }`}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-2 mb-6 shadow-sm">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 flex items-center gap-2 mb-6 shadow-sm">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Bill Payment Options Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              Bill Payment Options
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Enable or disable the requirement for customers to select their preferred payment method (Cash/Card/Cheque) and payment intent (Full/Partial) during the Bill Payment queue registration flow.
            </p>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2">
              <h4 className="font-medium text-gray-900 text-sm">Payment Method Selection</h4>
              <p className="text-xs text-gray-500 mt-1">
                {enableBillPaymentOptions 
                  ? 'Customers must select how they want to pay before getting a ticket.'
                  : 'Customers can get a ticket without selecting a payment method.'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 ml-4 mt-2">
            <button
              onClick={handleToggleBillPaymentOptions}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                enableBillPaymentOptions ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enableBillPaymentOptions ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${enableBillPaymentOptions ? 'text-indigo-600' : 'text-gray-500'}`}>
              {enableBillPaymentOptions ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Collect Mobile Number Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Mobile Verification</h3>
          <p className="text-sm text-gray-600">
            Control whether a mobile number is collected/verified via OTP when customers select specific services.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Collect Mobile Number</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {services.map(service => (
                <tr key={service.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{service.title}</div>
                    <div className="text-sm text-gray-500 font-medium">{service.code}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={service.requireOtp}
                          onChange={() => handleToggleOtp(service.id)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {service.isCustomized ? (
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                        Customized
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full border border-gray-200">
                        Global Default
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500 font-medium bg-gray-50">
                    No services found for your outlet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Bottom Save Bar (Mobile Friendly) */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
          <div className="flex items-center justify-between">
            <span className="text-amber-600 text-sm font-medium">Unsaved changes</span>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeleshopManagerSettings
