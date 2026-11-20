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
      cash_counts: {
        Row: {
          business_date: string;
          business_id: string;
          cash_in_cents: number;
          cash_out_cents: number;
          closed_at: string;
          counted_cents: number;
          created_at: string;
          difference_cents: number;
          expected_cents: number;
          id: string;
          opening_cents: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_date: string;
          business_id: string;
          cash_in_cents: number;
          cash_out_cents: number;
          closed_at?: string;
          counted_cents: number;
          created_at?: string;
          difference_cents: number;
          expected_cents: number;
          id?: string;
          opening_cents: number;
          updated_at?: string;
        };
        Update: {
          business_date?: string;
          business_id?: string;
          cash_in_cents?: number;
          cash_out_cents?: number;
          closed_at?: string;
          counted_cents?: number;
          created_at?: string;
          difference_cents?: number;
          expected_cents?: number;
          id?: string;
          opening_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cash_counts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          accepts_promotions: boolean;
          address: string | null;
          anonymized_at: string | null;
          business_id: string;
          created_at: string;
          id: string;
          last_order_at: string | null;
          name: string;
          note: string | null;
          orders_count: number;
          phone: string | null;
          search_text: string | null;
          spent_cents: number;
          stamps: number;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          accepts_promotions?: boolean;
          address?: string | null;
          anonymized_at?: string | null;
          business_id: string;
          created_at?: string;
          id?: string;
          last_order_at?: string | null;
          name: string;
          note?: string | null;
          orders_count?: number;
          phone?: string | null;
          search_text?: never;
          spent_cents?: number;
          stamps?: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          accepts_promotions?: boolean;
          address?: string | null;
          anonymized_at?: string | null;
          business_id?: string;
          created_at?: string;
          id?: string;
          last_order_at?: string | null;
          name?: string;
          note?: string | null;
          orders_count?: number;
          phone?: string | null;
          search_text?: never;
          spent_cents?: number;
          stamps?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_categories: {
        Row: {
          business_id: string;
          created_at: string;
          icon: string;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          icon: string;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "expense_categories_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount_cents: number;
          business_id: string;
          category_id: string;
          created_at: string;
          description: string | null;
          id: string;
          method: string;
          receipt_path: string | null;
          replaces_id: string | null;
          spent_at: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          business_id: string;
          category_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          method: string;
          receipt_path?: string | null;
          replaces_id?: string | null;
          spent_at?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          business_id?: string;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          method?: string;
          receipt_path?: string | null;
          replaces_id?: string | null;
          spent_at?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_category_fkey";
            columns: ["business_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "expense_categories";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "expenses_replaces_fkey";
            columns: ["business_id", "replaces_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      loyalty_settings: {
        Row: {
          business_id: string;
          created_at: string;
          goal: number;
          is_active: boolean;
          reward_amount_cents: number | null;
          reward_kind: string;
          reward_text: string | null;
          stamp_unit: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          goal?: number;
          is_active?: boolean;
          reward_amount_cents?: number | null;
          reward_kind?: string;
          reward_text?: string | null;
          stamp_unit?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          goal?: number;
          is_active?: boolean;
          reward_amount_cents?: number | null;
          reward_kind?: string;
          reward_text?: string | null;
          stamp_unit?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_stamps: {
        Row: {
          business_id: string;
          created_at: string;
          customer_id: string;
          delta: number;
          id: string;
          order_id: string | null;
          reason: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          customer_id: string;
          delta: number;
          id?: string;
          order_id?: string | null;
          reason: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          customer_id?: string;
          delta?: number;
          id?: string;
          order_id?: string | null;
          reason?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_stamps_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_stamps_customer_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "loyalty_stamps_order_fkey";
            columns: ["business_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      manual_incomes: {
        Row: {
          amount_cents: number;
          business_id: string;
          created_at: string;
          description: string;
          id: string;
          method: string;
          received_at: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          business_id: string;
          created_at?: string;
          description: string;
          id?: string;
          method: string;
          received_at?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          business_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          method?: string;
          received_at?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "manual_incomes_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      message_templates: {
        Row: {
          body: string;
          business_id: string;
          created_at: string;
          key: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          business_id: string;
          created_at?: string;
          key: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          body?: string;
          business_id?: string;
          created_at?: string;
          key?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "message_templates_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      order_lines: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_cost_cents: number | null;
          unit_price_cents: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_cost_cents?: number | null;
          unit_price_cents: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          unit_cost_cents?: number | null;
          unit_price_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_lines_order_fkey";
            columns: ["business_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "order_lines_product_fkey";
            columns: ["business_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      order_status_events: {
        Row: {
          at: string;
          business_id: string;
          created_at: string;
          id: string;
          order_id: string;
          reverted_at: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          at?: string;
          business_id: string;
          created_at?: string;
          id?: string;
          order_id: string;
          reverted_at?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          at?: string;
          business_id?: string;
          created_at?: string;
          id?: string;
          order_id?: string;
          reverted_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_fkey";
            columns: ["business_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      orders: {
        Row: {
          business_id: string;
          cancel_reason: string | null;
          channel: string;
          created_at: string;
          customer_id: string | null;
          customer_name: string | null;
          delivered_at: string | null;
          delivery_address: string | null;
          delivery_fee_cents: number;
          discount_cents: number;
          discount_reason: string | null;
          due_date: string;
          fulfillment: string;
          id: string;
          items_count: number;
          items_summary: string;
          note: string | null;
          number: number;
          paid_cents: number;
          promised_at: string | null;
          scheduled_for: string | null;
          status: string;
          subtotal_cents: number;
          total_cents: number;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          cancel_reason?: string | null;
          channel: string;
          created_at?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          delivered_at?: string | null;
          delivery_address?: string | null;
          delivery_fee_cents?: number;
          discount_cents?: number;
          discount_reason?: string | null;
          due_date: string;
          fulfillment: string;
          id?: string;
          items_count: number;
          items_summary: string;
          note?: string | null;
          number: number;
          paid_cents?: number;
          promised_at?: string | null;
          scheduled_for?: string | null;
          status: string;
          subtotal_cents: number;
          total_cents: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          business_id?: string;
          cancel_reason?: string | null;
          channel?: string;
          created_at?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          delivered_at?: string | null;
          delivery_address?: string | null;
          delivery_fee_cents?: number;
          discount_cents?: number;
          discount_reason?: string | null;
          due_date?: string;
          fulfillment?: string;
          id?: string;
          items_count?: number;
          items_summary?: string;
          note?: string | null;
          number?: number;
          paid_cents?: number;
          promised_at?: string | null;
          scheduled_for?: string | null;
          status?: string;
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          business_id: string;
          created_at: string;
          id: string;
          kind: string;
          method: string;
          order_id: string;
          paid_at: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          business_id: string;
          created_at?: string;
          id?: string;
          kind: string;
          method: string;
          order_id: string;
          paid_at?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          business_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          method?: string;
          order_id?: string;
          paid_at?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_fkey";
            columns: ["business_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["business_id", "id"];
          },
        ];
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
          order_id: string | null;
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
          order_id?: string | null;
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
          order_id?: string | null;
          product_id?: string;
          quantity?: number;
          reason?: string | null;
          request_id?: string | null;
          reverts_movement_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_fkey";
            columns: ["business_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["business_id", "id"];
          },
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
      add_payment: {
        Args: { p_amount_cents: number; p_method: string; p_order_id: string; p_request_id: string };
        Returns: Json;
      };
      advance_order: { Args: { p_from_status: string; p_order_id: string }; Returns: Json };
      anonymize_customer: { Args: { p_id: string }; Returns: Json };
      attach_receipt: { Args: { p_expense_id: string; p_receipt_path: string }; Returns: Json };
      cancel_order: {
        Args: {
          p_order_id: string;
          p_reason: string;
          p_refund_cents: number;
          p_refund_method: string;
          p_request_id: string;
        };
        Returns: Json;
      };
      cash_expected: { Args: { p_business_date: string }; Returns: Json };
      change_payment_method: { Args: { p_method: string; p_payment_id: string; p_request_id: string }; Returns: Json };
      close_cash_day: {
        Args: { p_business_date: string; p_counted_cents: number; p_opening_cents: number; p_request_id: string };
        Returns: Json;
      };
      complete_setup: { Args: { p_categories: Json; p_request_id: string; p_stock: Json }; Returns: Json };
      correct_expense: {
        Args: {
          p_amount_cents: number;
          p_category_id: string;
          p_description: string;
          p_id: string;
          p_method: string;
          p_request_id: string;
        };
        Returns: Json;
      };
      create_counter_sale: { Args: { p_items: Json; p_method: string; p_request_id: string }; Returns: Json };
      create_expense: {
        Args: {
          p_amount_cents: number;
          p_category_id: string;
          p_description: string;
          p_method: string;
          p_request_id: string;
          p_spent_at: string;
        };
        Returns: Json;
      };
      create_manual_income: {
        Args: {
          p_amount_cents: number;
          p_description: string;
          p_method: string;
          p_received_on: string;
          p_request_id: string;
        };
        Returns: Json;
      };
      create_order: { Args: { p_draft: Json; p_request_id: string }; Returns: Json };
      edit_order: {
        Args: {
          p_expected_version: number;
          p_lines: Json;
          p_order_id: string;
          p_refund_cents: number;
          p_refund_method: string;
          p_request_id: string;
        };
        Returns: Json;
      };
      expenses_summary: { Args: { p_from: string; p_to: string }; Returns: Json };
      export_rows: { Args: { p_from: string; p_to: string }; Returns: Json };
      find_customer_by_phone: { Args: { p_phone: string }; Returns: Json };
      get_business: { Args: Record<PropertyKey, never>; Returns: Json };
      get_customer: { Args: { p_id: string }; Returns: Json };
      get_loyalty_settings: { Args: Record<PropertyKey, never>; Returns: Json };
      get_order: { Args: { p_order_id: string }; Returns: Json };
      home_summary: { Args: Record<PropertyKey, never>; Returns: Json };
      income_summary: { Args: { p_from: string; p_to: string }; Returns: Json };
      latest_cash_count: { Args: { p_business_date: string }; Returns: Json };
      list_customer_orders: { Args: { p_cursor?: string; p_customer_id: string; p_limit?: number }; Returns: Json };
      list_expense_categories: { Args: Record<PropertyKey, never>; Returns: Json };
      list_expenses: { Args: { p_cursor?: string; p_from?: string; p_limit?: number; p_to?: string }; Returns: Json };
      list_income: { Args: { p_cursor?: string; p_from?: string; p_limit?: number; p_to?: string }; Returns: Json };
      list_orders: {
        Args: { p_cursor?: string; p_filter: string; p_limit?: number; p_search?: string };
        Returns: Json;
      };
      list_product_movements: { Args: { p_cursor?: string; p_limit?: number; p_product_id: string }; Returns: Json };
      list_products: { Args: Record<PropertyKey, never>; Returns: Json };
      list_receivables: { Args: { p_cursor?: string; p_limit?: number }; Returns: Json };
      list_templates: { Args: Record<PropertyKey, never>; Returns: Json };
      loyalty_overview: { Args: { p_limit?: number }; Returns: Json };
      order_counts: { Args: Record<PropertyKey, never>; Returns: Json };
      product_sales_by_weekday: { Args: { p_product_id: string }; Returns: Json };
      production_suggestion: { Args: Record<PropertyKey, never>; Returns: Json };
      register_production: { Args: { p_items: Json; p_request_id: string }; Returns: Json };
      register_stock_count: { Args: { p_counts: Json; p_request_id: string }; Returns: Json };
      register_waste: {
        Args: { p_product_id: string; p_quantity: number; p_reason: string; p_request_id: string };
        Returns: Json;
      };
      report_ranking: { Args: { p_from: string; p_to: string }; Returns: Json };
      report_summary: { Args: { p_from: string; p_previous_from?: string; p_to: string }; Returns: Json };
      reset_template: { Args: { p_key: string }; Returns: Json };
      revert_cancel: { Args: { p_order_id: string }; Returns: Json };
      revert_edit: { Args: { p_order_id: string; p_version: number }; Returns: Json };
      revert_expense_change: { Args: { p_expense_id: string }; Returns: Json };
      revert_status: { Args: { p_expected_status: string; p_order_id: string }; Returns: Json };
      revert_stock_change: { Args: { p_request_id: string }; Returns: Json };
      save_expense_category: {
        Args: { p_expected_version: number; p_icon: string; p_id: string; p_name: string };
        Returns: Json;
      };
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
      search_customers: { Args: { p_cursor?: string; p_filter: string; p_limit?: number; p_q: string }; Returns: Json };
      set_category_active: { Args: { p_active: boolean; p_expected_version: number; p_id: string }; Returns: Json };
      set_product_active: { Args: { p_active: boolean; p_id: string }; Returns: Json };
      stock_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      upcoming_orders: { Args: { p_limit?: number }; Returns: Json };
      update_customer: {
        Args: {
          p_accepts_promotions: boolean;
          p_address: string;
          p_expected_version: number;
          p_id: string;
          p_name: string;
          p_note: string;
        };
        Returns: Json;
      };
      update_loyalty_settings: {
        Args: {
          p_expected_version: number;
          p_goal: number;
          p_is_active: boolean;
          p_reward_amount_cents: number;
          p_reward_kind: string;
          p_reward_text: string;
          p_stamp_unit: string;
        };
        Returns: Json;
      };
      update_settings: { Args: { p_expected_version: number; p_patch: Json }; Returns: Json };
      update_template: { Args: { p_body: string; p_expected_version: number; p_key: string }; Returns: Json };
      void_expense: { Args: { p_id: string; p_reason: string }; Returns: Json };
      void_manual_income: { Args: { p_id: string; p_reason: string }; Returns: Json };
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
