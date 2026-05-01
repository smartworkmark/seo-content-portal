'use client';

import { DateRange, ContentType, SavedFilter, FeatureFilters, Severity } from '@/types';
import { FEATURE_CONFIG } from '@/lib/features';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { SavedFiltersBar } from './SavedFiltersBar';
import { SaveFilterModal } from './SaveFilterModal';
import { useState } from 'react';

interface FiltersProps {
  contentType: ContentType;
  practices: string[];
  accounts: string[];
  selectedPractices: string[];
  selectedDateRange: DateRange;
  onPracticesChange: (practices: string[]) => void;
  onDateRangeChange: (range: DateRange) => void;
  onExport: () => void;
  savedFilters: SavedFilter[];
  onApplyFilter: (filter: SavedFilter) => void;
  onSaveFilter: (name: string) => void;
  onDeleteFilter: (id: string) => void;
  featureFilters?: FeatureFilters;
  onFeatureToggle?: (feature: string) => void;
  selectedSeverities?: Severity[];
  onSeveritiesChange?: (severities: Severity[]) => void;
}

const SEVERITY_OPTIONS: Severity[] = ['Critical', 'Investigate', 'Alert', 'Underpace', 'Auto', 'OK'];

export function Filters({
  contentType,
  practices,
  accounts,
  selectedPractices,
  selectedDateRange,
  onPracticesChange,
  onDateRangeChange,
  onExport,
  savedFilters,
  onApplyFilter,
  onSaveFilter,
  onDeleteFilter,
  featureFilters = {},
  onFeatureToggle,
  selectedSeverities = [],
  onSeveritiesChange,
}: FiltersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isRepliesTab = contentType === 'replies';
  const filterLabel = isRepliesTab ? 'Account' : 'Practice';
  const filterOptions = isRepliesTab ? accounts : practices;

  const isShortRangeTab = contentType === 'neg-keywords' || contentType === 'g-ads-pacing';
  const dateRangeOptions: { value: DateRange; label: string }[] = isShortRangeTab
    ? [
        { value: '1d', label: 'Last 1 Day' },
        { value: '3d', label: 'Last 3 Days' },
        { value: '7d', label: 'Last 7 Days' },
      ]
    : [
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' },
        { value: '90d', label: 'Last 90 Days' },
      ];

  const handleSaveFilter = (name: string) => {
    onSaveFilter(name);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 py-4">
      {/* Saved Filters Bar */}
      <SavedFiltersBar
        savedFilters={savedFilters}
        currentPractices={selectedPractices}
        currentDateRange={selectedDateRange}
        onApplyFilter={onApplyFilter}
        onDeleteFilter={onDeleteFilter}
        onSaveClick={() => setIsModalOpen(true)}
      />

      {/* Main Filters Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
          {/* Practice/Account Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">
              {filterLabel}:
            </label>
            <MultiSelectDropdown
              label={filterLabel}
              options={filterOptions}
              selected={selectedPractices}
              onChange={onPracticesChange}
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

          {/* Severity Filter — G Ads Pacing tab only */}
          {contentType === 'g-ads-pacing' && onSeveritiesChange && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Severity:</label>
              <MultiSelectDropdown
                label="Severity"
                pluralLabel="Severities"
                options={SEVERITY_OPTIONS}
                selected={selectedSeverities}
                onChange={(s) => onSeveritiesChange(s as Severity[])}
              />
            </div>
          )}

          {/* Feature Filter Pills — blogs tab only */}
          {contentType === 'blogs' && onFeatureToggle && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Features:</span>
              {Object.entries(FEATURE_CONFIG).map(([key, config]) => {
                const mode = featureFilters[key]; // undefined | 'include' | 'exclude'
                const isInclude = mode === 'include';
                const isExclude = mode === 'exclude';
                const borderColor = isInclude ? config.color : isExclude ? '#f43f5e' : '#e2e8f0';
                const textColor = isInclude ? config.color : isExclude ? '#f43f5e' : '#94a3b8';
                const bgColor = isInclude ? config.bgColor : isExclude ? '#fff1f2' : 'transparent';
                const iconColor = isInclude ? config.color : isExclude ? '#f43f5e' : '#b0aec5';
                return (
                  <button
                    key={key}
                    onClick={() => onFeatureToggle(key)}
                    style={{ borderColor, color: textColor, backgroundColor: bgColor }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                  >
                    <span style={{ color: iconColor, display: 'inline-flex' }}>
                      <config.Icon />
                    </span>
                    {isInclude && <span>✓</span>}
                    {isExclude && <span>✗</span>}
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}
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

      {/* Save Filter Modal */}
      <SaveFilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFilter}
        practices={selectedPractices}
        dateRange={selectedDateRange}
      />
    </div>
  );
}
