import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  QrCode,
  Users,
  Coffee,
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
  activePage: string;
  setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const { currentUser, loading } = useUser()
  const location = useLocation()
  const navigate = useNavigate()

  // Base nav items per role
  const adminItems: NavigationItem[] = [
    //{ name: 'Home', icon: Home, to: '/' },
    { name: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
    { name: 'Services', icon: Briefcase, to: '/admin/services' },
    { name: 'Branches', icon: Building2, to: '/admin/branches' },
    { name: 'Managers', icon: Users, to: '/admin/managers' },
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
    { name: 'Break Oversight', icon: Coffee, to: '/manager/breaks' },
    { name: 'QR Codes', icon: QrCode, to: '/manager/qr-codes' },
    { name: 'Compare', icon: Scale3D, to: '/manager/compare' },
    { name: 'Register Officer', icon: UserPlus, to: '/manager/register-officer' },
  ]

  // Fix flickering: prioritize URL path over role, and handle loading state
  const onOfficerPath = location.pathname.startsWith('/officer')
  const onAdminPath = location.pathname.startsWith('/admin')
  const onManagerPath = location.pathname.startsWith('/manager')
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

  const handleNavClick = (itemName: string): void => {
    setActivePage(itemName);
    if (isMobileMenuOpen && window.innerWidth < 1024) {
      setIsMobileMenuOpen(false);
    }
  };

  // Get user display information based on role and context
  const getUserDisplayInfo = () => {
    // Get stored user data
    const storedUser = localStorage.getItem('dq_user')
    const storedManager = localStorage.getItem('manager')
    
    if (onOfficerPath) {
      const officer = storedUser ? JSON.parse(storedUser) : null
      return {
        name: officer?.name || 'Officer',
        role: 'Customer Service Officer',
        initials: officer?.name ? officer.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'CSO',
        counterNumber: officer?.counterNumber,
        outletName: officer?.outlet?.name || 'Unknown Branch'
      }
    } else if (onManagerPath) {
      const manager = storedManager ? JSON.parse(storedManager) : null
      return {
        name: manager?.name || 'Manager',
        role: 'Regional Manager',
        initials: manager?.name ? manager.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'RM'
      }
    } else {
      // Admin path
      const admin = storedUser ? JSON.parse(storedUser) : null
      return {
        name: admin?.name || 'Admin',
        role: 'Administrator',
        initials: admin?.name ? admin.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'AD'
      }
    }
  }

  const userInfo = getUserDisplayInfo()

  const handleLogout = (): void => {
    // Clear all stored user data
    localStorage.removeItem('dq_user')
    localStorage.removeItem('dq_role')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('managerToken')
    localStorage.removeItem('manager')
    localStorage.removeItem('dq_jwt')
    
    // Navigate to home page
    navigate('/')
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
        ${isMobileMenuOpen ? 'w-full sm:w-80 md:w-72' : 'hidden lg:block'}
        lg:w-72 xl:w-80 
      `}>
        
        {/* Header */}
        <div className="border-b border-gray-200 h-16 flex items-center justify-center p-4 relative">
          <img 
            src="/logo.png" 
            alt="System Logo" 
            className="w-16 h-16 rounded-lg object-contain"
          />
          {/* Close button - only for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute right-3 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer lg:hidden"
          >
            <SidebarIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 sm:px-6 pt-4 sm:pt-6">
          <ul className="space-y-2 sm:space-y-3">
            {navigationItems.map((item) => (
              <li key={item.name}>
                {item.to ? (
                  <Link
                    to={item.to}
                    onClick={() => handleNavClick(item.name)}
                    className={`w-full flex items-center px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium sm:font-semibold rounded-lg transition-all duration-200 relative cursor-pointer ${
                      (location.pathname === item.to || activePage === item.name)
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-white hover:bg-blue-600'
                    }`}
                  >
                    <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="ml-2 sm:ml-3 truncate">{item.name}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => handleNavClick(item.name)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 relative cursor-pointer ${
                      activePage === item.name
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-white hover:bg-blue-600'
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="ml-3 truncate">{item.name}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-semibold">{userInfo.initials}</span>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{userInfo.name}</p>
                <p className="text-xs text-gray-600 truncate">{userInfo.role}</p>
                {onOfficerPath && userInfo.counterNumber && (
                  <p className="text-xs text-blue-600 font-medium truncate">
                    Counter {userInfo.counterNumber} • {userInfo.outletName}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm text-red-600 font-semibold rounded-lg transition-all duration-200 hover:bg-red-50"
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;