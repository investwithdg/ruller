export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "Draft"
  | "AwaitingPayment"
  | "ReadyForDispatch"
  | "Assigned"
  | "Accepted"
  | "PickedUp"
  | "InTransit"
  | "Delivered"
  | "Canceled";

export type UserRole = "admin" | "dispatcher" | "driver" | "recipient";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          slug: string;
          tenant_id: string;
          organization_id: string;
          name: string;
          short_name: string;
          order_prefix: string;
          vertical: string;
          primary_color: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          tenant_id: string;
          organization_id: string;
          name: string;
          short_name: string;
          order_prefix?: string;
          vertical?: string;
          primary_color?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          tenant_id?: string;
          organization_id?: string;
          name?: string;
          short_name?: string;
          order_prefix?: string;
          vertical?: string;
          primary_color?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          auth_id: string | null;
          user_id: string | null;
          tenant_id: string;
          organization_id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          corporate_account_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          user_id?: string | null;
          tenant_id?: string;
          organization_id?: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          corporate_account_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          user_id?: string | null;
          tenant_id?: string;
          organization_id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          corporate_account_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          driver_id: string | null;
          vehicle_type: string;
          make_model: string;
          plate_number: string | null;
          insurance_verified: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          driver_id?: string | null;
          vehicle_type?: string;
          make_model: string;
          plate_number?: string | null;
          insurance_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          driver_id?: string | null;
          vehicle_type?: string;
          make_model?: string;
          plate_number?: string | null;
          insurance_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tracking_events: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          order_id: string;
          driver_id: string | null;
          event_type: string;
          status_label: string | null;
          latitude: number | null;
          longitude: number | null;
          accuracy_m: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          order_id: string;
          driver_id?: string | null;
          event_type: string;
          status_label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          accuracy_m?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          order_id?: string;
          driver_id?: string | null;
          event_type?: string;
          status_label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          accuracy_m?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          auth_id: string | null;
          tenant_id: string;
          organization_id: string;
          email: string | null;
          role: UserRole | null;
          expo_push_token?: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          tenant_id?: string;
          organization_id?: string;
          email?: string | null;
          role?: UserRole | null;
          expo_push_token?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          tenant_id?: string;
          organization_id?: string;
          email?: string | null;
          role?: UserRole | null;
          expo_push_token?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          auth_user_id: string | null;
          email: string;
          name: string | null;
          phone: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          auth_user_id?: string | null;
          email: string;
          name?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          auth_user_id?: string | null;
          email?: string;
          name?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          name: string;
          phone: string;
          vehicle_details: string | null;
          vehicle_type?: string | null;
          user_id: string | null;
          push_subscription: Json | null;
          expo_push_token?: string | null;
          is_available?: boolean | null;
          doc_verified?: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          name: string;
          phone: string;
          vehicle_details?: string | null;
          vehicle_type?: string | null;
          user_id?: string | null;
          push_subscription?: Json | null;
          expo_push_token?: string | null;
          is_available?: boolean | null;
          doc_verified?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          name?: string;
          phone?: string;
          vehicle_details?: string | null;
          vehicle_type?: string | null;
          user_id?: string | null;
          push_subscription?: Json | null;
          expo_push_token?: string | null;
          is_available?: boolean | null;
          doc_verified?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          customer_id: string | null;
          pickup_address: string;
          dropoff_address: string;
          distance_mi: number;
          weight_lb: number | null;
          pricing: Json;
          expires_at: string | null;
          status: string | null;
          stripe_checkout_session_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          customer_id?: string | null;
          pickup_address: string;
          dropoff_address: string;
          distance_mi: number;
          weight_lb?: number | null;
          pricing: Json;
          expires_at?: string | null;
          status?: string | null;
          stripe_checkout_session_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          customer_id?: string | null;
          pickup_address?: string;
          dropoff_address?: string;
          distance_mi?: number;
          weight_lb?: number | null;
          pricing?: Json;
          expires_at?: string | null;
          status?: string | null;
          stripe_checkout_session_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          quote_id: string | null;
          customer_id: string | null;
          customer_auth_id: string | null;
          driver_id: string | null;
          price_total: number;
          currency: string | null;
          status: OrderStatus;
          public_tracking_token: string | null;
          stripe_payment_intent_id: string | null;
          stripe_checkout_session_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          quote_id?: string | null;
          customer_id?: string | null;
          customer_auth_id?: string | null;
          driver_id?: string | null;
          price_total: number;
          currency?: string | null;
          status?: OrderStatus;
          public_tracking_token?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_checkout_session_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          quote_id?: string | null;
          customer_id?: string | null;
          customer_auth_id?: string | null;
          driver_id?: string | null;
          price_total?: number;
          currency?: string | null;
          status?: OrderStatus;
          public_tracking_token?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_checkout_session_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      delivery_proof: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          order_id: string;
          driver_id: string;
          photo_urls: string[];
          signature_url: string | null;
          signature_svg?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          gps_accuracy_m?: number | null;
          geofence_verified?: boolean | null;
          notes: string | null;
          recipient_name: string | null;
          delivered_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          order_id: string;
          driver_id: string;
          photo_urls?: string[];
          signature_url?: string | null;
          signature_svg?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          gps_accuracy_m?: number | null;
          geofence_verified?: boolean | null;
          notes?: string | null;
          recipient_name?: string | null;
          delivered_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          order_id?: string;
          driver_id?: string;
          photo_urls?: string[];
          signature_url?: string | null;
          signature_svg?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          gps_accuracy_m?: number | null;
          geofence_verified?: boolean | null;
          notes?: string | null;
          recipient_name?: string | null;
          delivered_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      dispatch_events: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          order_id: string | null;
          actor: string;
          event_type: string;
          payload: Json;
          source: string | null;
          event_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          order_id?: string | null;
          actor: string;
          event_type: string;
          payload: Json;
          source?: string | null;
          event_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          order_id?: string | null;
          actor?: string;
          event_type?: string;
          payload?: Json;
          source?: string | null;
          event_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      driver_locations: {
        Row: {
          id: string;
          tenant_id: string;
          organization_id: string;
          driver_id: string;
          order_id: string | null;
          latitude: number;
          longitude: number;
          accuracy: number | null;
          heading: number | null;
          speed: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          driver_id: string;
          order_id?: string | null;
          latitude: number;
          longitude: number;
          accuracy?: number | null;
          heading?: number | null;
          speed?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organization_id?: string;
          driver_id?: string;
          order_id?: string | null;
          latitude?: number;
          longitude?: number;
          accuracy?: number | null;
          heading?: number | null;
          speed?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      pricing_settings: {
        Row: {
          id: string;
          tenant_slug: string;
          tenant_id: string;
          organization_id: string;
          base_fee: number;
          per_mile_rate: number;
          fuel_pct: number;
          minimum_charge: number;
          currency: string;
          updated_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          tenant_id?: string;
          organization_id?: string;
          base_fee: number;
          per_mile_rate: number;
          fuel_pct: number;
          minimum_charge: number;
          currency?: string;
          updated_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_slug?: string;
          tenant_id?: string;
          organization_id?: string;
          base_fee?: number;
          per_mile_rate?: number;
          fuel_pct?: number;
          minimum_charge?: number;
          currency?: string;
          updated_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_own_account: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      order_status: OrderStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
