'use client';

import { SavedFilter, DateRange } from '@/types';

interface SavedFiltersBarProps {
  savedFilters: SavedFilter[];
  currentPractices: string[];
  currentDateRange: DateRange;
  onApplyFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (id: string) => void;
  onSaveClick: () => void;
}

export function SavedFiltersBar({
  savedFilters,
  currentPractices,
  currentDateRange,
  onApplyFilter,
  onDeleteFilter,
  onSaveClick,
}: SavedFiltersBarProps) {
  // Only show Save button when specific practices are selected
  const hasCustomFilter = currentPractices.length > 0;

  // Check if a saved filter matches current selection
  const isFilterActive = (filter: SavedFilter): boolean => {
    const practicesMatch =
      filter.practices.length === currentPractices.length &&
      filter.practices.every((p) => currentPractices.includes(p));
    return practicesMatch && filter.dateRange === currentDateRange;
  };

  // Hide the entire bar if no saved filters and no practices selected
  if (savedFilters.length === 0 && !hasCustomFilter) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 py-2 overflow-x-auto">
      <span className="text-xs text-gray-500 whitespace-nowrap">Saved:</span>

      {/* Saved Filter Chips */}
      <div className="flex items-center gap-2">
        {savedFilters.map((filter) => {
          const isActive = isFilterActive(filter);
          return (
            <div
              key={filter.id}
              className={`
                group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                transition-colors cursor-pointer
                ${isActive
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }
              `}
              onClick={() => onApplyFilter(filter)}
            >
              <svg
                className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              <span className="whitespace-nowrap">{filter.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFilter(filter.id);
                }}
                className="ml-0.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-300/50 transition-opacity"
                title="Delete filter"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Save Button */}
        {hasCustomFilter && (
          <button
            type="button"
            onClick={onSaveClick}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-white border border-dashed border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Save</span>
          </button>
        )}
      </div>
    </div>
  );
}
