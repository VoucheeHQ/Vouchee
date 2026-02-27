import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

export const STRIPE_PRICE_IDS = {
  weekly: process.env.STRIPE_PRICE_WEEKLY || 'price_weekly_placeholder',
  fortnightly: process.env.STRIPE_PRICE_FORTNIGHTLY || 'price_fortnightly_placeholder',
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_placeholder',
} as const

export function getPriceIdByFrequency(frequency: 'weekly' | 'fortnightly' | 'monthly'): string {
  return STRIPE_PRICE_IDS[frequency]
}
