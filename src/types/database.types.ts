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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          cleaner_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          last_nudge_sent_at: string | null
          message: string | null
          pending_reviewed_at: string | null
          request_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          cleaner_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          last_nudge_sent_at?: string | null
          message?: string | null
          pending_reviewed_at?: string | null
          request_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          cleaner_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          last_nudge_sent_at?: string | null
          message?: string | null
          pending_reviewed_at?: string | null
          request_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "cleaners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "clean_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      clean_requests: {
        Row: {
          assigned_cleaner_id: string | null
          bathrooms: number
          bedrooms: number
          cancellation_reason: string | null
          cancellation_requested_at: string | null
          cooling_off_consent_given: boolean
          cooling_off_until: string | null
          cover_date: string | null
          cover_feedback_email_sent_at: string | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          first_clean_discount_amount_pence: number | null
          first_clean_discount_credited_at: string | null
          frequency: string | null
          fulfilled_at: string | null
          gocardless_mandate_id: string | null
          gocardless_refund_id: string | null
          gocardless_subscription_id: string | null
          goes_live_at: string | null
          has_pets: boolean
          hidden: boolean | null
          hidden_reviewed_at: string | null
          hourly_rate: number | null
          hours_per_session: number | null
          id: string
          is_switch: boolean | null
          original_cleaner_id: string | null
          parent_request_id: string | null
          paused_at: string | null
          payment_failed_at: string | null
          payment_failure_count: number | null
          payment_grace_until: string | null
          pre_launch_24h_email_sent_at: string | null
          pre_launch_confirmed_at: string | null
          preferred_day: string | null
          preferred_days: string[] | null
          price_per_session: number | null
          republish_count: number | null
          review_email_sent_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          start_date: string | null
          status: Database["public"]["Enums"]["request_status"]
          switch_blocked_cleaner_id: string | null
          switch_from_request_id: string | null
          switch_pending: boolean | null
          switch_reason: string | null
          switch_requested_at: string | null
          tasks: string[] | null
          time_of_day: string | null
          time_window_end: string | null
          time_window_start: string | null
          updated_at: string
          zone: Database["public"]["Enums"]["horsham_zone"] | null
        }
        Insert: {
          assigned_cleaner_id?: string | null
          bathrooms: number
          bedrooms: number
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          cooling_off_consent_given?: boolean
          cooling_off_until?: string | null
          cover_date?: string | null
          cover_feedback_email_sent_at?: string | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          first_clean_discount_amount_pence?: number | null
          first_clean_discount_credited_at?: string | null
          frequency?: string | null
          fulfilled_at?: string | null
          gocardless_mandate_id?: string | null
          gocardless_refund_id?: string | null
          gocardless_subscription_id?: string | null
          goes_live_at?: string | null
          has_pets?: boolean
          hidden?: boolean | null
          hidden_reviewed_at?: string | null
          hourly_rate?: number | null
          hours_per_session?: number | null
          id?: string
          is_switch?: boolean | null
          original_cleaner_id?: string | null
          parent_request_id?: string | null
          paused_at?: string | null
          payment_failed_at?: string | null
          payment_failure_count?: number | null
          payment_grace_until?: string | null
          pre_launch_24h_email_sent_at?: string | null
          pre_launch_confirmed_at?: string | null
          preferred_day?: string | null
          preferred_days?: string[] | null
          price_per_session?: number | null
          republish_count?: number | null
          review_email_sent_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          switch_blocked_cleaner_id?: string | null
          switch_from_request_id?: string | null
          switch_pending?: boolean | null
          switch_reason?: string | null
          switch_requested_at?: string | null
          tasks?: string[] | null
          time_of_day?: string | null
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
          zone?: Database["public"]["Enums"]["horsham_zone"] | null
        }
        Update: {
          assigned_cleaner_id?: string | null
          bathrooms?: number
          bedrooms?: number
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          cooling_off_consent_given?: boolean
          cooling_off_until?: string | null
          cover_date?: string | null
          cover_feedback_email_sent_at?: string | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          first_clean_discount_amount_pence?: number | null
          first_clean_discount_credited_at?: string | null
          frequency?: string | null
          fulfilled_at?: string | null
          gocardless_mandate_id?: string | null
          gocardless_refund_id?: string | null
          gocardless_subscription_id?: string | null
          goes_live_at?: string | null
          has_pets?: boolean
          hidden?: boolean | null
          hidden_reviewed_at?: string | null
          hourly_rate?: number | null
          hours_per_session?: number | null
          id?: string
          is_switch?: boolean | null
          original_cleaner_id?: string | null
          parent_request_id?: string | null
          paused_at?: string | null
          payment_failed_at?: string | null
          payment_failure_count?: number | null
          payment_grace_until?: string | null
          pre_launch_24h_email_sent_at?: string | null
          pre_launch_confirmed_at?: string | null
          preferred_day?: string | null
          preferred_days?: string[] | null
          price_per_session?: number | null
          republish_count?: number | null
          review_email_sent_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          switch_blocked_cleaner_id?: string | null
          switch_from_request_id?: string | null
          switch_pending?: boolean | null
          switch_reason?: string | null
          switch_requested_at?: string | null
          tasks?: string[] | null
          time_of_day?: string | null
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
          zone?: Database["public"]["Enums"]["horsham_zone"] | null
        }
        Relationships: [
          {
            foreignKeyName: "clean_requests_assigned_cleaner_id_fkey"
            columns: ["assigned_cleaner_id"]
            isOneToOne: false
            referencedRelation: "cleaners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clean_requests_original_cleaner_id_fkey"
            columns: ["original_cleaner_id"]
            isOneToOne: false
            referencedRelation: "cleaners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clean_requests_parent_request_id_fkey"
            columns: ["parent_request_id"]
            isOneToOne: false
            referencedRelation: "clean_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clean_requests_switch_blocked_cleaner_id_fkey"
            columns: ["switch_blocked_cleaner_id"]
            isOneToOne: false
            referencedRelation: "cleaners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clean_requests_switch_from_request_id_fkey"
            columns: ["switch_from_request_id"]
            isOneToOne: false
            referencedRelation: "clean_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaner_documents: {
        Row: {
          cleaner_id: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          notes: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          cleaner_id: string
          document_type: string
          file_name: string
          file_url: string
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          cleaner_id?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaner_documents_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "cleaners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaner_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaner_job_alerts_sent: {
        Row: {
          cleaner_id: string
          request_id: string
          sent_at: string
        }
        Insert: {
          cleaner_id: string
          request_id: string
          sent_at?: string
        }
        Update: {
          cleaner_id?: string
          request_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaner_job_alerts_sent_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "cleaners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaner_job_alerts_sent_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "clean_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaners: {
        Row: {
          application_notes: string | null
          application_status: Database["public"]["Enums"]["application_status"]
          approved_at: string | null
          approved_by: string | null
          availability_days: string[]
          bio: string | null
          cleans_completed: number | null
          cover_cleans_notify: boolean
          created_at: string
          dbs_checked: boolean
          dbs_expiry: string | null
          dbs_file_url: string | null
          dbs_number: string | null
          dbs_uploaded_at: string | null
          dbs_verified: boolean
          has_insurance: boolean
          hourly_rate: number | null
          id: string
          insurance_expiry: string | null
          insurance_expiry_date: string | null
          insurance_file_url: string | null
          insurance_provider: string | null
          insurance_uploaded_at: string | null
          insurance_verified: boolean
          interview_conducted_at: string | null
          interview_conducted_by: string | null
          interview_notes: string | null
          interview_platform: Json | null
          interview_qualifying: Json | null
          job_notify: boolean
          job_notify_filters: Json | null
          marketing_opt_in: boolean
          max_radius_miles: number
          needs_credentials_help: boolean
          onboarding_completed_at: string | null
          own_supplies: boolean
          phone: string | null
          profile_id: string
          rating_average: number | null
          rating_count: number
          rejected_at: string | null
          rejection_reason: string | null
          right_to_work: boolean
          right_to_work_expiry: string | null
          right_to_work_file_url: string | null
          right_to_work_uploaded_at: string | null
          right_to_work_verified: boolean
          short_id: string
          sms_notify: boolean | null
          submission_reviewed_at: string | null
          suspended_at: string | null
          suspension_reason: string | null
          tasks: string[] | null
          time_of_day: string | null
          updated_at: string
          years_experience: number | null
          zones: string[] | null
        }
        Insert: {
          application_notes?: string | null
          application_status?: Database["public"]["Enums"]["application_status"]
          approved_at?: string | null
          approved_by?: string | null
          availability_days?: string[]
          bio?: string | null
          cleans_completed?: number | null
          cover_cleans_notify?: boolean
          created_at?: string
          dbs_checked?: boolean
          dbs_expiry?: string | null
          dbs_file_url?: string | null
          dbs_number?: string | null
          dbs_uploaded_at?: string | null
          dbs_verified?: boolean
          has_insurance?: boolean
          hourly_rate?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_expiry_date?: string | null
          insurance_file_url?: string | null
          insurance_provider?: string | null
          insurance_uploaded_at?: string | null
          insurance_verified?: boolean
          interview_conducted_at?: string | null
          interview_conducted_by?: string | null
          interview_notes?: string | null
          interview_platform?: Json | null
          interview_qualifying?: Json | null
          job_notify?: boolean
          job_notify_filters?: Json | null
          marketing_opt_in?: boolean
          max_radius_miles?: number
          needs_credentials_help?: boolean
          onboarding_completed_at?: string | null
          own_supplies?: boolean
          phone?: string | null
          profile_id: string
          rating_average?: number | null
          rating_count?: number
          rejected_at?: string | null
          rejection_reason?: string | null
          right_to_work?: boolean
          right_to_work_expiry?: string | null
          right_to_work_file_url?: string | null
          right_to_work_uploaded_at?: string | null
          right_to_work_verified?: boolean
          short_id?: string
          sms_notify?: boolean | null
          submission_reviewed_at?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          tasks?: string[] | null
          time_of_day?: string | null
          updated_at?: string
          years_experience?: number | null
          zones?: string[] | null
        }
        Update: {
          application_notes?: string | null
          application_status?: Database["public"]["Enums"]["application_status"]
          approved_at?: string | null
          approved_by?: string | null
          availability_days?: string[]
          bio?: string | null
          cleans_completed?: number | null
          cover_cleans_notify?: boolean
          created_at?: string
          dbs_checked?: boolean
          dbs_expiry?: string | null
          dbs_file_url?: string | null
          dbs_number?: string | null
          dbs_uploaded_at?: string | null
          dbs_verified?: boolean
          has_insurance?: boolean
          hourly_rate?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_expiry_date?: string | null
          insurance_file_url?: string | null
          insurance_provider?: string | null
          insurance_uploaded_at?: string | null
          insurance_verified?: boolean
          interview_conducted_at?: string | null
          interview_conducted_by?: string | null
          interview_notes?: string | null
          interview_platform?: Json | null
          interview_qualifying?: Json | null
          job_notify?: boolean
          job_notify_filters?: Json | null
          marketing_opt_in?: boolean
          max_radius_miles?: number
          needs_credentials_help?: boolean
          onboarding_completed_at?: string | null
          own_supplies?: boolean
          phone?: string | null
          profile_id?: string
          rating_average?: number | null
          rating_count?: number
          rejected_at?: string | null
          rejection_reason?: string | null
          right_to_work?: boolean
          right_to_work_expiry?: string | null
          right_to_work_file_url?: string | null
          right_to_work_uploaded_at?: string | null
          right_to_work_verified?: boolean
          short_id?: string
          sms_notify?: boolean | null
          submission_reviewed_at?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          tasks?: string[] | null
          time_of_day?: string | null
          updated_at?: string
          years_experience?: number | null
          zones?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaners_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaners_interview_conducted_by_fkey"
            columns: ["interview_conducted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          clean_request_id: string | null
          cleaner_chat_index: number | null
          cleaner_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          last_nudge_sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          clean_request_id?: string | null
          cleaner_chat_index?: number | null
          cleaner_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_nudge_sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          clean_request_id?: string | null
          cleaner_chat_index?: number | null
          cleaner_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_nudge_sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_clean_request_id_fkey"
            columns: ["clean_request_id"]
            isOneToOne: false
            referencedRelation: "clean_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "cleaners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string
          address_line2: string | null
          blocked_cleaner_ids: string[] | null
          city: string
          created_at: string
          frequency: Database["public"]["Enums"]["frequency_type"]
          gocardless_flow_id: string | null
          gocardless_mandate_id: string | null
          id: string
          postcode: string
          profile_id: string
          referral_token: string | null
          referred_by_customer_id: string | null
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          blocked_cleaner_ids?: string[] | null
          city: string
          created_at?: string
          frequency: Database["public"]["Enums"]["frequency_type"]
          gocardless_flow_id?: string | null
          gocardless_mandate_id?: string | null
          id?: string
          postcode: string
          profile_id: string
          referral_token?: string | null
          referred_by_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          blocked_cleaner_ids?: string[] | null
          city?: string
          created_at?: string
          frequency?: Database["public"]["Enums"]["frequency_type"]
          gocardless_flow_id?: string | null
          gocardless_mandate_id?: string | null
          id?: string
          postcode?: string
          profile_id?: string
          referral_token?: string | null
          referred_by_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_referred_by_customer_id_fkey"
            columns: ["referred_by_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          body: string
          created_at: string
          email: string | null
          id: string
          page_url: string | null
          profile_id: string | null
          role: string | null
          status: string
          type: string
          user_agent: string | null
        }
        Insert: {
          body: string
          created_at?: string
          email?: string | null
          id?: string
          page_url?: string | null
          profile_id?: string | null
          role?: string | null
          status?: string
          type: string
          user_agent?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          email?: string | null
          id?: string
          page_url?: string | null
          profile_id?: string | null
          role?: string | null
          status?: string
          type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gocardless_webhook_events: {
        Row: {
          action: string
          details: Json | null
          id: string
          links: Json | null
          processed_at: string | null
          processing_error: string | null
          raw_payload: Json
          received_at: string | null
          resource_type: string
        }
        Insert: {
          action: string
          details?: Json | null
          id: string
          links?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          raw_payload: Json
          received_at?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          links?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          raw_payload?: Json
          received_at?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      keyword_violations: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          emailed_at: string | null
          id: string
          message_content: string
          reviewed_at: string | null
          reviewed_by: string | null
          sender_id: string | null
          sender_role: string
          triggered_keywords: string[]
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          emailed_at?: string | null
          id?: string
          message_content: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id?: string | null
          sender_role: string
          triggered_keywords: string[]
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          emailed_at?: string | null
          id?: string
          message_content?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id?: string | null
          sender_role?: string
          triggered_keywords?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "keyword_violations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyword_violations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyword_violations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          sender_id: string | null
          sender_role: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          sender_id?: string | null
          sender_role?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          sender_id?: string | null
          sender_role?: string | null
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
          body: string | null
          cleaner_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          cleaner_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
        }
        Update: {
          body?: string | null
          cleaner_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "cleaners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          suspended: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          suspended?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          suspended?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_credits: {
        Row: {
          applied_at: string | null
          created_at: string
          id: string
          referee_applied_at: string | null
          referred_customer_id: string
          referrer_applied_at: string | null
          referrer_customer_id: string
          referrer_skipped_reason: string | null
          state: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          id?: string
          referee_applied_at?: string | null
          referred_customer_id: string
          referrer_applied_at?: string | null
          referrer_customer_id: string
          referrer_skipped_reason?: string | null
          state?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          id?: string
          referee_applied_at?: string | null
          referred_customer_id?: string
          referrer_applied_at?: string | null
          referrer_customer_id?: string
          referrer_skipped_reason?: string | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_credits_referred_customer_id_fkey"
            columns: ["referred_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_credits_referrer_customer_id_fkey"
            columns: ["referrer_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          clean_request_id: string | null
          cleaner_id: string
          created_at: string
          customer_profile_id: string
          hidden: boolean
          hidden_reason: string | null
          id: string
          stars: number
        }
        Insert: {
          body: string
          clean_request_id?: string | null
          cleaner_id: string
          created_at?: string
          customer_profile_id: string
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          stars: number
        }
        Update: {
          body?: string
          clean_request_id?: string | null
          cleaner_id?: string
          created_at?: string
          customer_profile_id?: string
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_clean_request_id_fkey"
            columns: ["clean_request_id"]
            isOneToOne: false
            referencedRelation: "clean_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "cleaners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      violation_keywords: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          keyword: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          keyword: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          keyword?: string
        }
        Relationships: [
          {
            foreignKeyName: "violation_keywords_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: { Args: never; Returns: string }
      increment_payment_failure: {
        Args: { p_grace_until: string; p_request_id: string }
        Returns: number
      }
      normalise_for_keyword_audit: { Args: { input: string }; Returns: string }
      recompute_cleaner_review_aggregates: {
        Args: { target_cleaner_id: string }
        Returns: undefined
      }
    }
    Enums: {
      application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
        | "submitted"
      frequency_type: "weekly" | "fortnightly" | "monthly"
      horsham_zone:
        | "central_south_east"
        | "north_west"
        | "north_east_roffey"
        | "south_west"
        | "warnham_north"
        | "broadbridge_heath"
        | "mannings_heath"
        | "faygate_kilnwood_vale"
        | "christs_hospital"
      request_status:
        | "pending"
        | "assigned"
        | "active"
        | "completed"
        | "cancelled"
        | "pending_review"
        | "paused"
        | "deleted"
        | "fulfilled"
        | "pre_launch_pending"
      service_type:
        | "regular"
        | "deep_clean"
        | "end_of_tenancy"
        | "oven_clean"
        | "cover"
      user_role: "customer" | "cleaner" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "pending",
        "approved",
        "rejected",
        "suspended",
        "submitted",
      ],
      frequency_type: ["weekly", "fortnightly", "monthly"],
      horsham_zone: [
        "central_south_east",
        "north_west",
        "north_east_roffey",
        "south_west",
        "warnham_north",
        "broadbridge_heath",
        "mannings_heath",
        "faygate_kilnwood_vale",
        "christs_hospital",
      ],
      request_status: [
        "pending",
        "assigned",
        "active",
        "completed",
        "cancelled",
        "pending_review",
        "paused",
        "deleted",
        "fulfilled",
        "pre_launch_pending",
      ],
      service_type: [
        "regular",
        "deep_clean",
        "end_of_tenancy",
        "oven_clean",
        "cover",
      ],
      user_role: ["customer", "cleaner", "admin"],
    },
  },
} as const
