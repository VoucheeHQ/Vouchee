# Environment Setup Guide

## Step 1: Copy the example file

```bash
cp .env.example .env.local
```

## Step 2: Fill in your Supabase credentials

1. Go to https://app.supabase.com
2. Select your "cleaning-platform" project
3. Click "Project Settings" (gear icon in sidebar)
4. Go to "API" section

Copy these values into your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

5. Go to "Service Role" and copy the service role key:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Stripe (placeholder for now)

Leave these as placeholder values for now:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_WEEKLY=price_weekly_placeholder
STRIPE_PRICE_FORTNIGHTLY=price_fortnightly_placeholder
STRIPE_PRICE_MONTHLY=price_monthly_placeholder
```

## Step 4: App URL

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Cleaning Platform
```

## Step 5: Enable Email Auth in Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Make sure "Email" is enabled
3. Turn OFF "Confirm email" for testing (you can turn it back on later)

## Step 6: Run the app

```bash
npm run dev
```

Open http://localhost:3000 in your browser!
