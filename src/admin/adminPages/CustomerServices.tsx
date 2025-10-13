import { useState } from "react"
import { Search } from "lucide-react"

interface Service {
  id: string
  title: string
  description: string
  checked: boolean
}

const CustomerServices: React.FC = () => {
  const [services, setServices] = useState<Service[]>([
    {
      id: "bill-payments",
      title: "Bill Payments",
      description: "Handle customer bill payments and inquiries",
      checked: true,
    },
    {
      id: "new-connections",
      title: "New Connections",
      description: "Mobile/fixed line/broadband registration",
      checked: true,
    },
    {
      id: "plan-changes",
      title: "Plan Changes/Upgrades",
      description: "Help customers change or upgrade their plans",
      checked: true,
    },
    {
      id: "technical-support",
      title: "Technical Support & Troubleshooting",
      description: "Resolve technical issues",
      checked: false,
    },
    {
      id: "device-issues",
      title: "Device Issues/Repairs",
      description: "Handle device-related problems and repairs",
      checked: false,
    },
    {
      id: "account-management",
      title: "Account Management",
      description: "Address changes, name transfers, etc.",
      checked: false,
    },
    {
      id: "service-disconnections",
      title: "Service Disconnections/Reconnections",
      description: "Process service changes",
      checked: true,
    },
    {
      id: "complaint-resolution",
      title: "Complaint Resolution",
      description: "Handle and resolve customer complaints",
      checked: false,
    },
    {
      id: "document-submission",
      title: "Document Submission/Verification",
      description: "Process customer documents",
      checked: false,
    },
    {
      id: "international-roaming",
      title: "International Roaming Services",
      description: "Setup and manage roaming services",
      checked: false,
    },
    {
      id: "corporate-account",
      title: "Corporate Account Management",
      description: "Handle business accounts",
      checked: false,
    },
  ])

  const handleServiceToggle = (id: string): void => {
    setServices(
      services.map((service) =>
        service.id === id ? { ...service, checked: !service.checked } : service
      )
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header 
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="text-center flex-1">
          <div className="text-gray-700 font-medium">Tuesday, September</div>
          <div className="text-gray-700 font-medium">23, 2025</div>
          <div className="text-gray-500 text-sm">02:33 PM</div>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Selector 
          <div className="flex items-center gap-1 text-gray-700 cursor-pointer">
            <span>English</span>
            <ChevronDown className="w-4 h-4" />
          </div>

          {/* Notification Bell 
          <div className="relative cursor-pointer">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              3
            </span>
          </div>

          {/* User Profile 
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="text-gray-700 font-medium text-sm">Admin123</div>
              <div className="text-gray-500 text-xs">System Admin</div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </header>*/}
      

      {/* Main Content */}
      <main className="p-6">
        {/* Title and Search */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            Customer Service Types
          </h1>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Services..."
              className="pl-10 w-80 border border-gray-300 rounded-md text-gray-600 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none py-2 px-3"
            />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={service.checked}
                  onChange={() => handleServiceToggle(service.id)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Assign Services Button */}
        <div className="flex justify-end">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
            Assign Services
          </button>
        </div>
      </main>
    </div>
  )
}

export default CustomerServices