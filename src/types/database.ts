// supabase/migrations/20261017000000_init.sql ile senkron tutun.
// Supabase CLI ile giriş yapıldığında şu komutla yeniden üretilebilir:
// npx supabase gen types typescript --project-id kdydrtqhihamayiigknm > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update, Relationships = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

type Rel<Name extends string, Column extends string, Ref extends string, RefColumn extends string = 'id'> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: [RefColumn];
};

export type ListingStatus = 'draft' | 'published' | 'reserved' | 'sold' | 'unpublished';
export type MediaType = 'image' | 'video';
export type NotificationType = 'new_listing' | 'price_change' | 'status_change' | 'message_reply' | 'announcement';

export type FilterField = {
  key: string;
  label: string;
  type: 'range' | 'select';
  unit?: string;
  options?: string[];
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  notify_new_listings: boolean;
  notify_price_changes: boolean;
  notify_status_changes: boolean;
  notify_message_replies: boolean;
  notify_announcements: boolean;
  prefer_nearby: boolean;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = Partial<
  Pick<
    ProfileRow,
    | 'full_name'
    | 'phone'
    | 'avatar_url'
    | 'notify_new_listings'
    | 'notify_price_changes'
    | 'notify_status_changes'
    | 'notify_message_replies'
    | 'notify_announcements'
    | 'prefer_nearby'
    | 'expo_push_token'
  >
>;

export type CategoryRow = {
  slug: string;
  name: string;
  icon: string;
  subtypes: string[];
  filter_fields: FilterField[];
  sort_order: number;
};

export type CategoryStatsRow = CategoryRow & { listing_count: number };

export type ListingRow = {
  id: string;
  listing_no: number;
  category_slug: string;
  subtype: string | null;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  km: number | null;
  attributes: Record<string, string | number>;
  city: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ListingStatus;
  is_featured: boolean;
  cover_url: string | null;
  photo_count: number;
  has_video: boolean;
  search_text: string;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingMediaRow = {
  id: string;
  listing_id: string;
  type: MediaType;
  url: string;
  storage_path: string | null;
  sort_order: number;
  created_at: string;
};

export type FavoriteRow = {
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type SavedSearchFilters = {
  category?: string;
  subtype?: string;
  /** Yalnızca taksit/kredi imkânı olan ilanlar */
  financing?: boolean;
  brand?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Kategoriye özel alanlar: { km: { min, max }, axle_count: '3' } */
  fields?: Record<string, { min?: number; max?: number } | string>;
};

export type SavedSearchRow = {
  id: string;
  user_id: string;
  name: string;
  query: string | null;
  filters: SavedSearchFilters;
  sort: string;
  notify: boolean;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  listing_id: string;
  user_id: string;
  last_message: string | null;
  last_message_is_staff: boolean | null;
  last_message_at: string;
  created_at: string;
};

export type ConversationUnreadRow = {
  conversation_id: string;
  unread_count: number;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  is_staff: boolean;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  listing_id: string | null;
  conversation_id: string | null;
  announcement_id: string | null;
  data: { old_price?: number; new_price?: number; old_status?: ListingStatus; new_status?: ListingStatus };
  read_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Pick<ProfileRow, 'id'> & ProfileUpdate, ProfileUpdate>;
      categories: Table<CategoryRow, CategoryRow, Partial<CategoryRow>>;
      listings: Table<
        ListingRow,
        Pick<ListingRow, 'category_slug' | 'title' | 'price' | 'city'> &
          Partial<Omit<ListingRow, 'id' | 'listing_no' | 'search_text'>>,
        Partial<Omit<ListingRow, 'id' | 'listing_no' | 'search_text'>>,
        [
          Rel<'listings_category_slug_fkey', 'category_slug', 'categories', 'slug'>,
          Rel<'listings_created_by_fkey', 'created_by', 'profiles'>,
        ]
      >;
      listing_media: Table<
        ListingMediaRow,
        Pick<ListingMediaRow, 'listing_id' | 'url'> & Partial<ListingMediaRow>,
        Partial<ListingMediaRow>,
        [Rel<'listing_media_listing_id_fkey', 'listing_id', 'listings'>]
      >;
      favorites: Table<
        FavoriteRow,
        Pick<FavoriteRow, 'user_id' | 'listing_id'>,
        never,
        [
          Rel<'favorites_listing_id_fkey', 'listing_id', 'listings'>,
          Rel<'favorites_user_id_fkey', 'user_id', 'profiles'>,
        ]
      >;
      saved_searches: Table<
        SavedSearchRow,
        Pick<SavedSearchRow, 'user_id' | 'name'> & Partial<Omit<SavedSearchRow, 'id' | 'created_at'>>,
        Partial<Pick<SavedSearchRow, 'name' | 'query' | 'filters' | 'sort' | 'notify'>>,
        [Rel<'saved_searches_user_id_fkey', 'user_id', 'profiles'>]
      >;
      conversations: Table<
        ConversationRow,
        Pick<ConversationRow, 'listing_id' | 'user_id'>,
        never,
        [
          Rel<'conversations_listing_id_fkey', 'listing_id', 'listings'>,
          Rel<'conversations_user_id_fkey', 'user_id', 'profiles'>,
        ]
      >;
      messages: Table<
        MessageRow,
        Pick<MessageRow, 'conversation_id' | 'sender_id' | 'body'>,
        Partial<Pick<MessageRow, 'read_at'>>,
        [
          Rel<'messages_conversation_id_fkey', 'conversation_id', 'conversations'>,
          Rel<'messages_sender_id_fkey', 'sender_id', 'profiles'>,
        ]
      >;
      announcements: Table<
        AnnouncementRow,
        Pick<AnnouncementRow, 'title' | 'body'> & Partial<AnnouncementRow>,
        Partial<AnnouncementRow>
      >;
      notifications: Table<
        NotificationRow,
        never,
        Partial<Pick<NotificationRow, 'read_at'>>,
        [
          Rel<'notifications_listing_id_fkey', 'listing_id', 'listings'>,
          Rel<'notifications_conversation_id_fkey', 'conversation_id', 'conversations'>,
          Rel<'notifications_announcement_id_fkey', 'announcement_id', 'announcements'>,
        ]
      >;
    };
    Views: {
      category_stats: { Row: CategoryStatsRow; Relationships: [] };
      conversation_unread: { Row: ConversationUnreadRow; Relationships: [] };
    };
    Functions: {
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
