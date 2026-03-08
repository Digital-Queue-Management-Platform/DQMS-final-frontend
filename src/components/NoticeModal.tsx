import { Bell, X } from "lucide-react"

interface Notice {
    id: string
    title: string
    message: string
}

interface NoticeModalProps {
    notices: Notice[]
    onDismiss: (id: string) => void
}

/**
 * Dismissable modal shown for standard (informational) notices.
 * Customers can close each notice and continue.
 */
export default function NoticeModal({ notices, onDismiss }: NoticeModalProps) {
    if (notices.length === 0) return null

    const notice = notices[0]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Top accent */}
                <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />

                <div className="p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-blue-100 rounded-full p-4">
                            <Bell className="w-10 h-10 text-blue-600" />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-2">{notice.title}</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">{notice.message}</p>

                    {notices.length > 1 && (
                        <p className="mt-3 text-xs text-gray-400">
                            Notice {1} of {notices.length}
                        </p>
                    )}

                    <button
                        onClick={() => onDismiss(notice.id)}
                        className="mt-6 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {notices.length > 1 ? "Next" : "OK, Continue"}
                    </button>
                </div>

                <button
                    onClick={() => onDismiss(notice.id)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close notice"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
