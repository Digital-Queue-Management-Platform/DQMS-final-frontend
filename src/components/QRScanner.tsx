import React, { useRef, useEffect, useState, useCallback } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, X, CheckCircle, AlertCircle, Monitor } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface DeviceInfo {
  type: string;
  deviceId: string;
  deviceName: string;
  macAddress: string;
  setupCode: string;
  timestamp: number;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, isOpen }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);

  const handleScan = useCallback((result: QrScanner.ScanResult) => {
    try {
      console.log('QR Code scanned:', result.data);
      const data = JSON.parse(result.data);
      
      // Validate QR code format
      if (data.type === 'dqmp_outlet_setup' && data.deviceId && data.setupCode) {
        console.log('Valid QR code detected:', data);
        setDeviceInfo(data);
        setScanResult('success');
        
        // Stop scanning after successful scan
        if (scannerRef.current) {
          scannerRef.current.stop();
        }
        
        // Auto-proceed after 2 seconds on successful scan
        setTimeout(() => {
          onScan(data);
        }, 2000);
      } else {
        console.log('Invalid QR code format:', data);
        setError('Invalid QR code format. Please scan a DQMP Android TV setup code.');
        setScanResult('error');
        
        // Reset error after 3 seconds and continue scanning
        setTimeout(() => {
          setError(null);
          setScanResult(null);
        }, 3000);
      }
    } catch (err) {
      console.error('QR Code parsing error:', err, 'Data:', result.data);
      setError('Unable to read QR code. Please ensure it\'s a valid DQMP setup code.');
      setScanResult('error');
      
      setTimeout(() => {
        setError(null);
        setScanResult(null);
      }, 3000);
    }
  }, [onScan]);

  const startScanner = useCallback(async () => {
    if (!videoRef.current || scannerRef.current) return;

    try {
      console.log('Starting QR scanner...');
      const scanner = new QrScanner(
        videoRef.current,
        handleScan,
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          preferredCamera: 'environment', // Use rear camera on mobile
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      console.log('QR scanner started successfully');
      setScanning(true);
      setError(null);
    } catch (err) {
      console.error('QR Scanner start error:', err);
      setError('Unable to access camera. Please check camera permissions and try again.');
    }
  }, [handleScan]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
      setScanning(false);
    }
  }, []);

  const handleManualEntry = () => {
    const qrData = prompt('Enter QR code data for testing (JSON format):');
    if (qrData) {
      try {
        const data = JSON.parse(qrData);
        
        if (data.type === 'dqmp_outlet_setup' && data.deviceId && data.setupCode) {
          setDeviceInfo(data);
          setScanResult('success');
          
          setTimeout(() => {
            onScan(data);
          }, 1000);
        } else {
          setError('Invalid QR code format. Please provide a valid DQMP setup code.');
          setScanResult('error');
        }
      } catch (err) {
        setError('Invalid JSON format.');
        setScanResult('error');
      }
    }
  };

  const createTestQRCode = () => {
    const testData = {
      type: 'dqmp_outlet_setup',
      version: '1.0',
      deviceId: 'android-tv-' + Date.now(),
      deviceName: 'Test Android TV',
      macAddress: '00:11:22:33:44:55',
      setupCode: 'TEST-1234',
      timestamp: Date.now()
    };
    
    const jsonData = JSON.stringify(testData);
    navigator.clipboard.writeText(jsonData).then(() => {
      alert('Test QR data copied to clipboard:\n\n' + jsonData);
    }).catch(() => {
      prompt('Copy this test data manually:', jsonData);
    });
  };

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
      setDeviceInfo(null);
      setScanResult(null);
      setError(null);
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Setup Android TV Display</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-emerald-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Instructions */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Scan QR Code from Android TV Display
            </h3>
            <p className="text-gray-600">
              Point your camera at the QR code displayed on the Android TV screen to automatically configure the outlet display.
            </p>
          </div>

          {/* Scanner Container */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />

            {/* Scanner Overlay */}
            {scanning && !scanResult && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-emerald-500 rounded-lg w-64 h-64 relative">
                  <div className="absolute inset-0 border-2 border-emerald-500 rounded-lg animate-pulse"></div>
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-lg"></div>
                </div>
              </div>
            )}

            {/* Success Overlay */}
            {scanResult === 'success' && deviceInfo && (
              <div className="absolute inset-0 bg-emerald-500 bg-opacity-90 flex items-center justify-center">
                <div className="text-center text-white">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">QR Code Scanned Successfully!</h3>
                  <p className="text-emerald-100 mb-4">
                    Device: {deviceInfo.deviceName}
                  </p>
                  <p className="text-emerald-100">
                    Setup Code: {deviceInfo.setupCode}
                  </p>
                  <p className="text-sm text-emerald-200 mt-2">
                    Configuring outlet display...
                  </p>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {scanResult === 'error' && (
              <div className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center">
                <div className="text-center text-white">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Scan Error</h3>
                  <p className="text-red-100 text-center max-w-xs">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {!scanning && !error && (
              <div className="absolute inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center">
                <div className="text-center text-white">
                  <Camera className="w-12 h-12 mx-auto mb-2 animate-pulse" />
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {error && !scanResult && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                <div>
                  <h4 className="text-red-800 font-medium">Camera/Scanning Error</h4>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Testing Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-blue-800 font-medium mb-2">Testing & Troubleshooting:</h4>
            <div className="flex space-x-2 mb-3">
              <button
                onClick={handleManualEntry}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Manual Entry
              </button>
              <button
                onClick={createTestQRCode}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Generate Test Data
              </button>
            </div>
            <p className="text-blue-700 text-sm">
              Use "Manual Entry" to paste the QR code data directly for testing, or "Generate Test Data" to create sample data.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h4 className="text-emerald-800 font-medium mb-2">Instructions:</h4>
            <ol className="text-emerald-700 text-sm space-y-1">
              <li>1. Open the Android TV app and navigate to the QR setup screen</li>
              <li>2. Allow camera access when prompted by your browser</li>
              <li>3. Point the camera directly at the QR code on the TV screen</li>
              <li>4. Hold steady - scanning happens automatically when detected</li>
              <li>5. Wait for the green confirmation before proceeding</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            <div className="flex space-x-2">
              {!scanning && !scanResult && (
                <button
                  onClick={startScanner}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera</span>
                </button>
              )}
              
              {deviceInfo && (
                <button
                  onClick={() => onScan(deviceInfo)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Configure Display</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;