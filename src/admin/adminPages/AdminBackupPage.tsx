import React, { useState, useEffect, useRef } from 'react'
import api from '../../config/api'
import { Database, Download, AlertCircle, Loader2, HardDrive, FileJson, Clock, Trash2, ChevronDown, ChevronUp, Upload, CheckCircle2, RefreshCw } from 'lucide-react'

interface BackupCounts {
  regions: number
  outlets: number
  officers: number
  customers: number
  tokens: number
  feedback: number
  completedServices: number
  services: number
  appointments: number
  breakLogs: number
  transferLogs: number
  serviceCases: number
  serviceCaseUpdates: number
  closureNotices: number
  managerQRTokens: number
  teleshopManagers: number
  gms: number
  dgms: number
  otps: number
  sltBills: number
  mercantileHolidays: number
  documents: number
  alerts: number
}

interface BackupHistoryEntry {
  id: string
  exportedAt: string
  filename: string
  totalRecords: number
  counts: BackupCounts
}

const HISTORY_KEY = 'dqmp_backup_history'
const MAX_HISTORY = 50

const TABLE_LABELS: Record<keyof BackupCounts, string> = {
  regions: 'Regions',
  outlets: 'Outlets / Branches',
  officers: 'Officers',
  customers: 'Customers',
  tokens: 'Queue Tokens',
  feedback: 'Feedback',
  completedServices: 'Completed Services',
  services: 'Services',
  appointments: 'Appointments',
  breakLogs: 'Break Logs',
  transferLogs: 'Transfer Logs',
  serviceCases: 'Service Cases',
  serviceCaseUpdates: 'Service Case Updates',
  closureNotices: 'Closure Notices',
  managerQRTokens: 'Manager QR Tokens',
  teleshopManagers: 'Teleshop Managers',
  gms: 'General Managers',
  dgms: 'Deputy General Managers',
  otps: 'OTP Records',
  sltBills: 'SLT Bills',
  mercantileHolidays: 'Mercantile Holidays',
  documents: 'Documents',
  alerts: 'Alerts',
}

function loadHistory(): BackupHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(history: BackupHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch { /* storage full — silently ignore */ }
}

interface RestoreResult {
  totalRestored: number
  restored: Record<string, number>
}

const AdminBackupPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<BackupHistoryEntry[]>(() => loadHistory())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keep localStorage in sync whenever history changes
  useEffect(() => { saveHistory(history) }, [history])

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await api.get('/admin/backup', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      })

      const text = await (res.data as Blob).text()
      const parsed = JSON.parse(text) as { exportedAt: string; version: string; counts: BackupCounts }

      const filename = `dqmp-backup-${new Date(parsed.exportedAt).toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`
      const totalRecords = Object.values(parsed.counts).reduce((a, b) => a + b, 0)

      // Trigger browser file download
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Prepend to history
      const entry: BackupHistoryEntry = {
        id: crypto.randomUUID(),
        exportedAt: parsed.exportedAt,
        filename,
        totalRecords,
        counts: parsed.counts,
      }
      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY))
      setExpandedId(entry.id)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate backup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const deleteHistoryEntry = (id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const clearAllHistory = () => {
    setHistory([])
    setExpandedId(null)
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return

    setRestoring(true)
    setRestoreError(null)
    setRestoreResult(null)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed.tables) throw new Error('Invalid backup file: missing tables')

      const token = localStorage.getItem('adminToken')
      const res = await api.post('/admin/restore', parsed, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      setRestoreResult(res.data)
    } catch (err: any) {
      setRestoreError(
        err?.response?.data?.error ||
        err?.message ||
        'Failed to restore backup.'
      )
    } finally {
      setRestoring(false)
    }
  }

  const latestBackup = history[0] ?? null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <Database className="h-7 w-7 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Backup</h1>
          <p className="text-sm text-gray-500 mt-0.5">Export a full JSON snapshot of every table and all its data</p>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6">
        <div className="flex gap-3">
          <HardDrive className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-800 space-y-1">
            <p className="font-semibold">What's included</p>
            <p className="text-indigo-700">
              Every table is exported with all its rows and columns — regions, outlets, officers, customers,
              tokens, feedback, completed services, appointments, closure notices, break logs, transfer logs,
              service cases, SLT bills, OTP records, mercantile holidays, documents, alerts, GMs, DGMs,
              teleshop managers, and more — as one downloadable JSON file.
            </p>
          </div>
        </div>
      </div>

      {/* Action card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileJson className="h-8 w-8 text-gray-400" />
            <div>
              <p className="font-semibold text-gray-800">Full system export</p>
              <p className="text-sm text-gray-500">
                {latestBackup
                  ? `Last backup: ${new Date(latestBackup.exportedAt).toLocaleString()} · ${latestBackup.totalRecords.toLocaleString()} records`
                  : 'No backups downloaded yet'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Backup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Restore card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-8 w-8 text-gray-400" />
            <div>
              <p className="font-semibold text-gray-800">Restore from backup</p>
              <p className="text-sm text-gray-500">Upload a backup JSON file to seed missing data back into the database</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleRestore}
          />
          <button
            onClick={() => { setRestoreResult(null); setRestoreError(null); fileInputRef.current?.click() }}
            disabled={restoring}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
          >
            {restoring ? (
              <><Loader2 className="h-5 w-5 animate-spin" />Restoring…</>
            ) : (
              <><Upload className="h-5 w-5" />Upload &amp; Restore</>
            )}
          </button>
        </div>

        {/* Restore error */}
        {restoreError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{restoreError}</p>
          </div>
        )}

        {/* Restore result */}
        {restoreResult && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Restore complete — {restoreResult.totalRestored.toLocaleString()} records seeded
              </span>
            </div>
            <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {Object.entries(restoreResult.restored).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
                  <span className="text-sm text-gray-600">{TABLE_LABELS[key as keyof BackupCounts] ?? key}</span>
                  <span className="text-sm font-semibold text-emerald-700">+{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backup history */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Backup history</h2>
            {history.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                {history.length}
              </span>
            )}
          </div>
          {history.length > 0 && (
            <button
              onClick={clearAllHistory}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No backups yet. Click "Download Backup" to create one.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((entry, idx) => {
              const isExpanded = expandedId === entry.id
              return (
                <li key={entry.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {idx === 0 && (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Latest
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{entry.filename}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(entry.exportedAt).toLocaleString()} &middot; {entry.totalRecords.toLocaleString()} records
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        Details
                      </button>
                      <button
                        onClick={() => deleteHistoryEntry(entry.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove from history"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded counts */}
                  {isExpanded && (
                    <div className="mt-4 flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                      {(Object.keys(entry.counts) as (keyof BackupCounts)[]).map((key) => (
                        <div key={key} className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
                          <span className="text-sm text-gray-600">{TABLE_LABELS[key]}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {entry.counts[key].toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between bg-indigo-50 px-4 py-2.5">
                        <span className="text-sm font-semibold text-indigo-700">Total records</span>
                        <span className="text-sm font-bold text-indigo-800">{entry.totalRecords.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default AdminBackupPage
