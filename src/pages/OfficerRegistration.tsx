"use client"

import React, { useState, useEffect } from "react"
import api from "../config/api"
import type { Outlet } from "../types"

export default function OfficerRegistration() {
  const [name, setName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState("")
  const [counterNumber, setCounterNumber] = useState<number | "">("")
  const [isTraining, setIsTraining] = useState(false)
  const [languages, setLanguages] = useState<string[]>([])
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateMobile = (v: string) => /^0[0-9]{9}$/.test(v.replace(/\s/g, ''))
  const validateEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

  useEffect(() => {
    fetchOutlets()
  }, [])

  const fetchOutlets = async () => {
    try {
      const res = await api.get("/queue/outlets")
      setOutlets(res.data)
      if (res.data.length > 0) setSelectedOutlet(res.data[0].id)
    } catch (err) {
      console.error("Failed to fetch outlets", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setLoading(true)

    // Validate fields
    const errors: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) errors.name = "Full name must be at least 2 characters"
    if (!validateMobile(mobileNumber)) errors.mobileNumber = "Enter a valid 10-digit Sri Lankan number (e.g. 071XXXXXXX)"
    if (!validateEmail(email)) errors.email = "Enter a valid email address"
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setLoading(false)
      return
    }
    setValidationErrors({})

    try {
      const payload: any = {
        name,
        mobileNumber,
        email,
        outletId: selectedOutlet,
      }
      if (counterNumber !== "") payload.counterNumber = Number(counterNumber)
      if (isTraining) payload.isTraining = true
      if (languages.length > 0) payload.languages = languages

      const res = await api.post("/officer/register", payload)
      if (res.data.success) {
        setMessage("Officer registered successfully")
        setName("")
        setMobileNumber("")
        setEmail("")
        setCounterNumber("")
        setIsTraining(false)
        setLanguages([])
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Registration failed"
      if (err.response?.status === 409) {
        setValidationErrors(prev => ({ ...prev, mobileNumber: msg }))
      } else {
        setMessage(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">Register Officer</h2>
      {message && <div className="mb-4 text-sm text-green-700 bg-green-50 p-3 rounded">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full name *</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setValidationErrors(p => ({ ...p, name: '' })) }} required className={`w-full px-3 py-2 border rounded ${validationErrors.name ? 'border-red-500' : ''}`} />
          {validationErrors.name && <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Mobile number *</label>
          <input value={mobileNumber} onChange={(e) => { setMobileNumber(e.target.value); setValidationErrors(p => ({ ...p, mobileNumber: '' })) }} required className={`w-full px-3 py-2 border rounded ${validationErrors.mobileNumber ? 'border-red-500' : ''}`} placeholder="07XXXXXXXX" maxLength={10} />
          {validationErrors.mobileNumber && <p className="text-xs text-red-600 mt-1">{validationErrors.mobileNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setValidationErrors(p => ({ ...p, email: '' })) }} className={`w-full px-3 py-2 border rounded ${validationErrors.email ? 'border-red-500' : ''}`} placeholder="officer@slt.lk" />
          <p className="text-xs text-gray-400 mt-1">If provided, login credentials will be emailed.</p>
          {validationErrors.email && <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>}
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

        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded">
          {loading ? "Registering..." : "Register Officer"}
        </button>
      </form>
    </div>
  )
}
