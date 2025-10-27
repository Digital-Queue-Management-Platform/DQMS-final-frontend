import { useState, useEffect } from 'react'
import api from '../config/api'

// Local, simple, live-backed service title cache. No static fallbacks.
let serviceMapCache: Record<string, string> | null = null
let loadingPromise: Promise<Record<string, string>> | null = null

const prettify = (code: string) =>
  (code || 'Unknown Service').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

const loadServices = async (): Promise<Record<string, string>> => {
  if (serviceMapCache) return serviceMapCache
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      const res = await api.get('/queue/services')
      const list = Array.isArray(res.data) ? res.data : []
      const map: Record<string, string> = {}
      for (const s of list) {
        if (s?.code) map[s.code] = s?.title || s.code
      }
      serviceMapCache = map
      return map
    } catch {
      // On failure, keep cache null and return empty
      return {}
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

export const getServiceDisplayNameSync = (serviceCode: string): string => {
  if (!serviceCode) return 'Unknown Service'
  if (serviceMapCache && serviceMapCache[serviceCode]) return serviceMapCache[serviceCode]
  return prettify(serviceCode)
}

export const getServiceDisplayName = async (serviceCode: string): Promise<string> => {
  if (!serviceCode) return 'Unknown Service'
  const map = await loadServices()
  if (map && map[serviceCode]) return map[serviceCode]
  return prettify(serviceCode)
}

// Hook to get service name with automatic loading of live services
export const useServiceName = (serviceCode: string): string => {
  const [serviceName, setServiceName] = useState<string>(getServiceDisplayNameSync(serviceCode))

  useEffect(() => {
    if (!serviceCode) {
      setServiceName('Unknown Service')
      return
    }
    let mounted = true
    ;(async () => {
      const name = await getServiceDisplayName(serviceCode)
      if (mounted) setServiceName(name)
    })()
    return () => {
      mounted = false
    }
  }, [serviceCode])

  return serviceName || getServiceDisplayNameSync(serviceCode)
}