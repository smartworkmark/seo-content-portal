'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function SearchableSelect({ label, options, value, onChange }: SearchableSelectProps) {
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

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const displayValue = value === 'all' ? `All ${label}s` : value;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-[200px] border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
      >
        <span className="truncate">{displayValue}</span>
        <svg
          className={`ml-2 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

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

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {/* "All" Option */}
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                value === 'all' ? 'bg-indigo-50 text-indigo-900 font-medium' : 'text-gray-700'
              }`}
            >
              All {label}s
            </button>

            {/* Filtered Options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    value === option ? 'bg-indigo-50 text-indigo-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))
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
