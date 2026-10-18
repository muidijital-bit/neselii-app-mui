import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

import { useProfile } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { AnnouncementRow, ListingMediaRow, ListingRow, ListingStatus } from '@/types/database';

const BUCKET = 'listing-media';
const MAX_IMAGE_SIDE = 1600;

export function useIsAdmin() {
  return useProfile().data?.role === 'admin';
}

export type AdminListing = Pick<
  ListingRow,
  'id' | 'listing_no' | 'title' | 'price' | 'currency' | 'status' | 'cover_url' | 'photo_count' | 'updated_at'
>;

export function useAdminListings(status: ListingStatus | null) {
  return useQuery({
    queryKey: ['admin-listings', status],
    queryFn: async (): Promise<AdminListing[]> => {
      let q = supabase
        .from('listings')
        .select('id, listing_no, title, price, currency, status, cover_url, photo_count, updated_at')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export type ListingInput = Pick<
  ListingRow,
  | 'category_slug'
  | 'subtype'
  | 'title'
  | 'description'
  | 'price'
  | 'brand'
  | 'model'
  | 'year'
  | 'km'
  | 'attributes'
  | 'city'
  | 'district'
  | 'status'
  | 'is_featured'
>;

function useInvalidateListings() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
    queryClient.invalidateQueries({ queryKey: ['listings'] });
    queryClient.invalidateQueries({ queryKey: ['featured-listings'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['brands'] });
    if (id) queryClient.invalidateQueries({ queryKey: ['listing', id] });
  };
}

/** Yeni ilan oluşturur ya da mevcut ilanı günceller; ilan id'sini döndürür. */
export function useSaveListing() {
  const { userId } = useAuth();
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ListingInput }) => {
      if (id) {
        const { error } = await supabase.from('listings').update(input).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from('listings')
        .insert({ ...input, created_by: userId })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => invalidate(id),
  });
}

export function useDeleteListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async (listing: { id: string; media: ListingMediaRow[] }) => {
      const paths = listing.media.flatMap((m) => (m.storage_path ? [m.storage_path] : []));
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      const { error } = await supabase.from('listings').delete().eq('id', listing.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/** Fotoğrafı en fazla 1600 px'e küçültüp JPEG olarak hazırlar. */
async function prepareImage(asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_IMAGE_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_IMAGE_SIDE } : { height: MAX_IMAGE_SIDE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: result.uri, contentType: 'image/jpeg', extension: 'jpg' };
}

async function uploadAsset(listingId: string, asset: ImagePickerAsset, type: 'image' | 'video') {
  const file =
    type === 'image'
      ? await prepareImage(asset)
      : {
          uri: asset.uri,
          contentType: asset.mimeType ?? 'video/mp4',
          extension: asset.mimeType === 'video/quicktime' ? 'mov' : 'mp4',
        };
  const path = `${listingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.extension}`;
  const body = await (await fetch(file.uri)).arrayBuffer();
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: file.contentType });
  if (error) throw error;
  return { path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

export function useUploadMedia(listingId: string) {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async ({
      assets,
      type,
      startOrder,
    }: {
      assets: ImagePickerAsset[];
      type: 'image' | 'video';
      startOrder: number;
    }) => {
      // Sırayla yükle: mobil bağlantıda paralel büyük yüklemeler zaman aşımına düşebilir
      for (const [i, asset] of assets.entries()) {
        const { path, url } = await uploadAsset(listingId, asset, type);
        const { error } = await supabase
          .from('listing_media')
          .insert({ listing_id: listingId, type, url, storage_path: path, sort_order: startOrder + i });
        if (error) throw error;
      }
    },
    onSettled: () => invalidate(listingId),
  });
}

export function useDeleteMedia(listingId: string) {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async (media: ListingMediaRow) => {
      if (media.storage_path) await supabase.storage.from(BUCKET).remove([media.storage_path]);
      const { error } = await supabase.from('listing_media').delete().eq('id', media.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(listingId),
  });
}

/** İki fotoğrafın sırasını değiştirir (kapak = ilk fotoğraf). */
export function useSwapMedia(listingId: string) {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async ([a, b]: [ListingMediaRow, ListingMediaRow]) => {
      const results = await Promise.all([
        supabase.from('listing_media').update({ sort_order: b.sort_order }).eq('id', a.id),
        supabase.from('listing_media').update({ sort_order: a.sort_order }).eq('id', b.id),
      ]);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => invalidate(listingId),
  });
}

export function useAdminAnnouncements() {
  return useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveAnnouncement() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id?: string;
      input: Pick<AnnouncementRow, 'title' | 'body' | 'published_at'>;
    }) => {
      const { error } = id
        ? await supabase.from('announcements').update(input).eq('id', id)
        : await supabase.from('announcements').insert({ ...input, created_by: userId });
      if (error) throw error;
    },
    onSuccess: (_d, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      if (id) queryClient.invalidateQueries({ queryKey: ['announcement', id] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });
}
