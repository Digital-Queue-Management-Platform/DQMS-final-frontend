"use client"

import React, { useEffect, useMemo, useState } from "react"
import api from "../config/api"
import type { Outlet } from "../types"

export default function ManagerOfficerRegistration() {
  const [name, setName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState("")
  const [counterNumber, setCounterNumber] = useState<number | "">("")
  const [isTraining, setIsTraining] = useState(false)
  const [languages, setLanguages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // Load manager and region outlets from /manager/me to scope outlets
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get("/manager/me")
  const all = (res.data?.manager?.outlets || []) as Outlet[]
  const active = all.filter((o: any) => o.isActive !== false)
  if (!mounted) return
  setOutlets(active)
  if (active.length > 0) setSelectedOutlet(active[0].id)
      } catch (e) {
        console.error("Failed to load manager outlets", e)
      }
    })()
    return () => { mounted = false }
  }, [])

  const maxCounter = useMemo(() => {
    const outlet = outlets.find(o => o.id === selectedOutlet) as any
    return outlet?.counterCount ?? undefined
  }, [outlets, selectedOutlet])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setLoading(true)

    try {
      const payload: any = {
        name,
        mobileNumber,
        outletId: selectedOutlet,
      }
      if (counterNumber !== "") payload.counterNumber = Number(counterNumber)
      if (isTraining) payload.isTraining = true
      if (languages.length > 0) payload.languages = languages

      // Use manager-protected endpoint
      const res = await api.post("/manager/officers", payload)
      if (res.data.success) {
        setMessage("Officer registered successfully")
        setName("")
        setMobileNumber("")
        setCounterNumber("")
        setIsTraining(false)
        setLanguages([])
      }
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 mt-4">
      <h2 className="text-xl font-bold mb-4">Register Officer</h2>
      {message && <div className="mb-4 text-sm text-green-700">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Mobile number</label>
          <input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required className="w-full px-3 py-2 border rounded" placeholder="07XXXXXXXX" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Outlet</label>
          <select value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)} className="w-full px-3 py-2 border rounded" required>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.name} - {o.location}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Counter number (optional)</label>
          <input type="number" value={counterNumber as any} onChange={(e) => setCounterNumber(e.target.value === "" ? "" : Number(e.target.value))} className="w-full px-3 py-2 border rounded" />
          {maxCounter !== undefined && <p className="text-xs text-gray-500 mt-1">Max available counters: {maxCounter}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input id="training" type="checkbox" checked={isTraining} onChange={(e) => setIsTraining(e.target.checked)} />
          <label htmlFor="training" className="text-sm text-gray-700">Is training officer</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Languages</label>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            {[
              { code: 'en', label: 'English' },
              { code: 'si', label: 'Sinhala' },
              { code: 'ta', label: 'Tamil' },
            ].map((lang) => (
              <label key={lang.code} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={languages.includes(lang.code)}
                  onChange={(e) => {
                    setLanguages((prev) =>
                      e.target.checked ? [...prev, lang.code] : prev.filter((c) => c !== lang.code)
                    )
                  }}
                />
                <span>{lang.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Select all languages the officer can handle.</p>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-2 rounded">
          {loading ? "Registering..." : "Register Officer"}
        </button>
      </form>
    </div>
  )
}
