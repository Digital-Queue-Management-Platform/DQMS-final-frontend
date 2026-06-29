import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  CheckCircle2, 
  Clock, 
  Eye, 
  EyeOff, 
  ShieldAlert,
  ListOrdered,
  Timer,
  Save,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../config/api';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    priorityFeature: false,
    advanceBooking: true,
    showServiceType: false,
    billEnquiryLimit: true,
    showQueuePosition: true,
    showWaitTime: true,
  });

  const [initialSettings, setInitialSettings] = useState(settings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        priorityRes,
        advanceRes,
        serviceTypeRes,
        billLimitRes,
        queuePosRes,
        waitTimeRes
      ] = await Promise.all([
        api.get('/queue/settings/priority-service').catch(() => ({ data: { enabled: false } })),
        api.get('/queue/settings/advance-appointment').catch(() => ({ data: { enabled: true } })),
        api.get('/queue/settings/show-service-type').catch(() => ({ data: { enabled: false } })),
        api.get('/queue/settings/bill-enquiry-rate-limit').catch(() => ({ data: { enabled: true } })),
        api.get('/queue/settings/show-queue-position').catch(() => ({ data: { enabled: true } })),
        api.get('/queue/settings/show-wait-time').catch(() => ({ data: { enabled: true } }))
      ]);

      const fetchedSettings = {
        priorityFeature: priorityRes.data?.enabled === true,
        advanceBooking: advanceRes.data?.enabled !== false,
        showServiceType: serviceTypeRes.data?.enabled === true,
        billEnquiryLimit: billLimitRes.data?.enabled !== false,
        showQueuePosition: queuePosRes.data?.enabled !== false,
        showWaitTime: waitTimeRes.data?.enabled !== false,
      };

      setSettings(fetchedSettings);
      setInitialSettings(fetchedSettings);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load some settings. They may show default values.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSuccess(null);
  };

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await Promise.all([
        settings.priorityFeature !== initialSettings.priorityFeature 
          ? api.patch('/queue/settings/priority-service', { enabled: settings.priorityFeature })
          : Promise.resolve(),
        settings.advanceBooking !== initialSettings.advanceBooking 
          ? api.patch('/queue/settings/advance-appointment', { enabled: settings.advanceBooking })
          : Promise.resolve(),
        settings.showServiceType !== initialSettings.showServiceType 
          ? api.patch('/queue/settings/show-service-type', { enabled: settings.showServiceType })
          : Promise.resolve(),
        settings.billEnquiryLimit !== initialSettings.billEnquiryLimit 
          ? api.patch('/queue/settings/bill-enquiry-rate-limit', { enabled: settings.billEnquiryLimit })
          : Promise.resolve(),
        settings.showQueuePosition !== initialSettings.showQueuePosition 
          ? api.patch('/queue/settings/show-queue-position', { enabled: settings.showQueuePosition })
          : Promise.resolve(),
        settings.showWaitTime !== initialSettings.showWaitTime 
          ? api.patch('/queue/settings/show-wait-time', { enabled: settings.showWaitTime })
          : Promise.resolve(),
      ]);

      setInitialSettings(settings);
      setSuccess('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <span className="ml-4 text-gray-600 text-lg">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center">
          <SettingsIcon className="w-8 h-8 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-500 text-sm mt-1">Configure global platform behavior and features</p>
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
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Priority Feature */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">New Service Priority Feature</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 line-clamp-3">
              When enabled, customers who select a service marked as priority are moved ahead in the live queue. When disabled, all customers follow the standard queue order.
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
            <span className={`text-sm font-medium ${settings.priorityFeature ? 'text-indigo-600' : 'text-gray-400'}`}>
              {settings.priorityFeature ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => handleToggle('priorityFeature')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.priorityFeature ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.priorityFeature ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </motion.div>

        {/* 24-Hour Advance Booking Rule */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">24-Hour Advance Booking Rule</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 line-clamp-3">
              When enabled, customers must book their appointments at least 24 hours in advance. When disabled, customers can schedule for any future time.
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
            <span className={`text-sm font-medium ${settings.advanceBooking ? 'text-indigo-600' : 'text-gray-400'}`}>
              {settings.advanceBooking ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => handleToggle('advanceBooking')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.advanceBooking ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.advanceBooking ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </motion.div>

        {/* Queue Display Settings */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                {settings.showServiceType ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </div>
              <h3 className="font-semibold text-gray-900">Queue Display Settings</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Control what information is visible to officers in the My Queue table. When enabled, officers will see the service type column.
            </p>
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md inline-block mb-4">
              Current status: Service type is {settings.showServiceType ? 'visible' : 'hidden'} in the officer queue list.
            </div>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
            <span className={`text-sm font-medium ${settings.showServiceType ? 'text-indigo-600' : 'text-gray-400'}`}>
              {settings.showServiceType ? 'Visible' : 'Hidden'}
            </span>
            <button
              onClick={() => handleToggle('showServiceType')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.showServiceType ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showServiceType ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </motion.div>

        {/* Daily Bill Enquiry Limit */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">Daily Bill Enquiry Limit</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 line-clamp-3">
              When enabled, customers can only request their bill details 3 times per day per mobile number to protect their privacy. When disabled, customers have unlimited bill enquiries.
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
            <span className={`text-sm font-medium ${settings.billEnquiryLimit ? 'text-indigo-600' : 'text-gray-400'}`}>
              {settings.billEnquiryLimit ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => handleToggle('billEnquiryLimit')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.billEnquiryLimit ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.billEnquiryLimit ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </motion.div>

        {/* Show Queue Position */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <ListOrdered className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">Show Queue Position</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 line-clamp-3">
              When enabled, customers can view their exact position in the queue on the token tracking page. When disabled, this information is hidden.
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
            <span className={`text-sm font-medium ${settings.showQueuePosition ? 'text-indigo-600' : 'text-gray-400'}`}>
              {settings.showQueuePosition ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => handleToggle('showQueuePosition')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.showQueuePosition ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showQueuePosition ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </motion.div>

        {/* Show Wait Time */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                <Timer className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">Show Wait Time</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 line-clamp-3">
              When enabled, customers can view the estimated wait time for their service on the token tracking page. When disabled, this information is hidden.
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
            <span className={`text-sm font-medium ${settings.showWaitTime ? 'text-indigo-600' : 'text-gray-400'}`}>
              {settings.showWaitTime ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => handleToggle('showWaitTime')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.showWaitTime ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showWaitTime ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </motion.div>
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
  );
};

export default SettingsPage;
