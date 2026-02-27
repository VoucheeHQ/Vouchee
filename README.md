# Vouchee

A two-sided marketplace connecting self-employed cleaners with customers in Horsham and surrounding areas.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (Postgres + Auth) |
| Payments | Stripe Subscriptions |
| Deployment | Vercel |

---

## Roles

- **Customer** – Posts a clean request via wizard, pays monthly platform fee
- **Cleaner** – Applies to join, browses job offers, accepts/declines, marks complete
- **Admin** – Approves cleaners, manages assignments, exports data, edits pricing

---

## Pricing

| Frequency | Per Session Fee | Monthly Charge |
|-----------|----------------|----------------|
| Weekly | £9.99 | £9.99 × 4.3333 = **£43.33** |
| Fortnightly | £14.99 | £14.99 × 2.1667 = **£32.48** |
| Monthly | £19.99 flat | **£19.99** |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-org/vouchee.git
cd vouchee
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your Supabase and Stripe credentials in `.env.local`.

### 3. Set up Supabase

- Create a new project at [supabase.com](https://supabase.com)
- Run the SQL migrations in `/supabase/migrations/` via the Supabase SQL editor
- Enable Email auth in Authentication → Providers

### 4. Set up Stripe

- Create products and prices matching the pricing table above
- Copy the price IDs into `.env.local`
- Set up a webhook endpoint pointing to `/api/webhooks/stripe`

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (public)/           # Public marketing pages
│   ├── (auth)/             # Login / register / onboarding
│   ├── dashboard/          # Customer dashboard
│   ├── cleaner/            # Cleaner portal
│   ├── admin/              # Admin panel
│   └── api/                # API routes (Stripe webhooks etc.)
├── components/
│   ├── ui/                 # Base UI primitives
│   ├── forms/              # Form components
│   └── layout/             # Header, footer, nav
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── stripe/             # Stripe helpers
│   └── utils/              # Shared utilities
├── types/                  # TypeScript types & DB types
└── supabase/
    └── migrations/         # SQL migration files
```

---

## Future Hooks (not yet implemented)

- `/app/(public)/products` – Affiliate products page placeholder
- Review nudge email – triggered 30 days after first completed clean

---

## Deployment

Push to `main` branch → auto-deploys on Vercel.

Set all environment variables in Vercel Dashboard → Settings → Environment Variables.

---

## Locations Served (V1)

Horsham, Crawley, Billingshurst, Pulborough, Storrington, Henfield, Burgess Hill, Haywards Heath
