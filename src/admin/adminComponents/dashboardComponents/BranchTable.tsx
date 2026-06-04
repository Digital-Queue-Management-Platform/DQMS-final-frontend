//import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface BranchData {
  id: number;
  name: string;
  customersServed: number;
  avgWaitingTime: number;
  avgServiceTime: number;
  rating: number;
  trend: string;
}

interface BranchTableProps {
  data: BranchData[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  sortColumn: string;
  setSortColumn: (column: string) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
}

export function BranchTable({
  data,
  currentPage,
  setCurrentPage,
  sortColumn,
  setSortColumn,
  sortDirection,
  setSortDirection,
}: BranchTableProps) {
  const itemsPerPage = 5;
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a: any, b: any) => {
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    if (typeof aValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
  });

  const currentData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400 text-sm">★</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400 text-sm">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300 text-sm">★</span>
        ))}
        <span className="ml-1 text-xs text-gray-500">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const waitTimeBadge = (t: number) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        t > 15
          ? 'bg-red-100 text-red-800'
          : t > 10
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-green-100 text-green-800'
      }`}
    >
      {t} min
    </span>
  );

  const SortIcon = ({ col }: { col: string }) =>
    sortColumn === col ? (
      sortDirection === 'asc' ? (
        <ArrowUpIcon className="w-3 h-3 ml-1 flex-shrink-0" />
      ) : (
        <ArrowDownIcon className="w-3 h-3 ml-1 flex-shrink-0" />
      )
    ) : null;

  return (
    <div>
      {/* ── Mobile card view (hidden on sm+) ─────────────────────── */}
      <div className="sm:hidden space-y-3">
        {currentData.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-6">No branch data available.</p>
        )}
        {currentData.map((branch) => (
          <div
            key={branch.id}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 leading-snug flex-1 pr-2">
                {branch.name}
              </h4>
              {renderStars(branch.rating)}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Served</p>
                <p className="text-sm font-bold text-gray-900">{branch.customersServed}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Wait</p>
                <div className="flex justify-center">{waitTimeBadge(branch.avgWaitingTime)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Service</p>
                <p className="text-sm font-bold text-gray-900">{branch.avgServiceTime} min</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop table view (hidden below sm) ─────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                { label: 'Branch Name', col: 'name' },
                { label: 'Customers Served', col: 'customersServed' },
                { label: 'Avg. Wait', col: 'avgWaitingTime' },
                { label: 'Avg. Service', col: 'avgServiceTime' },
                { label: 'Rating', col: 'rating' },
              ].map(({ label, col }) => (
                <th
                  key={col}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center">
                    {label}
                    <SortIcon col={col} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No branch data available.
                </td>
              </tr>
            )}
            {currentData.map((branch) => (
              <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[180px] truncate">
                  {branch.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {branch.customersServed}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {waitTimeBadge(branch.avgWaitingTime)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {branch.avgServiceTime} min
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderStars(branch.rating)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-3 sm:px-4 py-3 mt-1">
          {/* Mobile: simple prev/next */}
          <div className="flex sm:hidden items-center gap-2 w-full justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>

          {/* Desktop: full pagination */}
          <div className="hidden sm:flex flex-1 items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
              {' '}–{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, data.length)}
              </span>{' '}
              of <span className="font-medium">{data.length}</span> results
            </p>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
                      : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <span className="sr-only">Next</span>
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}