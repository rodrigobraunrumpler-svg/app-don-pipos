// Generado desde la base con `pnpm db:types`. No se edita a mano.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      business_settings: {
        Row: {
          active_payment_methods: unknown[];
          business_id: string;
          created_at: string;
          delivery_fee_cents: number;
          delivery_zone: string | null;
          lapsed_after_days: number;
          production_interval_days: number;
          reminders: NonNullable<Json>;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          active_payment_methods?: unknown[];
          business_id: string;
          created_at?: string;
          delivery_fee_cents?: number;
          delivery_zone?: string | null;
          lapsed_after_days?: number;
          production_interval_days?: number;
          reminders?: NonNullable<Json>;
          updated_at?: string;
          version?: number;
        };
        Update: {
          active_payment_methods?: unknown[];
          business_id?: string;
          created_at?: string;
          delivery_fee_cents?: number;
          delivery_zone?: string | null;
          lapsed_after_days?: number;
          production_interval_days?: number;
          reminders?: NonNullable<Json>;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          created_at: string;
          id: string;
          modules: string[];
          name: string;
          owner_id: string;
          setup_done_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          modules?: string[];
          name: string;
          owner_id: string;
          setup_done_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          modules?: string[];
          name?: string;
          owner_id?: string;
          setup_done_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          business_id: string;
          cost_cents: number | null;
          created_at: string;
          id: string;
          image_url: string | null;
          is_active: boolean;
          min_stock: number;
          name: string;
          price_cents: number;
          sanity_id: string | null;
          show_on_web: boolean;
          sort_order: number;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          cost_cents?: number | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          min_stock?: number;
          name: string;
          price_cents: number;
          sanity_id?: string | null;
          show_on_web?: boolean;
          sort_order?: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          business_id?: string;
          cost_cents?: number | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          min_stock?: number;
          name?: string;
          price_cents?: number;
          sanity_id?: string | null;
          show_on_web?: boolean;
          sort_order?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_levels: {
        Row: {
          business_id: string;
          created_at: string;
          on_hand: number;
          product_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          on_hand?: number;
          product_id: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          on_hand?: number;
          product_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_levels_product_fkey";
            columns: ["business_id", "product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          business_id: string;
          created_at: string;
          happened_at: string;
          id: string;
          kind: string;
          product_id: string;
          quantity: number;
          reason: string | null;
          request_id: string | null;
          reverts_movement_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          happened_at?: string;
          id?: string;
          kind: string;
          product_id: string;
          quantity: number;
          reason?: string | null;
          request_id?: string | null;
          reverts_movement_id?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          happened_at?: string;
          id?: string;
          kind?: string;
          product_id?: string;
          quantity?: number;
          reason?: string | null;
          request_id?: string | null;
          reverts_movement_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_fkey";
            columns: ["business_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "stock_movements_reverts_fkey";
            columns: ["business_id", "reverts_movement_id"];
            isOneToOne: false;
            referencedRelation: "stock_movements";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_business: { Args: Record<PropertyKey, never>; Returns: Json };
      list_products: { Args: Record<PropertyKey, never>; Returns: Json };
      save_product: {
        Args: {
          p_cost_cents: number;
          p_expected_version: number;
          p_id: string;
          p_min_stock: number;
          p_name: string;
          p_price_cents: number;
          p_show_on_web: boolean;
        };
        Returns: Json;
      };
      set_product_active: { Args: { p_active: boolean; p_id: string }; Returns: Json };
      update_settings: { Args: { p_expected_version: number; p_patch: Json }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
