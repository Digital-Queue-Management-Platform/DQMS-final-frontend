"use client"

import React, { useState } from "react"
import api from "../config/api"

export default function AdminRegistration() {
  const [regionName, setRegionName] = useState("")
  const [managerName, setManagerName] = useState("")
  const [managerEmail, setManagerEmail] = useState("")
  const [managerMobile, setManagerMobile] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const res = await api.post("/admin/register-region", {
        name: regionName,
        managerName,
        managerEmail,
        managerMobile,
      })

      if (res.data.success) {
        setMessage("Region created successfully")
        setRegionName("")
        setManagerName("")
        setManagerEmail("")
        setManagerMobile("")
      }
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">Admin / Region Registration</h2>
      {message && <div className="mb-4 text-sm text-green-700">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Region name</label>
          <input value={regionName} onChange={(e) => setRegionName(e.target.value)} required className="w-full px-3 py-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Manager name</label>
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Manager email</label>
          <input value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} type="email" className="w-full px-3 py-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Manager mobile</label>
          <input value={managerMobile} onChange={(e) => setManagerMobile(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
          {loading ? "Creating..." : "Create Region"}
        </button>
      </form>
    </div>
  )
}
