import { useEffect, useRef } from 'react'
import { WS_URL } from '../config/api'

interface WebSocketOptions {
  onMessage?: (data: any) => void
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
  onError?: (error: Event) => void
  reconnectInterval?: number
  autoReconnect?: boolean
}

export const useWebSocket = (options: WebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)
  
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 5000,
    autoReconnect = true
  } = options

  const connect = () => {
    if (!isMountedRef.current) return

    try {
      // Clean up existing connection
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }

      wsRef.current = new WebSocket(WS_URL)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully')
        if (onOpen) onOpen()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (onMessage) onMessage(data)
        } catch (error) {
          console.error('WebSocket message parsing error:', error)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        if (onError) onError(error)
      }

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.reason)
        if (onClose) onClose(event)
        
        // Auto-reconnect if enabled and component is still mounted
        if (autoReconnect && !event.wasClean && isMountedRef.current) {
          reconnectTimerRef.current = window.setTimeout(() => {
            console.log('Attempting WebSocket reconnection...')
            connect()
          }, reconnectInterval)
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      
      // Retry connection if auto-reconnect is enabled
      if (autoReconnect && isMountedRef.current) {
        reconnectTimerRef.current = window.setTimeout(connect, reconnectInterval)
      }
    }
  }

  const disconnect = () => {
    isMountedRef.current = false
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Component unmounting')
    }
  }

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected. Message not sent:', data)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    connect()
    
    return () => {
      disconnect()
    }
  }, []) // Empty dependency array - only connect once

  return { 
    send,
    disconnect,
    reconnect: connect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  }
}