import React, { useEffect, useState } from 'react';
import { RefreshCwIcon, DownloadIcon, Eye, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  showBranchDashboard: boolean;
  setShowBranchDashboard: (show: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ showBranchDashboard, setShowBranchDashboard }) => {
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Update every second

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleBranchDashboardToggle = (): void => {
    setShowBranchDashboard(!showBranchDashboard);
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {showBranchDashboard ? 'Branch Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-sm text-gray-500">
            {formatDate(currentDateTime)} | {formatTime(currentDateTime)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {showBranchDashboard ? (
            <button 
              className="flex items-center px-4 py-2 bg-gray-900 border border-gray-300 rounded-md text-md font-medium text-white hover:text-black hover:bg-gray-50"
              onClick={handleBranchDashboardToggle}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Admin Dashboard
            </button>
          ) : (
            <button 
              className="flex items-center px-4 py-2 bg-black border border-gray-300 rounded-md text-md font-medium text-white hover:text-black hover:bg-gray-50"
              onClick={handleBranchDashboardToggle}
            >
              <Eye className="w-5 h-5 mr-2" />
              Location wise Dashboard
            </button>
          )}
          <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700">
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}; 

export default Header;