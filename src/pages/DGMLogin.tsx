import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, LogIn, UserCheck, KeyRound } from "lucide-react"
import api from "../config/api"

export default function DGMLogin() {
    const navigate = useNavigate()
    const [mobileNumber, setMobileNumber] = useState("")
    const [otpCode, setOtpCode] = useState("")
    const [step, setStep] = useState<"mobile" | "otp">("mobile")
    const [dgmName, setDgmName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const urlParams = new URLSearchParams(window.location.search)
    const returnTo = urlParams.get("returnTo") || "/dgm/dashboard"

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            const response = await api.post("/dgm/request-otp", { mobileNumber })
            if (response.data.success) {
                setDgmName(response.data.dgmName)
                setStep("otp")
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to send OTP")
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            const response = await api.post("/dgm/login", { mobileNumber, otpCode })
            if (response.data.success) {
                localStorage.setItem("dgm", JSON.stringify(response.data.dgm))
                localStorage.setItem("dgmToken", response.data.token)
                localStorage.setItem("dq_role", "dgm")
                localStorage.setItem("dq_user", JSON.stringify({
                    id: response.data.dgm.id,
                    mobileNumber: response.data.dgm.mobileNumber,
                    name: response.data.dgm.name,
                    role: "dgm"
                }))
                setTimeout(() => navigate(returnTo), 50)
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Login failed")
        } finally {
            setLoading(false)
        }
    }

    const handleBackToMobile = () => {
        setStep("mobile")
        setOtpCode("")
        setError("")
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-teal-50 to-cyan-100">
            <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-teal-200 shadow-2xl w-full max-w-sm sm:max-w-md p-6 sm:p-8">
                <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-teal-100 rounded-2xl mb-4">
                        {step === "mobile" ? (
                            <UserCheck className="w-7 h-7 sm:w-8 sm:h-8 text-teal-600" />
                        ) : (
                            <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-teal-600" />
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">DGM Portal</h1>
                    <p className="text-sm sm:text-base text-gray-500">
                        {step === "mobile" 
                            ? "Deputy General Manager — enter your mobile number"
                            : `Enter the OTP sent to ${mobileNumber}`
                        }
                    </p>
                    {step === "otp" && dgmName && (
                        <p className="text-sm text-teal-700 mt-2">Welcome, {dgmName}!</p>
                    )}
                </div>

                {error && (
                    <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
                )}

                {step === "mobile" ? (
                    <form onSubmit={handleRequestOTP} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    id="dgm-mobile"
                                    type="tel"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base transition-all"
                                    placeholder="Enter your mobile number"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            id="dgm-send-otp-btn"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base shadow-md hover:shadow-lg"
                        >
                            <LogIn className="w-4 h-4" />
                            {loading ? "Sending OTP..." : "Send OTP"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Enter 4-Digit OTP</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    id="dgm-otp"
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base tracking-widest text-center text-xl font-semibold transition-all"
                                    placeholder="----"
                                    maxLength={4}
                                    pattern="[0-9]{4}"
                                    required
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">OTP expires in 5 minutes</p>
                        </div>

                        <button
                            type="submit"
                            id="dgm-login-btn"
                            disabled={loading || otpCode.length !== 4}
                            className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base shadow-md hover:shadow-lg"
                        >
                            <LogIn className="w-4 h-4" />
                            {loading ? "Verifying..." : "Verify & Login"}
                        </button>

                        <button
                            type="button"
                            onClick={handleBackToMobile}
                            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all text-sm sm:text-base"
                        >
                            Back to Mobile Number
                        </button>
                    </form>
                )}

                <p className="mt-5 text-center text-xs sm:text-sm text-gray-400">Deputy General Manager access only</p>
            </div>
        </div>
    )
}
