// Supabase projesi: neseli-app-mui (kdydrtqhihamayiigknm). Remote şema tek doğru kaynaktır.
// Yeniden üretmek için: npx supabase gen types typescript --project-id kdydrtqhihamayiigknm > src/types/database.ts
// (Dosyanın sonundaki uygulama içi alias'ları koruyun.)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      advisors: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          filter_fields: Json
          icon: string
          name: string
          slug: string
          sort_order: number
          subtypes: string[]
        }
        Insert: {
          filter_fields?: Json
          icon: string
          name: string
          slug: string
          sort_order?: number
          subtypes?: string[]
        }
        Update: {
          filter_fields?: Json
          icon?: string
          name?: string
          slug?: string
          sort_order?: number
          subtypes?: string[]
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string
          last_message_is_staff: boolean | null
          listing_id: string
          staff_hidden_at: string | null
          user_id: string
          user_hidden_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          last_message_is_staff?: boolean | null
          listing_id: string
          staff_hidden_at?: string | null
          user_id: string
          user_hidden_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          last_message_is_staff?: boolean | null
          listing_id?: string
          staff_hidden_at?: string | null
          user_id?: string
          user_hidden_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          lead_id: string | null
          storage_path: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          lead_id?: string | null
          storage_path: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          storage_path?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          fuel_consumption: Json
          fuel_price_tl: number
          insurance_tl_per_year: number
          maintenance_tl_per_km: number
          tax_tl_per_year: number
          tire_tl_per_km: number
          id: boolean
          min_down_payment_percent: number
          monthly_rate_percent: number
          terms: number[]
          updated_at: string
        }
        Insert: {
          fuel_consumption?: Json
          fuel_price_tl?: number
          insurance_tl_per_year?: number
          maintenance_tl_per_km?: number
          tax_tl_per_year?: number
          tire_tl_per_km?: number
          id?: boolean
          min_down_payment_percent?: number
          monthly_rate_percent?: number
          terms?: number[]
          updated_at?: string
        }
        Update: {
          fuel_consumption?: Json
          fuel_price_tl?: number
          insurance_tl_per_year?: number
          maintenance_tl_per_km?: number
          tax_tl_per_year?: number
          tire_tl_per_km?: number
          id?: boolean
          min_down_payment_percent?: number
          monthly_rate_percent?: number
          terms?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          advisor_id: string | null
          appointment_at: string | null
          appointment_location: string | null
          contact_phone: string
          created_at: string
          data: Json
          id: string
          listing_id: string | null
          note: string | null
          preferred_date: string | null
          preferred_slot: string
          reminder_sent_at: string | null
          status: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_id?: string | null
          appointment_at?: string | null
          appointment_location?: string | null
          contact_phone: string
          created_at?: string
          data?: Json
          id?: string
          listing_id?: string | null
          note?: string | null
          preferred_date?: string | null
          preferred_slot?: string
          reminder_sent_at?: string | null
          status?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_id?: string | null
          appointment_at?: string | null
          appointment_location?: string | null
          contact_phone?: string
          created_at?: string
          data?: Json
          id?: string
          listing_id?: string | null
          note?: string | null
          preferred_date?: string | null
          preferred_slot?: string
          reminder_sent_at?: string | null
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_insights: {
        Row: {
          expertise_report_path: string | null
          expertise_summary: string | null
          inspection_valid_until: string | null
          known_defects: string[]
          mechanical_condition: string | null
          tire_percent: number | null
          cautions: string[]
          check_documents: boolean
          check_expertise: boolean
          check_inspection: boolean
          check_maintenance: boolean
          check_no_heavy_damage: boolean
          check_service_records: boolean
          expert_advisor_id: string | null
          history_note: string | null
          last_service_date: string | null
          last_service_km: number | null
          listing_id: string
          owner_count: number | null
          strengths: string[]
          updated_at: string
          usage_type: string | null
        }
        Insert: {
          expertise_report_path?: string | null
          expertise_summary?: string | null
          inspection_valid_until?: string | null
          known_defects?: string[]
          mechanical_condition?: string | null
          tire_percent?: number | null
          cautions?: string[]
          check_documents?: boolean
          check_expertise?: boolean
          check_inspection?: boolean
          check_maintenance?: boolean
          check_no_heavy_damage?: boolean
          check_service_records?: boolean
          expert_advisor_id?: string | null
          history_note?: string | null
          last_service_date?: string | null
          last_service_km?: number | null
          listing_id: string
          owner_count?: number | null
          strengths?: string[]
          updated_at?: string
          usage_type?: string | null
        }
        Update: {
          expertise_report_path?: string | null
          expertise_summary?: string | null
          inspection_valid_until?: string | null
          known_defects?: string[]
          mechanical_condition?: string | null
          tire_percent?: number | null
          cautions?: string[]
          check_documents?: boolean
          check_expertise?: boolean
          check_inspection?: boolean
          check_maintenance?: boolean
          check_no_heavy_damage?: boolean
          check_service_records?: boolean
          expert_advisor_id?: string | null
          history_note?: string | null
          last_service_date?: string | null
          last_service_km?: number | null
          listing_id?: string
          owner_count?: number | null
          strengths?: string[]
          updated_at?: string
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_insights_expert_advisor_id_fkey"
            columns: ["expert_advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_insights_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_media: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          storage_path: string | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          storage_path?: string | null
          type?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          storage_path?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          attributes: Json
          brand: string | null
          category_slug: string
          city: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          district: string | null
          has_video: boolean
          id: string
          is_featured: boolean
          km: number | null
          latitude: number | null
          listing_no: number
          longitude: number | null
          model: string | null
          photo_count: number
          price: number
          published_at: string | null
          reserved_lead_id: string | null
          reserved_until: string | null
          search_text: string | null
          status: string
          subtype: string | null
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          attributes?: Json
          brand?: string | null
          category_slug: string
          city: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          district?: string | null
          has_video?: boolean
          id?: string
          is_featured?: boolean
          km?: number | null
          latitude?: number | null
          listing_no?: never
          longitude?: number | null
          model?: string | null
          photo_count?: number
          price: number
          published_at?: string | null
          reserved_lead_id?: string | null
          reserved_until?: string | null
          search_text?: string | null
          status?: string
          subtype?: string | null
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          attributes?: Json
          brand?: string | null
          category_slug?: string
          city?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          district?: string | null
          has_video?: boolean
          id?: string
          is_featured?: boolean
          km?: number | null
          latitude?: number | null
          listing_no?: never
          longitude?: number | null
          model?: string | null
          photo_count?: number
          price?: number
          published_at?: string | null
          reserved_lead_id?: string | null
          reserved_until?: string | null
          search_text?: string | null
          status?: string
          subtype?: string | null
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "listings_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "category_stats"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "listings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_staff: boolean
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_staff?: boolean
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_staff?: boolean
          read_at?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          announcement_id: string | null
          body: string | null
          conversation_id: string | null
          created_at: string
          data: Json
          id: string
          lead_id: string | null
          listing_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          announcement_id?: string | null
          body?: string | null
          conversation_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          announcement_id?: string | null
          body?: string | null
          conversation_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          expo_push_token: string | null
          full_name: string | null
          id: string
          notify_announcements: boolean
          notify_message_replies: boolean
          notify_new_listings: boolean
          notify_price_changes: boolean
          notify_status_changes: boolean
          phone: string | null
          prefer_nearby: boolean
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          expo_push_token?: string | null
          full_name?: string | null
          id: string
          notify_announcements?: boolean
          notify_message_replies?: boolean
          notify_new_listings?: boolean
          notify_price_changes?: boolean
          notify_status_changes?: boolean
          phone?: string | null
          prefer_nearby?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          expo_push_token?: string | null
          full_name?: string | null
          id?: string
          notify_announcements?: boolean
          notify_message_replies?: boolean
          notify_new_listings?: boolean
          notify_price_changes?: boolean
          notify_status_changes?: boolean
          phone?: string | null
          prefer_nearby?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          notify: boolean
          query: string | null
          sort: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          notify?: boolean
          query?: string | null
          sort?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          notify?: boolean
          query?: string | null
          sort?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_in_media: {
        Row: {
          created_at: string
          id: string
          kind: string
          lead_id: string
          section: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          lead_id: string
          section: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          section?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_in_media_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "trade_ins"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      trade_ins: {
        Row: {
          brand: string
          category_slug: string
          created_at: string
          damage_status: string | null
          expected_price: number | null
          km: number | null
          lead_id: string
          model: string | null
          valuated_at: string | null
          valuation_max: number | null
          valuation_min: number | null
          year: number | null
        }
        Insert: {
          brand: string
          category_slug: string
          created_at?: string
          damage_status?: string | null
          expected_price?: number | null
          km?: number | null
          lead_id: string
          model?: string | null
          valuated_at?: string | null
          valuation_max?: number | null
          valuation_min?: number | null
          year?: number | null
        }
        Update: {
          brand?: string
          category_slug?: string
          created_at?: string
          damage_status?: string | null
          expected_price?: number | null
          km?: number | null
          lead_id?: string
          model?: string | null
          valuated_at?: string | null
          valuation_max?: number | null
          valuation_min?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_ins_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      category_stats: {
        Row: {
          filter_fields: Json | null
          icon: string | null
          listing_count: number | null
          name: string | null
          slug: string | null
          sort_order: number | null
          subtypes: string[] | null
        }
        Relationships: []
      }
      conversation_unread: {
        Row: {
          conversation_id: string | null
          unread_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_my_account: { Args: never; Returns: undefined }
      hide_conversation: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      approve_reservation: {
        Args: { p_days: number; p_lead_id: string }
        Returns: string
      }
      release_reservation: {
        Args: { p_lead_id: string }
        Returns: undefined
      }
      register_push_token: {
        Args: { p_token: string }
        Returns: undefined
      }
      unregister_push_token: { Args: never; Returns: undefined }
      set_listing_specs: {
        Args: { p_listing_id: string; p_specs: Json }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ---------------------------------------------------------------------------
// Uygulama içi alias'lar (otomatik üretilen kısmın dışında, elle korunur)
// ---------------------------------------------------------------------------

export type ProfileRow = Tables<'profiles'>;
export type CategoryRow = Tables<'categories'>;
export type ListingRow = Tables<'listings'>;
export type ListingMediaRow = Tables<'listing_media'>;
export type FavoriteRow = Tables<'favorites'>;
export type ConversationRow = Tables<'conversations'>;
export type MessageRow = Tables<'messages'>;
export type NotificationRow = Tables<'notifications'>;
export type AnnouncementRow = Tables<'announcements'>;
export type SavedSearchRow = Tables<'saved_searches'>;
export type LeadRow = Tables<'leads'>;
export type AdvisorRow = Tables<'advisors'>;
export type FinanceSettingsRow = Tables<'finance_settings'>;
export type ListingInsightsRow = Tables<'listing_insights'>;

/** listings.status için kullanılan değerler (RLS: published/reserved/sold herkese açık). */
export type ListingStatus = 'draft' | 'published' | 'reserved' | 'sold';

/** categories.filter_fields içindeki tek bir filtre tanımı. */
export type CategoryFilterField =
  | { key: string; label: string; type: 'range'; unit?: string }
  | { key: string; label: string; type: 'select'; options: string[] };
