# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint via `next lint`
- `npm run type-check` — `tsc --noEmit` (no test framework configured)

Dev environment is Windows / PowerShell — prefer PowerShell syntax in shell commands (`$env:VAR`, `;` for chaining, etc.). The `@/*` path alias maps to `./src/*`.

## Architecture

Vouchee is a Next.js 14 App Router app for a two-sided cleaning marketplace (customers ↔ self-employed cleaners) in Horsham, UK. There are three roles — `customer`, `cleaner`, `admin` — defined in the `user_role` Postgres enum and stored on `profiles.role`.

### Auth & role-gated routing

- Supabase Auth via `@supabase/ssr`. A trigger on `auth.users` auto-creates a `profiles` row with default role `customer` (see `supabase/migrations/001_initial_schema.sql`).
- `middleware.ts` (matcher: `/admin`, `/cleaner`, `/customer`) reads the session, looks up `profiles.role`, and redirects on mismatch. Public marketing pages and the `/request` wizard are unauthenticated.
- Two Supabase server-client helpers exist: `src/lib/supabase/server.ts` (canonical, imported as `@/lib/supabase/server`) and `supabase/server.ts` (legacy duplicate using the newer `getAll/setAll` cookie API). New code should use the `@/lib/supabase/server` one. Browser client lives at `src/lib/supabase/client.ts`.

### Admin write path — service-role pattern

Admin mutations follow a fixed pattern (see `src/app/admin/route.ts` and `src/app/api/admin/route.ts` for the canonical examples, plus most files under `src/app/api/`):

1. Construct the cookie-aware server client and call `auth.getUser()`.
2. Re-check `profiles.role === 'admin'` (do not trust middleware alone — API routes aren't always behind it).
3. Construct a separate service-role client with `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for the write.

Touching `SUPABASE_SERVICE_ROLE_KEY` from a route handler is intentional — 29+ routes do this. The key MUST stay server-only.

### Route groups (App Router)

- `src/app/(public)/` — marketing pages (home, how-it-works, faq, coverage, jobs, blog, horsham, cleaning-supplies). Shares a public `layout.tsx`.
- `src/app/(cleaner-funnel)/cleaner/` — onboarding funnel branches (going-solo, established, new-to-cleaning, returning, no-presence) leading into `/cleaner/onboarding`. Distinct from the authenticated `/cleaner/dashboard` (which lives at `src/app/cleaner/`, not in this group).
- `src/app/request/` — customer signup wizard (frequency → property → review → terms → preview).
- `src/app/c/[shortId]/` — short-link redirector.
- Auth flow pages under `src/app/auth/` (callback, signup, verify-email, reset-password) and `src/app/login`, `src/app/forgot-password`.

Each dashboard (`admin/dashboard/page.tsx`, `cleaner/dashboard/page.tsx`, `customer/dashboard/page.tsx`) is a large single-file client component (~850–1,400 lines each) that owns its own data fetching and tabs. Don't expect them to share state.

### Payments — GoCardless, not Stripe

Despite the Stripe scaffolding (`src/lib/stripe/config.ts`, README pricing table, `stripe_customer_id`/`stripe_subscription_id` columns in `customers`), the live payment integration is **GoCardless Direct Debit**. API routes under `src/app/api/gocardless/` (`create-flow`, `confirm`, `confirm-switch`, `cancel-subscription`) plus the webhook at `src/app/api/webhooks/gocardless/` are the real code path. The Stripe files are vestigial — don't add to them without first checking with the user. The `stripe_*` columns are reused / repurposed for GoCardless IDs in some flows; check the actual writes before assuming semantics from column names.

### Cron jobs

Configured in `vercel.json`, one route per cron:
- `auto-close-chats` (3am UTC) — auto-close stale conversations
- `check-payment-grace` (4am UTC) — handle DD grace period (note: lives at `src/app/api/cron/auto-close-chats/check-payment-grace/route.ts`, a nested path — odd but intentional)
- `nudge-missed-messages` (8am UTC)
- `nudge-pending-applications` (8am UTC)

These run as Vercel Cron and use the service-role client to bypass RLS.

### Transactional email

Resend, via templates in `src/lib/emails/` (`application-received`, `cleaner-decision`, `cleaner-job-alert`, `cover-clean-confirm`). Sender routes live under `src/app/api/send-*`, `src/app/api/admin/test-*-email/` (admin test harnesses), and `src/app/api/notifications/cleaner-job-alert/`.

### Database

Single migration: `supabase/migrations/001_initial_schema.sql` (387 lines). Defines enums (`user_role`, `frequency_type`, `application_status`, `subscription_status`, `request_status`, `session_status`, `issue_status`), core tables (`profiles`, `customers`, `cleaners`, `clean_requests`, `applications`, `conversations`, `messages`, etc.), the `handle_new_user` trigger, and `update_updated_at_column` triggers. Hand-maintained TS types in `src/types/database.types.ts` must be kept in sync — they are not auto-generated.

### Analytics & consent

`CookieBanner` in `src/components/cookie-banner.tsx` + `PostHogProvider` in `src/components/posthog-provider.tsx` (mounted in root `layout.tsx`). PostHog is consent-gated — analytics should not fire before the user accepts. Helper: `src/lib/cookie-consent.ts`.

### Security headers

`next.config.js` sets per-path `X-Frame-Options`: dashboards allow `SAMEORIGIN` (admin embeds customer/cleaner dashboards in iframes for support views); everything else is `DENY`. Don't broaden this without reason.

## Conventions worth knowing

- Path alias `@/*` → `src/*`.
- Form stack: `react-hook-form` + `zod` + `@hookform/resolvers`. Toasts via `sonner`. Icons via `lucide-react`.
- **Heavy inline styles** matching `chat-widget.tsx`, `cleaner-card.tsx`, dashboard pages. DM Sans font; cards use `borderRadius: 16px`, `border: 1.5px solid #e2e8f0`, white bg, soft shadow. Tailwind exists (`tailwind.config.ts`) and is used in some marketing pages and the public jobs page, but the bulk of the app is inline-styled.
- **Mobile breakpoints** live in sibling `.css` files that import into their page, using `@media (max-width: 768px)` overrides with `!important` (because inline styles win otherwise). Pattern is established across: cleaner dashboard, customer dashboard, cleaner public profile, chat widget, onboarding shell, auth card, FAQ page.
- SVGs are imported as React components via `@svgr/webpack` (see `next.config.js` and `src/types/svg.d.ts`).
- UK locale throughout: `en-GB` date formatting, £ currency, postcode-based zones (`src/lib/postcode-sectors.ts`).

## Workflow rules

- **`npm run type-check` must pass before any commit.** This is the safety net — there's no test framework, so the type-checker is the only automated guard. Run it after every edit batch.
- Commits should have clear, descriptive messages — see recent history (3a13d5b, 28caf0c, 15515d1) for the style.
- Solo dev (Adam Bell) — no PR review, so review your own diffs carefully before approving git commands.

## Test data

- Test cleaner: Alison Cranston / Wondermaids, id `bb255bfa-8548-44bd-9a1c-1bb0611746a3`
- Test customer email: `adamjbell95@gmail.com`
- Supabase project ref: `behskhaptphbddpugphg`

## Production safety

- All sensitive env keys live in Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `GOCARDLESS_ACCESS_TOKEN`, `RESEND_API_KEY`, `CRON_SECRET`, PostHog keys. **Never run scripts that mutate prod data without explicit user confirmation.**
- Site is going to be launch-gated by `NEXT_PUBLIC_LAUNCHED` env var (not wired yet — a blocker on the launch list).
- GoCardless is currently on sandbox; the sandbox-to-live cutover happens at launch.
- ICO registration pending — don't process real personal data until that's done.