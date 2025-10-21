import React from "react"
import { Routes, Route, useLocation, useNavigate } from "react-router-dom"
// MainNav removed per request - no top navbar
import Sidebar from "./admin/adminComponents/additionalComps/SideBar"
import Header from "./components/Header"
import ProtectedAdminRoute from "./components/ProtectedAdminRoute"
import ProtectedManagerRoute from "./components/ProtectedManagerRoute"
import CustomerRegistration from "./pages/CustomerRegistration"
import QueueStatus from "./pages/QueueStatus"
import OfficerLogin from "./pages/OfficerLogin"
import OfficerDashboard from "./pages/OfficerDashboard"
import AdminLogin from "./pages/AdminLogin"
import DashboardPage from "./admin/adminPages/DashboardPage"
import AdminOfficers from "./admin/adminPages/AdminOfficers"
import BranchesPage from "./admin/adminPages/BranchesPage"
import ServicesPage from "./admin/adminPages/ServicesPage"
import BranchComparePage from "./admin/adminPages/BranchComparePage"
import AdminAllOfficers from "./admin/adminPages/AdminAllOfficers"
import ManagerManagement from "./admin/adminPages/ManagerManagement"
import FeedbackPage from "./pages/FeedbackPage"
import QRDisplay from "./pages/QRDisplay"
// import OfficerRegistration from "./pages/OfficerRegistration" // moved under manager portal
import OfficerQueuePage from "./pages/OfficerQueuePage"
import IPSpeakerPage from "./pages/IPSpeakerPage"
import ManagerLogin from "./pages/ManagerLogin"
import ManagerDashboard from "./pages/ManagerDashboard"
import ManagerBranches from "./pages/ManagerBranches"
import ManagerCompare from "./pages/ManagerCompare"
import ManagerOfficerRegistration from "./pages/ManagerOfficerRegistration.tsx"
import ManagerOfficers from "./pages/ManagerOfficers"
import ManagerQRCodes from "./pages/ManagerQRCodes"
import ManagerBreakOversight from "./pages/ManagerBreakOversight"

import { Shield, UserCog, ArrowRight, Building2 } from "lucide-react"
import OfficerTopBar from "./components/OfficerTopBar"
import ManagerTopBar from "./components/ManagerTopBar"
import api from "./config/api"
import type { Officer } from "./types"

function TabsLanding() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState<string>("officer")

  React.useEffect(() => {
    const stateTab = new URLSearchParams(location.search).get("tab")
    if (stateTab) setActiveTab(stateTab)
  }, [location.search])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    navigate(`/?tab=${tab}`)
  }

  

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col xl:flex-row min-h-screen">
        {/* Left Side - Branding & Features */}
        <div className="xl:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white p-4 sm:p-8 lg:p-12 flex flex-col justify-center relative overflow-hidden min-h-[40vh] xl:min-h-screen">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-white opacity-5 rounded-full -mr-24 -mt-24 sm:-mr-36 sm:-mt-36 lg:-mr-48 lg:-mt-48"></div>
          <div className="absolute bottom-0 left-0 w-36 h-36 sm:w-54 sm:h-54 lg:w-72 lg:h-72 bg-white opacity-5 rounded-full -ml-18 -mb-18 sm:-ml-27 sm:-mb-27 lg:-ml-36 lg:-mb-36"></div>
          
          <div className="relative z-10 max-w-xl mx-auto w-full">
            {/* Logo/Brand */}
            <div className="mb-8 sm:mb-12 lg:mb-16 text-center">
              <div className="flex flex-col items-center justify-center mb-4">
                <img 
                  src="/logo_white.png" 
                  alt="Queue Management Platform Logo" 
                  className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-xl object-contain mb-4"
                />
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-nowrap text-center">Queue Management Platform</h1>
              </div>
              <p className="text-base sm:text-lg lg:text-xl text-blue-100 text-center">Streamlining Service, Minimizing Wait Times</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8 pt-6 sm:pt-8 border-t border-white border-opacity-20">
              <div className="text-center xl:text-left">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">50%</div>
                <div className="text-xs sm:text-sm text-blue-100">Less Waiting</div>
              </div>
              <div className="text-center xl:text-left">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">24/7</div>
                <div className="text-xs sm:text-sm text-blue-100">Available</div>
              </div>
              <div className="text-center xl:text-left">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">100+</div>
                <div className="text-xs sm:text-sm text-blue-100">Branches</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Portal Selection */}
        <div className="xl:w-1/2 p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center bg-gray-50 min-h-[60vh] xl:min-h-screen">
          <div className="max-w-2xl mx-auto w-full">
            <div className="mb-6 sm:mb-8 text-center xl:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Access Portal</h2>
              <p className="text-sm sm:text-base text-gray-600">Select your role to continue</p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="flex flex-wrap sm:flex-nowrap border-b border-gray-200">
                {[
                  { id: 'officer', label: 'Officer', icon: UserCog },
                  { id: 'manager', label: 'Manager', icon: Building2 },
                  { id: 'admin', label: 'Admin', icon: Shield }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 font-medium sm:font-semibold transition-all text-xs sm:text-sm ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-6 lg:p-8">
                {/* Officer Tab */}
                {activeTab === 'officer' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Officer Portal</h3>
                      <p className="text-gray-600 text-sm">Manage counters and serve customers</p>
                    </div>

                    <div className="space-y-4">
                      {/* Officer Login */}
                      <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                        <h4 className="font-semibold text-gray-900 mb-2">Officer Login</h4>
                        <p className="text-sm text-gray-600 mb-4">Access your counter dashboard</p>
                        <button
                          onClick={() => navigate('/officer/login')}
                          className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          Login <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manager Tab */}
                {activeTab === 'manager' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Manager Portal</h3>
                      <p className="text-gray-600 text-sm">Regional branch management and oversight</p>
                    </div>

                    <div className="space-y-4">
                      {/* Manager Login */}
                      <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <h4 className="font-semibold text-gray-900 mb-2">Manager Login</h4>
                        <p className="text-sm text-gray-600 mb-4">Access regional dashboard and analytics</p>
                        <button
                          onClick={() => navigate('/manager/login')}
                          className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          Login <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Tab */}
                {activeTab === 'admin' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Admin Portal</h3>
                      <p className="text-gray-600 text-sm">System management and analytics</p>
                    </div>

                    <div className="space-y-4">
                      {/* Admin Login */}
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                        <h4 className="font-semibold text-gray-900 mb-2">Admin Dashboard</h4>
                        <p className="text-sm text-gray-600 mb-4">Access comprehensive analytics</p>
                        <button
                          onClick={() => navigate('/admin')}
                          className="w-full px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          Access Panel <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">Need help? Contact system support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isAdminPath = location.pathname.startsWith('/admin')
  const isOfficerPath = location.pathname.startsWith('/officer')
  const isManagerPath = location.pathname.startsWith('/manager')
  const isOfficerLogin = location.pathname === '/officer/login'
  const isManagerLogin = location.pathname === '/manager/login'
  // Ensure sidebar is visible on admin, officer, and manager routes (but not on login pages)
  const showSidebar = isAdminPath || (isOfficerPath && !isOfficerLogin) || (isManagerPath && !isManagerLogin)
  const [activePage, setActivePage] = React.useState<string>('')

  // Central officer state for top bar when on officer pages (except login)
  const [officer, setOfficer] = React.useState<Officer | null>(null)
  
  // Central manager state for top bar when on manager pages (except login)
  const [manager, setManager] = React.useState<any | null>(null)

  React.useEffect(() => {
    let mounted = true
    async function loadUser() {
      if (isOfficerPath && !isOfficerLogin) {
        try {
          const res = await api.get('/officer/me')
          if (!mounted) return
          setOfficer(res.data.officer)
        } catch (e) {
          // If not authenticated, send to login
          navigate('/officer/login')
        }
      } else {
        setOfficer(null)
      }

      if (isManagerPath && !isManagerLogin) {
        // Manager authentication is now handled by ProtectedManagerRoute
        // This is just for loading manager context data
        try {
          const storedManager = localStorage.getItem('manager')
          const managerData = storedManager ? JSON.parse(storedManager) : null
          
          if (managerData?.email) {
            const params = { email: managerData.email }
            const res = await api.get('/manager/me', { params })
            if (!mounted) return
            setManager(res.data.manager)
          }
        } catch (e: any) {
          console.error('Manager context loading failed:', e)
          // Don't redirect here - ProtectedManagerRoute will handle authentication
        }
      } else {
        setManager(null)
      }
    }
    loadUser()
    return () => { mounted = false }
  }, [isOfficerPath, isOfficerLogin, isManagerPath, isManagerLogin, navigate])

  const handleAfterStatusChange = React.useCallback((status: string) => {
    // Broadcast a window event so officer pages can react (refresh summaries/queues)
    try {
      const evt: any = new CustomEvent('officer:status-changed', { detail: { status } })
      window.dispatchEvent(evt)
    } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {showSidebar && (
        <Sidebar 
          activePage={activePage} 
          setActivePage={setActivePage} />
      )}
      <div 
        className={`flex-1 transition-all duration-300 ${showSidebar ? 'lg:ml-72 xl:ml-80' : 'ml-0'}`}
      >
        {/* Header for all dashboard pages */}
        {showSidebar && <Header />}
        
        {/* Shared Officer Top Bar for all officer pages except login, dashboard, queue, and ip-speaker */}
        {isOfficerPath && !isOfficerLogin && officer && !location.pathname.includes('/officer/dashboard') && !location.pathname.includes('/officer/queue') && !location.pathname.includes('/officer/ip-speaker') && (
          <OfficerTopBar 
            officer={officer}
            onOfficerUpdate={setOfficer as any}
            onAfterStatusChange={handleAfterStatusChange}
          />
        )}
        
        {/* Shared Manager Top Bar for all manager pages except login */}
        {isManagerPath && !isManagerLogin && manager && (
          <ManagerTopBar 
            manager={manager}
          />
        )}
        {children}
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route
        element={<Layout><TabsLanding /></Layout>}
        path="/"
      />
      <Route
        element={<Layout><CustomerRegistration /></Layout>}
        path="/register/:outletId"
      />
      <Route
        element={<Layout><QueueStatus /></Layout>}
        path="/queue/:tokenId"
      />
      <Route
        element={<Layout><FeedbackPage /></Layout>}
        path="/feedback/:tokenId"
      />
      <Route
        element={<Layout><QRDisplay /></Layout>}
        path="/qr/:outletId"
      />
      <Route
        element={<Layout><OfficerLogin /></Layout>}
        path="/officer/login"
      />
      <Route
        element={<Layout><OfficerDashboard /></Layout>}
        path="/officer/dashboard"
      />
      <Route
        element={<Layout><OfficerQueuePage /></Layout>}
        path="/officer/queue"
      />
      <Route
        element={<Layout><IPSpeakerPage /></Layout>}
        path="/officer/ip-speaker"
      />
      <Route
        element={<AdminLogin />}
        path="/admin/login"
      />
      <Route
        element={<Layout><ProtectedAdminRoute><DashboardPage /></ProtectedAdminRoute></Layout>}
        path="/admin"
      />
      <Route
        element={<Layout><ProtectedAdminRoute><AdminOfficers /></ProtectedAdminRoute></Layout>}
        path="/admin/officers"
      />
      <Route
        element={<Layout><ProtectedAdminRoute><AdminAllOfficers /></ProtectedAdminRoute></Layout>}
        path="/admin/all-officers"
      />
      <Route
        element={<Layout><ProtectedAdminRoute><ServicesPage /></ProtectedAdminRoute></Layout>}
        path="/admin/services"
      />
      <Route
        element={<Layout><ProtectedAdminRoute><BranchesPage /></ProtectedAdminRoute></Layout>}
        path="/admin/branches"
      />
      <Route
        element={<Layout><ProtectedAdminRoute><ManagerManagement /></ProtectedAdminRoute></Layout>}
        path="/admin/managers"
      />
      <Route
        element={<Layout><ProtectedAdminRoute><BranchComparePage /></ProtectedAdminRoute></Layout>}
        path="/admin/compare"
      />
      <Route
        element={<Layout><ManagerLogin /></Layout>}
        path="/manager/login"
      />
      <Route
        element={<Layout><ProtectedManagerRoute><ManagerDashboard /></ProtectedManagerRoute></Layout>}
        path="/manager/dashboard"
      />
      <Route
        element={<Layout><ProtectedManagerRoute><ManagerBranches /></ProtectedManagerRoute></Layout>}
        path="/manager/branches"
      />
      <Route
        element={<Layout><ProtectedManagerRoute><ManagerQRCodes /></ProtectedManagerRoute></Layout>}
        path="/manager/qr-codes"
      />
      <Route
        element={<Layout><ProtectedManagerRoute><ManagerCompare /></ProtectedManagerRoute></Layout>}
        path="/manager/compare"
      />
      <Route
        element={<Layout><ProtectedManagerRoute><ManagerOfficerRegistration /></ProtectedManagerRoute></Layout>}
        path="/manager/register-officer"
      />
      <Route
        element={<Layout><ProtectedManagerRoute><ManagerOfficers /></ProtectedManagerRoute></Layout>}
        path="/manager/officers"
      />
      <Route
        element={<Layout><ProtectedManagerRoute><ManagerBreakOversight /></ProtectedManagerRoute></Layout>}
        path="/manager/breaks"
      />
    </Routes>
  )
}

export default App