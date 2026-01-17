'use client';

import { useState, useEffect, useCallback } from 'react';
import { SavedFilter, ContentType, DateRange } from '@/types';
import {
  getSavedFilters,
  saveFilter as saveFilterToStorage,
  deleteFilter as deleteFilterFromStorage,
} from '@/lib/saved-filters';

interface UseSavedFiltersReturn {
  savedFilters: SavedFilter[];
  isLoaded: boolean;
  saveFilter: (filter: {
    name: string;
    contentType: ContentType;
    practices: string[];
    dateRange: DateRange;
  }) => SavedFilter;
  deleteFilter: (id: string) => void;
  getFiltersForTab: (contentType: ContentType) => SavedFilter[];
}

export function useSavedFilters(): UseSavedFiltersReturn {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load filters from localStorage on mount (client-side only)
  useEffect(() => {
    // Use a microtask to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      const filters = getSavedFilters();
      setSavedFilters(filters);
      setIsLoaded(true);
    });
  }, []);

  const saveFilter = useCallback((filter: {
    name: string;
    contentType: ContentType;
    practices: string[];
    dateRange: DateRange;
  }): SavedFilter => {
    const newFilter = saveFilterToStorage(filter);
    setSavedFilters((prev) => [...prev, newFilter]);
    return newFilter;
  }, []);

  const deleteFilter = useCallback((id: string): void => {
    deleteFilterFromStorage(id);
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const getFiltersForTab = useCallback((contentType: ContentType): SavedFilter[] => {
    return savedFilters.filter((f) => f.contentType === contentType);
  }, [savedFilters]);

  return {
    savedFilters,
    isLoaded,
    saveFilter,
    deleteFilter,
    getFiltersForTab,
  };
}
