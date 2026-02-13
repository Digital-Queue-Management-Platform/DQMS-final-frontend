import React, { useEffect, useMemo, useRef, useState } from 'react'

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: string
  onResend?: () => void
  resendDisabled?: boolean
  lang?: 'en' | 'si' | 'ta'
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 4,
  value,
  onChange,
  onComplete,
  disabled,
  error,
  onResend,
  resendDisabled,
  lang,
}) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const [localLang, setLocalLang] = useState<'en' | 'si' | 'ta'>(() => {
    if (lang) return lang
    try {
      const saved = localStorage.getItem('dq_lang') as 'en' | 'si' | 'ta' | null
      if (saved) return saved
    } catch {}
    const nav = (navigator?.language || 'en').toLowerCase()
    if (nav.startsWith('si')) return 'si'
    if (nav.startsWith('ta')) return 'ta'
    return 'en'
  })

  useEffect(() => {
    if (lang && lang !== localLang) setLocalLang(lang)
  }, [lang])

  useEffect(() => {
    try { localStorage.setItem('dq_lang', localLang) } catch {}
  }, [localLang])

  const t = useMemo(() => {
    const dict = {
      en: {
        enterCode: (n: number) => `Enter the ${n}-digit code`,
        sentInfo: 'We sent a verification code to your mobile number.',
        notReceived: "Didn’t receive the code?",
        resend: 'Resend',
        language: 'Language',
      },
      si: {
        enterCode: (n: number) => `අංක ${n}ක කේතය ඇතුල් කරන්න`,
        sentInfo: 'ඔබගේ ජංගම දුරකථන අංකයට සත්‍යාපන කේතයක් අප විසින් යවා ඇත.',
        notReceived: 'කේතය නොලැබුණාද?',
        resend: 'නැවත යවන්න',
        language: 'භාෂාව',
      },
      ta: {
        enterCode: (n: number) => `இந்த ${n} இலக்க குறியீட்டை உள்ளிடவும்`,
        sentInfo: 'உங்கள் கைபேசி எண்ணிற்கு சரிபார்ப்பு குறியீட்டை அனுப்பியுள்ளோம்.',
        notReceived: 'குறியீடு கிடைக்கவில்லையா?',
        resend: 'மீண்டும் அனுப்பவும்',
        language: 'மொழி',
      },
    } as const
    return dict[localLang]
  }, [localLang])

  useEffect(() => {
    // focus first empty on mount
    const idx = Math.min(value.length, length - 1)
    inputsRef.current[idx]?.focus()
  }, [])

  const setChar = (i: number, v: string) => {
    const next = value.split('')
    next[i] = v
    const joined = next.join('').slice(0, length)
    onChange(joined)
    if (joined.length === length && onComplete) onComplete(joined)
  }

  return (
    <div className="">
      <div className="text-sm font-medium text-gray-800 mb-1">{t.enterCode(length)}</div>
      <div className="text-xs text-gray-500 mb-3">{t.sentInfo}</div>
      {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
      <div className="flex justify-between gap-2 sm:gap-3 select-none">
        {Array.from({ length }).map((_, i) => {
          const char = value[i] || ''
          return (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              disabled={disabled}
              value={char}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 1)
                setChar(i, v)
                if (v && i < length - 1) inputsRef.current[i + 1]?.focus()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  if (!value[i] && i > 0) inputsRef.current[i - 1]?.focus()
                }
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
                if (pasted) {
                  e.preventDefault()
                  onChange(pasted)
                  const idx = Math.min(pasted.length, length) - 1
                  inputsRef.current[idx]?.focus()
                  if (pasted.length === length && onComplete) onComplete(pasted)
                }
              }}
              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-2xl font-semibold border-2 rounded-xl bg-white shadow-sm
                         border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         transition-transform focus:scale-105"
            />
          )
        })}
      </div>
      <div className="mt-3 text-xs text-gray-600 text-center">
        {t.notReceived}
        {onResend && (
          <button
            type="button"
            onClick={onResend}
            disabled={!!resendDisabled}
            className="ml-2 text-indigo-600 hover:underline disabled:text-gray-400"
          >
            {t.resend}
          </button>
        )}
      </div>
    </div>
  )
}

export default OTPInput
