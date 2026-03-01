import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, LogIn, Briefcase } from "lucide-react"
import api from "../config/api"

export default function GMLogin() {
    const navigate = useNavigate()
    const [mobileNumber, setMobileNumber] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const urlParams = new URLSearchParams(window.location.search)
    const returnTo = urlParams.get("returnTo") || "/gm/dashboard"

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            const response = await api.post("/gm/login", { mobileNumber })
            if (response.data.success) {
                localStorage.setItem("gm", JSON.stringify(response.data.gm))
                localStorage.setItem("gmToken", response.data.token)
                localStorage.setItem("dq_role", "gm")
                localStorage.setItem("dq_user", JSON.stringify({
                    id: response.data.gm.id,
                    mobileNumber: response.data.gm.mobileNumber,
                    name: response.data.gm.name,
                    role: "gm"
                }))
                setTimeout(() => navigate(returnTo), 50)
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Login failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-violet-50 to-purple-100">
            <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-violet-200 shadow-2xl w-full max-w-sm sm:max-w-md p-6 sm:p-8">
                <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-violet-100 rounded-2xl mb-4">
                        <Briefcase className="w-7 h-7 sm:w-8 sm:h-8 text-violet-600" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">GM Portal</h1>
                    <p className="text-sm sm:text-base text-gray-500">General Manager — enter your mobile number</p>
                </div>

                {error && (
                    <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                            <input
                                id="gm-mobile"
                                type="tel"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm sm:text-base transition-all"
                                placeholder="Enter your mobile number"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        id="gm-login-btn"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base shadow-md hover:shadow-lg"
                    >
                        <LogIn className="w-4 h-4" />
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="mt-5 text-center text-xs sm:text-sm text-gray-400">General Manager access only</p>
            </div>
        </div>
    )
}
