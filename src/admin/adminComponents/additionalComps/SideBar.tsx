import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
//import SLTlogo from '../../../assets/logo.png';
import {
  LayoutDashboard,
  //FolderOpen, 
  //Users, 
  //UserCheck, 
  UserCog,
  Headphones,
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
  Phone,
  MessageSquare,
  Calendar,
  UserCheck,
  Monitor,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext'
import api from '../../../config/api'

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
  const [hoverExpanded, setHoverExpanded] = useState<boolean>(false);
  const { currentUser, loading } = useUser()
  const location = useLocation()
  const navigate = useNavigate()

  // Base nav items per role
  const adminItems: NavigationItem[] = [
    //{ name: 'Home', icon: Home, to: '/' },
    { name: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
    { name: 'Appointments', icon: Calendar, to: '/admin/appointments' },
    { name: 'Critical Feedback', icon: MessageSquare, to: '/admin/feedback' },
    { name: 'Services', icon: Briefcase, to: '/admin/services' },
    { name: 'Branches', icon: Building2, to: '/admin/branches' },
    { name: 'RTOMs', icon: Users, to: '/admin/managers' },
    { name: 'Compare', icon: Scale3D, to: '/admin/compare' },
    { name: 'All Officers', icon: UserCog, to: '/admin/all-officers' },
  ]
  // Officer navigation items - Queue is now the primary page (first in order)
  const officerItems: NavigationItem[] = [
    { name: 'Queue', icon: ListOrdered, to: '/officer/queue' },
    { name: 'Officer Dashboard', icon: LayoutDashboard, to: '/officer/dashboard' },
    { name: 'IP Speaker', icon: Headphones, to: '/officer/ip-speaker' },
    { name: 'Serve Customers', icon: UserCheck, to: '/officer/served-customers' },
    { name: 'Service Tracking', icon: MessageSquare, to: '/officer/service-tracking' },
  ]
  const regionManagerItems: NavigationItem[] = [
    //{ name: 'Home', icon: Home, to: '/' },
    { name: 'Dashboard', icon: LayoutDashboard, to: '/manager/dashboard' },
    { name: 'Appointments', icon: Calendar, to: '/manager/appointments' },
    { name: 'Feedback (2-Star)', icon: MessageSquare, to: '/manager/feedback' },
    { name: 'Teleshop Managers', icon: Phone, to: '/manager/teleshop-managers' },
    { name: 'Branches', icon: Building2, to: '/manager/branches' },
    { name: 'Break Oversight', icon: Coffee, to: '/manager/breaks' },
    { name: 'QR Codes', icon: QrCode, to: '/manager/qr-codes' },
    { name: 'Compare', icon: Scale3D, to: '/manager/compare' },
    { name: 'Service Tracking', icon: MessageSquare, to: '/manager/service-tracking' },
  ]

  const teleshopManagerItems: NavigationItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, to: '/teleshop-manager/dashboard' },
    { name: 'Kiosk Settings', icon: Monitor, to: '/teleshop-manager/kiosk-settings' },
    { name: 'Appointments', icon: Calendar, to: '/teleshop-manager/appointments' },
    { name: 'Completed Services', icon: ListOrdered, to: '/teleshop-manager/completed-services' },
    { name: 'Served Customers', icon: UserCheck, to: '/teleshop-manager/served-customers' },
    { name: 'Feedback Management', icon: MessageSquare, to: '/teleshop-manager/feedback' },
    { name: 'Manage Officers', icon: Users, to: '/teleshop-manager/officers' },
    { name: 'Register Officer', icon: UserPlus, to: '/teleshop-manager/officers/add' },
    { name: 'Service Tracking', icon: MessageSquare, to: '/teleshop-manager/service-tracking' },
  ]

  // Fix flickering: prioritize URL path over role, and handle loading state
  const onOfficerPath = location.pathname.startsWith('/officer')
  const onAdminPath = location.pathname.startsWith('/admin')
  const onManagerPath = location.pathname.startsWith('/manager')
  const onTeleshopManagerPath = location.pathname.startsWith('/teleshop-manager')
  const role = (currentUser?.role || '').toLowerCase()

  const navigationItems: NavigationItem[] = onOfficerPath
    ? officerItems
    : onAdminPath
      ? adminItems // Always show admin items on admin paths
      : onManagerPath
        ? regionManagerItems // Always show manager items on manager paths
        : onTeleshopManagerPath
          ? teleshopManagerItems // Always show teleshop manager items on teleshop manager paths
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

  const toggleSidebar = (): void => {
    if (window.innerWidth < 1024) {
      setIsMobileMenuOpen(prev => !prev)
    } else {
      setIsCollapsed((prev) => !prev)
    }
  }

  // Get user display information based on role and context
  const getUserDisplayInfo = () => {
    // Get stored user data
    const storedUser = localStorage.getItem('dq_user')
    const storedManager = localStorage.getItem('manager')

    if (onOfficerPath) {
      const storedOfficer = localStorage.getItem('officer')
      const officer = storedOfficer ? JSON.parse(storedOfficer) : null
      return {
        name: officer?.name || 'Officer',
        role: 'Customer Service Officer',
        initials: officer?.name ? officer.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'CSO',
        counterNumber: officer?.counterNumber,
        outletName: officer?.outlet?.name || 'Unknown Branch'
      }
    } else if (onManagerPath) {
      const manager = storedManager ? JSON.parse(storedManager) : null
      const managerName = manager?.name || manager?.id || 'Manager'
      return {
        name: managerName,
        role: 'RTOM (Regional Telecommunication Office Manager)',
        initials: managerName ? managerName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'RTOM',
        regionName: manager?.regionName,
        outletCount: manager?.outlets?.length || 0
      }
    } else if (onTeleshopManagerPath) {
      const storedTeleshopManager = localStorage.getItem('teleshopManager')
      const teleshopManager = storedTeleshopManager ? JSON.parse(storedTeleshopManager) : null
      const teleshopManagerName = teleshopManager?.name || 'Teleshop Manager'
      return {
        name: teleshopManagerName,
        role: 'Teleshop Manager',
        initials: teleshopManagerName ? teleshopManagerName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'TM',
        regionName: teleshopManager?.regionName,
        officerCount: teleshopManager?.officers?.length || 0
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

  // collapsed for rendering: true when user has collapsed sidebar and we're NOT hovering
  const collapsed = isCollapsed && !hoverExpanded

  const handleLogout = async (): Promise<void> => {
    try {
      // Call appropriate backend logout to clear httpOnly cookies
      if (onOfficerPath) {
        await api.post('/officer/logout')
        // Set officer offline proactively (best-effort)
        try {
          const storedOfficer = localStorage.getItem('officer')
          if (storedOfficer) {
            const o = JSON.parse(storedOfficer)
            if (o?.id) {
              await api.post('/officer/status', { officerId: o.id, status: 'offline' })
            }
          }
        } catch { }
      } else if (onManagerPath) {
        await api.post('/manager/logout')
      } else if (onTeleshopManagerPath) {
        await api.post('/teleshop-manager/logout')
      } else if (onAdminPath) {
        // No server cookie for admin in this app, just clear tokens
      }
    } catch (e) {
      // ignore logout errors; proceed to clear client state
    }

    // Clear all stored user data
    try {
      localStorage.removeItem('dq_user')
      localStorage.removeItem('dq_role')
      localStorage.removeItem('adminToken')
      localStorage.removeItem('managerToken')
      localStorage.removeItem('manager')
      localStorage.removeItem('dq_jwt')
      // Officer-specific
      localStorage.removeItem('officer')
      localStorage.removeItem('officerToken')
      // Teleshop manager-specific
      localStorage.removeItem('teleshopManager')
      localStorage.removeItem('teleshopManagerToken')
    } catch { }

    try {
      window.location.replace('/')
    } catch {
      // Fallback to SPA navigation if window.location is unavailable
      if (onOfficerPath) navigate('/officer/login', { replace: true })
      else if (onManagerPath) navigate('/manager/login', { replace: true })
      else if (onTeleshopManagerPath) navigate('/teleshop-manager/login', { replace: true })
      else if (onAdminPath) navigate('/admin/login', { replace: true })
      else navigate('/', { replace: true })
    }
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
      <div
        onMouseLeave={() => {
          if (window.innerWidth >= 1024) setHoverExpanded(false)
        }}
        className={`
        fixed left-0 top-0 bg-white shadow-xl border-r border-gray-200 h-full min-h-screen z-50 transition-all duration-300 overflow-x-hidden
        ${isMobileMenuOpen ? 'w-72' : 'hidden lg:block'}
        ${collapsed ? 'lg:w-16' : 'lg:w-72'}
      `}>

        {/* Header */}
        {/*<div className="border-b border-gray-200 h-20 flex items-center justify-between p-5 relative">*/}
        <div className="h-20 flex items-center justify-between p-5 relative">
          {collapsed ? (
            <button
              onClick={toggleSidebar}
              onMouseEnter={() => { if (window.innerWidth >= 1024 && isCollapsed) setHoverExpanded(true) }}
              className="flex items-center justify-center w-full cursor-pointer"
            >
              <Menu className="h-6 w-6 text-gray-600" />
            </button>
          ) : (
            <>
              <div>
                <img
                  src='/logo.png'
                  alt='logo'
                  className='w-36 pr-2 p-1'
                />
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
        <nav className={`${collapsed ? 'px-2' : 'px-6'} pt-4 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-14rem)] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-600`}>
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.name}>
                {item.to ? (
                  <Link
                    to={item.to}
                    onClick={() => handleNavClick(item.name)}
                    className={`group w-full flex items-center ${collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} text-sm font-semibold rounded-lg transition-all duration-200 relative cursor-pointer ${(location.pathname === item.to || activePage === item.name)
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-white hover:bg-blue-600'
                      }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span className="ml-3 truncate">{item.name}</span>}
                    {collapsed && (
                      <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleNavClick(item.name)}
                    className={`group w-full flex items-center ${collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} text-sm font-semibold rounded-lg transition-all duration-200 relative cursor-pointer ${activePage === item.name
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-white hover:bg-blue-600'
                      }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span className="ml-3 truncate">{item.name}</span>}
                    {collapsed && (
                      <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
          <div className="p-6">
            {collapsed ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="h-10 w-10 bg-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">{userInfo.initials}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-3 text-gray-600 hover:text-white hover:bg-red-500 rounded-full group relative"
                >
                  <LogOut className="h-4 w-4" />
                  <div className="absolute left-full ml-3 px-3 py-2 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    Sign Out
                  </div>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center mb-3">
                  {/*<div className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">{userInfo.initials}</span>
                  </div>*/}
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{userInfo.name}</p>
                    <p className="text-xs text-gray-600 truncate">{userInfo.role}</p>
                    {onOfficerPath && userInfo.counterNumber && (
                      <p className="text-xs text-blue-600 font-medium truncate">
                        Counter {userInfo.counterNumber} • {userInfo.outletName}
                      </p>
                    )}
                    {onManagerPath && userInfo.regionName && (
                      <p className="text-xs text-green-600 font-medium truncate">
                        {userInfo.regionName} Region • {userInfo.outletCount} {userInfo.outletCount === 1 ? 'Branch' : 'Branches'}
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
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;