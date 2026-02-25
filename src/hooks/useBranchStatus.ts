import { useState, useEffect, useRef } from "react"
import api from "../config/api"

export interface BranchStatusNotice {
    title: string
    message: string
}

export interface BranchStatus {
    isClosed: boolean
    reason: string | null
    activeNotice: BranchStatusNotice | null
}

/**
 * Polls /api/branch-status/:outletId every `pollInterval` ms.
 * Returns the current closed status for the given outlet.
 */
export function useBranchStatus(outletId: string | null | undefined, pollInterval = 60_000): BranchStatus {
    const [status, setStatus] = useState<BranchStatus>({ isClosed: false, reason: null, activeNotice: null })
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!outletId) return

        let mounted = true

        async function check() {
            try {
                const res = await api.get(`/branch-status/${outletId}`)
                if (mounted) setStatus(res.data)
            } catch {
                // silently ignore — branch status is best-effort
            } finally {
                if (mounted) {
                    timerRef.current = setTimeout(check, pollInterval)
                }
            }
        }

        check()

        return () => {
            mounted = false
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [outletId, pollInterval])

    return status
}
