'use client';

import { useState, useRef, useEffect } from 'react';
import { DateRange } from '@/types';

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  practices: string[];
  dateRange: DateRange;
}

export function SaveFilterModal({
  isOpen,
  onClose,
  onSave,
  practices,
  dateRange,
}: SaveFilterModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Use microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => {
        setName('');
        setError('');
      });
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a name');
      return;
    }

    onSave(trimmedName);
    setName('');
    setError('');
  };

  const getDateRangeLabel = (range: DateRange): string => {
    switch (range) {
      case '7d':
        return 'Last 7 days';
      case '30d':
        return 'Last 30 days';
      case 'all':
        return 'All time';
    }
  };

  const getPracticesSummary = (): string => {
    if (practices.length === 0) {
      return 'All practices';
    }
    if (practices.length === 1) {
      return practices[0];
    }
    if (practices.length === 2) {
      return practices.join(', ');
    }
    return `${practices.length} practices`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Save Filter</h2>

        {/* Summary */}
        <div className="bg-gray-50 rounded-md p-3 mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Practices:</span> {getPracticesSummary()}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">Date range:</span> {getDateRangeLabel(dateRange)}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 mb-1">
              Filter name
            </label>
            <input
              ref={inputRef}
              id="filter-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g., East Coast Practices"
              className={`
                w-full px-3 py-2 border rounded-md text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600
                ${error ? 'border-red-300' : 'border-gray-300'}
              `}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
