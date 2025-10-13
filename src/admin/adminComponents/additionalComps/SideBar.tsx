import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
//import SLTlogo from '../../../assets/logo.png';
import { 
  LayoutDashboard, 
  //FolderOpen, 
  //Users, 
  //UserCheck, 
  UserCog,
  //Headphones,
  UserPlus,
  LogOut,
  Menu,
  SidebarIcon,
  Scale3D,
  ListOrdered,
  Building2,
  Briefcase,
  //X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext'

interface NavigationItem {
  name: string;
  icon: LucideIcon;
  to?: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  activePage: string;
  setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, activePage, setActivePage }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const { currentUser, loading } = useUser()
  const loc = useLocation()

  // Base nav items per role
  const adminItems: NavigationItem[] = [
    //{ name: 'Home', icon: Home, to: '/' },
    { name: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
    { name: 'Services', icon: Briefcase, to: '/admin/services' },
    { name: 'Branches', icon: Building2, to: '/admin/branches' },
    { name: 'Compare', icon: Scale3D, to: '/admin/compare' },
    { name: 'All Officers', icon: UserCog, to: '/admin/all-officers' },
  ]
  const officerItems: NavigationItem[] = [
    { name: 'Officer Dashboard', icon: LayoutDashboard, to: '/officer/dashboard' },
    { name: 'Queue', icon: ListOrdered, to: '/officer/queue' },
  ]
  const regionManagerItems: NavigationItem[] = [
    //{ name: 'Home', icon: Home, to: '/' },
    { name: 'Dashboard', icon: LayoutDashboard, to: '/manager/dashboard' },
    { name: 'Officers', icon: UserCog, to: '/manager/officers' },
    { name: 'Branches', icon: Building2, to: '/manager/branches' },
    { name: 'Compare', icon: Scale3D, to: '/manager/compare' },
    { name: 'Register Officer', icon: UserPlus, to: '/manager/register-officer' },
  ]

  // Fix flickering: prioritize URL path over role, and handle loading state
  const onOfficerPath = loc.pathname.startsWith('/officer')
  const onAdminPath = loc.pathname.startsWith('/admin')
  const onManagerPath = loc.pathname.startsWith('/manager')
  const role = (currentUser?.role || '').toLowerCase()
  
  const navigationItems: NavigationItem[] = onOfficerPath
    ? officerItems
    : onAdminPath
      ? adminItems // Always show admin items on admin paths
      : onManagerPath
        ? regionManagerItems // Always show manager items on manager paths
        : role === 'admin' || role === '' || loading
          ? adminItems // Default to admin while loading or for admin role
          : role === 'officer'
            ? officerItems
            : role === 'region_manager' || role === 'manager' || role === 'regionalmanager'
              ? regionManagerItems
              : adminItems // fallback
  
  const toggleSidebar = (): void => {
    if (window.innerWidth < 1024) {
      setIsMobileMenuOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  const location = useLocation();

  const handleNavClick = (itemName: string): void => {
    setActivePage(itemName);
    if (isMobileMenuOpen && window.innerWidth < 1024) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = (): void => {
    console.log('Logout clicked');
    // Add logout logic here
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-blue-600 text-white p-3 rounded-lg shadow-lg cursor-pointer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 bg-white shadow-xl border-r border-gray-200 h-full min-h-screen z-50 transition-all duration-300
        ${isMobileMenuOpen ? 'w-72' : 'hidden lg:block'}
        ${isCollapsed ? 'lg:w-16' : 'lg:w-72'} 
      `}>
        
        {/* Header */}
        <div className="border-b border-gray-200 h-20 flex items-center justify-between p-5 relative">
          {isCollapsed ? (
            <button
              onClick={toggleSidebar}
              className="flex flex-col items-center justify-center w-full cursor-pointer group"
            >
              <div className="w-8 h-8 bg-gray-50 rounded-md flex items-center justify-center p-1 mb-1">
                <img 
                  src="/logo.jpg" 
                  alt="System Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <Menu className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center p-1">
                  <img 
                    src="/logo.jpg" 
                    alt="System Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">QueueFlow</h2>
                  <p className="text-xs text-gray-500">Admin Panel</p>
                </div>
              </div>
              {/* Close button - inside header for expanded state */}
              <button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsMobileMenuOpen(false);
                  } else {
                    setIsCollapsed(true);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <SidebarIcon className="h-6 w-6 text-gray-600" />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className={`${isCollapsed ? 'px-2' : 'px-6'} pt-6`}>
          <ul className="space-y-3">
            {navigationItems.map((item) => (
              <li key={item.name}>
                {item.to ? (
                  <Link
                    to={item.to}
                    onClick={() => handleNavClick(item.name)}
                    className={`w-full flex items-center ${isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} text-sm font-semibold rounded-lg transition-all duration-200 relative cursor-pointer ${
                      (location.pathname === item.to || activePage === item.name)
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-white hover:bg-blue-600'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {!isCollapsed && <span className="ml-3">{item.name}</span>}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleNavClick(item.name)}
                    className={`w-full flex items-center ${isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} text-sm font-semibold rounded-lg transition-all duration-200 relative cursor-pointer ${
                      activePage === item.name
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-white hover:bg-blue-600'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {!isCollapsed && <span className="ml-3">{item.name}</span>}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
          <div className="p-6">
            {isCollapsed ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">JD</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-white hover:bg-red-500 rounded-lg group relative"
                >
                  <LogOut className="h-4 w-4" />
                  <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    Sign Out
                  </div>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">JD</span>
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">John Doe</p>
                    <p className="text-xs text-gray-600 truncate">Administrator</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 text-sm text-red-600 font-semibold rounded-lg transition-all duration-200 hover:bg-red-50"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;