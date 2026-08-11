'use client';

import { DateRange, ContentType, SavedFilter, FeatureFilters } from '@/types';
import { FEATURE_CONFIG } from '@/lib/features';
import { STATUS_FILTER_OPTIONS, type PacingView, type StatusFilter } from '@/lib/g-ads-pacing';
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
  selectedStatuses?: StatusFilter[];
  onStatusesChange?: (statuses: StatusFilter[]) => void;
  selectedModes?: Array<'account' | 'campaign'>;
  onModesChange?: (modes: Array<'account' | 'campaign'>) => void;
  needsReviewOnly?: boolean;
  onNeedsReviewChange?: (v: boolean) => void;
  pacingView?: PacingView;
  onPacingViewChange?: (v: PacingView) => void;
  pausedCount?: number;
  lastMonthCount?: number;
  // "July 2026" — computed once in page.tsx so the chip and the table's empty state agree.
  periodLabel?: string;
  selectedConfidences?: string[];
  onConfidencesChange?: (confidences: string[]) => void;
}

const MODE_OPTIONS = ['Account-level', 'Campaign-level'] as const;
const modeLabelToValue = (label: string): 'account' | 'campaign' =>
  label === 'Campaign-level' ? 'campaign' : 'account';
const modeValueToLabel = (value: 'account' | 'campaign'): string =>
  value === 'campaign' ? 'Campaign-level' : 'Account-level';
const CONFIDENCE_OPTIONS: string[] = ['high', 'medium', 'low'];

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
  selectedStatuses = [],
  onStatusesChange,
  selectedModes = [],
  onModesChange,
  needsReviewOnly = false,
  onNeedsReviewChange,
  pacingView = 'daily',
  onPacingViewChange,
  pausedCount = 0,
  lastMonthCount = 0,
  periodLabel = '',
  selectedConfidences = [],
  onConfidencesChange,
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

          {/* Date range, or a static period chip in the two alternate pacing views */}
          <div className="flex items-center gap-2">
            {contentType === 'g-ads-pacing' && pacingView !== 'daily' ? (
              // The alternate views are scoped server-side (current month for pauses, previous
              // calendar month for closing spend), so the 1/3/7-day pills don't apply. The chip
              // reuses the selected-pill styling so the control reads as "locked", and
              // selectedDateRange is left untouched — returning to Daily restores it.
              <div className="flex items-center rounded-lg bg-gray-100 p-1">
                <span className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm">
                  {pacingView === 'paused' ? 'This Month' : (periodLabel || 'Last Month')}
                </span>
              </div>
            ) : (
              <fieldset className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
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
              </fieldset>
            )}

            {/* Pacing view — a segmented control rather than independent toggles, so the three
                mutually exclusive views can't be combined. */}
            {contentType === 'g-ads-pacing' && onPacingViewChange && (
              <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                {([
                  { value: 'daily', label: 'Daily' },
                  { value: 'paused', label: `Paused practices (${pausedCount})` },
                  { value: 'last-month', label: `Last month (${lastMonthCount})` },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={pacingView === option.value}
                    onClick={() => onPacingViewChange(option.value)}
                    className={`
                      px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors
                      ${pacingView === option.value
                        ? 'bg-white text-gray-900 shadow-sm font-medium'
                        : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-900'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Confidence Filter — Keyword Buildout tab only */}
          {contentType === 'kw-buildout' && onConfidencesChange && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Confidence:</label>
              <MultiSelectDropdown
                label="Confidence"
                pluralLabel="Confidences"
                options={CONFIDENCE_OPTIONS}
                selected={selectedConfidences}
                onChange={onConfidencesChange}
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

      {/* Second row — G Ads Pacing record filters, separated from the view controls above so the
          bar stops wrapping and the view/filter distinction is visible. Gated on the tab (not on
          the individual handlers) so every other tab renders exactly one row. All three are inert
          in the Paused and Last month views, which are scoped server-side; the selections are
          disabled rather than cleared, so they reapply on return to Daily. */}
      {contentType === 'g-ads-pacing' && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
          {onStatusesChange && (
            <fieldset
              disabled={pacingView !== 'daily'}
              className={`flex items-center gap-2 transition-opacity ${pacingView !== 'daily' ? 'opacity-45' : ''}`}
            >
              <label className="text-sm text-gray-600 whitespace-nowrap">Status:</label>
              <MultiSelectDropdown
                label="Status"
                pluralLabel="Statuses"
                options={STATUS_FILTER_OPTIONS}
                selected={selectedStatuses}
                onChange={(s) => onStatusesChange(s as StatusFilter[])}
              />
            </fieldset>
          )}

          {onModesChange && (
            <fieldset
              disabled={pacingView !== 'daily'}
              className={`flex items-center gap-2 transition-opacity ${pacingView !== 'daily' ? 'opacity-45' : ''}`}
            >
              <label className="text-sm text-gray-600 whitespace-nowrap">Mode:</label>
              <MultiSelectDropdown
                label="Mode"
                pluralLabel="Modes"
                options={[...MODE_OPTIONS]}
                selected={selectedModes.map(modeValueToLabel)}
                onChange={(labels) => onModesChange(labels.map(modeLabelToValue))}
              />
            </fieldset>
          )}

          {onNeedsReviewChange && (
            <fieldset
              disabled={pacingView !== 'daily'}
              className={`flex items-center gap-2 transition-opacity ${pacingView !== 'daily' ? 'opacity-45' : ''}`}
            >
              <label className="text-sm text-gray-600 whitespace-nowrap">Feedback:</label>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {([
                  { value: false, label: 'All' },
                  { value: true, label: 'Needs review' },
                ] as const).map((option) => (
                  <button
                    key={option.label}
                    onClick={() => onNeedsReviewChange(option.value)}
                    className={`
                      px-3 py-1.5 text-sm rounded-md transition-colors
                      ${needsReviewOnly === option.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-900'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

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
