// Şema ile senkron tutun. Supabase projesi bağlandıktan sonra şu komutla yeniden üretilebilir:
// npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update, Relationships = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type FuelType = 'benzin' | 'dizel' | 'lpg' | 'hibrit' | 'elektrik';
export type Transmission = 'manuel' | 'otomatik' | 'yari_otomatik';
export type ListingCondition = 'sifir' | 'ikinci_el';
export type ListingStatus = 'active' | 'sold' | 'passive';

export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
};

export type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  brand: string;
  model: string;
  series: string | null;
  year: number;
  km: number;
  fuel_type: FuelType | null;
  transmission: Transmission | null;
  body_type: string | null;
  color: string | null;
  condition: ListingCondition;
  city: string | null;
  district: string | null;
  status: ListingStatus;
  is_featured: boolean;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingImageRow = {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number;
  created_at: string;
};

export type FavoriteRow = {
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type Rel<Name extends string, Column extends string, Ref extends string> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ['id'];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Pick<ProfileRow, 'id'> & Partial<Omit<ProfileRow, 'id'>>,
        Partial<Pick<ProfileRow, 'full_name' | 'phone' | 'avatar_url'>>
      >;
      listings: Table<
        ListingRow,
        Pick<ListingRow, 'seller_id' | 'title' | 'price' | 'brand' | 'model' | 'year'> &
          Partial<ListingRow>,
        Partial<ListingRow>,
        [Rel<'listings_seller_id_fkey', 'seller_id', 'profiles'>]
      >;
      listing_images: Table<
        ListingImageRow,
        Pick<ListingImageRow, 'listing_id' | 'url'> & Partial<ListingImageRow>,
        Partial<ListingImageRow>,
        [Rel<'listing_images_listing_id_fkey', 'listing_id', 'listings'>]
      >;
      favorites: Table<
        FavoriteRow,
        Pick<FavoriteRow, 'user_id' | 'listing_id'> & Partial<FavoriteRow>,
        Partial<FavoriteRow>,
        [
          Rel<'favorites_listing_id_fkey', 'listing_id', 'listings'>,
          Rel<'favorites_user_id_fkey', 'user_id', 'profiles'>,
        ]
      >;
      conversations: Table<
        ConversationRow,
        Pick<ConversationRow, 'listing_id' | 'buyer_id' | 'seller_id'> & Partial<ConversationRow>,
        Partial<ConversationRow>,
        [
          Rel<'conversations_listing_id_fkey', 'listing_id', 'listings'>,
          Rel<'conversations_buyer_id_fkey', 'buyer_id', 'profiles'>,
          Rel<'conversations_seller_id_fkey', 'seller_id', 'profiles'>,
        ]
      >;
      messages: Table<
        MessageRow,
        Pick<MessageRow, 'conversation_id' | 'sender_id' | 'body'> & Partial<MessageRow>,
        Partial<Pick<MessageRow, 'read_at'>>,
        [
          Rel<'messages_conversation_id_fkey', 'conversation_id', 'conversations'>,
          Rel<'messages_sender_id_fkey', 'sender_id', 'profiles'>,
        ]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
