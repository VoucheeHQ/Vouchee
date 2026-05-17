import { Database } from './database.types'

// ─── Database Table Types ────────────────────────────
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Cleaner = Database['public']['Tables']['cleaners']['Row']
export type CleanRequest = Database['public']['Tables']['clean_requests']['Row']

// ─── Enums ───────────────────────────────────────────
export type UserRole = Database['public']['Enums']['user_role']
export type FrequencyType = Database['public']['Enums']['frequency_type']
export type ApplicationStatus = Database['public']['Enums']['application_status']
export type RequestStatus = Database['public']['Enums']['request_status']

// ─── Form Types ──────────────────────────────────────
export interface CleanerApplicationFormData {
  fullName: string
  phone: string
  bio: string
  yearsExperience: number
  ownSupplies: boolean
  dbsChecked: boolean
  availabilityDays: string[]
  maxRadiusMiles: number
}

// ─── Joined Types ────────────────────────────────────
export interface CleanRequestWithCustomer extends CleanRequest {
  customer: Customer & { profile: Profile }
}

export interface CleanRequestWithCleaner extends CleanRequest {
  cleaner?: Cleaner & { profile: Profile }
}

// ─── Utility Types ───────────────────────────────────
export interface SelectOption {
  value: string
  label: string
}

export interface DashboardStats {
  totalCleans: number
  upcomingCleans: number
  completedCleans: number
  activeIssues: number
}