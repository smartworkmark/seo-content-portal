'use client';

import { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectDropdown({ label, options, selected, onChange }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key to close dropdown
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleToggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    // If all are selected or some are selected, clear all (means "all")
    // If none selected, stay at none (means "all")
    onChange([]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const removeTag = (option: string) => {
    onChange(selected.filter((s) => s !== option));
  };

  // Determine display text
  const getDisplayText = () => {
    if (selected.length === 0) {
      return `All ${label}s`;
    }
    if (selected.length === 1) {
      return selected[0];
    }
    if (selected.length === 2) {
      return `${selected[0]}, ${selected[1]}`;
    }
    return `${selected.length} selected`;
  };

  const isAllSelected = selected.length === 0;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-[200px] border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
      >
        <span className="truncate">{getDisplayText()}</span>
        <svg
          className={`ml-2 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Selected Tags (only show when 1-3 items and dropdown is closed) */}
      {!isOpen && selected.length > 0 && selected.length <= 3 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full"
            >
              <span className="truncate max-w-[120px]">{item}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(item);
                }}
                className="hover:text-indigo-950"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}s...`}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`text-xs font-medium ${
                isAllSelected ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              All {label}s
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOption(option)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span className={isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}>
                      {option}
                    </span>
                  </label>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No {label.toLowerCase()}s found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
