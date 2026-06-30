import { useCallback, useRef } from 'react'
import api from '../config/api'

/**
 * Returns a debounced check function.
 * Call checkMobile(number, setter) or checkEmail(email, setter)
 * where setter is setFieldErrors or similar.
 *
 * The check fires 600ms after the last keystroke to avoid hitting the
 * server on every character.
 */
export function useOfficerDuplicateCheck() {
    const mobileTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    /**
     * Check if mobile is already registered.
     * @param mobile – raw value from input
     * @param setError – callback that receives an error string or ''
     */
    const checkMobile = useCallback((mobile: string, setError: (msg: string) => void) => {
        if (mobileTimer.current) clearTimeout(mobileTimer.current)

        // Only check when we have a full 10-digit Sri Lankan number
        const clean = mobile.replace(/\s/g, '')
        if (!/^0[0-9]{9}$/.test(clean)) return

        mobileTimer.current = setTimeout(async () => {
            try {
                const res = await api.get('/officer/check', { params: { mobile: clean } })
                setError(res.data.taken ? res.data.message : '')
            } catch {
                // Silently ignore network errors – let submit-time validation catch them
            }
        }, 600)
    }, [])

    /**
     * Check if email is already registered.
     * @param email – raw value from input
     * @param setError – callback that receives an error string or ''
     */
    const checkEmail = useCallback((email: string, setError: (msg: string) => void) => {
        if (emailTimer.current) clearTimeout(emailTimer.current)

        const trimmed = email.trim()
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return

        emailTimer.current = setTimeout(async () => {
            try {
                const res = await api.get('/officer/check', { params: { email: trimmed } })
                setError(res.data.taken ? res.data.message : '')
            } catch {
                // Silently ignore
            }
        }, 600)
    }, [])

    return { checkMobile, checkEmail }
}
