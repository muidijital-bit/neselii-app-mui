import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { FuelType, ListingRow, Transmission } from '@/types/database';

const PAGE_SIZE = 20;

export type ListingFilters = {
  search?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxKm?: number;
  fuelType?: FuelType;
  transmission?: Transmission;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'km_asc';
};

export type ListingSummary = Pick<
  ListingRow,
  | 'id'
  | 'title'
  | 'price'
  | 'currency'
  | 'brand'
  | 'model'
  | 'year'
  | 'km'
  | 'fuel_type'
  | 'transmission'
  | 'city'
  | 'district'
  | 'status'
  | 'is_featured'
  | 'cover_image_url'
  | 'created_at'
>;

const LIST_COLUMNS =
  'id, title, price, currency, brand, model, year, km, fuel_type, transmission, city, district, status, is_featured, cover_image_url, created_at';

export function useListings(filters: ListingFilters) {
  return useInfiniteQuery({
    queryKey: ['listings', filters],
    initialPageParam: 0,
    getNextPageParam: (lastPage: ListingSummary[], _all: ListingSummary[][], lastPageParam: number) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
    queryFn: async ({ pageParam }): Promise<ListingSummary[]> => {
      let query = supabase.from('listings').select(LIST_COLUMNS).eq('status', 'active');

      if (filters.search) query = query.ilike('title', `%${filters.search}%`);
      if (filters.brand) query = query.eq('brand', filters.brand);
      if (filters.minPrice != null) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice != null) query = query.lte('price', filters.maxPrice);
      if (filters.minYear != null) query = query.gte('year', filters.minYear);
      if (filters.maxYear != null) query = query.lte('year', filters.maxYear);
      if (filters.maxKm != null) query = query.lte('km', filters.maxKm);
      if (filters.fuelType) query = query.eq('fuel_type', filters.fuelType);
      if (filters.transmission) query = query.eq('transmission', filters.transmission);

      switch (filters.sort) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'km_asc':
          query = query.order('km', { ascending: true });
          break;
        default:
          query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
      }

      const from = pageParam * PAGE_SIZE;
      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return data;
    },
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, listing_images(id, url, sort_order), seller:profiles!listings_seller_id_fkey(id, full_name, phone)')
        .eq('id', id)
        .order('sort_order', { referencedTable: 'listing_images' })
        .single();
      if (error) throw error;
      return data;
    },
  });
}
