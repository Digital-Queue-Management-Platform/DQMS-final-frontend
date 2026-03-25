import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Building2, PhoneCall, UserCircle2, ArrowRight, Briefcase, UserCheck, CalendarDays, ClipboardCheck, Search, MonitorSmartphone } from "lucide-react";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function ProLoginLanding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const outletId = searchParams.get("outletId");
    if (outletId) {
      console.log("[Redirect] Found outletId in query params, redirecting to display:", outletId);
      navigate(`/display/outlet/${outletId}${window.location.search}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const portals = [
    {
      title: "System Administrator",
      subtitle: "Full system control & analytics",
      icon: ShieldCheck,
      action: () => navigate("/admin"),
      accent: "bg-slate-700",
      iconColor: "text-slate-700",
      iconBg: "bg-slate-100",
      border: "hover:border-slate-400",
    },
    {
      title: "General Manager (GM)",
      subtitle: "Multi-region oversight & reporting",
      icon: Briefcase,
      action: () => navigate("/gm/login"),
      accent: "bg-violet-600",
      iconColor: "text-violet-600",
      iconBg: "bg-violet-100",
      border: "hover:border-violet-400",
    },
    {
      title: "Deputy General Manager",
      subtitle: "Outlet-level oversight & management",
      icon: UserCheck,
      action: () => navigate("/dgm/login"),
      accent: "bg-cyan-600",
      iconColor: "text-cyan-600",
      iconBg: "bg-cyan-100",
      border: "hover:border-cyan-400",
    },
    {
      title: "Regional Manager (RTOM)",
      subtitle: "Branch oversight & reporting",
      icon: Building2,
      action: () => navigate("/manager/login"),
      accent: "bg-emerald-600",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
      border: "hover:border-emerald-400",
    },
    {
      title: "Teleshop Manager",
      subtitle: "Officer & service supervision",
      icon: PhoneCall,
      action: () => navigate("/teleshop-manager/login"),
      accent: "bg-sky-600",
      iconColor: "text-sky-600",
      iconBg: "bg-sky-100",
      border: "hover:border-sky-400",
    },
    {
      title: "Customer Service Officer",
      subtitle: "Queue handling & customer service",
      icon: UserCircle2,
      action: () => navigate("/officer/login"),
      accent: "bg-amber-500",
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
      border: "hover:border-amber-400",
    },
  ];

  const customerActions = [
    { label: "Book Appointment", icon: CalendarDays, path: "/appointment/book", solid: true, color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
    { label: "My Appointments", icon: ClipboardCheck, path: "/appointment/my", solid: false, color: "bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200" },
    { label: "Check Service Status", icon: Search, path: "/service/status", solid: false, color: "bg-white hover:bg-blue-50 text-blue-700 border border-blue-200" },
    { label: "Walk-in Queue", icon: MonitorSmartphone, path: "/kiosk/login", solid: true, color: "bg-purple-600 hover:bg-purple-700 text-white" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[420px_1fr] xl:grid-cols-[480px_1fr] bg-slate-50 overflow-hidden">
      {/* ── Left Brand Panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white overflow-hidden"
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center lg:justify-start gap-4 mb-6 sm:mb-8"
          >
            <img
              src="/logo_white.png"
              alt="SLT-MOBITEL"
              className="h-10 sm:h-12 lg:h-14 w-auto object-contain"
            />
            <div className="h-8 w-[1px] bg-white/20" />
            <img
              src="/Transzent Logo.png"
              alt="Transzent Logo"
              className="h-12 sm:h-16 lg:h-20 object-contain brightness-0 invert opacity-90"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-center lg:text-left">
              Digital Queue
              <span className="block text-indigo-300">Management Platform</span>
            </h1>
            <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-sm mx-auto lg:mx-0 text-center lg:text-left leading-relaxed">
              Enterprise-grade queue orchestration designed for high-volume service environments.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="relative z-10 mt-8 lg:mt-0"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            {[["99.9%", "Uptime"], ["120+", "Branches"], ["24/7", "Support"]].map(([val, lbl]) => (
              <div key={lbl} className="bg-white/10 rounded-xl py-3 px-2 backdrop-blur-sm">
                <p className="text-xl sm:text-2xl font-bold">{val}</p>
                <p className="text-xs text-slate-300 mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-slate-500 text-xs text-center lg:text-left">
            © {new Date().getFullYear()} SLT-Mobitel Digital Platforms Section
          </p>
        </motion.div>
      </motion.div>

      {/* ── Right: Portal Selector ── */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-6 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Secure Portal Access</h2>
            <p className="mt-1.5 text-sm sm:text-base text-slate-500">Select your authorized role to continue</p>
          </motion.div>

          {/* Portal grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          >
            {portals.map((portal) => {
              const Icon = portal.icon;
              return (
                <motion.button
                  key={portal.title}
                  variants={itemVariants}
                  whileHover={{ y: -3, boxShadow: "0 8px 24px rgb(0 0 0 / 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={portal.action}
                  className={`group relative overflow-hidden rounded-xl bg-white border border-slate-200 ${portal.border} p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer`}
                  style={{ boxShadow: "0 1px 3px rgb(0 0 0 / 0.06)" }}
                >
                  {/* Accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${portal.accent}`} />

                  <div className="pl-3">
                    <div className={`w-9 h-9 rounded-lg ${portal.iconBg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${portal.iconColor}`} />
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900">{portal.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{portal.subtitle}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-400 group-hover:text-slate-700 transition-colors">
                      Access Portal
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* ── Customer Quick Access ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="mt-6"
          >
            <div className="relative flex items-center mb-4">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-xs text-slate-400 font-medium bg-slate-50">Customer Services</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {customerActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(action.path)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${action.color}`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-center leading-tight">{action.label}</span>
                  </motion.button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Use your mobile number to view appointments · Reference number for service status
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
