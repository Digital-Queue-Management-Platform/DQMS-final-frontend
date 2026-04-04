"use client"

import { useState, useEffect } from "react"
import { Users, Clock, Star, TrendingUp, Filter, Download, Activity, BarChart3, FileText } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import api, { WS_URL } from "../../config/api"

interface Analytics {
  totalTokens: number
  avgWaitTime: number
  avgServiceTime: number
  feedbackStats: Array<{ rating: number; _count?: number; count?: number }>
  officerPerformance: Array<{
    officer: any
    tokensHandled: number
    avgRating: number
    feedbackCount: number
  }>
  branchPerformance?: Array<{
    id: string
    name: string
    totalTokens: number
    avgWaitTime: number
    avgServiceTime: number
    avgRating: number
    feedbackCount: number
  }>
  serviceTypes?: Array<{ name: string; count: number }>
}

interface RealtimeStats {
  activeTokens: number
  completedToday: number
  activeOfficers: number
  avgRating: number
}

export default function InsightsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  const [selectedOutlet, setSelectedOutlet] = useState("")
  const [loading, setLoading] = useState(true)
  const [outlets, setOutlets] = useState<any[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  const fetchOutlets = async () => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) return

    try {
      const response = await api.get("/queue/outlets")
      setOutlets(response.data)
    } catch (err) {
      console.error("Failed to fetch outlets:", err)
    }
  }

  useEffect(() => {
    fetchOutlets()
  }, [])

  useEffect(() => {
    const checkAuthStatus = () => {
      const adminToken = localStorage.getItem('adminToken')
      const isCurrentlyAuth = !!adminToken

      if (isAuthenticated !== isCurrentlyAuth) {
        setIsAuthenticated(isCurrentlyAuth)
        if (!isCurrentlyAuth) {
          setAnalytics(null)
          setRealtimeStats(null)
        }
      }
    }

    checkAuthStatus()
    const authCheckInterval = setInterval(checkAuthStatus, 1000)
    return () => clearInterval(authCheckInterval)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    fetchAnalytics()
    fetchRealtimeStats()

    const interval = setInterval(() => {
      fetchRealtimeStats()
    }, 30000)

    const ws = new WebSocket(WS_URL)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const relevantTypes = ["NEGATIVE_FEEDBACK", "LONG_WAIT", "NEW_TOKEN", "TOKEN_COMPLETED", "OFFICER_STATUS_CHANGE", "CRITICAL_FEEDBACK_ALERT"]
        if (relevantTypes.includes(data.type)) {
          fetchRealtimeStats()
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error)
      }
    }

    ws.onopen = () => console.log('AdminDashboard WebSocket connected')
    ws.onerror = (error) => console.error('AdminDashboard WebSocket error:', error)

    return () => {
      clearInterval(interval)
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [isAuthenticated])

  const fetchAnalytics = async () => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) return

    setLoading(true)
    try {
      const endDate = new Date(dateRange.endDate)
      endDate.setHours(23, 59, 59, 999)

      const params: any = {
        startDate: new Date(dateRange.startDate).toISOString(),
        endDate: endDate.toISOString(),
      }

      if (selectedOutlet) {
        params.outletId = selectedOutlet
      }

      const response = await api.get("/admin/analytics", { params })
      setAnalytics(response.data)
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRealtimeStats = async () => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) return

    try {
      setDashboardLoading(true)
      const response = await api.get("/admin/dashboard/realtime")
      setRealtimeStats(response.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch realtime stats:", err)
    } finally {
      setDashboardLoading(false)
    }
  }

  const calculateRatingDistribution = () => {
    if (!analytics) return []

    const distribution = [0, 0, 0, 0, 0]
    analytics.feedbackStats.forEach((stat) => {
      distribution[stat.rating - 1] = stat._count !== undefined ? stat._count : (stat.count || 0)
    })

    const totalCount = analytics.feedbackStats.reduce((sum, s) => sum + (s._count !== undefined ? s._count : (s.count || 0)), 0)

    return distribution.map((count, index) => ({
      rating: index + 1,
      count: count || 0,
      percentage:
        totalCount > 0
          ? ((count || 0) / totalCount) * 100
          : 0,
    }))
  }

  const exportToCSV = () => {
    if (!analytics) return

    const dateStr = new Date().toLocaleDateString().replace(/\//g, '-')
    const reportDate = new Date().toLocaleString()
    const outName = selectedOutlet ? (outlets.find((o: any) => o.id === selectedOutlet)?.name || 'Outlet').replace(/\s+/g, '_') : 'All_Outlets'

    // Constructing a more professional CSV structure using array of rows
    const rows = [
      ["SLT-MOBITEL DIGITAL QUEUE MANAGEMENT PLATFORM"],
      ["ANALYTICS & PERFORMANCE REPORT"],
      [""],
      ["REPORT PARAMETERS"],
      ["Generated At", reportDate],
      ["Report ID", `DQMP-${Math.floor(Date.now() / 10000)}`],
      ["Scope", selectedOutlet ? (outlets.find((o: any) => o.id === selectedOutlet)?.name || 'Specified Outlet') : 'Island-wide (All Outlets)'],
      ["Period", `${dateRange.startDate} to ${dateRange.endDate}`],
      [""],
      ["I. EXECUTIVE SUMMARY"],
      ["Operational Metric", "Statistical Value"],
      ["Total Tokens Issued", analytics.totalTokens.toLocaleString()],
      ["Average Wait Time (min)", analytics.avgWaitTime],
      ["Average Service Time (min)", analytics.avgServiceTime],
      [""],
      ["II. CUSTOMER SATISFACTION ANALYSIS"],
      ["Satisfaction Level", "Token Count", "Percentage Share"],
      ...calculateRatingDistribution().reverse().map(item => [
        `${item.rating} Stars`,
        (item.count || 0),
        `${(item.percentage || 0).toFixed(1)}%`
      ]),
      [""],
      ["III. SERVICE UTILIZATION BREAKDOWN"],
      ["Service Category", "Tokens Issued"]
    ]

    // Service Type Data
    if (analytics.serviceTypes && analytics.serviceTypes.length > 0) {
      analytics.serviceTypes.forEach(st => {
        rows.push([st.name, st.count])
      })
    }
    rows.push([""])

    // Section IV: Regional (Conditional)
    if (analytics.branchPerformance && analytics.branchPerformance.length > 0 && !selectedOutlet) {
      rows.push(["IV. REGIONAL PERFORMANCE AUDIT"])
      rows.push(["Outlet Name", "Tokens", "Avg Wait", "Avg Svc", "Rating", "Reviews"])
      analytics.branchPerformance.forEach(b => {
        rows.push([b.name, b.totalTokens, b.avgWaitTime, b.avgServiceTime, b.avgRating, b.feedbackCount])
      })
      rows.push([""])
    }

    // Section V: Officer Insights
    rows.push(["V. OFFICER EFFICIENCY INSIGHTS"])
    rows.push(["Officer Name", "Outlet", "Tokens", "Rating", "Feedbacks"])
    analytics.officerPerformance.forEach(perf => {
      rows.push([
        perf.officer?.name || 'Unknown',
        perf.officer?.outlet?.name || 'N/A',
        perf.tokensHandled,
        perf.avgRating.toFixed(1),
        perf.feedbackCount
      ])
    })

    if (realtimeStats) {
      rows.push([""])
      rows.push(["LATEST REAL-TIME OVERVIEW"])
      rows.push(["Active Tokens", realtimeStats.activeTokens])
      rows.push(["Completed Today", realtimeStats.completedToday])
      rows.push(["Active Officers", realtimeStats.activeOfficers])
      rows.push(["Avg Rating Today", realtimeStats.avgRating.toFixed(1)])
    }

    // Convert rows to CSV string with proper escaping
    const csvString = rows
      .map(row => row.map(value => {
        const str = String(value ?? '').replace(/"/g, '""')
        return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
      }).join(","))
      .join("\n")

    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    const fileName = `DQMP_Analytics_${outName}_${dateStr}.csv`
    link.setAttribute("download", fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    if (!analytics) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const SLT_BLUE = [0, 92, 185]
    const SLT_ORANGE = [255, 102, 0]
    const SLT_DARK = [22, 38, 70]

    const addHeader = (isFirstPage: boolean = false) => {
      // Background Banner (Executive Dark Navy)
      doc.setFillColor(SLT_DARK[0], SLT_DARK[1], SLT_DARK[2])
      doc.rect(0, 0, pageWidth, 32, 'F')

      // Vertical branding divider (Orange Accent)
      doc.setFillColor(SLT_ORANGE[0], SLT_ORANGE[1], SLT_ORANGE[2])
      doc.rect(20, 8, 1, 16, 'F')

      // Main Logo Branding
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
        doc.text("ANALYTICS & PERFORMANCE", pageWidth - 20, 16, { align: "right" })
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.text("Insights Intelligence Series", pageWidth - 20, 23, { align: "right" })
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
      const reportId = `DQMP-${Math.floor(Date.now() / 10000)}`

      // LEFT: ID & Generation Date
      doc.text(`${reportId} | Generated on: ${dateStr}`, 20, pageHeight - 10)

      // CENTER: Management Notice (Bold)
      doc.setFont("helvetica", "bold")
      doc.text("SLT-MOBITEL DQMP Management Report", pageWidth / 2, pageHeight - 10, { align: "center" })

      // RIGHT: Page Registry
      doc.setFont("helvetica", "normal")
      doc.text(`Page ${page} of ${total}`, pageWidth - 20, pageHeight - 10, { align: "right" })
    }

    addHeader(true)

    doc.setTextColor(51, 65, 85)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("REPORT PARAMETERS", 20, 50)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, 20, 56)
    doc.text(`Scope: ${selectedOutlet ? outlets.find((o: any) => o.id === selectedOutlet)?.name || selectedOutlet : 'Island-wide (All Outlets)'}`, 20, 61)

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(SLT_BLUE[0], SLT_BLUE[1], SLT_BLUE[2])
    doc.text("I. Executive Summary", 20, 75)

    const summaryData = [
      ["Operational Metric", "Statistical Value"],
      ["Total Tokens Issued", analytics.totalTokens.toLocaleString()],
      ["Average Wait Time", `${analytics.avgWaitTime} minutes`],
      ["Average Service Time", `${analytics.avgServiceTime} minutes`]
    ]

    // Section 1: Executive Summary
    autoTable(doc, {
      startY: 82,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: SLT_DARK as [number, number, number], textColor: [256, 255, 255], fontStyle: 'bold', halign: 'left' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { halign: 'right', fontStyle: 'bold', textColor: SLT_BLUE as [number, number, number] }
      },
      margin: { left: 20, right: 20 }
    })

    let currentY = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("II. Customer Satisfaction Analysis", 20, currentY)

    const satisfactionData = calculateRatingDistribution().reverse().map(item => [
      `${item.rating} Stars`,
      (item.count || 0).toLocaleString(),
      `${(item.percentage || 0).toFixed(1)}%`
    ])

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Satisfaction Level', 'Token Count', 'Percentage Share']],
      body: satisfactionData,
      theme: 'striped',
      headStyles: { fillColor: SLT_BLUE as [number, number, number], textColor: [255, 255, 255], halign: 'center' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 20, right: 20 }
    })

    currentY = (doc as any).lastAutoTable.finalY + 15
    if (analytics.serviceTypes && analytics.serviceTypes.length > 0) {
      if (currentY > pageHeight - 50) { doc.addPage(); addHeader(); currentY = 45; }
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(SLT_BLUE[0], SLT_BLUE[1], SLT_BLUE[2])
      doc.text("III. Service Utilization Breakdown", 20, currentY)
      const stData = analytics.serviceTypes.map(st => [st.name, st.count.toLocaleString()])
      autoTable(doc, {
        startY: currentY + 6,
        head: [['Service Category', 'Tokens Issued']],
        body: stData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], halign: 'left' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'center', fontStyle: 'bold', cellWidth: 40 }
        },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    if (analytics.branchPerformance && analytics.branchPerformance.length > 0 && !selectedOutlet) {
      if (currentY > pageHeight - 50) { doc.addPage(); addHeader(); currentY = 45; }
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(SLT_BLUE[0], SLT_BLUE[1], SLT_BLUE[2])
      doc.text("IV. Regional Performance Audit", 20, currentY)
      const branchData = analytics.branchPerformance.map(b => [b.name, b.totalTokens.toLocaleString(), `${b.avgWaitTime}m`, `${b.avgServiceTime}m`, b.avgRating.toFixed(1), b.feedbackCount.toLocaleString()])
      autoTable(doc, {
        startY: currentY + 6,
        head: [['Outlet Name', 'Tokens', 'Avg Wait', 'Avg Svc', 'Rating', 'Feedbacks']],
        body: branchData,
        theme: 'grid',
        headStyles: { fillColor: SLT_DARK as [number, number, number], textColor: [255, 255, 255], halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 'auto' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold' },
          5: { halign: 'center' }
        },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    if (currentY > pageHeight - 50) { doc.addPage(); addHeader(); currentY = 45; }
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(SLT_BLUE[0], SLT_BLUE[1], SLT_BLUE[2])
    doc.text("V. Officer Efficiency Insights", 20, currentY)
    const officerData = analytics.officerPerformance.map(perf => [perf.officer?.name || 'Unknown', perf.officer?.outlet?.name || 'N/A', perf.tokensHandled.toLocaleString(), perf.avgRating.toFixed(1), perf.feedbackCount.toLocaleString()])
    autoTable(doc, {
      startY: currentY + 6,
      head: [['Officer Name', 'Outlet', 'Tokens', 'Rating', 'Feedbacks']],
      body: officerData,
      theme: 'grid',
      headStyles: { fillColor: SLT_BLUE as [number, number, number], textColor: [255, 255, 255], halign: 'center' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'center', fontStyle: 'bold' },
        3: { halign: 'center' },
        4: { halign: 'center' }
      },
      margin: { left: 20, right: 20 }
    })

    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) { addFooter(i, totalPages) }
    const fileDate = new Date().toISOString().split('T')[0]
    doc.save(`DQMP_Report_${selectedOutlet ? 'Outlet' : 'IslandWide'}_${fileDate}.pdf`)
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px]" />
      </div>

      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 shadow-sm shadow-slate-200/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Analytics & Reports</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <p className="text-[10px] sm:text-sm text-gray-600">Super Admin • DQMS Management</p>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  {dashboardLoading && <span className="flex items-center gap-1">Refreshing...</span>}
                  <span>Last sync: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Status indicators removed for cleaner analytics view */}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {realtimeStats && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              Real-time Overview
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Active Tokens</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{realtimeStats.activeTokens}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Completed Today</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{realtimeStats.completedToday}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Active Officers</p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-600">{realtimeStats.activeOfficers}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Avg Rating Today</p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">{realtimeStats.avgRating.toFixed(1)}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Report Configuration</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Scope</label>
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              >
                <option value="">Island-wide (All Outlets)</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchAnalytics}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Update
              </button>
              <button
                onClick={exportToPDF}
                disabled={!analytics || loading}
                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Download PDF Report"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button
                onClick={exportToCSV}
                disabled={!analytics || loading}
                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Download CSV Data"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-slate-500 text-sm font-medium">Analyzing data patterns...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tokens</h3>
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.totalTokens}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500 uppercase font-bold">
                  <TrendingUp className="w-3 h-3" />
                  In Selected Period
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Wait Time</h3>
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.avgWaitTime}</p>
                <div className="mt-2 text-[10px] text-slate-500 uppercase font-bold">Minutes per Customer</div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Service Time</h3>
                  <Clock className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.avgServiceTime}</p>
                <div className="mt-2 text-[10px] text-slate-500 uppercase font-bold">Minutes per Service</div>
              </div>
            </div>

            {analytics.serviceTypes && analytics.serviceTypes.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Service Type Distribution
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Service Type</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Total Tokens Issued</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 px-6">
                      {analytics.serviceTypes.map((st) => (
                        <tr key={st.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{st.name}</td>
                          <td className="px-6 py-4 text-sm text-right text-slate-900 font-bold">{st.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {analytics.branchPerformance && analytics.branchPerformance.length > 0 && !selectedOutlet && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    Branch Performance Summary
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr className="bg-white/50">
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch</th>
                        <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tokens</th>
                        <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Wait Time</th>
                        <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {analytics.branchPerformance.map((branch) => (
                        <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{branch.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600 font-medium">{branch.totalTokens}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600">{branch.avgWaitTime}m</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600">{branch.avgServiceTime}m</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-sm font-bold text-slate-900">{branch.avgRating.toFixed(1)}</span>
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900">Officer Productivity Metrics</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-white">
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Officer</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Outlet</th>
                      <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tokens</th>
                      <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rating</th>
                      <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {analytics.officerPerformance.map((perf, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-bold text-indigo-600">{perf.officer?.name?.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{perf.officer?.name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 hidden sm:table-cell">{perf.officer?.outlet?.name || "N/A"}</td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-slate-900">{perf.tokensHandled}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold text-slate-900">{perf.avgRating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-slate-500 hidden md:table-cell">{perf.feedbackCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No data available for the selected criteria</p>
          </div>
        )}
      </main>
    </div>
  )
}
