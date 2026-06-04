import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell, Mail, MessageSquare, Clock, Send, Play,
  CheckCircle2, XCircle, Loader2, Eye, RefreshCw,
  AlertTriangle, Users, Info,
  ChevronRight, CheckCircle,
} from 'lucide-react'
import api from '../../config/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationSettings {
  daily_summary_sms_enabled: string
  daily_summary_email_enabled: string
  daily_summary_hour: string
  daily_summary_minute: string
}

interface SendResult {
  managerId: string
  managerName: string
  branchName: string | null
  smsStatus: 'sent' | 'skipped' | 'failed' | 'disabled'
  emailStatus: 'sent' | 'skipped' | 'failed' | 'disabled'
  error?: string
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  enabled, onChange, disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    disabled={disabled}
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
      enabled ? 'bg-indigo-600' : 'bg-gray-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
)

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
    enabled
      ? 'bg-green-50 text-green-700 border border-green-200'
      : 'bg-gray-100 text-gray-500 border border-gray-200'
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
    {enabled ? 'Enabled' : 'Disabled'}
  </span>
)

// ─── SMS Preview Panel ────────────────────────────────────────────────────────

const SMSPreviewPanel: React.FC = () => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      {[
        {
          title: 'Part 1 – Summary',
          text: [
            'Dear Kumara,',
            '',
            'Daily Summary - Colombo South Teleshop',
            `Date: ${today}`,
            '',
            'Tokens Issued    : 52',
            'Customers Served : 45',
            'Avg Wait Time    : 8 mins',
            'Avg Service Time : 12 mins',
            'Customer Rating  : 4.3 / 5',
            '',
            'SLT-MOBITEL',
          ].join('\n'),
        },
        {
          title: 'Part 2 – Top Services',
          text: [
            'Dear Kumara,',
            '',
            `Top Services Today (${today}):`,
            '1. Bill Payment - 20 customers',
            '2. SIM Replacement - 15 customers',
            '3. New Connection - 10 customers',
            '',
            'SLT-MOBITEL',
          ].join('\n'),
        },
      ].map((msg) => (
        <div key={msg.title}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{msg.title}</p>
          <div className="bg-gray-900 rounded-xl p-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{msg.text}</pre>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Email Preview Panel ──────────────────────────────────────────────────────

const EmailPreviewPanel: React.FC = () => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  return (
    <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden text-xs">
      {/* Subject bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
        <span className="text-gray-500 font-medium">Subject:</span>
        <span className="text-gray-800 font-semibold">
          Daily Branch Summary – Colombo South | {today}
        </span>
      </div>
      {/* Body */}
      <div className="bg-white p-4 space-y-3">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-lg px-4 py-3 text-center">
          <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold">SLT-MOBITEL</p>
          <p className="text-white font-bold text-sm mt-0.5">Daily Branch Summary</p>
          <p className="text-blue-200 text-[11px]">Colombo South Teleshop &nbsp;|&nbsp; {today}</p>
        </div>
        {/* Greeting */}
        <p className="text-gray-700">
          Dear <strong>Manager Kumara</strong>,
          <br />
          <span className="text-gray-500 text-[11px]">
            Please find below your daily branch performance summary for{' '}
            <strong className="text-gray-700">Colombo South Teleshop</strong> on{' '}
            <strong className="text-gray-700">{today}</strong>.
          </span>
        </p>
        {/* Metrics */}
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">📊 Performance Summary</span>
          </div>
          {[
            ['Tokens Issued', '52'],
            ['Customers Served', '45'],
            ['Avg Wait Time', '8 mins'],
            ['Avg Service Time', '12 mins'],
            ['Customer Rating', '4.3 / 5 ⭐'],
            ['Peak Hour', '10:00'],
          ].map(([label, value], i) => (
            <div key={label} className={`flex justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-900 font-semibold">{value}</span>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="bg-slate-900 rounded-lg px-4 py-2 text-center">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">SLT-MOBITEL</p>
          <p className="text-[10px] text-gray-600">Digital Queue Management System</p>
        </div>
      </div>
    </div>
  )
}

// ─── Results Table Modal ──────────────────────────────────────────────────────

const ResultsModal: React.FC<{ results: SendResult[]; onClose: () => void }> = ({ results, onClose }) => {
  const statusIcon = (status: string) => {
    if (status === 'sent') return <CheckCircle2 className="w-4 h-4 text-green-600" />
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />
    return <span className="w-4 h-4 rounded-full bg-gray-300 inline-block" />
  }
  const statusText = (status: string) => {
    const map: Record<string, string> = { sent: 'text-green-700', failed: 'text-red-600', disabled: 'text-gray-400', skipped: 'text-gray-400' }
    return map[status] || 'text-gray-500'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Dispatch Results</h3>
            <p className="text-slate-500 text-sm mt-0.5">{results.length} manager{results.length !== 1 ? 's' : ''} processed</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 font-semibold uppercase tracking-wide border-b border-slate-100">
                <th className="text-left pb-2 pl-2">Manager</th>
                <th className="text-left pb-2">Branch</th>
                <th className="text-center pb-2">SMS</th>
                <th className="text-center pb-2">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {results.map((r) => (
                <tr key={r.managerId} className={`hover:bg-slate-50 ${r.smsStatus === 'failed' || r.emailStatus === 'failed' ? 'bg-red-50/50' : ''}`}>
                  <td className="py-2.5 pl-2 font-medium text-slate-800">{r.managerName}</td>
                  <td className="py-2.5 text-slate-500 text-xs">{r.branchName || '—'}</td>
                  <td className="py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {statusIcon(r.smsStatus)}
                      <span className={`text-xs font-medium ${statusText(r.smsStatus)}`}>{r.smsStatus}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {statusIcon(r.emailStatus)}
                      <span className={`text-xs font-medium ${statusText(r.emailStatus)}`}>{r.emailStatus}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast notification ───────────────────────────────────────────────────────

interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'info' }

const Toast: React.FC<{ toasts: ToastItem[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        onClick={() => onRemove(t.id)}
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium cursor-pointer transition-all ${
          t.type === 'success' ? 'bg-white border-green-200 text-green-800' :
          t.type === 'error' ? 'bg-white border-red-200 text-red-700' :
          'bg-white border-blue-200 text-blue-700'
        }`}
      >
        {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> :
         t.type === 'error' ? <XCircle className="w-4 h-4 text-red-500 shrink-0" /> :
         <Info className="w-4 h-4 text-blue-500 shrink-0" />}
        {t.message}
      </div>
    ))}
  </div>
)

// ─── Section Card ─────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    daily_summary_sms_enabled: 'false',
    daily_summary_email_enabled: 'false',
    daily_summary_hour: '19',
    daily_summary_minute: '0',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTestSms, setSendingTestSms] = useState(false)
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const [sendingNow, setSendingNow] = useState(false)

  const [testMobile, setTestMobile] = useState('')
  const [testEmail, setTestEmail] = useState('')

  const [showSmsPreview, setShowSmsPreview] = useState(false)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null)
  const [lastSent, setLastSent] = useState<string | null>(null)

  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const getAuthHeader = () => {
    const token = localStorage.getItem('adminToken')
    return { Authorization: `Bearer ${token}` }
  }

  useEffect(() => {
    api.get('/admin/notification-settings', { headers: getAuthHeader() })
      .then(res => { if (res.data?.settings) setSettings(res.data.settings) })
      .catch(() => addToast('Failed to load notification settings', 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.put('/admin/notification-settings', settings, { headers: getAuthHeader() })
      if (res.data?.settings) {
        setSettings(res.data.settings)
      }
      addToast('Settings saved successfully', 'success')
    } catch {
      addToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const sendTestSms = async () => {
    if (!testMobile.trim()) { addToast('Please enter a mobile number', 'info'); return }
    setSendingTestSms(true)
    try {
      await api.post('/admin/notification-settings/test-sms', { mobileNumber: testMobile }, { headers: getAuthHeader() })
      addToast(`Test SMS sent to ${testMobile}`, 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to send test SMS', 'error')
    } finally {
      setSendingTestSms(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail.trim()) { addToast('Please enter an email address', 'info'); return }
    setSendingTestEmail(true)
    try {
      await api.post('/admin/notification-settings/test-email', { email: testEmail }, { headers: getAuthHeader() })
      addToast(`Test email sent to ${testEmail}`, 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to send test email', 'error')
    } finally {
      setSendingTestEmail(false)
    }
  }

  const sendNow = async () => {
    setSendingNow(true)
    try {
      const res = await api.post('/admin/notification-settings/send-now', {}, { headers: getAuthHeader() })
      const msg = res.data.message || 'Daily summaries dispatched'
      addToast(msg, 'success')
      setLastSent(new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' }))
      if (res.data.results) setSendResults(res.data.results)
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to dispatch summaries', 'error')
    } finally {
      setSendingNow(false)
    }
  }

  const smsEnabled = settings.daily_summary_sms_enabled === 'true'
  const emailEnabled = settings.daily_summary_email_enabled === 'true'
  const hour = settings.daily_summary_hour.padStart(2, '0')
  const minute = settings.daily_summary_minute.padStart(2, '0')

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Loading notification settings…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Subtle background blobs – matches other admin pages */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-6">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <Bell className="h-6 w-6 text-indigo-600 flex-shrink-0" />
              Daily Summary Notifications
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Automatically send branch performance summaries to Teleshop Managers via SMS and email.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-sm transition-all shrink-0"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {/* ── Status Overview Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SectionCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">SMS Status</p>
                <p className={`text-xl font-extrabold mt-1 ${smsEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                  {smsEnabled ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${smsEnabled ? 'bg-green-50' : 'bg-gray-100'}`}>
                <MessageSquare className={`h-5 w-5 ${smsEnabled ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Email Status</p>
                <p className={`text-xl font-extrabold mt-1 ${emailEnabled ? 'text-blue-700' : 'text-gray-400'}`}>
                  {emailEnabled ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${emailEnabled ? 'bg-blue-50' : 'bg-gray-100'}`}>
                <Mail className={`h-5 w-5 ${emailEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Scheduled At</p>
                <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{hour}:{minute}</p>
              </div>
              <div className="bg-indigo-50 p-2.5 rounded-xl">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Last Sent</p>
                <p className="text-sm font-bold text-slate-700 mt-1">{lastSent || '—'}</p>
              </div>
              <div className="bg-violet-50 p-2.5 rounded-xl">
                <Bell className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Automatic Schedule Info Banner ───────────────────────────────── */}
        <SectionCard>
          <div className="flex items-start gap-4 px-6 py-4">
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 shrink-0 mt-0.5">
              <Info className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Automatic Daily Dispatch</p>
              <p className="text-sm text-gray-500 mt-0.5">
                The system automatically sends the daily summary to all active Teleshop Managers every day
                at <strong className="text-gray-700 font-mono">{hour}:{minute}</strong> (Sri Lanka Standard Time, UTC+5:30).
                The scheduler checks every minute — no additional setup required. Enable SMS or Email below to activate.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── SMS Notifications ────────────────────────────────────────────── */}
        <SectionCard>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                <MessageSquare className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">SMS Notifications</h2>
                <p className="text-xs text-gray-500 mt-0.5">Send daily summary SMS to each Teleshop Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge enabled={smsEnabled} />
              <Toggle
                enabled={smsEnabled}
                onChange={v => setSettings(s => ({ ...s, daily_summary_sms_enabled: v ? 'true' : 'false' }))}
              />
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Info */}
            <div className="flex items-start gap-3 p-3.5 bg-green-50 border border-green-100 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                Each manager receives <strong>up to 2 SMS messages</strong> — one with key metrics and one
                with top services. Messages begin with <em>"Dear [First Name],"</em> and end with
                <em> "SLT-MOBITEL"</em>.
              </p>
            </div>

            {/* Preview toggle */}
            <button
              onClick={() => setShowSmsPreview(v => !v)}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Eye className="h-4 w-4" />
              {showSmsPreview ? 'Hide' : 'Show'} SMS Preview
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showSmsPreview ? 'rotate-90' : ''}`} />
            </button>
            {showSmsPreview && <SMSPreviewPanel />}

            {/* Test SMS */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Send Test SMS
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="e.g. 0771234567"
                  value={testMobile}
                  onChange={e => setTestMobile(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendTestSms()}
                  className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-800 placeholder-gray-400"
                />
                <button
                  onClick={sendTestSms}
                  disabled={sendingTestSms}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all"
                >
                  {sendingTestSms ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sendingTestSms ? 'Sending…' : 'Send Test'}
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Email Notifications ──────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Email Notifications</h2>
                <p className="text-xs text-gray-500 mt-0.5">Send a rich HTML summary email to each Teleshop Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge enabled={emailEnabled} />
              <Toggle
                enabled={emailEnabled}
                onChange={v => setSettings(s => ({ ...s, daily_summary_email_enabled: v ? 'true' : 'false' }))}
              />
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
              <Mail className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                A professionally styled HTML email is sent with a personal greeting, performance metrics,
                top services table, and officer highlights. The subject is{' '}
                <em>"Daily Branch Summary – [Branch] | [Date]"</em>.
                Managers without an email address are automatically skipped.
              </p>
            </div>

            <button
              onClick={() => setShowEmailPreview(v => !v)}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Eye className="h-4 w-4" />
              {showEmailPreview ? 'Hide' : 'Show'} Email Preview
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showEmailPreview ? 'rotate-90' : ''}`} />
            </button>
            {showEmailPreview && <EmailPreviewPanel />}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Send Test Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="e.g. manager@slt.lk"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendTestEmail()}
                  className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-800 placeholder-gray-400"
                />
                <button
                  onClick={sendTestEmail}
                  disabled={sendingTestEmail}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all"
                >
                  {sendingTestEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sendingTestEmail ? 'Sending…' : 'Send Test'}
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Schedule + Manual Trigger ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Schedule */}
          <SectionCard>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                <Clock className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Schedule</h2>
                <p className="text-xs text-gray-500 mt-0.5">Set the daily automatic send time (Sri Lanka Time)</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Hour (0–23)
                  </label>
                  <input
                    type="number"
                    min={0} max={23}
                    value={settings.daily_summary_hour}
                    onChange={e => setSettings(s => ({ ...s, daily_summary_hour: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center font-mono font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Minute (0–59)
                  </label>
                  <input
                    type="number"
                    min={0} max={59}
                    value={settings.daily_summary_minute}
                    onChange={e => setSettings(s => ({ ...s, daily_summary_minute: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center font-mono font-bold text-gray-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div>
                  <p className="text-xs text-indigo-700 font-semibold uppercase tracking-wide">Daily Send Time</p>
                  <p className="text-2xl font-black text-indigo-800 font-mono mt-0.5">{hour}:{minute}</p>
                  <p className="text-xs text-indigo-600 mt-0.5">Sri Lanka Standard Time (UTC+5:30)</p>
                </div>
                <Clock className="h-10 w-10 text-indigo-300" />
              </div>

              <p className="text-xs text-gray-400">
                The scheduler runs every minute in the background. Summaries are sent once per day at the configured time.
              </p>
            </div>
          </SectionCard>

          {/* Manual Trigger */}
          <SectionCard>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                <Play className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Manual Trigger</h2>
                <p className="text-xs text-gray-500 mt-0.5">Send summaries to all managers immediately</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                <Users className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Sends today's branch summary to all active Teleshop Managers assigned to a branch.
                  Uses whichever channels (SMS / Email) are enabled above.
                </p>
              </div>

              <button
                onClick={sendNow}
                disabled={sendingNow || (!smsEnabled && !emailEnabled)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all shadow-sm"
              >
                {sendingNow
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Sending to all managers…</>
                  : <><Send className="h-4 w-4" />Send Now to All Managers</>
                }
              </button>

              {!smsEnabled && !emailEnabled && (
                <p className="text-xs text-gray-400 text-center">Enable SMS or Email above to use this feature.</p>
              )}

              {lastSent && (
                <p className="text-xs text-gray-500 text-center">
                  Last dispatched: <strong className="text-gray-700">{lastSent}</strong>
                </p>
              )}

              {sendResults && (
                <button
                  onClick={() => setSendResults(sendResults)}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all font-medium"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  View Dispatch Results
                </button>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Bottom Save ──────────────────────────────────────────────────── */}
        <div className="flex justify-end pb-4">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-sm transition-all"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {/* Toasts */}
      <Toast toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* Results modal */}
      {sendResults && <ResultsModal results={sendResults} onClose={() => setSendResults(null)} />}
    </div>
  )
}
