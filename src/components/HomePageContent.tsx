import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Sparkles, Shield, Clock } from 'lucide-react'

interface HomePageProps {
  location?: string
}

export default function HomePageContent({ location = 'Horsham' }: HomePageProps) {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)" }}>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
              <Sparkles className="h-4 w-4" />
              <span>Trusted local cleaners in {location}</span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight text-ink md:text-6xl">
              Professional cleaning,{' '}
              <span className="gradient-text">made simple</span>
            </h1>

            <p className="mb-10 text-lg text-ink-secondary md:text-xl">
              Connect with vetted, local cleaners in {location} for weekly, fortnightly, or monthly services.
              No contracts, flexible scheduling, satisfaction guaranteed.
            </p>

            {/* Service type cards */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/request/property"
                className="group flex flex-col items-center rounded-2xl bg-brand-600 px-8 py-6 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl sm:w-52"
              >
                <span className="mb-2 text-xl font-bold">Regular clean</span>
                <span className="text-sm text-brand-200">Weekly · Fortnightly · Monthly</span>
              </Link>
              <Link
                href="/request/property?type=one-off"
                className="group flex flex-col items-center rounded-2xl border-2 border-brand-600 bg-white px-8 py-6 text-brand-700 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl sm:w-52"
              >
                <span className="mb-2 text-xl font-bold">One off clean</span>
                <span className="text-sm text-brand-400">End of tenancy · Oven · Deep clean</span>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-ink-secondary">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>DBS checked cleaners</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Insured & vetted</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-ink md:text-4xl">Why choose Vouchee?</h2>
            <p className="text-lg text-ink-secondary">We make finding and managing your cleaner effortless</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="card-hover">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100">
                  <Shield className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle>Fully vetted cleaners</CardTitle>
                <CardDescription>All cleaners are DBS checked, reference verified, and insured for your peace of mind</CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent-100">
                  <Clock className="h-6 w-6 text-accent-600" />
                </div>
                <CardTitle>Flexible scheduling</CardTitle>
                <CardDescription>Choose weekly, fortnightly, or monthly cleans. Pause or adjust your schedule anytime</CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Sparkles className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Hassle-free management</CardTitle>
                <CardDescription>Simple platform to manage bookings, communicate, and report any issues</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-ink md:text-4xl">Simple, transparent pricing</h2>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {/* Weekly */}
            <Link href="/request/property?preset=weekly" className="block no-underline">
              <Card className="card-hover h-full cursor-pointer border-brand-500 shadow-elevated ...">
                <CardHeader>
                  <CardTitle>Weekly</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-ink">£9.99</span>
                    <span className="text-ink-secondary"> / clean</span>
                  </div>
                  <CardDescription className="mt-2">Billed monthly: £43.33</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span>Every week</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span>Cancel anytime</span></li>
                  </ul>
                  <div className="mt-4 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">Most popular</div>
                </CardContent>
              </Card>
            </Link>

            {/* Fortnightly */}
            <Link href="/request/property?preset=fortnightly" className="block no-underline">
              <Card className="card-hover h-full cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Fortnightly</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-ink">£14.99</span>
                    <span className="text-ink-secondary"> / clean</span>
                  </div>
                  <CardDescription className="mt-2">Billed monthly: £32.48</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span>Every 2 weeks</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span>Cancel anytime</span></li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Monthly */}
            <Link href="/request/property?preset=monthly" className="block no-underline">
              <Card className="card-hover h-full cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:border-brand-400">
                <CardHeader>
                  <CardTitle>Monthly</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-ink">£19.99</span>
                    <span className="text-ink-secondary"> / month</span>
                  </div>
                  <CardDescription className="mt-2">Flat rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span>Once per month</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span>Cancel anytime</span></li>
                  </ul>
                </CardContent>
              </Card>
            </Link>
          </div>

          <p className="mt-8 text-center text-sm text-ink-secondary">
            Platform service fee based on 52 weeks per year, averaged across 12 months. You pay your cleaner directly for their time.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl px-8 py-12 md:px-12" style={{
            background: "linear-gradient(135deg, #1e40af, #3b82f6)", position: "relative",
          }}>
            <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
            <div style={{ position: "absolute", bottom: "-80px", right: "40px", width: "280px", height: "280px", borderRadius: "50%", background: "rgba(250,204,21,0.1)" }} />
            <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl" style={{ position: "relative" }}>
              Not the right fit? Switch cleaners anytime.
            </h2>
            <p className="mb-8 text-lg" style={{ color: "rgba(255,255,255,0.8)", position: "relative" }}>
              If your cleaner isn&apos;t the right fit, let us know and we&apos;ll help you find a better match — with a discounted first clean.
            </p>
            <Link href="/request/property" style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "#facc15", color: "#1e293b", fontWeight: 700, fontSize: "15px",
              padding: "14px 28px", borderRadius: "100px", textDecoration: "none",
              position: "relative", boxShadow: "0 4px 20px rgba(250,204,21,0.4)",
            }}>
              Find a cleaner in {location} →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
