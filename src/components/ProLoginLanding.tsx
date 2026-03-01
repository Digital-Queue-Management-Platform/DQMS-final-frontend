//import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Building2, PhoneCall, UserCircle2, ArrowRight, Briefcase, UserCheck } from "lucide-react";

export default function ProLoginLanding() {
  const navigate = useNavigate();

  const portals = [
    {
      title: "System Administrator",
      subtitle: "Full system control & analytics",
      icon: ShieldCheck,
      action: () => navigate("/admin"),
      gradient: "from-slate-900 to-slate-700",
    },
    {
      title: "General Manager (GM)",
      subtitle: "Multi-region oversight & reporting",
      icon: Briefcase,
      action: () => navigate("/gm/login"),
      gradient: "from-violet-700 to-purple-600",
    },
    {
      title: "Deputy General Manager (DGM)",
      subtitle: "Outlet-level oversight & management",
      icon: UserCheck,
      action: () => navigate("/dgm/login"),
      gradient: "from-teal-600 to-cyan-500",
    },
    {
      title: "Regional Manager (RTOM)",
      subtitle: "Branch oversight & reporting",
      icon: Building2,
      action: () => navigate("/manager/login"),
      gradient: "from-emerald-700 to-green-600",
    },
    {
      title: "Teleshop Manager",
      subtitle: "Officer & service supervision",
      icon: PhoneCall,
      action: () => navigate("/teleshop-manager/login"),
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      title: "Customer Service Officer",
      subtitle: "Queue handling & customer service",
      icon: UserCircle2,
      action: () => navigate("/officer/login"),
      gradient: "from-yellow-200 to-orange-600",
    },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white">
        <div>
          <img
            src="/logo_white.png"
            alt="Queue Management Platform Logo"
            className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-xl object-contain mb-4"
          />
          <h1 className="text-4xl font-bold leading-tight">
            Queue Management
            <span className="block text-slate-300">Platform</span>
          </h1>
          <p className="mt-4 text-slate-300 max-w-md">
            Enterprise-grade queue orchestration designed for high-volume service environments.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold">99.9%</p>
            <p className="text-sm text-slate-300">Uptime</p>
          </div>
          <div>
            <p className="text-3xl font-bold">120+</p>
            <p className="text-sm text-slate-300">Branches</p>
          </div>
          <div>
            <p className="text-3xl font-bold">24/7</p>
            <p className="text-sm text-slate-300">Monitoring</p>
          </div>
        </div>
      </div>

      {/* Right Login Selector */}
      <div className="flex items-center justify-center p-6 sm:px-12">
        <div className="w-full max-w-2xl">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Secure Portal Access</h2>
            <p className="mt-2 text-slate-600">Select your authorized role to continue</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {portals.map((portal, i) => {
              const Icon = portal.icon;
              return (
                <button
                  key={i}
                  onClick={portal.action}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:shadow-xl transition-all"
                >
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${portal.gradient} transition-opacity`}
                  />

                  <div className="relative z-10">
                    <Icon className="w-7 h-7 text-slate-800 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">{portal.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{portal.subtitle}</p>

                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-800">
                      Access Portal
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/*<div className="mt-10 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Queue Management Platform · Secure & Audited
          </div>*/}

          {/* Quick access for customers */}
          <div className="mt-6 text-center">
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/appointment/book')}
                className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-sm whitespace-nowrap"
              >
                Book Appointment
              </button>
              <button
                onClick={() => navigate('/appointment/my')}
                className="px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-all whitespace-nowrap"
              >
                My Appointments
              </button>
              <button
                onClick={() => navigate('/service/status')}
                className="px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 transition-all whitespace-nowrap"
              >
                Check Service Status
              </button>
              <button
                onClick={() => navigate('/kiosk/login')}
                className="px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all shadow-sm whitespace-nowrap"
              >
                Walk-in Appoinment
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">Use mobile number on “My Appointments” to view bookings, or your reference number to check service status.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
