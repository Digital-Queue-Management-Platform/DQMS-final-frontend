import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, QrCode, Smartphone, CheckCircle, AlertCircle, Settings, Wifi } from 'lucide-react';
import QRScanner from '../components/QRScanner';
import axios from 'axios';
import { API_URL } from '../config/api';

interface DeviceInfo {
  type: string;
  deviceId: string;
  deviceName: string;
  macAddress: string;
  setupCode: string;
  timestamp: number;
}

interface OutletDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  macAddress: string;
  setupCode: string;
  configuredAt: string;
  isActive: boolean;
  lastSeen?: string;
}

const TeleshopManagerOutletSetup: React.FC = () => {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [devices, setDevices] = useState<OutletDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState(false);

  const fetchLinkedDevices = useCallback(async () => {
    try {
      const token = localStorage.getItem('teleshopManagerToken');
      const response = await axios.get(`${API_URL}/teleshop-manager/outlet-devices`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setDevices(response.data.devices || []);
    } catch (err) {
      console.error('Failed to fetch linked devices:', err);
      // Don't show error for this as it's not critical
    }
  }, []);

  useEffect(() => {
    fetchLinkedDevices();
  }, [fetchLinkedDevices]);

  const handleQRScan = useCallback(async (deviceInfo: DeviceInfo) => {
    setConfiguring(true);
    setError(null);

    try {
      const token = localStorage.getItem('teleshopManagerToken');
      
      const response = await axios.post(
        `${API_URL}/teleshop-manager/outlet-setup-qr`,
        {
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          macAddress: deviceInfo.macAddress,
          setupCode: deviceInfo.setupCode,
          timestamp: deviceInfo.timestamp
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSuccess(`Android TV "${deviceInfo.deviceName}" has been successfully configured for your outlet!`);
        setShowScanner(false);
        fetchLinkedDevices(); // Refresh the list
        
        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 5000);
      } else {
        setError(response.data.message || 'Failed to configure device');
      }
    } catch (err: any) {
      console.error('QR scan error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to configure Android TV device. Please try again.';
      setError(errorMessage);
    } finally {
      setConfiguring(false);
    }
  }, [fetchLinkedDevices]);

  const removeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to remove this device configuration? After removal, this TV display will be available for configuration by any teleshop manager.')) return;

    try {
      const token = localStorage.getItem('teleshopManagerToken');
      await axios.delete(`${API_URL}/teleshop-manager/outlet-devices/${deviceId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setSuccess('Device configuration removed successfully! The TV display is now available for new configuration. Any teleshop manager can scan the QR code shown on that TV to configure it for their outlet.');
      fetchLinkedDevices();
      
      setTimeout(() => {
        setSuccess(null);
      }, 8000); // Longer timeout for detailed message
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove device');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto py-4 sm:h-16 gap-4">
            <div className="flex items-center space-x-3">
              <Monitor className="w-8 h-8 text-emerald-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Android TV Setup</h1>
                <p className="text-sm text-gray-500">Configure outlet display devices</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/teleshop-manager/dashboard')}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3" />
              <div>
                <h3 className="text-green-800 font-medium">Success!</h3>
                <p className="text-green-700 text-sm mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
              <div>
                <h3 className="text-red-800 font-medium">Configuration Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Loading */}
        {configuring && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mt-0.5 mr-3"></div>
              <div>
                <h3 className="text-blue-800 font-medium">Configuring Device...</h3>
                <p className="text-blue-700 text-sm mt-1">Please wait while we set up your Android TV display.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Setup Instructions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <QrCode className="w-5 h-5 mr-2 text-emerald-600" />
                Android TV Setup & Management
              </h2>

              <div className="space-y-6">
                {/* Device Transfer Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Monitor className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-blue-800 font-medium">Device Transfer</h3>
                      <p className="text-blue-700 text-sm mt-1">
                        Remove devices from your outlet to make them available for other teleshop managers. 
                        When removed, the TV will show a new QR code that any manager can scan to configure for their outlet.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step by step instructions */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Install DQMP Android TV App</h3>
                      <p className="text-gray-600 text-sm">Install the DQMP Outlet Display APK on your Android TV device or TV box.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Launch App on TV</h3>
                      <p className="text-gray-600 text-sm">Open the DQMP app on your Android TV. It will display a QR code setup screen.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Scan QR Code</h3>
                      <p className="text-gray-600 text-sm">Click the button below to scan the QR code displayed on your TV screen.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Automatic Configuration</h3>
                      <p className="text-gray-600 text-sm">The display will automatically configure and start showing your outlet queue.</p>
                    </div>
                  </div>
                </div>

                {/* Scan Button */}
                <div className="pt-4 border-t">
                  <button
                    onClick={() => setShowScanner(true)}
                    disabled={configuring}
                    className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>Scan QR Code from TV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Configured Devices */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Monitor className="w-5 h-5 mr-2 text-emerald-600" />
                Configured Devices
              </h2>

              {devices.length === 0 ? (
                <div className="text-center py-8">
                  <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No devices configured yet</p>
                  <p className="text-gray-400 text-xs mt-1">Scan a QR code to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div key={device.id} className="border rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-3">
                          <Monitor className="w-8 h-8 text-emerald-600" />
                          <div>
                            <h3 className="font-medium text-gray-900">{device.deviceName}</h3>
                            <p className="text-xs text-gray-500">ID: {device.deviceId.substring(0, 8)}...</p>
                            <p className="text-xs text-gray-500">Code: {device.setupCode}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {device.isActive ? (
                            <div className="flex items-center text-green-600 text-xs">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                              Active
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-400 text-xs">
                              <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                              Inactive
                            </div>
                          )}
                          
                          <button
                            onClick={() => removeDevice(device.id)}
                            className="text-red-600 hover:text-red-800 text-xs px-3 py-1 hover:bg-red-50 rounded transition-colors border border-red-200 hover:border-red-300"
                            title="Remove this device to make it available for other outlets"
                          >
                            Release Device
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Configured: {new Date(device.configuredAt).toLocaleDateString()}
                        {device.lastSeen && (
                          <span className="ml-2">
                            • Last seen: {new Date(device.lastSeen).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <button
                  onClick={() => navigate('/teleshop-manager/outlet-display')}
                  className="w-full text-left text-sm text-emerald-600 hover:text-emerald-800 flex items-center space-x-2 py-2 px-3 hover:bg-emerald-50 rounded transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Display Settings</span>
                </button>
                
                <button
                  onClick={fetchLinkedDevices}
                  className="w-full text-left text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-2 py-2 px-3 hover:bg-gray-50 rounded transition-colors"
                >
                  <Wifi className="w-4 h-4" />
                  <span>Refresh Devices</span>
                </button>
              </div>
            </div>
            
            {/* Device Transfer Instructions */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
              <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                <QrCode className="w-4 h-4 mr-2 text-blue-600" />
                Device Transfer Process
              </h3>
              
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-medium">1.</span>
                  <span>Click "Release Device" above to remove a TV from your outlet</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-medium">2.</span>
                  <span>The TV will automatically show a new QR code setup screen</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-medium">3.</span>
                  <span>Any teleshop manager can scan that QR code to configure the TV for their outlet</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-medium">4.</span>
                  <span>The TV will immediately start displaying the new outlet's queue information</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-xs">
                  <strong>Note:</strong> Released devices are immediately available for reconfiguration. 
                  Make sure to coordinate with other managers if transferring devices between outlets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />
    </div>
  );
};

export default TeleshopManagerOutletSetup;