import React from "react"
import { Routes, Route, useLocation, useNavigate } from "react-router-dom"
// MainNav removed per request - no top navbar
import Sidebar from "./admin/adminComponents/additionalComps/SideBar"
//import Header from "./components/Header"
import ProtectedAdminRoute from "./components/ProtectedAdminRoute"
import ProtectedManagerRoute from "./components/ProtectedManagerRoute"
import CustomerRegistration from "./pages/CustomerRegistration"
import OfficerLogin from "./pages/OfficerLogin"
import AdminLogin from "./pages/AdminLogin"
const OfficerDashboard = React.lazy(() => import("./pages/OfficerDashboard"))
const QueueStatus = React.lazy(() => import("./pages/QueueStatus"))
// Lazily-loaded heavy admin/manager pages to reduce initial bundle
const DashboardPage = React.lazy(() => import("./admin/adminPages/DashboardPage"))
const AdminOfficers = React.lazy(() => import("./admin/adminPages/AdminOfficers"))
const BranchesPage = React.lazy(() => import("./admin/adminPages/BranchesPage"))
const ServicesPage = React.lazy(() => import("./admin/adminPages/ServicesPage"))
const BranchComparePage = React.lazy(() => import("./admin/adminPages/BranchComparePage"))
const AdminBackupPage = React.lazy(() => import("./admin/adminPages/AdminBackupPage"))
const AdminAllOfficers = React.lazy(() => import("./admin/adminPages/AdminAllOfficers"))
const ManagerManagement = React.lazy(() => import("./admin/adminPages/ManagerManagement"))
const InsightsPage = React.lazy(() => import("./admin/adminPages/InsightsPage"))
import OfficerQueuePage from "./pages/OfficerQueuePage"
import IPSpeakerPage from "./pages/IPSpeakerPage"
import ManagerLogin from "./pages/ManagerLogin"
const FeedbackPage = React.lazy(() => import("./pages/FeedbackPage"))
const QRDisplay = React.lazy(() => import("./pages/QRDisplay"))
const OfficerServedCustomers = React.lazy(() => import("./pages/OfficerServedCustomers"))
const OfficerServiceTracking = React.lazy(() => import("./pages/OfficerServiceTracking"))
const OfficerBranchNotices = React.lazy(() => import("./pages/OfficerBranchNotices"))
const ManagerDashboard = React.lazy(() => import("./pages/ManagerDashboard"))
const ManagerBranches = React.lazy(() => import("./pages/ManagerBranches"))
const ManagerCompare = React.lazy(() => import("./pages/ManagerCompare"))
const ManagerBreakOversight = React.lazy(() => import("./pages/ManagerBreakOversight"))
const ManagerAppointments = React.lazy(() => import("./pages/ManagerAppointments"))
const TeleshopManagerLogin = React.lazy(() => import("./pages/TeleshopManagerLogin"))
const TeleshopManagerDashboard = React.lazy(() => import("./pages/TeleshopManagerDashboard"))
const TeleshopManagerOfficerRegistration = React.lazy(() => import("./pages/TeleshopManagerOfficerRegistration"))
const TeleshopManagerOfficers = React.lazy(() => import("./pages/TeleshopManagerOfficers"))
const TeleshopManagerEditOfficer = React.lazy(() => import("./pages/TeleshopManagerEditOfficer"))
const TeleshopManagerCompletedServices = React.lazy(() => import("./pages/TeleshopManagerCompletedServices"))
const TeleshopManagerFeedback = React.lazy(() => import("./pages/TeleshopManagerFeedback"))
const TeleshopManagerAppointments = React.lazy(() => import("./pages/TeleshopManagerAppointments"))
const TeleshopManagerServedCustomers = React.lazy(() => import("./pages/TeleshopManagerServedCustomers"))
const TeleshopManagerKioskSettings = React.lazy(() => import("./pages/TeleshopManagerKioskSettings"))
const ManagerFeedback = React.lazy(() => import("./pages/ManagerFeedback"))
const AdminFeedback = React.lazy(() => import("./pages/AdminFeedback"))
const ManagerOfficerAssignment = React.lazy(() => import("./pages/ManagerOfficerAssignment"))
import ProtectedTeleshopManagerRoute from "./components/ProtectedTeleshopManagerRoute"
import KioskLogin from "./pages/KioskLogin"
import KioskDashboard from "./pages/KioskDashboard"
const ManagerTeleshopManagers = React.lazy(() => import("./pages/ManagerTeleshopManagers"))
const AppointmentBooking = React.lazy(() => import("./pages/AppointmentBooking"))
const AppointmentMy = React.lazy(() => import("./pages/AppointmentMy"))
const AdminAppointments = React.lazy(() => import("./admin/adminPages/AdminAppointments"))
const AdminOutletPasswords = React.lazy(() => import("./admin/adminPages/AdminOutletPasswords"))
const ServiceStatus = React.lazy(() => import("./pages/ServiceStatus"))
const OutletQueueDisplay = React.lazy(() => import("./pages/OutletQueueDisplay"))
const ManagerServiceTracking = React.lazy(() => import("./pages/ManagerServiceTracking"))
const TeleshopManagerServiceTracking = React.lazy(() => import("./pages/TeleshopManagerServiceTracking"))
const TeleshopManagerClosureNotices = React.lazy(() => import("./pages/TeleshopManagerClosureNotices"))
const TeleshopManagerAuditLogs = React.lazy(() => import("./pages/TeleshopManagerAuditLogs"))
const TeleshopManagerOutletDisplay = React.lazy(() => import("./pages/TeleshopManagerOutletDisplay"))
const TeleshopManagerOutletSetup = React.lazy(() => import("./pages/TeleshopManagerOutletSetup"))
const TeleshopManagerQRCodes = React.lazy(() => import("./pages/TeleshopManagerQRCodes"))
const ManagerClosureNotices = React.lazy(() => import("./pages/ManagerClosureNotices"))
const AdminGMs = React.lazy(() => import("./admin/adminPages/AdminGMs"))
const AdminDGMs = React.lazy(() => import("./admin/adminPages/AdminDGMs"))
const AdminTeleshopManagers = React.lazy(() => import("./admin/adminPages/AdminTeleshopManagers"))
const SystemLogsPage = React.lazy(() => import("./admin/adminPages/SystemLogsPage"))
const GMLogin = React.lazy(() => import("./pages/GMLogin"))
const DGMLogin = React.lazy(() => import("./pages/DGMLogin"))
const GMDashboard = React.lazy(() => import("./pages/GMDashboard"))
const GMFeedback = React.lazy(() => import("./pages/GMFeedback"))
const GMClosureNotices = React.lazy(() => import("./pages/GMClosureNotices"))
const DGMDashboard = React.lazy(() => import("./pages/DGMDashboard"))
const DGMFeedback = React.lazy(() => import("./pages/DGMFeedback"))
const DGMClosureNotices = React.lazy(() => import("./pages/DGMClosureNotices"))
const GMManageDGMs = React.lazy(() => import("./pages/GMManageDGMs"))
const DGMManageRTOMs = React.lazy(() => import("./pages/DGMManageRTOMs"))
const GMLocationDashboard = React.lazy(() => import("./pages/GMLocationDashboard"))
const DGMLocationDashboard = React.lazy(() => import("./pages/DGMLocationDashboard"))
import ProtectedGMRoute from "./components/ProtectedGMRoute"
import ProtectedDGMRoute from "./components/ProtectedDGMRoute"
import ShortUrlResolver from "./components/ShortUrlResolver"

//import { Shield, UserCog, ArrowRight, Building2, Phone } from "lucide-react"
import OfficerTopBar from "./components/OfficerTopBar"
import api from "./config/api"
import type { Officer } from "./types"
import ProLoginLanding from "./components/ProLoginLanding"

{/*function TabsLanding() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState<string>("admin")

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
      {/* Use a 7-column grid at xl+ to enforce exact 3/7 + 4/7 split without relying on non-standard width classes 
      <div className="min-h-screen grid grid-cols-1 xl:grid-cols-7">
        {/* Left Side - Branding & Features 
        <div className="col-span-3 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white p-4 sm:p-8 lg:p-12 flex flex-col justify-center relative overflow-hidden min-h-[40vh] xl:min-h-screen">
          {/* Decorative Background Elements 
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-white opacity-5 rounded-full -mr-24 -mt-24 sm:-mr-36 sm:-mt-36 lg:-mr-48 lg:-mt-48"></div>
          <div className="absolute bottom-0 left-0 w-36 h-36 sm:w-54 sm:h-54 lg:w-72 lg:h-72 bg-white opacity-5 rounded-full -ml-18 -mb-18 sm:-ml-27 sm:-mb-27 lg:-ml-36 lg:-mb-36"></div>
          
          <div className="relative z-10 max-w-xl mx-auto w-full">
            {/* Logo/Brand 
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

            {/* Stats *
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

        {/* Right Side - Portal Selection *
        <div className="col-span-4 p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center bg-gray-50 min-h-[60vh] xl:min-h-screen">
          {/* Remove max-width & auto horizontal margin to eliminate unintended empty space on the right 
          <div className="w-full">
            {/*<div className="mb-6 sm:mb-8 text-center xl:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Access Portal</h2>
              <p className="text-sm sm:text-base text-gray-600">Select your role to continue</p>
            </div>*

            {/* Tab Navigation 
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="flex flex-wrap sm:flex-nowrap border-b border-gray-200">
                {[
                  { id: 'admin', label: 'Admin', icon: Shield },
                  { id: 'manager', label: 'RTOM', icon: Building2 },
                  { id: 'teleshop', label: 'Teleshop Manager', icon: Phone },
                  { id: 'officer', label: 'Customer Service Officer', icon: UserCog }
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

              {/* Tab Content *
              <div className="p-4 sm:p-6 lg:p-8">
                {/* Officer Tab 
                {activeTab === 'officer' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Customer Service Officer Portal</h3>
                      <p className="text-gray-600 text-sm">Manage counters and serve customers</p>
                    </div>

                    <div className="space-y-4">
                      {/* Officer Login 
                      <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                        <h4 className="font-semibold text-gray-900 mb-2">Customer Service Officer Login</h4>
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

                {/* Manager Tab 
                {activeTab === 'manager' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Manager Portal</h3>
                      <p className="text-gray-600 text-sm">Regional branch management and oversight</p>
                    </div>

                    <div className="space-y-4">
                      {/* Manager Login 
                      <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <h4 className="font-semibold text-gray-900 mb-2">RTOM Login</h4>
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

                {/* Teleshop Tab 
                {activeTab === 'teleshop' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Teleshop Manager Portal</h3>
                      <p className="text-gray-600 text-sm">Manage officers and monitor breaks</p>
                    </div>

                    <div className="space-y-4">
                      {/* Teleshop Manager Login 
                      <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                        <h4 className="font-semibold text-gray-900 mb-2">RTOM Login</h4>
                        <p className="text-sm text-gray-600 mb-4">Access officer management dashboard</p>
                        <button
                          onClick={() => navigate('/teleshop-manager/login')}
                          className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          Login <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Tab 
                {activeTab === 'admin' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Admin Portal</h3>
                      <p className="text-gray-600 text-sm">System management and analytics</p>
                    </div>

                    <div className="space-y-4">
                      {/* Admin Login 
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

            {/* Footer 
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">Need help? Contact system support</p>
            </div>

            {/* Quick access for customers 
            <div className="mt-6 text-center">
              <div className="inline-flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/appointment/book')}
                  className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                >
                  Book Appointment
                </button>
                <button
                  onClick={() => navigate('/appointment/my')}
                  className="px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-all"
                >
                  My Appointments
                </button>
                <button
                  onClick={() => navigate('/service/status')}
                  className="px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 transition-all"
                >
                  Check Service Status
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Use your mobile number on “My Appointments” to view bookings, or your reference number to check service status.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}*/}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isAdminPath = location.pathname.startsWith('/admin')
  const isOfficerPath = location.pathname.startsWith('/officer')
  const isManagerPath = location.pathname.startsWith('/manager')
  const isTeleshopManagerPath = location.pathname.startsWith('/teleshop-manager')
  const isGMPath = location.pathname.startsWith('/gm')
  const isDGMPath = location.pathname.startsWith('/dgm')
  const isOfficerLogin = location.pathname === '/officer/login'
  const isManagerLogin = location.pathname === '/manager/login'
  const isTeleshopManagerLogin = location.pathname === '/teleshop-manager/login'
  const isGMLogin = location.pathname === '/gm/login'
  const isDGMLogin = location.pathname === '/dgm/login'
  // Ensure sidebar is visible on admin, officer, manager, and teleshop manager routes (but not on login pages)
  const showSidebar = isAdminPath || (isOfficerPath && !isOfficerLogin) || (isManagerPath && !isManagerLogin) || (isTeleshopManagerPath && !isTeleshopManagerLogin) || (isGMPath && !isGMLogin) || (isDGMPath && !isDGMLogin)
  const [activePage, setActivePage] = React.useState<string>('')
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    try { return localStorage.getItem('sidebar_collapsed') === '1' } catch { return false }
  })

  // Central officer state for top bar when on officer pages (except login)
  const [officer, setOfficer] = React.useState<Officer | null>(null)

  React.useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0') } catch {
    }
  }, [isCollapsed])

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
        // No need to load manager state for top bar since we're not using it
      } else {
        // Clear any manager-related state if needed
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
    } catch { }
  }, [])

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
        className={`flex-1 transition-all duration-300 ${showSidebar ? (isCollapsed ? 'lg:ml-16' : 'lg:ml-72') : 'ml-0'}`}
      >
        {/* Header for all dashboard pages
        {showSidebar && <Header />} */}

        {/* Shared Officer Top Bar for all officer pages except login, dashboard, queue, ip-speaker, served-customers, and service-tracking */}
        {isOfficerPath && !isOfficerLogin && officer && !location.pathname.includes('/officer/dashboard') && !location.pathname.includes('/officer/queue') && !location.pathname.includes('/officer/ip-speaker') && !location.pathname.includes('/officer/served-customers') && !location.pathname.includes('/officer/service-tracking') && !location.pathname.includes('/officer/branch-notices') && (
          <OfficerTopBar
            officer={officer}
            onOfficerUpdate={setOfficer as any}
            onAfterStatusChange={handleAfterStatusChange}
          />
        )}
        {children}
      </div>
    </div>
  )
}

function App() {
  return (
    <React.Suspense fallback={<div className="p-6 text-center text-sm text-gray-600">Loading...</div>}>
      <Routes>
        <Route
          element={<Layout><ProLoginLanding /></Layout>}
          path="/"
        />
        <Route
          element={<Layout><CustomerRegistration /></Layout>}
          path="/register/:outletId"
        />
        <Route
          element={<Layout><AppointmentBooking /></Layout>}
          path="/appointment/book"
        />
        <Route
          element={<Layout><AppointmentMy /></Layout>}
          path="/appointment/my"
        />
        <Route
          element={<Layout><ServiceStatus /></Layout>}
          path="/service/status"
        />
        <Route
          element={<Layout><OutletQueueDisplay /></Layout>}
          path="/display/outlet/:outletId"
        />
        <Route
          element={<Layout><QueueStatus /></Layout>}
          path="/queue/:tokenId"
        />
        <Route
          element={<Layout><ShortUrlResolver /></Layout>}
          path="/t/:shortId"
        />
        <Route
          element={<Layout><ShortUrlResolver /></Layout>}
          path="/f/:shortId"
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
          element={<Layout><OfficerServedCustomers /></Layout>}
          path="/officer/served-customers"
        />
        <Route
          element={<Layout><OfficerServiceTracking /></Layout>}
          path="/officer/service-tracking"
        />
        <Route
          element={<Layout><OfficerBranchNotices /></Layout>}
          path="/officer/branch-notices"
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
          element={<Layout><ProtectedAdminRoute><AdminAppointments /></ProtectedAdminRoute></Layout>}
          path="/admin/appointments"
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
          element={<Layout><ProtectedAdminRoute><AdminBackupPage /></ProtectedAdminRoute></Layout>}
          path="/admin/backup"
        />
        <Route
          element={<Layout><ProtectedAdminRoute><AdminOutletPasswords /></ProtectedAdminRoute></Layout>}
          path="/admin/outlet-passwords"
        />
        <Route
          element={<Layout><ProtectedAdminRoute><AdminFeedback /></ProtectedAdminRoute></Layout>}
          path="/admin/feedback"
        />
        <Route
          element={<Layout><ProtectedAdminRoute><InsightsPage /></ProtectedAdminRoute></Layout>}
          path="/admin/insights"
        />
        <Route
          element={<Layout><ProtectedAdminRoute><AdminGMs /></ProtectedAdminRoute></Layout>}
          path="/admin/gms"
        />
        <Route
          element={<Layout><ProtectedAdminRoute><AdminDGMs /></ProtectedAdminRoute></Layout>}
          path="/admin/dgms"
        />
        <Route
          element={<Layout><ProtectedAdminRoute><AdminTeleshopManagers /></ProtectedAdminRoute></Layout>}
          path="/admin/teleshop-managers"
        />
        <Route
          element={<Layout><ProtectedAdminRoute><SystemLogsPage /></ProtectedAdminRoute></Layout>}
          path="/admin/logs"
        />
        <Route
          element={<KioskLogin />}
          path="/kiosk/login"
        />
        <Route
          element={<KioskDashboard />}
          path="/kiosk/dashboard"
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
          element={<Layout><ProtectedManagerRoute><ManagerServiceTracking /></ProtectedManagerRoute></Layout>}
          path="/manager/service-tracking"
        />
        <Route
          element={<Layout><ProtectedManagerRoute><ManagerAppointments /></ProtectedManagerRoute></Layout>}
          path="/manager/appointments"
        />
        <Route
          element={<Layout><ProtectedManagerRoute><ManagerBranches /></ProtectedManagerRoute></Layout>}
          path="/manager/branches"
        />
        <Route
          element={<Layout><ProtectedManagerRoute><ManagerCompare /></ProtectedManagerRoute></Layout>}
          path="/manager/compare"
        />
        <Route
          element={<Layout><ProtectedManagerRoute><ManagerBreakOversight /></ProtectedManagerRoute></Layout>}
          path="/manager/breaks"
        />
        <Route
          element={<Layout><ProtectedManagerRoute><ManagerFeedback /></ProtectedManagerRoute></Layout>}
          path="/manager/feedback"
        />
        <Route
          element={<Layout><ProtectedManagerRoute><ManagerTeleshopManagers /></ProtectedManagerRoute></Layout>}
          path="/manager/teleshop-managers"
        />
        <Route
          element={<Layout><ProtectedManagerRoute><ManagerOfficerAssignment /></ProtectedManagerRoute></Layout>}
          path="/manager/officer-assignment"
        />
        <Route
          element={<Layout><ProtectedManagerRoute><ManagerClosureNotices /></ProtectedManagerRoute></Layout>}
          path="/manager/closure-notices"
        />
        <Route
          element={<Layout><TeleshopManagerLogin /></Layout>}
          path="/teleshop-manager/login"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerDashboard /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/dashboard"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerServiceTracking /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/service-tracking"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerAppointments /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/appointments"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerOfficers /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/officers"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerEditOfficer /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/officers/:officerId/edit"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerOfficerRegistration /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/officers/add"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerCompletedServices /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/completed-services"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerServedCustomers /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/served-customers"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerFeedback /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/feedback"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerKioskSettings /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/kiosk-settings"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerClosureNotices /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/closure-notices"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerAuditLogs /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/audit-logs"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerOutletDisplay /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/outlet-display"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerOutletSetup /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/outlet-setup"
        />
        <Route
          element={<Layout><ProtectedTeleshopManagerRoute><TeleshopManagerQRCodes /></ProtectedTeleshopManagerRoute></Layout>}
          path="/teleshop-manager/qr-codes"
        />
        <Route element={<GMLogin />} path="/gm/login" />
        <Route
          element={<Layout><ProtectedGMRoute><GMDashboard /></ProtectedGMRoute></Layout>}
          path="/gm/dashboard"
        />
        <Route
          element={<Layout><ProtectedGMRoute><GMFeedback /></ProtectedGMRoute></Layout>}
          path="/gm/feedback"
        />
        <Route
          element={<Layout><ProtectedGMRoute><GMClosureNotices /></ProtectedGMRoute></Layout>}
          path="/gm/closure-notices"
        />
        <Route
          element={<Layout><ProtectedGMRoute><GMManageDGMs /></ProtectedGMRoute></Layout>}
          path="/gm/manage-dgms"
        />
        <Route
          element={<Layout><ProtectedGMRoute><GMLocationDashboard /></ProtectedGMRoute></Layout>}
          path="/gm/location-dashboard"
        />
        <Route element={<DGMLogin />} path="/dgm/login" />
        <Route
          element={<Layout><ProtectedDGMRoute><DGMDashboard /></ProtectedDGMRoute></Layout>}
          path="/dgm/dashboard"
        />
        <Route
          element={<Layout><ProtectedDGMRoute><DGMFeedback /></ProtectedDGMRoute></Layout>}
          path="/dgm/feedback"
        />
        <Route
          element={<Layout><ProtectedDGMRoute><DGMClosureNotices /></ProtectedDGMRoute></Layout>}
          path="/dgm/closure-notices"
        />
        <Route
          element={<Layout><ProtectedDGMRoute><DGMManageRTOMs /></ProtectedDGMRoute></Layout>}
          path="/dgm/manage-rtoms"
        />
        <Route
          element={<Layout><ProtectedDGMRoute><DGMLocationDashboard /></ProtectedDGMRoute></Layout>}
          path="/dgm/location-dashboard"
        />
      </Routes>
    </React.Suspense>
  )
}

export default App