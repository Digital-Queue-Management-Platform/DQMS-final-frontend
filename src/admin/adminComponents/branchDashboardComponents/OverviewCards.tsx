import React from 'react'
import { UsersIcon, ClockIcon, StarIcon, TimerIcon } from 'lucide-react'

interface OverviewData {
  totalCustomers: number
  avgWaitingTime: number
  avgServiceTime: number
  customerSatisfaction: number
}

interface OverviewCardsProps {
  data: OverviewData
}

interface Card {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
}

const OverviewCards: React.FC<OverviewCardsProps> = ({ data }) => {
  const cards: Card[] = [
    {
      title: 'Total Customers Served',
      value: data.totalCustomers.toString(),
      change: '+5.2%',
      icon: <UsersIcon size={24} className="text-blue-600" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Average Waiting Time',
      value: `${data.avgWaitingTime} min`,
      change: '-2.3%',
      icon: <ClockIcon size={24} className="text-green-600" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Average Service Time',
      value: `${data.avgServiceTime} min`,
      change: '-1.1%',
      icon: <TimerIcon size={24} className="text-purple-600" />,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Customer Satisfaction',
      value: `${data.customerSatisfaction.toFixed(1)}/5`,
      change: '+0.3',
      icon: <StarIcon size={24} className="text-amber-600" />,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                {card.title}
              </h3>
              <div className="mt-2 flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">
                  {card.value}
                </p>
                <span className={`ml-2 text-sm font-medium ${card.textColor}`}>
                  {card.change}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-full ${card.bgColor}`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default OverviewCards