"use client"

import { useState, useEffect } from "react"
import { Users, Clock, Star, TrendingUp, Filter, Download, Activity, BarChart3, FileText } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import api, { WS_URL } from "../../config/api"

interface Analytics {
  totalTokens: number
  totalCompleted: number
  avgWaitTime: number
  avgServiceTime: number
  feedbackStats: Array<{ rating: number; _count?: number; count?: number }>
  officerPerformance: Array<{
    officer: {
      name?: string
      status?: string
      outlet?: { name?: string }
    }
    tokensHandled: number
    avgRating: number
    feedbackCount: number
  }>
  branchPerformance?: Array<{
    id: string
    name: string
    location?: string
    isActive?: boolean
    totalTokens: number
    avgWaitTime: number
    avgServiceTime: number
    avgRating: number
    feedbackCount: number
  }>
  serviceTypes?: Array<{ name: string; count: number }>
  hourlyStats?: Array<{
    hour: string
    waitTime: number
    serviceTime: number
    rating: number
    feedbackCount: number
    issued: number
    completed: number
    activeCounters: number
  }>
  tokenFlow?: Array<{ time: string; issued: number; completed: number }>
  staffUtilizationTrend?: Array<{ time: string; activeCounters: number; customerDemand: number }>
  hourlyWaitingTimes?: Array<{ hour: string; value: number }>
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
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [outlets, setOutlets] = useState<any[]>([])
  const [allOutlets, setAllOutlets] = useState<any[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [exportSections, setExportSections] = useState({
    executiveSummary: true,
    customerSatisfaction: true,
    serviceUtilization: true,
    branchPerformance: true,
    officerPerformance: true,
    hourlyPerformance: true,
    tokenFlow: true,
    staffUtilization: true,
    outletRegistry: true,
  })

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

  const fetchAllOutlets = async (start?: string, end?: string) => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) return []
    try {
      const params: any = {}
      if (start && end) {
        params.startDate = start
        params.endDate = end
      }
      const response = await api.get("/admin/outlets/all", { params })
      setAllOutlets(response.data)
      return response.data as any[]
    } catch (err) {
      console.error("Failed to fetch all outlets:", err)
      return []
    }
  }

  useEffect(() => {
    fetchOutlets()
    fetchAllOutlets()
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

      if (selectedOutlets.length > 0) {
        params.outletIds = selectedOutlets.join(",")
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

  const exportToCSV = async () => {
    if (!analytics) return
    // Re-fetch outlet status scoped to the selected date range so Active/Inactive is accurate
    const freshOutlets = await fetchAllOutlets(dateRange.startDate, dateRange.endDate)

    const reportDate = new Date().toLocaleString()
    const dateStr = new Date().toLocaleDateString().replace(/\//g, '-')
    const outName = selectedOutlets.length > 0
      ? (selectedOutlets.length === 1 ? (outlets.find((o: any) => o.id === selectedOutlets[0])?.name || 'Outlet') : `${selectedOutlets.length}_Outlets`).replace(/\s+/g, '_')
      : 'All_Outlets'
    const scopeLabel = selectedOutlets.length > 0
      ? (selectedOutlets.length === 1 ? (outlets.find((o: any) => o.id === selectedOutlets[0])?.name || 'Specified Outlet') : `${selectedOutlets.length} Selected Outlets`)
      : 'Island-wide (All Outlets)'
    const reportId = `DQMP-${Math.floor(Date.now() / 10000)}`
    const totalFeedbacks = analytics.feedbackStats.reduce((s, f) => s + (f._count ?? f.count ?? 0), 0)
    const completionRate = analytics.totalTokens > 0
      ? ((analytics.totalCompleted / analytics.totalTokens) * 100).toFixed(1)
      : '0.0'

    const rows: any[][] = [
      ["SLT-MOBITEL DIGITAL QUEUE MANAGEMENT PLATFORM"],
      ["ANALYTICS & PERFORMANCE REPORT"],
      [""],
      ["REPORT PARAMETERS"],
      ["Generated At", reportDate],
      ["Report ID", reportId],
      ["Scope", scopeLabel],
      ["Period", `${dateRange.startDate} to ${dateRange.endDate}`],
      [""],
    ]

    const activeSections: string[] = []
    if (exportSections.executiveSummary) activeSections.push("EXECUTIVE SUMMARY")
    if (exportSections.customerSatisfaction) activeSections.push("CUSTOMER SATISFACTION ANALYSIS")
    if (exportSections.serviceUtilization) activeSections.push("SERVICE UTILIZATION BREAKDOWN")
    if (exportSections.branchPerformance && analytics.branchPerformance && analytics.branchPerformance.length > 0 && selectedOutlets.length !== 1) {
      activeSections.push("REGIONAL BRANCH PERFORMANCE AUDIT")
    }
    if (exportSections.officerPerformance && analytics.officerPerformance && analytics.officerPerformance.length > 0) {
      activeSections.push("OFFICER PERFORMANCE AUDIT")
    }
    if (exportSections.hourlyPerformance && analytics.hourlyStats && analytics.hourlyStats.length > 0) {
      activeSections.push("HOURLY PERFORMANCE BREAKDOWN (08:00 - 18:00)")
    }
    if (exportSections.tokenFlow && analytics.tokenFlow && analytics.tokenFlow.length > 0) {
      activeSections.push("TOKEN FLOW ANALYSIS")
    }
    if (exportSections.staffUtilization && analytics.staffUtilizationTrend && analytics.staffUtilizationTrend.length > 0) {
      activeSections.push("STAFF UTILIZATION TREND")
    }
    if (exportSections.outletRegistry && (freshOutlets.length > 0 || allOutlets.length > 0)) {
      activeSections.push("OUTLET REGISTRY (ALL BRANCHES)")
    }

    const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"]
    const getSectionHeader = (title: string) => {
      const idx = activeSections.indexOf(title)
      return idx !== -1 ? `${romanNumerals[idx]}. ${title}` : title
    }

    // Section I - Executive Summary
    if (exportSections.executiveSummary) {
      rows.push([getSectionHeader("EXECUTIVE SUMMARY")])
      rows.push(["Operational Metric", "Statistical Value"])
      rows.push(["Total Tokens Issued", analytics.totalTokens.toLocaleString()])
      rows.push(["Total Tokens Completed", (analytics.totalCompleted ?? 0).toLocaleString()])
      rows.push(["Completion Rate", `${completionRate}%`])
      rows.push(["Average Wait Time (min)", analytics.avgWaitTime])
      rows.push(["Average Service Time (min)", analytics.avgServiceTime])
      rows.push([""])
    }

    // Section II - Customer Satisfaction
    if (exportSections.customerSatisfaction) {
      rows.push([getSectionHeader("CUSTOMER SATISFACTION ANALYSIS")])
      rows.push(["Satisfaction Level", "Token Count", "Percentage Share"])
      calculateRatingDistribution().slice().reverse().forEach(item => {
        rows.push([
          `${item.rating} Stars`,
          (item.count || 0),
          `${(item.percentage || 0).toFixed(1)}%`
        ])
      })
      rows.push(["Total Feedback Responses", totalFeedbacks])
      rows.push([""])
    }

    // Section III - Service Utilization Breakdown
    if (exportSections.serviceUtilization) {
      rows.push([getSectionHeader("SERVICE UTILIZATION BREAKDOWN")])
      rows.push(["Service Category", "Tokens Issued"])
      if (analytics.serviceTypes && analytics.serviceTypes.length > 0) {
        const sortedServiceTypes = [...analytics.serviceTypes].sort((a, b) => b.count - a.count)
        sortedServiceTypes.forEach(st => rows.push([st.name, st.count]))
      } else {
        rows.push(["No service data available", ""])
      }
      rows.push([""])
    }

    // Section IV - Branch Performance
    if (exportSections.branchPerformance && analytics.branchPerformance && analytics.branchPerformance.length > 0 && selectedOutlets.length !== 1) {
      rows.push([getSectionHeader("REGIONAL BRANCH PERFORMANCE AUDIT")])
      rows.push(["Outlet Name", "Location", "Tokens Issued", "Avg Wait (m)", "Avg Service (m)", "Avg Rating", "Total Feedbacks"])
      
      const sortedBranchPerf = [...analytics.branchPerformance].sort((a, b) => b.totalTokens - a.totalTokens)
      
      sortedBranchPerf.forEach(b => {
        rows.push([
          b.name,
          b.location || 'N/A',
          b.totalTokens,
          b.avgWaitTime,
          b.avgServiceTime,
          b.avgRating.toFixed(2),
          b.feedbackCount
        ])
      })
      rows.push([""])
    }

    // Officer Performance Audit
    if (exportSections.officerPerformance && analytics.officerPerformance && analytics.officerPerformance.length > 0) {
      rows.push([getSectionHeader("OFFICER PERFORMANCE AUDIT")])
      rows.push(["Officer Name", "Outlet", "Tokens Handled", "Avg Rating", "Total Feedbacks"])
      
      const sortedOfficers = [...analytics.officerPerformance].sort((a, b) => {
        const outletA = a.officer?.outlet?.name || '';
        const outletB = b.officer?.outlet?.name || '';
        if (outletA !== outletB) {
          return outletA.localeCompare(outletB);
        }
        return b.tokensHandled - a.tokensHandled;
      });

      sortedOfficers.forEach(perf => {
        rows.push([
          perf.officer?.name || 'Unknown',
          perf.officer?.outlet?.name || 'N/A',
          perf.tokensHandled,
          perf.avgRating.toFixed(2),
          perf.feedbackCount
        ])
      });
      rows.push([""])
    }

    // Section V - Hourly Performance
    if (exportSections.hourlyPerformance && analytics.hourlyStats && analytics.hourlyStats.length > 0) {
      rows.push([getSectionHeader("HOURLY PERFORMANCE BREAKDOWN (08:00 - 18:00)")])
      rows.push(["Hour", "Tokens Issued", "Tokens Completed", "Avg Wait (min)", "Avg Service (min)", "Avg Rating", "Feedbacks", "Active Counters"])
      analytics.hourlyStats.forEach(h => {
        rows.push([
          h.hour,
          h.issued,
          h.completed,
          h.waitTime,
          h.serviceTime,
          h.rating > 0 ? h.rating.toFixed(2) : 'N/A',
          h.feedbackCount,
          h.activeCounters
        ])
      })
      rows.push([""])
    }

    // Section VI - Token Flow
    if (exportSections.tokenFlow && analytics.tokenFlow && analytics.tokenFlow.length > 0) {
      rows.push([getSectionHeader("TOKEN FLOW ANALYSIS")])
      rows.push(["Hour", "Tokens Issued", "Tokens Completed", "Net Flow (Issued - Completed)"])
      analytics.tokenFlow.forEach(tf => {
        rows.push([tf.time, tf.issued, tf.completed, tf.issued - tf.completed])
      })
      rows.push([""])
    }

    // Section VII - Staff Utilization
    if (exportSections.staffUtilization && analytics.staffUtilizationTrend && analytics.staffUtilizationTrend.length > 0) {
      rows.push([getSectionHeader("STAFF UTILIZATION TREND")])
      rows.push(["Hour", "Active Counters", "Customer Demand (Tokens Issued)"])
      analytics.staffUtilizationTrend.forEach(s => {
        rows.push([s.time, s.activeCounters, s.customerDemand])
      })
      rows.push([""])
    }

    // Section VIII - Outlet Registry
    if (exportSections.outletRegistry) {
      const sourceOutlets = freshOutlets.length > 0 ? freshOutlets : allOutlets
      if (sourceOutlets.length > 0) {
        const filteredOutlets = selectedOutlets.length > 0
          ? sourceOutlets.filter((o: any) => selectedOutlets.includes(o.id))
          : sourceOutlets

      const headerTitle = selectedOutlets.length > 0
        ? "OUTLET REGISTRY (SELECTED OUTLETS)"
        : "OUTLET REGISTRY (ALL BRANCHES)"

      rows.push([getSectionHeader(headerTitle)])
      rows.push(["Outlet Name", "Location", "Status", "Region", "Counters", "Registered Since"])
      filteredOutlets.forEach((o: any) => {
        rows.push([
          o.name,
          o.location || 'N/A',
          o.isActive ? 'ACTIVE' : 'INACTIVE',
          o.region?.name || 'N/A',
          o.counterCount ?? 0,
          o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'
        ])
      })
      rows.push([""])
      const activeCount = filteredOutlets.filter((o: any) => o.isActive).length
      const inactiveCount = filteredOutlets.length - activeCount
      rows.push(["Outlet Summary", `Total: ${filteredOutlets.length}`, `Active: ${activeCount}`, `Inactive: ${inactiveCount}`])
        rows.push([""])
      }
    }

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
    link.setAttribute("download", `DQMP_Analytics_${outName}_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = async () => {
    if (!analytics) return
    // Re-fetch outlet status scoped to the selected date range so Active/Inactive is accurate
    const freshOutlets = await fetchAllOutlets(dateRange.startDate, dateRange.endDate)

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const SLT_BLUE = [0, 92, 185] as [number, number, number]
    const SLT_ORANGE = [255, 102, 0] as [number, number, number]
    const SLT_DARK = [22, 38, 70] as [number, number, number]
    const SLT_GREEN = [5, 150, 105] as [number, number, number]
    const SLT_RED = [220, 38, 38] as [number, number, number]

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
      doc.text(`${reportId} | Generated: ${dateStr}`, 20, pageHeight - 10)
      doc.setFont("helvetica", "bold")
      doc.text("SLT-MOBITEL DQMP Management Report", pageWidth / 2, pageHeight - 10, { align: "center" })
      doc.setFont("helvetica", "normal")
      doc.text(`Page ${page} of ${total}`, pageWidth - 20, pageHeight - 10, { align: "right" })
    }

    const ensureSpace = (neededY: number, spaceNeeded: number = 50) => {
      if (neededY > pageHeight - spaceNeeded) {
        doc.addPage()
        addHeader()
        return 45
      }
      return neededY
    }

    const sectionTitle = (text: string, y: number) => {
      doc.setFontSize(13)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(SLT_BLUE[0], SLT_BLUE[1], SLT_BLUE[2])
      doc.text(text, 20, y)
    }

    const reportId = `DQMP-${Math.floor(Date.now() / 10000)}`
    const scopeLabel = selectedOutlets.length > 0
      ? (selectedOutlets.length === 1 ? (outlets.find((o: any) => o.id === selectedOutlets[0])?.name || 'Specified Outlet') : `${selectedOutlets.length} Selected Outlets`)
      : 'Island-wide (All Outlets)'
    const totalFeedbacks = analytics.feedbackStats.reduce((s, f) => s + (f._count ?? f.count ?? 0), 0)
    const completionRate = analytics.totalTokens > 0
      ? ((analytics.totalCompleted / analytics.totalTokens) * 100).toFixed(1)
      : '0.0'

    addHeader(true)

    // Report Parameters block
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(20, 36, pageWidth - 40, 24, 2, 2, 'F')
    doc.setTextColor(71, 85, 105)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text("REPORT PARAMETERS", 25, 44)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(`Report ID: ${reportId}`, 25, 50)
    doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, 25, 55)
    doc.text(`Scope: ${scopeLabel}`, pageWidth / 2, 50)
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 55)

    let currentY = 72

    const activeSections: string[] = []
    if (exportSections.executiveSummary) activeSections.push("Executive Summary")
    if (exportSections.customerSatisfaction) activeSections.push("Customer Satisfaction Analysis")
    if (exportSections.serviceUtilization) activeSections.push("Service Utilization Breakdown")
    if (exportSections.branchPerformance && analytics.branchPerformance && analytics.branchPerformance.length > 0 && selectedOutlets.length !== 1) {
      activeSections.push("Regional Branch Performance Audit")
    }
    if (exportSections.officerPerformance && analytics.officerPerformance && analytics.officerPerformance.length > 0) {
      activeSections.push("Officer Performance Audit")
    }
    if (exportSections.hourlyPerformance && analytics.hourlyStats && analytics.hourlyStats.length > 0) {
      activeSections.push("Hourly Performance Breakdown (08:00 - 18:00)")
    }
    if (exportSections.tokenFlow && analytics.tokenFlow && analytics.tokenFlow.length > 0) {
      activeSections.push("Token Flow Analysis")
    }
    if (exportSections.staffUtilization && analytics.staffUtilizationTrend && analytics.staffUtilizationTrend.length > 0) {
      activeSections.push("Staff Utilization Trend")
    }
    if (exportSections.outletRegistry && (freshOutlets.length > 0 || allOutlets.length > 0)) {
      activeSections.push("Outlet Registry - All Branches")
    }

    const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"]
    const getSectionHeader = (title: string) => {
      const idx = activeSections.indexOf(title)
      return idx !== -1 ? `${romanNumerals[idx]}. ${title}` : title
    }

    // â”€â”€ SECTION I: Executive Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportSections.executiveSummary) {
      sectionTitle(getSectionHeader("Executive Summary"), currentY)
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Operational Metric", "Statistical Value"]],
        body: [
          ["Total Tokens Issued", analytics.totalTokens.toLocaleString()],
          ["Total Tokens Completed", (analytics.totalCompleted ?? 0).toLocaleString()],
          ["Completion Rate", `${completionRate}%`],
          ["Average Wait Time", `${analytics.avgWaitTime} min`],
          ["Average Service Time", `${analytics.avgServiceTime} min`],
          ["Total Feedback Responses", totalFeedbacks.toLocaleString()],
        ],
        theme: 'grid',
        headStyles: { fillColor: SLT_DARK, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'right', fontStyle: 'bold', textColor: SLT_BLUE }
        },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
    }

    // â”€â”€ SECTION II: Customer Satisfaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportSections.customerSatisfaction) {
      currentY = ensureSpace(currentY, 70)
      sectionTitle(getSectionHeader("Customer Satisfaction Analysis"), currentY)
      const satisfactionData = calculateRatingDistribution().slice().reverse().map(item => [
        `${item.rating} Stars`,
        (item.count || 0).toLocaleString(),
        `${(item.percentage || 0).toFixed(1)}%`
      ])
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Satisfaction Level', 'Count', 'Share']],
        body: satisfactionData,
        theme: 'striped',
        headStyles: { fillColor: SLT_BLUE, textColor: [255, 255, 255], halign: 'center' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'center', fontStyle: 'bold' } },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
    }

    // â”€â”€ SECTION III: Service Utilization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportSections.serviceUtilization && analytics.serviceTypes && analytics.serviceTypes.length > 0) {
      currentY = ensureSpace(currentY, 60)
      sectionTitle(getSectionHeader("Service Utilization Breakdown"), currentY)
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Service Category', 'Tokens Issued']],
        body: [...analytics.serviceTypes].sort((a, b) => b.count - a.count).map(st => [st.name, st.count.toLocaleString()]),
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] as [number,number,number], textColor: [255, 255, 255], halign: 'left' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center', fontStyle: 'bold', cellWidth: 40 } },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
    }

    // â”€â”€ SECTION IV: Regional Branch Performance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportSections.branchPerformance && analytics.branchPerformance && analytics.branchPerformance.length > 0 && selectedOutlets.length !== 1) {
      currentY = ensureSpace(currentY, 60)
      sectionTitle(getSectionHeader("Regional Branch Performance Audit"), currentY)
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Outlet', 'Location', 'Tokens', 'Avg Wait', 'Avg Svc', 'Rating', 'Feedbacks']],
        body: [...analytics.branchPerformance].sort((a, b) => b.totalTokens - a.totalTokens).map(b => [
          b.name,
          b.location || 'N/A',
          b.totalTokens.toLocaleString(),
          `${b.avgWaitTime}m`,
          `${b.avgServiceTime}m`,
          b.avgRating.toFixed(2),
          b.feedbackCount.toLocaleString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: SLT_DARK, textColor: [255, 255, 255], halign: 'center', fontSize: 7.5 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 42 },
          1: { halign: 'left', cellWidth: 38 },
          2: { halign: 'center', cellWidth: 16 },
          3: { halign: 'center', cellWidth: 16 },
          4: { halign: 'center', cellWidth: 16 },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 24 }
        },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
    }

    // â”€â”€ SECTION V: Officer Performance Audit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportSections.officerPerformance && analytics.officerPerformance && analytics.officerPerformance.length > 0) {
      currentY = ensureSpace(currentY, 60)
      sectionTitle(getSectionHeader("Officer Performance Audit"), currentY)

      const sortedOfficers = [...analytics.officerPerformance].sort((a, b) => {
        const outletA = a.officer?.outlet?.name || '';
        const outletB = b.officer?.outlet?.name || '';
        if (outletA !== outletB) {
          return outletA.localeCompare(outletB);
        }
        return b.tokensHandled - a.tokensHandled;
      });

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Officer Name', 'Outlet', 'Tokens Handled', 'Avg Rating', 'Total Feedbacks']],
        body: sortedOfficers.map(perf => [
          perf.officer?.name || 'Unknown',
          perf.officer?.outlet?.name || 'N/A',
          perf.tokensHandled.toLocaleString(),
          perf.avgRating.toFixed(2),
          perf.feedbackCount.toLocaleString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: SLT_BLUE, textColor: [255, 255, 255], halign: 'center', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 50 },
          1: { halign: 'left', cellWidth: 50 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 25 }
        },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
    }

    // â”€â”€ SECTION VI: Hourly Performance Breakdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportSections.hourlyPerformance && analytics.hourlyStats && analytics.hourlyStats.length > 0) {
      doc.addPage(); addHeader(); currentY = 45
      sectionTitle(getSectionHeader("Hourly Performance Breakdown (08:00 - 18:00)"), currentY)
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Hour', 'Issued', 'Completed', 'Avg Wait (m)', 'Avg Svc (m)', 'Avg Rating', 'Feedbacks', 'Counters']],
        body: analytics.hourlyStats.map(h => [
          h.hour,
          h.issued,
          h.completed,
          h.waitTime,
          h.serviceTime,
          h.rating > 0 ? h.rating.toFixed(2) : '-',
          h.feedbackCount,
          h.activeCounters
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] as [number,number,number], textColor: [255, 255, 255], halign: 'center', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
        columnStyles: { 0: { halign: 'center', fontStyle: 'bold' } },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
    }

    // â”€â”€ SECTION VII: Token Flow Analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportSections.tokenFlow && analytics.tokenFlow && analytics.tokenFlow.length > 0) {
      currentY = ensureSpace(currentY, 80)
      sectionTitle(getSectionHeader("Token Flow Analysis"), currentY)
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Hour', 'Tokens Issued', 'Tokens Completed', 'Net Flow']],
        body: analytics.tokenFlow.map(tf => [
          tf.time,
          tf.issued,
          tf.completed,
          tf.issued - tf.completed
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] as [number,number,number], textColor: [255, 255, 255], halign: 'center', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
        columnStyles: {
          0: { fontStyle: 'bold' },
          3: { fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
          if (data.column.index === 3 && data.section === 'body') {
            const v = Number(data.cell.raw)
            if (v > 0) data.cell.styles.textColor = SLT_RED
            else if (v < 0) data.cell.styles.textColor = SLT_GREEN
          }
        },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
    }

    // â”€â”€ SECTION VIII: Staff Utilization Trend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportSections.staffUtilization && analytics.staffUtilizationTrend && analytics.staffUtilizationTrend.length > 0) {
      currentY = ensureSpace(currentY, 80)
      sectionTitle(getSectionHeader("Staff Utilization Trend"), currentY)
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Hour', 'Active Counters', 'Customer Demand (Tokens)']],
        body: analytics.staffUtilizationTrend.map(s => [s.time, s.activeCounters, s.customerDemand]),
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] as [number,number,number], textColor: [255, 255, 255], halign: 'center', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: 20, right: 20 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
    }

    // SECTION IX: Outlet Registry
    if (exportSections.outletRegistry) {
      const sourceOutlets = freshOutlets.length > 0 ? freshOutlets : allOutlets
      if (sourceOutlets.length > 0) {
        doc.addPage(); addHeader(); currentY = 45

        const filteredOutlets = selectedOutlets.length > 0
          ? sourceOutlets.filter((o: any) => selectedOutlets.includes(o.id))
          : sourceOutlets

        const headerTitle = selectedOutlets.length > 0
          ? "Outlet Registry - Selected Outlets"
          : "Outlet Registry - All Branches"

        sectionTitle(getSectionHeader(headerTitle), currentY)

        const activeOutlets = filteredOutlets.filter((o: any) => o.isActive)
        const inactiveOutlets = filteredOutlets.filter((o: any) => !o.isActive)

        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(71, 85, 105)
        doc.text(`Total Outlets: ${filteredOutlets.length}`, 20, currentY + 10)
        doc.setTextColor(SLT_GREEN[0], SLT_GREEN[1], SLT_GREEN[2])
        doc.setFont("helvetica", "bold")
        doc.text(`Active: ${activeOutlets.length}`, 75, currentY + 10)
        doc.setTextColor(SLT_RED[0], SLT_RED[1], SLT_RED[2])
        doc.text(`Inactive: ${inactiveOutlets.length}`, 110, currentY + 10)

        autoTable(doc, {
          startY: currentY + 15,
          head: [['Outlet Name', 'Location', 'Status', 'Region', 'Counters', 'Registered Since']],
          body: filteredOutlets.map((o: any) => [
            o.name,
            o.location || 'N/A',
            o.isActive ? 'ACTIVE' : 'INACTIVE',
            o.region?.name || 'N/A',
            o.counterCount ?? 0,
            o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'
          ]),
          theme: 'grid',
          headStyles: { fillColor: SLT_DARK, textColor: [255, 255, 255], halign: 'center', fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { halign: 'left', cellWidth: 40 },
            1: { halign: 'left', cellWidth: 35 },
            2: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
            3: { halign: 'left', cellWidth: 35 },
            4: { halign: 'center', cellWidth: 18 },
            5: { halign: 'center', cellWidth: 25 }
          },
          didParseCell: (data: any) => {
            if (data.column.index === 2 && data.section === 'body') {
              if (data.cell.raw === 'ACTIVE') data.cell.styles.textColor = SLT_GREEN
              else if (data.cell.raw === 'INACTIVE') data.cell.styles.textColor = SLT_RED
            }
          },
          margin: { left: 20, right: 20 }
        })
        currentY = (doc as any).lastAutoTable.finalY + 12
      }
    }

    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) addFooter(i, totalPages)

    const fileDate = new Date().toISOString().split('T')[0]
    const outLabel = selectedOutlets.length > 0 ? 'Outlets' : 'IslandWide'
    doc.save(`DQMP_Report_${outLabel}_${fileDate}.pdf`)
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
                <p className="text-[10px] sm:text-sm text-gray-600">Super Admin | DQMS Management</p>
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

            <div className="relative z-20">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Scope</label>
              <div
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all bg-white cursor-pointer min-h-[38px] flex items-center"
                onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
              >
                {selectedOutlets.length === 0 ? "Island-wide (All Outlets)" : `${selectedOutlets.length} Outlet${selectedOutlets.length > 1 ? 's' : ''} Selected`}
              </div>
              
              {isScopeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto z-50">
                  <div
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 text-sm font-medium text-slate-700"
                    onClick={() => {
                      setSelectedOutlets([])
                      setIsScopeDropdownOpen(false)
                    }}
                  >
                    Island-wide (All Outlets)
                  </div>
                  {outlets.map((outlet) => (
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
                        className="mr-3 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="truncate">{outlet.name}</span>
                    </label>
                  ))}
                </div>
              )}
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

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowCustomizer(!showCustomizer)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors outline-none"
            >
              <span>{showCustomizer ? "Hide" : "Customize"} Exported Report Document Sections</span>
              <span className="text-[10px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-600 font-bold ml-1">
                {Object.values(exportSections).filter(Boolean).length} / 9 Included
              </span>
            </button>

            {showCustomizer && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportSections.executiveSummary}
                    onChange={(e) => setExportSections({ ...exportSections, executiveSummary: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">Executive Summary</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Tokens & completion rate</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportSections.customerSatisfaction}
                    onChange={(e) => setExportSections({ ...exportSections, customerSatisfaction: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">Satisfaction Analysis</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Feedback rating distribution</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportSections.serviceUtilization}
                    onChange={(e) => setExportSections({ ...exportSections, serviceUtilization: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">Service Breakdown</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Utilization by category</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportSections.branchPerformance}
                    disabled={selectedOutlets.length === 1}
                    onChange={(e) => setExportSections({ ...exportSections, branchPerformance: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                  />
                  <div>
                    <span className={`block text-xs font-semibold ${selectedOutlets.length === 1 ? 'text-slate-400' : 'text-slate-700'}`}>Branch Audit</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{selectedOutlets.length === 1 ? 'N/A for single outlet' : 'Outlet comparison table'}</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportSections.officerPerformance}
                    onChange={(e) => setExportSections({ ...exportSections, officerPerformance: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">Officer Performance</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Individual officer efficiency audits</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportSections.hourlyPerformance}
                    onChange={(e) => setExportSections({ ...exportSections, hourlyPerformance: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">Hourly Performance</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Wait/service times per hour</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportSections.tokenFlow}
                    onChange={(e) => setExportSections({ ...exportSections, tokenFlow: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">Token Flow Analysis</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Net hourly traffic flow</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportSections.staffUtilization}
                    onChange={(e) => setExportSections({ ...exportSections, staffUtilization: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">Staff Utilization</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Counters vs customer demand</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportSections.outletRegistry}
                    onChange={(e) => setExportSections({ ...exportSections, outletRegistry: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">Outlet Registry</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Active & inactive branches</span>
                  </div>
                </label>
              </div>
            )}
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
                      {[...analytics.serviceTypes].sort((a, b) => b.count - a.count).map((st) => (
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

            {analytics.branchPerformance && analytics.branchPerformance.length > 0 && selectedOutlets.length !== 1 && (
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
                      {[...analytics.branchPerformance].sort((a, b) => b.totalTokens - a.totalTokens).map((branch) => (
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
                    {[...analytics.officerPerformance].sort((a, b) => {
                      const outletA = a.officer?.outlet?.name || '';
                      const outletB = b.officer?.outlet?.name || '';
                      if (outletA !== outletB) {
                        return outletA.localeCompare(outletB);
                      }
                      return b.tokensHandled - a.tokensHandled;
                    }).map((perf, index) => (
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
