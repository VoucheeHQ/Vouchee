export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'customer' | 'cleaner' | 'admin'
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'customer' | 'cleaner' | 'admin'
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'customer' | 'cleaner' | 'admin'
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          profile_id: string
          address_line1: string
          address_line2: string | null
          city: string
          postcode: string
          frequency: 'weekly' | 'fortnightly' | 'monthly'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: 'active' | 'paused' | 'cancelled' | 'pending'
          paused_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          address_line1: string
          address_line2?: string | null
          city: string
          postcode: string
          frequency: 'weekly' | 'fortnightly' | 'monthly'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'active' | 'paused' | 'cancelled' | 'pending'
          paused_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          address_line1?: string
          address_line2?: string | null
          city?: string
          postcode?: string
          frequency?: 'weekly' | 'fortnightly' | 'monthly'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'active' | 'paused' | 'cancelled' | 'pending'
          paused_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cleaners: {
        Row: {
          id: string
          profile_id: string
          application_status: 'pending' | 'approved' | 'rejected' | 'suspended'
          application_notes: string | null
          bio: string | null
          years_experience: number | null
          own_supplies: boolean
          dbs_checked: boolean
          availability_days: string[]
          max_radius_miles: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          application_status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          application_notes?: string | null
          bio?: string | null
          years_experience?: number | null
          own_supplies?: boolean
          dbs_checked?: boolean
          availability_days?: string[]
          max_radius_miles?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          application_status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          application_notes?: string | null
          bio?: string | null
          years_experience?: number | null
          own_supplies?: boolean
          dbs_checked?: boolean
          availability_days?: string[]
          max_radius_miles?: number
          created_at?: string
          updated_at?: string
        }
      }
      clean_requests: {
        Row: {
          id: string
          customer_id: string
          assigned_cleaner_id: string | null
          property_type: string
          bedrooms: number
          bathrooms: number
          has_pets: boolean
          special_instructions: string | null
          preferred_day: string | null
          preferred_time: string | null
          start_date: string | null
          status: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled'
          service_type: 'regular' | 'deep_clean' | 'end_of_tenancy' | 'oven_clean'
          zone: 'central_south_east' | 'north_west' | 'north_east_roffey' | 'south_west' | 'warnham_north' | 'broadbridge_heath' | 'mannings_heath' | 'faygate_kilnwood_vale' | 'christs_hospital' | null
          price_per_session: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          assigned_cleaner_id?: string | null
          property_type: string
          bedrooms: number
          bathrooms: number
          has_pets?: boolean
          special_instructions?: string | null
          preferred_day?: string | null
          preferred_time?: string | null
          start_date?: string | null
          status?: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled'
          service_type?: 'regular' | 'deep_clean' | 'end_of_tenancy' | 'oven_clean'
          zone?: 'central_south_east' | 'north_west' | 'north_east_roffey' | 'south_west' | 'warnham_north' | 'broadbridge_heath' | 'mannings_heath' | 'faygate_kilnwood_vale' | 'christs_hospital' | null
          price_per_session?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          assigned_cleaner_id?: string | null
          property_type?: string
          bedrooms?: number
          bathrooms?: number
          has_pets?: boolean
          special_instructions?: string | null
          preferred_day?: string | null
          preferred_time?: string | null
          start_date?: string | null
          status?: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled'
          service_type?: 'regular' | 'deep_clean' | 'end_of_tenancy' | 'oven_clean'
          zone?: 'central_south_east' | 'north_west' | 'north_east_roffey' | 'south_west' | 'warnham_north' | 'broadbridge_heath' | 'mannings_heath' | 'faygate_kilnwood_vale' | 'christs_hospital' | null
          price_per_session?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      clean_sessions: {
        Row: {
          id: string
          clean_request_id: string
          cleaner_id: string
          scheduled_date: string
          scheduled_time: string
          completed_at: string | null
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          customer_notes: string | null
          cleaner_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clean_request_id: string
          cleaner_id: string
          scheduled_date: string
          scheduled_time: string
          completed_at?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          customer_notes?: string | null
          cleaner_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clean_request_id?: string
          cleaner_id?: string
          scheduled_date?: string
          scheduled_time?: string
          completed_at?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          customer_notes?: string | null
          cleaner_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      issues: {
        Row: {
          id: string
          customer_id: string
          clean_session_id: string | null
          issue_type: 'quality' | 'damage' | 'no_show' | 'late' | 'other'
          description: string
          status: 'open' | 'investigating' | 'resolved' | 'closed'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          clean_session_id?: string | null
          issue_type: 'quality' | 'damage' | 'no_show' | 'late' | 'other'
          description: string
          status?: 'open' | 'investigating' | 'resolved' | 'closed'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          clean_session_id?: string | null
          issue_type?: 'quality' | 'damage' | 'no_show' | 'late' | 'other'
          description?: string
          status?: 'open' | 'investigating' | 'resolved' | 'closed'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tier_pricing: {
        Row: {
          id: string
          frequency: 'weekly' | 'fortnightly' | 'monthly'
          price_per_session: number
          sessions_per_month: number
          monthly_charge: number
          stripe_price_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          frequency: 'weekly' | 'fortnightly' | 'monthly'
          price_per_session: number
          sessions_per_month: number
          monthly_charge: number
          stripe_price_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          frequency?: 'weekly' | 'fortnightly' | 'monthly'
          price_per_session?: number
          sessions_per_month?: number
          monthly_charge?: number
          stripe_price_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'customer' | 'cleaner' | 'admin'
      frequency_type: 'weekly' | 'fortnightly' | 'monthly'
      application_status: 'pending' | 'approved' | 'rejected' | 'suspended'
      subscription_status: 'active' | 'paused' | 'cancelled' | 'pending'
      request_status: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled'
      session_status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
      issue_status: 'open' | 'investigating' | 'resolved' | 'closed'
      service_type: 'regular' | 'deep_clean' | 'end_of_tenancy' | 'oven_clean'
      horsham_zone: 'central_south_east' | 'north_west' | 'north_east_roffey' | 'south_west' | 'warnham_north' | 'broadbridge_heath' | 'mannings_heath' | 'faygate_kilnwood_vale' | 'christs_hospital'
    }
  }
}