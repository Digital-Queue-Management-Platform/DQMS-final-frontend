/**
 * Client-side System Logger
 * 
 * Captures and sends client-side errors, events, and diagnostics
 * to the backend logging system for centralized monitoring.
 */

import api from '../config/api'

type LogLevel = 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  message: string
  service: string
  module?: string
  event?: string
  stackTrace?: string
  metadata?: Record<string, unknown>
}

interface LogContext {
  module?: string
  event?: string
  outletId?: string
  userId?: string
  userRole?: string
  metadata?: Record<string, unknown>
}

class ClientLogger {
  private service: string
  private deviceId: string
  private sessionId: string
  private appVersion: string
  private batchQueue: LogEntry[] = []
  private batchTimer: ReturnType<typeof setInterval> | null = null
  private readonly BATCH_SIZE = 10
  private readonly BATCH_INTERVAL = 10000 // 10 seconds
  private context: {
    outletId?: string
    userId?: string
    userRole?: string
  } = {}
  
  constructor(service: string = 'frontend') {
    this.service = service
    this.deviceId = this.getOrCreateDeviceId()
    this.sessionId = this.generateSessionId()
    this.appVersion = this.getAppVersion()
    
    // Start batch processing
    this.startBatchProcessor()
    
    // Setup global error handlers
    this.setupErrorHandlers()
  }
  
  private getOrCreateDeviceId(): string {
    const key = `dqms_device_id_${this.service}`
    let deviceId = localStorage.getItem(key)
    
    if (!deviceId) {
      deviceId = `${this.service}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem(key, deviceId)
    }
    
    return deviceId
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private getAppVersion(): string {
    // Try to get version from meta tag or build info
    const metaVersion = document.querySelector('meta[name="version"]')?.getAttribute('content')
    return metaVersion || import.meta.env.VITE_APP_VERSION || '1.0.0'
  }
  
  private startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      this.flushBatch()
    }, this.BATCH_INTERVAL)
  }
  
  private async flushBatch() {
    if (this.batchQueue.length === 0) return
    
    const toProcess = this.batchQueue.splice(0, this.BATCH_SIZE)
    
    try {
      // Send batch to backend
      await Promise.all(toProcess.map(log => this.sendLog(log)))
    } catch (error) {
      // If sending fails, log to console and re-queue
      console.error('[ClientLogger] Failed to send logs:', error)
      // Don't re-queue to avoid infinite growth
    }
  }
  
  private async sendLog(entry: LogEntry) {
    try {
      await api.post('/logs/ingest', {
        ...entry,
        service: this.service,
        deviceId: this.deviceId,
        sessionId: this.sessionId,
        appVersion: this.appVersion,
        outletId: this.context.outletId,
        userId: this.context.userId,
        userRole: this.context.userRole,
        userAgent: navigator.userAgent,
        metadata: {
          ...entry.metadata,
          url: window.location.href,
          referrer: document.referrer,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight
        }
      })
    } catch (error) {
      // Silently fail - don't want logging to break the app
      console.warn('[ClientLogger] Failed to send log:', error)
    }
  }
  
  private addToQueue(level: LogLevel, message: string, context: LogContext = {}) {
    const entry: LogEntry = {
      level,
      message,
      service: this.service,
      module: context.module,
      event: context.event,
      metadata: context.metadata
    }
    
    this.batchQueue.push(entry)
    
    // Flush immediately for errors and fatal
    if (level === 'error' || level === 'fatal') {
      this.flushBatch()
    } else if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.flushBatch()
    }
  }
  
  private setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.error(`Uncaught error: ${event.message}`, {
        module: 'window',
        event: 'uncaught-error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      })
    })
    
    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.error(`Unhandled promise rejection: ${event.reason}`, {
        module: 'promise',
        event: 'unhandled-rejection',
        metadata: {
          reason: String(event.reason),
          stack: event.reason?.stack
        }
      })
    })
  }
  
  // Set context that will be included in all logs
  setContext(context: { outletId?: string; userId?: string; userRole?: string }) {
    this.context = { ...this.context, ...context }
  }
  
  // Clear context
  clearContext() {
    this.context = {}
  }
  
  // Logging methods
  info(message: string, context: LogContext = {}) {
    console.info(`[${this.service}]`, message, context)
    this.addToQueue('info', message, context)
  }
  
  warn(message: string, context: LogContext = {}) {
    console.warn(`[${this.service}]`, message, context)
    this.addToQueue('warn', message, context)
  }
  
  error(message: string, context: LogContext = {}) {
    console.error(`[${this.service}]`, message, context)
    this.addToQueue('error', message, context)
  }
  
  fatal(message: string, context: LogContext = {}) {
    console.error(`[${this.service}] FATAL:`, message, context)
    this.addToQueue('fatal', message, context)
  }
  
  // Log from an Error object
  logError(error: Error, context: LogContext = {}) {
    this.error(error.message, {
      ...context,
      metadata: {
        ...context.metadata,
        stack: error.stack,
        name: error.name
      }
    })
  }
  
  // WebSocket events
  wsConnected(metadata?: Record<string, unknown>) {
    this.info('WebSocket connected', {
      module: 'websocket',
      event: 'connected',
      metadata
    })
  }
  
  wsDisconnected(reason?: string, metadata?: Record<string, unknown>) {
    this.warn(`WebSocket disconnected${reason ? `: ${reason}` : ''}`, {
      module: 'websocket',
      event: 'disconnected',
      metadata: { reason, ...metadata }
    })
  }
  
  wsError(error: string, metadata?: Record<string, unknown>) {
    this.error(`WebSocket error: ${error}`, {
      module: 'websocket',
      event: 'error',
      metadata
    })
  }
  
  wsReconnecting(attempt: number, metadata?: Record<string, unknown>) {
    this.info(`WebSocket reconnecting (attempt ${attempt})`, {
      module: 'websocket',
      event: 'reconnecting',
      metadata: { attempt, ...metadata }
    })
  }
  
  // API events
  apiError(endpoint: string, status: number, error: string, metadata?: Record<string, unknown>) {
    this.error(`API error: ${endpoint} returned ${status} - ${error}`, {
      module: 'api',
      event: 'api-error',
      metadata: { endpoint, status, error, ...metadata }
    })
  }
  
  // Audio events (for outlet display and kiosk)
  audioError(error: string, metadata?: Record<string, unknown>) {
    this.error(`Audio error: ${error}`, {
      module: 'audio',
      event: 'audio-error',
      metadata
    })
  }
  
  audioPlaybackFailed(reason: string, metadata?: Record<string, unknown>) {
    this.warn(`Audio playback failed: ${reason}`, {
      module: 'audio',
      event: 'playback-failed',
      metadata
    })
  }
  
  // User action logging (for audit trail)
  userAction(action: string, details?: Record<string, unknown>) {
    this.info(`User action: ${action}`, {
      module: 'user',
      event: action,
      metadata: details
    })
  }
  
  // Page/component events
  pageView(pageName: string, metadata?: Record<string, unknown>) {
    this.info(`Page view: ${pageName}`, {
      module: 'navigation',
      event: 'page-view',
      metadata: { pageName, ...metadata }
    })
  }
  
  componentError(component: string, error: Error, metadata?: Record<string, unknown>) {
    this.error(`Component error in ${component}: ${error.message}`, {
      module: 'component',
      event: 'component-error',
      metadata: {
        component,
        stack: error.stack,
        ...metadata
      }
    })
  }
  
  // Send device heartbeat
  async sendHeartbeat(options: {
    deviceType: string
    outletId: string
    status?: 'online' | 'offline' | 'degraded'
    websocketConnected?: boolean
    pollingMode?: boolean
  }) {
    try {
      await api.post('/logs/heartbeat', {
        deviceId: this.deviceId,
        deviceType: options.deviceType,
        outletId: options.outletId,
        status: options.status || 'online',
        appVersion: this.appVersion,
        websocketConnected: options.websocketConnected ?? false,
        pollingMode: options.pollingMode ?? false,
        metadata: {
          userAgent: navigator.userAgent,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          url: window.location.href
        }
      })
    } catch (error) {
      console.warn('[ClientLogger] Failed to send heartbeat:', error)
    }
  }
  
  // Cleanup
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }
    this.flushBatch()
  }
}

// Create singleton instances for different dashboard types
export const adminLogger = new ClientLogger('admin-ui')
export const officerLogger = new ClientLogger('officer-ui')
export const managerLogger = new ClientLogger('manager-ui')
export const kioskLogger = new ClientLogger('kiosk-ui')
export const displayLogger = new ClientLogger('display-ui')
export const teleshopManagerLogger = new ClientLogger('teleshop-manager-ui')
export const gmLogger = new ClientLogger('gm-ui')
export const dgmLogger = new ClientLogger('dgm-ui')

// Factory function to get appropriate logger
export function getLogger(dashboardType: string): ClientLogger {
  switch (dashboardType) {
    case 'admin': return adminLogger
    case 'officer': return officerLogger
    case 'manager': return managerLogger
    case 'kiosk': return kioskLogger
    case 'display': return displayLogger
    case 'teleshop-manager': return teleshopManagerLogger
    case 'gm': return gmLogger
    case 'dgm': return dgmLogger
    default: return new ClientLogger(dashboardType)
  }
}

// Default export for general use
export default ClientLogger
