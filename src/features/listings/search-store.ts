import { useSyncExternalStore } from 'react';

import type { SavedSearchFilters } from '@/types/database';

export type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'km_asc';

export const sortLabels: Record<SortKey, string> = {
  newest: 'Önce en yeni',
  price_asc: 'Fiyat: düşükten yükseğe',
  price_desc: 'Fiyat: yüksekten düşüğe',
  year_desc: 'Model yılı: yeniden eskiye',
  km_asc: 'Kilometre: azdan çoğa',
};

export type SearchState = {
  query: string;
  filters: SavedSearchFilters;
  sort: SortKey;
};

const initialState: SearchState = { query: '', filters: {}, sort: 'newest' };

let state = initialState;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Ana sayfa, Filtrele ve Tüm İlanlar ekranlarının paylaştığı arama durumu. */
export const searchStore = {
  get: () => state,
  set(next: Partial<SearchState>) {
    state = { ...state, ...next };
    emit();
  },
  reset(next: Partial<SearchState> = {}) {
    state = { ...initialState, ...next };
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useSearchState() {
  return useSyncExternalStore(searchStore.subscribe, searchStore.get, searchStore.get);
}

/** Filtre butonundaki sayı: aktif filtre adedi */
export function countActiveFilters(filters: SavedSearchFilters) {
  let count = 0;
  if (filters.category) count++;
  if (filters.subtype) count++;
  if (filters.financing) count++;
  if (filters.brand) count++;
  if (filters.minYear != null || filters.maxYear != null) count++;
  if (filters.minPrice != null || filters.maxPrice != null) count++;
  for (const value of Object.values(filters.fields ?? {})) {
    if (typeof value === 'string' ? value : value.min != null || value.max != null) count++;
  }
  return count;
}
