import React from 'react'
import {
  RefreshCw,
  Download,
  Clock,
} from 'lucide-react'
import SearchableSelect from '../../../components/SearchableSelect'

interface Header2Props {
  selectedBranch: string
  setSelectedBranch: (branch: string) => void
  branchOptions: string[]
}

const Header2: React.FC<Header2Props> = ({ 
  selectedBranch, 
  setSelectedBranch, 
  branchOptions 
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  const options = branchOptions.map((name) => ({ _id: name, name }))

  return (
    <div className="p-2 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        {/* Title and Date */}
        <div>
          <h1 className="text-lg font-semibold text-gray-800">
            {selectedBranch}
          </h1>
          <div className="flex text-sm items-center text-gray-500 mt-1">
            <Clock size={16} className="mr-1" />
            <span>
              {currentDate} | {currentTime}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-0">
          {/* Branch Select */}
          <div className="min-w-64">
            <SearchableSelect
              options={options}
              value={selectedBranch}
              onChange={setSelectedBranch}
              placeholder="Select branch"
              displayKey={(opt) => opt.name || opt._id}
              searchKeys={["name", "_id"]}
            />
          </div>

          {/* Refresh Button */}
          <button className="flex items-center bg-white border border-gray-300 rounded-md px-4 py-2 text-gray-700 hover:bg-gray-50">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>

          {/* Export Button */}
          <button className="flex items-center bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700">
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>
    </div>
  )
}

export default Header2