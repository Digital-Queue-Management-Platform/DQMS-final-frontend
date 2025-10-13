import React from "react"
import { Routes, Route, useLocation, useNavigate } from "react-router-dom"
// MainNav removed per request - no top navbar
import Sidebar from "./admin/adminComponents/additionalComps/SideBar"
import CustomerRegistration from "./pages/CustomerRegistration"
import QueueStatus from "./pages/QueueStatus"
import OfficerLogin from "./pages/OfficerLogin"
import OfficerDashboard from "./pages/OfficerDashboard"
import DashboardPage from "./admin/adminPages/DashboardPage"
import AdminOfficers from "./admin/adminPages/AdminOfficers"
import BranchesPage from "./admin/adminPages/BranchesPage"
import ServicesPage from "./admin/adminPages/ServicesPage"
import BranchComparePage from "./admin/adminPages/BranchComparePage"
import AdminAllOfficers from "./admin/adminPages/AdminAllOfficers"
import FeedbackPage from "./pages/FeedbackPage"
import QRDisplay from "./pages/QRDisplay"
// import OfficerRegistration from "./pages/OfficerRegistration" // moved under manager portal
import OfficerQueuePage from "./pages/OfficerQueuePage"
import ManagerLogin from "./pages/ManagerLogin"
import ManagerDashboard from "./pages/ManagerDashboard"
import ManagerBranches from "./pages/ManagerBranches"
import ManagerCompare from "./pages/ManagerCompare"
import ManagerOfficerRegistration from "./pages/ManagerOfficerRegistration.tsx"
import ManagerOfficers from "./pages/ManagerOfficers"

import { Users, Shield, UserCog, Clock, ArrowRight, Building2 } from "lucide-react"
import OfficerTopBar from "./components/OfficerTopBar"
import ManagerTopBar from "./components/ManagerTopBar"
import api from "./config/api"
import type { Officer } from "./types"

function TabsLanding() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState<string>("customer")
  const [customerToken, setCustomerToken] = React.useState<string>("")
  const [customerLoginError, setCustomerLoginError] = React.useState<string>("")

  React.useEffect(() => {
    const stateTab = new URLSearchParams(location.search).get("tab")
    if (stateTab) setActiveTab(stateTab)
  }, [location.search])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    navigate(`/?tab=${tab}`)
  }

  const handleCustomerTokenLogin = () => {
    setCustomerLoginError("")
    const token = customerToken.trim()
    if (!token) {
      setCustomerLoginError('Please enter your token ID')
      return
    }
    navigate(`/queue/${token}`)
  }

  

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Branding & Features */}
        <div className="lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white p-12 flex flex-col justify-center relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -ml-36 -mb-36"></div>
          
          <div className="relative z-10 max-w-xl mx-auto">
            {/* Logo/Brand */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-5xl font-bold">QueueFlow</h1>
              </div>
              <p className="text-xl text-blue-100">Smart Queue Management</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white border-opacity-20">
              <div>
                <div className="text-4xl font-bold mb-2">50%</div>
                <div className="text-sm text-blue-100">Less Waiting</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">24/7</div>
                <div className="text-sm text-blue-100">Available</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">100+</div>
                <div className="text-sm text-blue-100">Branches</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Portal Selection */}
        <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-gray-50">
          <div className="max-w-xl mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Access Portal</h2>
              <p className="text-gray-600">Select your role to continue</p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="flex border-b border-gray-200">
                {[
                  { id: 'customer', label: 'Customer', icon: Users },
                  { id: 'officer', label: 'Officer', icon: UserCog },
                  { id: 'manager', label: 'Manager', icon: Building2 },
                  { id: 'admin', label: 'Admin', icon: Shield }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-all ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {/* Customer Tab */}
                {activeTab === 'customer' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Customer Portal</h3>
                      <p className="text-gray-600 text-sm">Get a queue token or check your status</p>
                    </div>

                    <div className="space-y-4">
                      {/* Check Token Status */}
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <h4 className="font-semibold text-gray-900 mb-3">Check Token Status</h4>
                        <input
                          value={customerToken}
                          onChange={(e) => setCustomerToken(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleCustomerTokenLogin()}
                          placeholder="Enter your token ID"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3"
                        />
                        {customerLoginError && (
                          <p className="text-sm text-red-600 mb-3">{customerLoginError}</p>
                        )}
                        <button
                          onClick={handleCustomerTokenLogin}
                          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          Check Status <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* New Registration (QR-gated notice) */}
                        <div className="block p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                          <h3 className="text-lg font-semibold text-yellow-900">Customer Registration</h3>
                          <p className="text-sm text-yellow-800">
                            To register, please scan the QR code displayed at the branch counter. The registration form will open automatically with a secure token.
                          </p>
                        </div>
                    </div>

                  </div>
                )}

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
  // Ensure sidebar is visible on admin, officer, and manager routes
  const showSidebar = isAdminPath || isOfficerPath || isManagerPath
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false)
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
        try {
          const res = await api.get('/manager/me')
          if (!mounted) return
          setManager(res.data.manager)
        } catch (e) {
          // If not authenticated, send to login
          navigate('/manager/login')
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

  // Get page title for manager pages
  const getManagerPageTitle = () => {
    const path = location.pathname
    if (path === '/manager/dashboard') return 'Regional Manager Dashboard'
    if (path === '/manager/branches') return 'Regional Branches'
    if (path === '/manager/compare') return 'Branch Comparison'
    if (path === '/manager/register-officer') return 'Register Officer'
    if (path === '/manager/officers') return 'Officers Management'
    return 'Regional Manager'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showSidebar && (
        <Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
          activePage={activePage} 
          setActivePage={setActivePage} />
      )}
      <div 
        className={`flex-1 transition-all duration-300 ${showSidebar ? 'ml-14' : 'ml-0'}`}
      >
        {/* Shared Officer Top Bar for all officer pages except login */}
        {isOfficerPath && !isOfficerLogin && officer && (
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
            title={getManagerPageTitle()}
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
        element={<Layout><DashboardPage /></Layout>}
        path="/admin"
      />
      <Route
        element={<Layout><AdminOfficers /></Layout>}
        path="/admin/officers"
      />
      <Route
        element={<Layout><AdminAllOfficers /></Layout>}
        path="/admin/all-officers"
      />
      <Route
        element={<Layout><ServicesPage /></Layout>}
        path="/admin/services"
      />
      <Route
        element={<Layout><BranchesPage /></Layout>}
        path="/admin/branches"
      />
      <Route
        element={<Layout><BranchComparePage /></Layout>}
        path="/admin/compare"
      />
      <Route
        element={<Layout><ManagerLogin /></Layout>}
        path="/manager/login"
      />
      <Route
        element={<Layout><ManagerDashboard /></Layout>}
        path="/manager/dashboard"
      />
      <Route
        element={<Layout><ManagerBranches /></Layout>}
        path="/manager/branches"
      />
      <Route
        element={<Layout><ManagerCompare /></Layout>}
        path="/manager/compare"
      />
      <Route
        element={<Layout><ManagerOfficerRegistration /></Layout>}
        path="/manager/register-officer"
      />
      <Route
        element={<Layout><ManagerOfficers /></Layout>}
        path="/manager/officers"
      />
    </Routes>
  )
}

export default App