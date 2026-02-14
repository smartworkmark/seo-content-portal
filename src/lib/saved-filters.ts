import { SavedFilter, SavedFiltersStore, ContentType, DateRange } from '@/types';
import { generateId } from './utils';

const STORAGE_KEY = 'content-portal-saved-filters';
const CURRENT_VERSION = 1;

function getDefaultStore(): SavedFiltersStore {
  return {
    version: CURRENT_VERSION,
    filters: [],
  };
}

function loadStore(): SavedFiltersStore {
  if (typeof window === 'undefined') {
    return getDefaultStore();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultStore();
    }

    const parsed = JSON.parse(stored) as SavedFiltersStore;

    // Validate structure
    if (!parsed || typeof parsed.version !== 'number' || !Array.isArray(parsed.filters)) {
      return getDefaultStore();
    }

    // Migrate any saved filters with 'all' date range to '90d'
    let needsPersist = false;
    for (const filter of parsed.filters) {
      if ((filter.dateRange as string) === 'all') {
        filter.dateRange = '90d';
        needsPersist = true;
      }
    }
    if (needsPersist) {
      persistStore(parsed);
    }

    return parsed;
  } catch {
    return getDefaultStore();
  }
}

function persistStore(store: SavedFiltersStore): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    // Handle quota exceeded or other storage errors
    console.error('Failed to save filters to localStorage:', error);
  }
}

export function getSavedFilters(): SavedFilter[] {
  const store = loadStore();
  return store.filters;
}

export function saveFilter(filter: {
  name: string;
  contentType: ContentType;
  practices: string[];
  dateRange: DateRange;
}): SavedFilter {
  const store = loadStore();

  const newFilter: SavedFilter = {
    id: generateId(),
    name: filter.name,
    contentType: filter.contentType,
    practices: filter.practices,
    dateRange: filter.dateRange,
    createdAt: new Date().toISOString(),
  };

  store.filters.push(newFilter);
  persistStore(store);

  return newFilter;
}

export function deleteFilter(id: string): void {
  const store = loadStore();
  store.filters = store.filters.filter((f) => f.id !== id);
  persistStore(store);
}

export function updateFilter(id: string, updates: Partial<Omit<SavedFilter, 'id' | 'createdAt'>>): void {
  const store = loadStore();
  const index = store.filters.findIndex((f) => f.id === id);

  if (index !== -1) {
    store.filters[index] = {
      ...store.filters[index],
      ...updates,
    };
    persistStore(store);
  }
}

export function getFiltersForContentType(contentType: ContentType): SavedFilter[] {
  const filters = getSavedFilters();
  return filters.filter((f) => f.contentType === contentType);
}
