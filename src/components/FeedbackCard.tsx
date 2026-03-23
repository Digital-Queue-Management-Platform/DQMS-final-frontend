import { Star, MessageSquare, CheckCircle, XCircle } from "lucide-react"

interface FeedbackCardProps {
  feedback: {
    id: string
    rating: number
    comment?: string
    isResolved: boolean
    createdAt: string
    resolvedAt?: string
    resolvedBy?: string
    resolutionComment?: string
    token: {
      tokenNumber: number
      officer: {
        id: string
        name: string
        mobileNumber: string
        counterNumber?: number
      }
      outlet: {
        id: string
        name: string
        location: string
      }
    }
    customer: {
      id: string
      name: string
      mobileNumber: string
    }
  }
  onResolve?: (feedbackId: string, comment: string) => void
}

import React from 'react'
function FeedbackCardComponent({ feedback, onResolve }: FeedbackCardProps) {
  const handleResolve = () => {
    const comment = prompt("Enter resolution comment:")
    if (comment && onResolve) {
      onResolve(feedback.id, comment)
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating
            ? "text-yellow-400 fill-current"
            : "text-gray-300"
        }`}
      />
    ))
  }

  const getRatingColor = (rating: number) => {
    if (rating === 1) return "text-red-600 bg-red-50 border-red-200"
    if (rating === 2) return "text-orange-600 bg-orange-50 border-orange-200"
    if (rating === 3) return "text-blue-600 bg-blue-50 border-blue-200"
    return "text-green-600 bg-green-50 border-green-200"
  }

  return (
    <div className={`border rounded-lg p-4 ${getRatingColor(feedback.rating)}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex">{renderStars(feedback.rating)}</div>
            <span className="text-sm font-medium">
              {feedback.rating}/5 Stars
            </span>
            {feedback.isResolved ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-900">Customer</p>
              <p className="text-gray-600">{feedback.customer.name}</p>
              <p className="text-gray-500">{feedback.customer.mobileNumber}</p>
            </div>

            <div>
              <p className="font-medium text-gray-900">Officer & Location</p>
              <p className="text-gray-600">
                {feedback.token.officer.name} - Counter {feedback.token.officer.counterNumber || 'N/A'}
              </p>
              <p className="text-gray-500">
                Token #{feedback.token.tokenNumber} at {feedback.token.outlet.name}
              </p>
            </div>
          </div>
        </div>

        <div className="text-right text-sm text-gray-500">
          <p>{new Date(feedback.createdAt).toLocaleDateString()}</p>
          <p>{new Date(feedback.createdAt).toLocaleTimeString()}</p>
        </div>
      </div>

      {feedback.comment && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Customer Comment</span>
          </div>
          <p className="text-gray-700 bg-white bg-opacity-50 rounded p-2 text-sm">
            "{feedback.comment}"
          </p>
        </div>
      )}

      {feedback.isResolved ? (
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Resolved</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Resolved by: {feedback.resolvedBy}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            Date: {feedback.resolvedAt ? new Date(feedback.resolvedAt).toLocaleString() : 'N/A'}
          </p>
          {feedback.resolutionComment && (
            <p className="text-sm text-gray-700 bg-white bg-opacity-50 rounded p-2">
              Resolution: {feedback.resolutionComment}
            </p>
          )}
        </div>
      ) : onResolve && (
        <div className="border-t pt-3 mt-3">
          <button
            onClick={handleResolve}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
          >
            Resolve Feedback
          </button>
        </div>
      )}
    </div>
  )
}

const FeedbackCard = React.memo(FeedbackCardComponent)
export default FeedbackCard