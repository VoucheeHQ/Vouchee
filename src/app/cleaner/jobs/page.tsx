import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JobsClient } from './JobsClient'

export const dynamic = 'force-dynamic'

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East',
  north_west: 'North West',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West',
  warnham_north: 'Warnham / Surrounding North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: 'Christs Hospital',
}

export default async function CleanerJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: cleanerData, error: cleanerError } = await supabase
    .from('cleaners')
    .select('zones, dbs_checked, has_insurance, right_to_work, application_status, hourly_rate')
    .eq('profile_id', user.id)
    .single<{
      zones: string[]
      dbs_checked: boolean
      has_insurance: boolean
      right_to_work: boolean
      application_status: string
      hourly_rate: number | null
    }>()

  if (cleanerError || !cleanerData) redirect('/cleaner/dashboard')
  if (cleanerData.application_status !== 'approved') redirect('/cleaner/dashboard')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single<{ full_name: string; email: string }>()

  const { data: jobs } = await supabase
    .from('clean_requests')
    .select('id, zone, bedrooms, bathrooms, hours_per_session, hourly_rate, preferred_days, time_of_day, tasks, created_at, goes_live_at, customer_id, service_type')
    .eq('status', 'active')
    .in('zone', cleanerData.zones ?? [])
    .order('goes_live_at', { ascending: false })

  const { data: myApplications } = await supabase
    .from('applications')
    .select('request_id, status')
    .eq('cleaner_id', user.id)

  const appliedRequestIds = new Set(
    ((myApplications ?? []) as { request_id: string; status: string }[]).map(a => a.request_id)
  )

  const formattedJobs = ((jobs ?? []) as any[]).map(job => ({
    id: job.id,
    zone: ZONE_LABELS[job.zone] ?? job.zone,
    zoneKey: job.zone,
    bedrooms: job.bedrooms,
    bathrooms: job.bathrooms,
    hoursPerSession: job.hours_per_session,
    hourlyRate: job.hourly_rate,
    preferredDays: job.preferred_days ?? [],
    timeOfDay: job.time_of_day ?? 'No preference',
    tasks: job.tasks ?? [],
    serviceType: job.service_type ?? 'regular',
    postedAt: job.goes_live_at ?? job.created_at,
    customerId: job.customer_id,
    alreadyApplied: appliedRequestIds.has(job.id),
  }))

  return (
    <JobsClient
      jobs={formattedJobs}
      cleanerId={user.id}
      cleanerName={profileData?.full_name ?? ''}
      cleanerDbs={cleanerData.dbs_checked}
      cleanerInsured={cleanerData.has_insurance}
      cleanerRightToWork={cleanerData.right_to_work}
      cleanerZones={cleanerData.zones ?? []}
    />
  )
}
