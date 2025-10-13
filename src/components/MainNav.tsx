"use client"

//import React from "react"
import { Link, useLocation } from "react-router-dom"
import { Home, User, Users, BarChart } from "lucide-react"

export function MainNav() {
  const location = useLocation()
  const isOfficer = !!localStorage.getItem("officer")

  return (
    <nav className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              to="/"
              className={`flex items-center px-4 text-gray-900 border-b-2 ${
                location.pathname === "/" ? "border-blue-500" : "border-transparent"
              }`}
            >
              <Home className="w-5 h-5 mr-2" />
              Home
            </Link>

            <Link
              to="/queue-status"
              className={`flex items-center px-4 text-gray-900 border-b-2 ${
                location.pathname === "/queue-status" ? "border-blue-500" : "border-transparent"
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Queue Status
            </Link>

            {isOfficer ? (
              <Link
                to="/officer/dashboard"
                className={`flex items-center px-4 text-gray-900 border-b-2 ${
                  location.pathname === "/officer/dashboard" ? "border-blue-500" : "border-transparent"
                }`}
              >
                <User className="w-5 h-5 mr-2" />
                Officer Dashboard
              </Link>
            ) : (
              <Link
                to="/officer/login"
                className={`flex items-center px-4 text-gray-900 border-b-2 ${
                  location.pathname === "/officer/login" ? "border-blue-500" : "border-transparent"
                }`}
              >
                <User className="w-5 h-5 mr-2" />
                Officer Login
              </Link>
            )}

            <Link
              to="/admin"
              className={`flex items-center px-4 text-gray-900 border-b-2 ${
                location.pathname === "/admin" ? "border-blue-500" : "border-transparent"
              }`}
            >
              <BarChart className="w-5 h-5 mr-2" />
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}