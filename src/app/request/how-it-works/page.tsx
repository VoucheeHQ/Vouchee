'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Sparkles, MessageSquare, CalendarCheck } from 'lucide-react'

export default function HowItWorksPage() {
  const router = useRouter()
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('cleanRequest')
    if (!stored) {
      router.push('/request/property')
      return
    }
    setHasData(true)
  }, [router])

  if (!hasData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spinner h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-surface py-12">
      <div className="container max-w-3xl">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-medium text-white">
            ✓
          </div>
          <div className="h-1 w-16 bg-brand-600"></div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-medium text-white">
            ✓
          </div>
          <div className="h-1 w-16 bg-brand-600"></div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-medium text-white">
            3
          </div>
          <div className="h-1 w-16 bg-gray-200"></div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-500">
            4
          </div>
        </div>

        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-ink">
            How Vouchee Works
          </h1>
          <p className="text-lg text-ink-secondary">
            Three simple steps to finding your perfect cleaner
          </p>
        </div>

        {/* Bubble steps */}
        <div className="relative mb-12 space-y-8">
          {/* Connecting line */}
          <div className="absolute left-8 top-16 bottom-16 w-0.5 bg-gradient-to-b from-brand-200 via-brand-300 to-brand-200 sm:left-12" />

          {/* Step 1 */}
          <div className="relative flex gap-6">
            <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg sm:h-20 sm:w-20">
              <Sparkles className="h-8 w-8 text-white sm:h-10 sm:w-10" />
            </div>
            <div className="flex-1 rounded-3xl bg-white p-6 shadow-card sm:p-8" style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(59, 130, 246, 0.1)'
            }}>
              <div className="mb-2 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                Step 1
              </div>
              <h3 className="mb-3 text-xl font-semibold text-ink">
                Your job gets published
              </h3>
              <p className="text-ink-secondary">
                Our vetted and vouched-for cleaners will see your request and apply to help out! 
                You'll see their Vouchee rating, how long they've been on the platform, how many jobs they've taken, and any other vital information.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex gap-6">
            <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg sm:h-20 sm:w-20">
              <MessageSquare className="h-8 w-8 text-white sm:h-10 sm:w-10" />
            </div>
            <div className="flex-1 rounded-3xl bg-white p-6 shadow-card sm:p-8" style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #fef9c3 100%)',
              border: '1px solid rgba(234, 179, 8, 0.1)'
            }}>
              <div className="mb-2 inline-block rounded-full bg-accent-100 px-3 py-1 text-xs font-medium text-accent-700">
                Step 2
              </div>
              <h3 className="mb-3 text-xl font-semibold text-ink">
                You're in the driver's seat
              </h3>
              <p className="text-ink-secondary">
                Choose to accept applications and chat with cleaners. Ask questions, arrange schedules, and find the perfect fit. 
                Once you accept, you'll be given full visibility of the cleaner's profile before you finalise your start date.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex gap-6">
            <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg sm:h-20 sm:w-20">
              <CalendarCheck className="h-8 w-8 text-white sm:h-10 sm:w-10" />
            </div>
            <div className="flex-1 rounded-3xl bg-white p-6 shadow-card sm:p-8" style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #d1fae5 100%)',
              border: '1px solid rgba(34, 197, 94, 0.1)'
            }}>
              <div className="mb-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Step 3
              </div>
              <h3 className="mb-3 text-xl font-semibold text-ink">
                You're in safe hands
              </h3>
              <p className="text-ink-secondary">
                Relax knowing you've got a locally-vouched cleaner, ready to take away some of your stress.
              </p>
            </div>
          </div>
        </div>

        {/* No payment callout */}
        <Card className="mb-8 border-2 border-green-200 bg-green-50">
          <div className="p-6 text-center">
            <div className="mb-3 text-4xl">✨</div>
            <h3 className="mb-2 text-lg font-semibold text-green-900">
              No payment required to browse
            </h3>
            <p className="text-sm text-green-700">
              Create your account, publish your request, and browse cleaners completely free. 
              You only pay once you've found someone and confirmed your first clean. We'll set up your direct debit once you're ready to start.
            </p>
          </div>
        </Card>

        <Button
          onClick={() => router.push('/auth/signup?step=request')}
          size="lg"
          className="w-full"
        >
          Create free account
        </Button>

        <p className="mt-4 text-center text-xs text-ink-secondary">
          Takes less than 30 seconds
        </p>
      </div>
    </div>
  )
}
