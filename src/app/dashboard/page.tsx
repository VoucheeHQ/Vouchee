'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Calendar, User, Settings } from 'lucide-react'

export default function CustomerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      setLoading(false)
    }
    
    checkUser()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spinner h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <div className="border-b border-ink/5 bg-surface">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-lg font-bold text-white">V</span>
            </div>
            <span className="text-lg font-semibold text-ink">Vouchee</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="container py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-ink">
            Welcome back! 👋
          </h1>
          <p className="text-ink-secondary">
            Your clean request has been published
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Request Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Sparkles className="h-8 w-8 text-brand-600" />
                <Badge variant="warning">Active</Badge>
              </div>
              <CardTitle className="mt-4">Your Request</CardTitle>
              <CardDescription>
                Cleaners are viewing your listing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-secondary">
                We'll notify you when cleaners apply. Check back soon!
              </p>
            </CardContent>
          </Card>

          {/* Upcoming Cleans */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Calendar className="h-8 w-8 text-accent-600" />
                <Badge>Coming soon</Badge>
              </div>
              <CardTitle className="mt-4">Upcoming Cleans</CardTitle>
              <CardDescription>
                Your scheduled sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-secondary">
                Once you've chosen a cleaner, your schedule will appear here
              </p>
            </CardContent>
          </Card>

          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <User className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="mt-4">Profile</CardTitle>
              <CardDescription>
                Manage your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-ink-secondary">
                {user?.email}
              </p>
              <Button variant="secondary" size="sm" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* What's Next */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">
                  1
                </div>
                <div>
                  <strong className="text-ink">Cleaners apply</strong>
                  <p className="text-sm text-ink-secondary">Vetted cleaners in your area will see your request and can apply</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">
                  2
                </div>
                <div>
                  <strong className="text-ink">You review applications</strong>
                  <p className="text-sm text-ink-secondary">See their ratings, experience, and chat with them before deciding</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">
                  3
                </div>
                <div>
                  <strong className="text-ink">Arrange your first clean</strong>
                  <p className="text-sm text-ink-secondary">Once you've found someone, arrange a start date and we'll set up payments</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
