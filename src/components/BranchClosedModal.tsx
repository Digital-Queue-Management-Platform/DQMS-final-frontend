import { AlertTriangle, Clock, X } from "lucide-react"

interface BranchClosedModalProps {
    reason: string | null
    activeNotice?: { title: string; message: string } | null
    /** If omitted, the modal is non-dismissable (no close button, no backdrop click) */
    onDismiss?: () => void
}

/**
 * Full-screen modal shown when a branch is detected as closed.
 * When `onDismiss` is not provided the modal is fully blocking — no way to close it.
 */
export default function BranchClosedModal({ reason, activeNotice, onDismiss }: BranchClosedModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Top accent bar */}
                <div className="h-2 bg-gradient-to-r from-red-500 to-orange-400" />

                <div className="p-8 text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                        <div className="bg-red-100 rounded-full p-4">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Branch Closed</h2>

                    {/* Reason */}
                    {reason && (
                        <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
                            <Clock className="w-4 h-4 shrink-0" />
                            <p className="text-sm">{reason}</p>
                        </div>
                    )}

                    {/* Active notice */}
                    {activeNotice && (
                        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
                            <p className="text-sm font-semibold text-orange-800 mb-1">{activeNotice.title}</p>
                            <p className="text-sm text-orange-700">{activeNotice.message}</p>
                        </div>
                    )}

                    <p className="mt-6 text-sm text-gray-500">
                        We apologize for the inconvenience. Please visit us during regular business hours.
                    </p>

                    {/* Dismiss button — only shown when dismissal is explicitly allowed */}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="mt-6 px-6 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Dismiss
                        </button>
                    )}
                </div>

                {/* Close icon — only shown when dismissal is explicitly allowed */}
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    )
}
