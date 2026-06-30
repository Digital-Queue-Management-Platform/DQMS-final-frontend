import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../config/api'

interface ShortUrlResolverProps { }

const ShortUrlResolver: React.FC<ShortUrlResolverProps> = () => {
  const { shortId } = useParams<{ shortId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const resolveShortUrl = async () => {
      if (!shortId) {
        setError('Invalid short URL')
        setLoading(false)
        return
      }

      try {
        console.log(`Resolving short URL: /t/${shortId}`)
        const response = await api.get(`/customer/t/${shortId}`)

        if (response.data.token) {
          const tokenId = response.data.token.id
          console.log(`Short URL resolved to token: ${tokenId}`)

          // Determine if we should go to feedback or queue dashboard
          const isFeedback = window.location.pathname.startsWith('/f/') || window.location.search.includes('f=1')

          if (isFeedback) {
            navigate(`/feedback/${tokenId}`, { replace: true })
          } else {
            // Redirect to the token queue status page
            navigate(`/queue/${tokenId}`, { replace: true })
          }
        } else {
          throw new Error('Token not found')
        }
      } catch (error) {
        console.error('Failed to resolve short URL:', error)
        setError('Link not found or expired. Please try registering again.')
        setLoading(false)
      }
    }

    resolveShortUrl()
  }, [shortId, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">Loading your token...</h2>
          <p className="text-sm text-gray-600 mt-2">Please wait while we redirect you</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Link Not Found</h2>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // This should never render since we redirect when successful
  return null
}

export default ShortUrlResolver