'use client';

import { DateRange, ContentType } from '@/types';
import { SearchableSelect } from './SearchableSelect';

interface FiltersProps {
  contentType: ContentType;
  practices: string[];
  accounts: string[];
  selectedPractice: string;
  selectedDateRange: DateRange;
  onPracticeChange: (practice: string) => void;
  onDateRangeChange: (range: DateRange) => void;
  onExport: () => void;
}

export function Filters({
  contentType,
  practices,
  accounts,
  selectedPractice,
  selectedDateRange,
  onPracticeChange,
  onDateRangeChange,
  onExport,
}: FiltersProps) {
  const isRepliesTab = contentType === 'replies';
  const filterLabel = isRepliesTab ? 'Account' : 'Practice';
  const filterOptions = isRepliesTab ? accounts : practices;

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Practice/Account Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            {filterLabel}:
          </label>
          <SearchableSelect
            label={filterLabel}
            options={filterOptions}
            value={selectedPractice}
            onChange={onPracticeChange}
          />
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {dateRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onDateRangeChange(option.value)}
              className={`
                px-3 py-1.5 text-sm rounded-md transition-colors
                ${selectedDateRange === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-900'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export CSV
      </button>
    </div>
  );
}
