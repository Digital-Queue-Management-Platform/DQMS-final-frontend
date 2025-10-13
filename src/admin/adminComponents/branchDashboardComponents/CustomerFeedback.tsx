import React from 'react'
import {
  AlertCircleIcon,
  MessageSquareIcon,
  AlertTriangleIcon,
} from 'lucide-react'

interface FeedbackItem {
  id: string | number
  customerName: string
  rating: number
  message: string
  timestamp: string
  isAlert: boolean
}

interface CustomerFeedbackProps {
  feedback: FeedbackItem[]
}

const CustomerFeedback: React.FC<CustomerFeedbackProps> = ({ feedback }) => {
  // Sort feedback to show alerts first, then by timestamp
  const sortedFeedback = [...feedback].sort((a, b) => {
    if (a.isAlert && !b.isAlert) return -1
    if (!a.isAlert && b.isAlert) return 1
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Customer Feedback & Alerts
        </h2>
        <button className="text-sm text-blue-600 hover:text-blue-800">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {feedback.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquareIcon size={24} className="mx-auto mb-2" />
            <p>No feedback available for this branch</p>
          </div>
        ) : (
          sortedFeedback.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border ${
                item.isAlert
                  ? item.rating <= 2
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  {item.isAlert ? (
                    <AlertCircleIcon size={16} className="text-red-500 mr-2" />
                  ) : item.rating <= 3 ? (
                    <AlertTriangleIcon
                      size={16}
                      className="text-amber-500 mr-2"
                    />
                  ) : (
                    <MessageSquareIcon
                      size={16}
                      className="text-gray-400 mr-2"
                    />
                  )}
                  <span className="font-medium text-gray-900">
                    {item.customerName}
                  </span>
                </div>

                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`h-4 w-4 ${
                        i < item.rating ? 'text-amber-400' : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>

              <p className="text-sm text-gray-700">{item.message}</p>
              <div className="mt-2 text-xs text-gray-500">{item.timestamp}</div>
            </div>
          ))
        )}
      </div>

      {feedback.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Branch Alert Summary
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500">Low Ratings (≤ 3★)</div>
              <div className="font-semibold">
                {feedback.filter((item) => item.rating <= 3).length}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500">Critical Alerts</div>
              <div className="font-semibold">
                {feedback.filter((item) => item.isAlert).length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerFeedback