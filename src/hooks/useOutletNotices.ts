import { useState, useEffect, useRef } from "react"
import api from "../config/api"

export interface OutletNotice {
    id: string
    title: string
    message: string
    noticeType: string
}

/**
 * Polls /api/outlet-notices/:outletId for active standard (dismissable) notices.
 * Returns notices that haven't been dismissed in this session.
 */
export function useOutletNotices(outletId: string | null | undefined, pollInterval = 120_000) {
    const [pending, setPending] = useState<OutletNotice[]>([])
    const dismissed = useRef<Set<string>>(new Set())
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!outletId) return
        let mounted = true

        async function fetch() {
            try {
                const res = await api.get(`/outlet-notices/${outletId}`)
                const all: OutletNotice[] = res.data.notices || []
                if (mounted) {
                    setPending(all.filter(n => !dismissed.current.has(n.id)))
                }
            } catch {
                // silently ignore
            } finally {
                if (mounted) timerRef.current = setTimeout(fetch, pollInterval)
            }
        }

        fetch()
        return () => {
            mounted = false
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [outletId, pollInterval])

    const dismiss = (id: string) => {
        dismissed.current.add(id)
        setPending(prev => prev.filter(n => n.id !== id))
    }

    return { notices: pending, dismiss }
}
