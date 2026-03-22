import React from 'react'
import SearchableSelect from '../../../components/SearchableSelect'

interface Header2Props {
  selectedBranch: string
  setSelectedBranch: (branch: string) => void
  branchOptions: string[]
  timeframe?: string
  setTimeframe?: (tf: string) => void
}

const Header2: React.FC<Header2Props> = ({ 
  selectedBranch, 
  setSelectedBranch, 
  branchOptions,
  timeframe,
  setTimeframe
}) => {
  const options = branchOptions.map((name) => ({ _id: name, name }))

  return (
    <div className="p-2 mb-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        {/* Title and Search */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <h1 className="text-lg font-bold text-gray-800 whitespace-nowrap min-w-[200px]">
            {selectedBranch}
          </h1>
          <div className="w-full sm:w-[400px]">
            <SearchableSelect
              options={options}
              value={selectedBranch}
              onChange={setSelectedBranch}
              placeholder="Select branch to view live data"
              displayKey={(opt) => opt.name || opt._id}
              searchKeys={["name", "_id"]}
            />
          </div>
        </div>

        {/* Global timeframe controlled at Dashboard level */}
        {setTimeframe && timeframe && (
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200 ml-auto xl:ml-0">
            {['Today', 'Weekly', 'Monthly', 'Annual'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeframe === tf 
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Header2