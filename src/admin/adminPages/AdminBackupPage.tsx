import React, { useState, useEffect, useRef } from 'react'
import api from '../../config/api'
import { Database, Download, AlertCircle, Loader2, HardDrive, FileJson, Clock, ChevronDown, ChevronUp, Upload, CheckCircle2, RefreshCw } from 'lucide-react'

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
  action: 'backup' | 'restore'
  status: 'success' | 'failed'
  filename?: string | null
  createdAt: string
  totalRecords: number
  tableCounts?: Partial<BackupCounts> | null
  errorMessage?: string | null
}

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

interface RestoreResult {
  totalRestored: number
  restored: Record<string, number>
}

const AdminBackupPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<BackupHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyWarning, setHistoryWarning] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [syncHistory, setSyncHistory] = useState<BackupHistoryEntry[]>([])
  const [syncHistoryLoading, setSyncHistoryLoading] = useState(false)
  const [syncHistoryError, setSyncHistoryError] = useState<string | null>(null)

  const fetchHistory = async (expandLatestBackup = false) => {
    setHistoryLoading(true)
    setHistoryError(null)
    setHistoryWarning(null)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await api.get('/admin/backup-history?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const fetched: BackupHistoryEntry[] = Array.isArray(res.data?.history) ? res.data.history : []
      setHistory(fetched)
      if (typeof res.data?.warning === 'string' && res.data.warning.trim()) {
        setHistoryWarning(res.data.warning)
      }

      if (expandLatestBackup) {
        const latestBackupEntry = fetched.find((entry) => entry.action === 'backup')
        setExpandedId(latestBackupEntry?.id ?? null)
      }
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 500) {
        setHistory([])
        setHistoryError('History is temporarily unavailable on server. Backup/restore still works.')
      } else {
        setHistoryError(err?.response?.data?.error || 'Failed to load backup history.')
      }
    } finally {
      setHistoryLoading(false)
    }
  }

  const fetchSyncHistory = async () => {
    setSyncHistoryLoading(true)
    setSyncHistoryError(null)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await api.get('/admin/vm-sync-status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const fetched: BackupHistoryEntry[] = Array.isArray(res.data?.history) ? res.data.history : []
      setSyncHistory(fetched)
    } catch (err: any) {
      setSyncHistoryError(err?.response?.data?.error || 'Failed to load sync history.')
    } finally {
      setSyncHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
    fetchSyncHistory()
  }, [])

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

      await fetchHistory(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate backup. Please try again.')
    } finally {
      setLoading(false)
    }
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
      const payload = { ...parsed, _meta: { filename: file.name } }
      const res = await api.post('/admin/restore', payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      setRestoreResult(res.data)
      await fetchHistory()
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

  const backupHistory = history.filter((entry) => entry.action === 'backup')
  const restoreHistory = history.filter((entry) => entry.action === 'restore')
  const latestBackup = backupHistory[0] ?? null

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
                  ? `Last backup: ${new Date(latestBackup.createdAt).toLocaleString()} · ${latestBackup.totalRecords.toLocaleString()} records`
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

      {/* VM Auto-Sync history */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-indigo-400" />
            <h2 className="font-semibold text-gray-800">VM → Neon Auto-Sync</h2>
            {syncHistory.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                {syncHistory.length}
              </span>
            )}
          </div>
          <button
            onClick={() => fetchSyncHistory()}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncHistoryLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {syncHistoryError ? (
          <div className="px-6 py-8 text-center text-sm text-red-500">{syncHistoryError}</div>
        ) : syncHistory.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No auto-sync activity yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {syncHistory.map((entry) => (
              <li key={entry.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {entry.status === 'success' ? 'Auto-Sync completed' : 'Auto-Sync failed'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(entry.createdAt).toLocaleString()}
                      {entry.filename ? ` · ${entry.filename}` : ''}
                    </p>
                    {entry.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{entry.errorMessage}</p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${entry.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {entry.status === 'success' ? `+${entry.totalRecords.toLocaleString()} rows synced` : 'Failed'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Backup history */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Backup history</h2>
            {backupHistory.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                {backupHistory.length}
              </span>
            )}
          </div>
          <button
            onClick={() => fetchHistory()}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {historyWarning && (
          <div className="px-6 pt-4 text-xs text-amber-700">{historyWarning}</div>
        )}

        {historyLoading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">Loading history...</div>
        ) : historyError ? (
          <div className="px-6 py-10 text-center text-sm text-red-500">{historyError}</div>
        ) : backupHistory.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No backups yet. Click "Download Backup" to create one.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {backupHistory.map((entry, idx) => {
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
                        <p className="text-sm font-medium text-gray-800 truncate">{entry.filename || 'dqmp-backup.json'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(entry.createdAt).toLocaleString()} &middot; {entry.totalRecords.toLocaleString()} records
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
                    </div>
                  </div>

                  {/* Expanded counts */}
                  {isExpanded && (
                    <div className="mt-4 flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                      {entry.tableCounts && (Object.keys(entry.tableCounts) as (keyof BackupCounts)[]).map((key) => (
                        <div key={key} className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
                          <span className="text-sm text-gray-600">{TABLE_LABELS[key] ?? key}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {(entry.tableCounts?.[key] ?? 0).toLocaleString()}
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

      {/* Restore history */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-6">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <Clock className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-800">Restore history</h2>
          {restoreHistory.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
              {restoreHistory.length}
            </span>
          )}
        </div>

        {historyLoading ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Loading history...</div>
        ) : restoreHistory.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No restore activity yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {restoreHistory.map((entry) => (
              <li key={entry.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {entry.status === 'success' ? 'Restore completed' : 'Restore failed'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(entry.createdAt).toLocaleString()}
                      {entry.filename ? ` · ${entry.filename}` : ''}
                    </p>
                    {entry.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{entry.errorMessage}</p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${entry.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {entry.status === 'success' ? `+${entry.totalRecords.toLocaleString()} rows` : 'Failed'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default AdminBackupPage
