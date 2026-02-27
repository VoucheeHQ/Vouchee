import { Database } from './database.types'

// ─── Database Table Types ───────────────────────────────────
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Cleaner = Database['public']['Tables']['cleaners']['Row']
export type CleanRequest = Database['public']['Tables']['clean_requests']['Row']
export type CleanSession = Database['public']['Tables']['clean_sessions']['Row']
export type Issue = Database['public']['Tables']['issues']['Row']
export type TierPricing = Database['public']['Tables']['tier_pricing']['Row']

// ─── Enums ──────────────────────────────────────────────────
export type UserRole = Database['public']['Enums']['user_role']
export type FrequencyType = Database['public']['Enums']['frequency_type']
export type ApplicationStatus = Database['public']['Enums']['application_status']
export type SubscriptionStatus = Database['public']['Enums']['subscription_status']
export type RequestStatus = Database['public']['Enums']['request_status']
export type SessionStatus = Database['public']['Enums']['session_status']
export type IssueStatus = Database['public']['Enums']['issue_status']

// ─── Form Types ─────────────────────────────────────────────
export interface CleanRequestFormData {
  propertyType: string
  bedrooms: number
  bathrooms: number
  hasPets: boolean
  specialInstructions?: string
  preferredDay?: string
  preferredTime?: string
}

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

export interface IssueReportFormData {
  cleanSessionId?: string
  issueType: 'quality' | 'damage' | 'no_show' | 'late' | 'other'
  description: string
}

// ─── Joined Types ───────────────────────────────────────────
export interface CleanRequestWithCustomer extends CleanRequest {
  customer: Customer & { profile: Profile }
}

export interface CleanRequestWithCleaner extends CleanRequest {
  cleaner?: Cleaner & { profile: Profile }
}

export interface CleanSessionWithDetails extends CleanSession {
  clean_request: CleanRequest & {
    customer: Customer & { profile: Profile }
  }
  cleaner: Cleaner & { profile: Profile }
}

export interface IssueWithDetails extends Issue {
  customer: Customer & { profile: Profile }
  clean_session?: CleanSession
}

// ─── Pricing Calculation Types ──────────────────────────────
export interface PricingTier {
  frequency: FrequencyType
  pricePerSession: number
  sessionsPerMonth: number
  monthlyCharge: number
}

export const PRICING_TIERS: Record<FrequencyType, PricingTier> = {
  weekly: {
    frequency: 'weekly',
    pricePerSession: 9.99,
    sessionsPerMonth: 4.3333,
    monthlyCharge: 43.33,
  },
  fortnightly: {
    frequency: 'fortnightly',
    pricePerSession: 14.99,
    sessionsPerMonth: 2.1667,
    monthlyCharge: 32.48,
  },
  monthly: {
    frequency: 'monthly',
    pricePerSession: 19.99,
    sessionsPerMonth: 1,
    monthlyCharge: 19.99,
  },
}

// ─── Utility Types ──────────────────────────────────────────
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
