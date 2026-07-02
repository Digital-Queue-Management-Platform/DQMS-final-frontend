"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Star, 
  ChevronDown,
  Activity,
  MapPin,
  Bell,
  Eye,
  Download,
  FileText
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../config/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface TeleshopOutlet {
  id: string
  name: string
  address: string
  teleshopManagerName: string
}

interface HourlyData {
  hour: string
  waitTime: number
  serviceTime: number
  issued: number
  completed: number
  dropOffs: number
  activeCounters: number
}

interface PerformanceMetrics {
  totalCustomers: number
  avgWaitTime: number
  avgServiceTime: number
  customerSatisfaction: number
  totalIssued: number
  totalCompleted: number
  totalDropOffs: number
  completionRate: number
  changePercents: {
    customers: number
    waitTime: number
    serviceTime: number
    satisfaction: number
  }
  hourlyData: HourlyData[]
  ratingDistribution: { rating: number; count: number }[]
  officers: { id: string; name: string; teleshopName?: string; tokensServed: number; avgServiceTime: number; rating: number }[]
  alerts: { id: string; message: string; severity: string; time: string }[]
}

interface Manager {
  id: string
  name: string
  email: string
  regionId: string
  regionName: string
  outlets: any[]
}

export default function RTOMTeleshopAnalytics() {
  const [manager, setManager] = useState<Manager | null>(null)
  const [outlets, setOutlets] = useState<TeleshopOutlet[]>([])
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [quickFilter, setQuickFilter] = useState('Today')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const navigate = useNavigate()

  const handleQuickFilterChange = (value: string) => {
    setQuickFilter(value)
    if (value === 'Custom') return
    
    const end = new Date()
    const start = new Date()
    
    switch (value.toLowerCase()) {
      case 'today':
        break
      case 'weekly':
        start.setDate(start.getDate() - 7)
        break
      case 'monthly':
        start.setMonth(start.getMonth() - 1)
        break
      case 'annual':
        start.setFullYear(start.getFullYear() - 1)
        break
    }
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  useEffect(() => {
    const storedManager = localStorage.getItem('manager')
    if (storedManager) {
      const managerData = JSON.parse(storedManager)
      // Ensure regionId is available
      if (!managerData.regionId && managerData.region) {
        managerData.regionId = managerData.region.id || managerData.region
      }
      setManager(managerData)
    }
    fetchOutlets()
  }, [])

  useEffect(() => {
    if (outlets.length > 0) {
      fetchAnalytics()
    }
  }, [selectedOutlets, outlets, startDate, endDate])

  const fetchOutlets = async () => {
    try {
      const response = await api.get('/manager/outlets')
      const outletsData = response.data.map((outlet: any) => ({
        id: outlet.id,
        name: outlet.name,
        address: outlet.address,
        teleshopManagerName: outlet.teleshopManager?.name || 'No Manager Assigned'
      }))
      setOutlets(outletsData)
      if (outletsData.length > 0) {
        setSelectedOutlets(outletsData.map((o: any) => o.id))
      }
    } catch (error) {
      console.error('Failed to fetch outlets:', error)
      setOutlets([])
    }
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const response = await api.get(`/manager/outlets/analytics`, {
        params: { 
          outletIds: selectedOutlets.length > 0 ? selectedOutlets.join(',') : outlets.map(o => o.id).join(','),
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      })
      
      const data = response.data
      setMetrics(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = async () => {
    if (!metrics || !selectedOutletData) return
    setExportingPdf(true)
    
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const SLT_BLUE = [0, 92, 185] as [number, number, number]
      const SLT_ORANGE = [255, 102, 0] as [number, number, number]
      const SLT_DARK = [22, 38, 70] as [number, number, number]

      const addHeader = (isFirstPage: boolean = false) => {
        doc.setFillColor(SLT_DARK[0], SLT_DARK[1], SLT_DARK[2])
        doc.rect(0, 0, pageWidth, 32, 'F')
        doc.setFillColor(SLT_ORANGE[0], SLT_ORANGE[1], SLT_ORANGE[2])
        doc.rect(20, 8, 1, 16, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(16)
        doc.text("SLT MOBITEL", 25, 16)
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.text("DIGITAL QUEUE MANAGEMENT PLATFORM", 25, 23)
        if (isFirstPage) {
          doc.setFontSize(12)
          doc.setFont("helvetica", "bold")
          doc.setTextColor(255, 255, 255)
          doc.text("TELESHOP ANALYTICS", pageWidth - 20, 16, { align: "right" })
          doc.setFontSize(8)
          doc.setFont("helvetica", "normal")
          doc.text("RTOM Report", pageWidth - 20, 23, { align: "right" })
        }
      }

      const addFooter = (page: number, total: number) => {
        doc.setPage(page)
        doc.setDrawColor(203, 213, 225)
        doc.setLineWidth(0.1)
        doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15)
        doc.setFontSize(6.5)
        doc.setTextColor(100, 116, 139)
        const dateStr = new Date().toLocaleString()
        doc.text(`Generated: ${dateStr}`, 20, pageHeight - 10)
        doc.setFont("helvetica", "bold")
        doc.text("Teleshop Analytics Report", pageWidth / 2, pageHeight - 10, { align: "center" })
        doc.setFont("helvetica", "normal")
        doc.text(`Page ${page} of ${total}`, pageWidth - 20, pageHeight - 10, { align: "right" })
      }

      const sectionTitle = (text: string, y: number) => {
        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(SLT_BLUE[0], SLT_BLUE[1], SLT_BLUE[2])
        doc.text(text, 20, y)
      }

      // Start rendering
      addHeader(true)
      let currentY = 45

      // Outlet Details
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(SLT_DARK[0], SLT_DARK[1], SLT_DARK[2])
      doc.text(selectedOutletData.name, 20, currentY)
      currentY += 6

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 116, 139)

      const includedOutlets = selectedOutlets.length > 0 
        ? outlets.filter(o => selectedOutlets.includes(o.id))
        : outlets
        
      if (selectedOutlets.length !== 1) {
        const namesStr = includedOutlets.map(o => o.name).join(", ")
        const splitNames = doc.splitTextToSize(`Included: ${namesStr}`, pageWidth - 40)
        doc.text(splitNames, 20, currentY)
        currentY += (splitNames.length * 4) + 1
      } else {
        doc.text(`Address: ${selectedOutletData.address}`, 20, currentY)
        currentY += 5
        doc.text(`Manager: ${selectedOutletData.teleshopManagerName}`, 20, currentY)
        currentY += 5
      }

      doc.text(`Period: ${startDate} to ${endDate}`, 20, currentY)
      
      currentY += 15
      
      // Summary Metrics
      sectionTitle("Performance Overview", currentY)
      currentY += 8
      
      const drawBox = (x: number, y: number, w: number, h: number, title: string, value: string) => {
        doc.setFillColor(248, 250, 252)
        doc.roundedRect(x, y, w, h, 2, 2, 'F')
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(x, y, w, h, 2, 2, 'S')
        
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text(title, x + 5, y + 8)
        
        doc.setFontSize(16)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(15, 23, 42)
        doc.text(value, x + 5, y + 18)
      }

      drawBox(20, currentY, 40, 25, "Total Tokens", String(metrics.totalCustomers))
      drawBox(65, currentY, 40, 25, "Avg Wait", `${metrics.avgWaitTime}m`)
      drawBox(110, currentY, 40, 25, "Avg Service", `${metrics.avgServiceTime}m`)
      drawBox(155, currentY, 35, 25, "Satisfaction", `${metrics.customerSatisfaction}/5`)
      
      currentY += 35
      
      // Officer Performance Table
      if (metrics.officers && metrics.officers.length > 0) {
        sectionTitle("Officer Performance", currentY)
        currentY += 5
        
        autoTable(doc, {
          startY: currentY,
          head: [['Officer Name', 'Teleshop', 'Tokens Served', 'Avg Service Time (m)', 'Rating']],
          body: metrics.officers.map(o => [
            o.name,
            o.teleshopName || '-',
            String(o.tokensServed),
            String(o.avgServiceTime),
            String(o.rating)
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: SLT_DARK, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 20, right: 20 }
        })
        
        currentY = (doc as any).lastAutoTable.finalY + 15
      }

      // Add footer to all pages
      const totalPages = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        addFooter(i, totalPages)
      }

      const outLabel = selectedOutlets.length > 0 ? (selectedOutlets.length === 1 ? selectedOutletData.name.replace(/\s+/g, '-') : 'Multiple-Outlets') : 'All-Outlets'
      doc.save(`teleshop-analytics-${outLabel}-${new Date().getTime()}.pdf`)
    } catch (err) {
      console.error("Failed to export PDF", err)
      alert("Failed to export PDF")
    } finally {
      setExportingPdf(false)
    }
  }

  const exportToCSV = async () => {
    if (!metrics || !selectedOutletData) return
    setExportingCsv(true)
    
    try {
      const q = (v: string | number | null | undefined): string => {
        if (v === null || v === undefined || v === "") return ""
        return `"${String(v).replace(/"/g, '""')}"`
      }

      let csv = "\uFEFF"
      csv += "TELESHOP ANALYTICS REPORT\n"
      csv += `Outlet,${q(selectedOutletData.name)}\n`
      
      const includedOutlets = selectedOutlets.length > 0 
        ? outlets.filter(o => selectedOutlets.includes(o.id))
        : outlets
        
      if (selectedOutlets.length !== 1) {
        csv += `Included Outlets,${q(includedOutlets.map(o => o.name).join("; "))}\n`
      } else {
        csv += `Manager,${q(selectedOutletData.teleshopManagerName)}\n`
      }
      
      csv += `Period,${q(startDate)} to ${q(endDate)}\n\n`
      
      csv += "SUMMARY\n"
      csv += `Total Customers,${metrics.totalCustomers}\n`
      csv += `Avg Wait Time (m),${metrics.avgWaitTime}\n`
      csv += `Avg Service Time (m),${metrics.avgServiceTime}\n`
      csv += `Completion Rate (%),${metrics.completionRate}\n`
      csv += `Customer Satisfaction (/5),${metrics.customerSatisfaction}\n\n`
      
      if (metrics.officers && metrics.officers.length > 0) {
        csv += "OFFICER DETAILS\n"
        csv += "Officer Name,Teleshop,Tokens Served,Avg Service Time (m),Rating\n"
        metrics.officers.forEach(o => {
          csv += `${q(o.name)},${q(o.teleshopName || '-')},${o.tokensServed},${o.avgServiceTime},${o.rating}\n`
        })
      }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      const outLabel = selectedOutlets.length > 0 ? (selectedOutlets.length === 1 ? selectedOutletData.name.replace(/\s+/g, '-') : 'Multiple-Outlets') : 'All-Outlets'
      link.setAttribute("download", `teleshop-analytics-${outLabel}-${new Date().getTime()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error("Failed to export CSV", err)
      alert("Failed to export CSV")
    } finally {
      setExportingCsv(false)
    }
  }

  const selectedOutletData = selectedOutlets.length === 1 
    ? outlets.find(o => o.id === selectedOutlets[0]) 
    : { name: selectedOutlets.length === 0 ? "All Assigned Outlets" : `${selectedOutlets.length} Outlets Selected`, address: "Multiple Locations", teleshopManagerName: "Multiple Managers" }

  if (!manager) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-2 gap-3 lg:gap-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/manager/dashboard')}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </motion.button>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Teleshop Analytics</h1>
                <p className="text-sm text-gray-600">View live analytics for individual outlets within your assigned regions.</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Outlet Selector */}
            <div className="relative min-w-[250px]">
              <div
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white cursor-pointer min-h-[42px] flex items-center justify-between"
                onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
              >
                <span className="truncate pr-2">
                  {selectedOutlets.length === 0 ? "All Assigned Outlets" : `${selectedOutlets.length} Outlet${selectedOutlets.length > 1 ? 's' : ''} Selected`}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>
              
              {isScopeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto z-50">
                  <div
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 text-sm font-medium text-slate-700"
                    onClick={() => {
                      setSelectedOutlets([])
                      setIsScopeDropdownOpen(false)
                    }}
                  >
                    All Assigned Outlets
                  </div>
                  {outlets.map(outlet => (
                    <label key={outlet.id} className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedOutlets.includes(outlet.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOutlets([...selectedOutlets, outlet.id])
                          } else {
                            setSelectedOutlets(selectedOutlets.filter(id => id !== outlet.id))
                          }
                        }}
                        className="mr-3 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <span className="truncate">{outlet.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Time Period Selector */}
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative">
                <select
                  value={quickFilter}
                  onChange={(e) => handleQuickFilterChange(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="Today">Today</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Annual">Annual</option>
                  <option value="Custom">Custom Range</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-center bg-white border border-gray-300 rounded-lg px-2 py-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setQuickFilter('Custom'); }}
                  className="appearance-none bg-transparent outline-none border-none text-sm text-gray-700"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setQuickFilter('Custom'); }}
                  className="appearance-none bg-transparent outline-none border-none text-sm text-gray-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Outlet Info */}
      {selectedOutletData && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{selectedOutletData.name}</h2>
              <p className="text-gray-600 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {selectedOutletData.address}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Manager: {selectedOutletData.teleshopManagerName}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-sm text-gray-500">
                {startDate} to {endDate}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToPDF}
                  disabled={exportingPdf || loading || !metrics}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium disabled:bg-blue-400"
                >
                  {exportingPdf ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exportingPdf ? 'Exporting...' : 'Export PDF'}
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={exportingCsv || loading || !metrics}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium disabled:bg-emerald-400"
                >
                  {exportingCsv ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {exportingCsv ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : metrics ? (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Total Customers Served</p>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">{metrics?.totalCustomers || 0}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-500">+{metrics?.changePercents?.customers || 0}%</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Average Waiting Time</p>
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">{metrics?.avgWaitTime || 0} min</p>
              <div className="flex items-center mt-2">
                <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-500">{metrics?.changePercents?.waitTime || 0}%</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Average Service Time</p>
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">{metrics?.avgServiceTime || 0} min</p>
              <div className="flex items-center mt-2">
                <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-500">{metrics?.changePercents?.serviceTime || 0}%</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">{metrics?.customerSatisfaction || 0}/5</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-500">+{metrics?.changePercents?.satisfaction || 0}</span>
              </div>
            </motion.div>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Waiting Times Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Waiting Times Throughout the Day</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics?.hourlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="waitTime" stroke="#f59e0b" strokeWidth={2} name="Wait Time (min)" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Token Drop-off Trend */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Drop-off Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics?.hourlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="issued" stroke="#10b981" strokeWidth={2} name="Issued" />
                  <Line type="monotone" dataKey="completed" stroke="#3b82f6" strokeWidth={2} name="Completed" />
                  <Line type="monotone" dataKey="dropOffs" stroke="#ef4444" strokeWidth={2} name="Drop-offs" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600">
                <p>Total no-shows: {metrics?.totalDropOffs || 0} customers ({(((metrics?.totalDropOffs || 0) / (metrics?.totalIssued || 1)) * 100).toFixed(1)}% of issued tokens)</p>
                <p>Completion rate: {(metrics?.completionRate || 0).toFixed(1)}%</p>
              </div>
            </motion.div>

            {/* Staff Utilization */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Utilization Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics?.hourlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="activeCounters" fill="#8b5cf6" name="Active Counters" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600">
                <p>This chart shows the number of active service counters throughout the day.</p>
                <p className="mt-1">Use this data to optimize staff allocation during peak hours.</p>
              </div>
            </motion.div>

            {/* Customer Rating Distribution */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Rating Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics?.ratingDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#fbbf24" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Additional Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Agent Performance */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Agent Performance</h3>
                <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {metrics?.officers?.length > 0 ? metrics.officers.map((officer) => (
                  <div key={officer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {officer.name?.charAt(0) || 'O'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{officer.name}</p>
                        {officer.teleshopName && (
                          <p className="text-xs text-emerald-600 mb-0.5 font-medium">{officer.teleshopName}</p>
                        )}
                        <p className="text-sm text-gray-600">{officer.tokensServed} tokens served</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">{officer.rating}</span>
                      </div>
                      <p className="text-xs text-gray-500">{officer.avgServiceTime}min avg</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No officer data available</p>
                )}
              </div>
            </motion.div>

            {/* Branch Alerts */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-500" />
                Branch Alerts
              </h3>
              <p className="text-sm text-gray-600 mb-4">Notifications</p>
              <div className="space-y-3">
                {metrics?.alerts?.length > 0 ? metrics.alerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'high' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.severity === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {alert.severity?.toUpperCase() || 'INFO'}
                    </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No alerts at this time</p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="text-center py-12">
            <p className="text-gray-500">No analytics data available</p>
          </div>
        </div>
      )}
    </div>
  )
}