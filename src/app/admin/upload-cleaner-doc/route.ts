import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const VALID_DOC_TYPES = ['dbs', 'insurance', 'right_to_work'] as const
type DocType = typeof VALID_DOC_TYPES[number]

// Maps doc type → column prefix on cleaners table
const COLUMN_MAP: Record<DocType, { url: string; verified: string; expiry: string; uploaded_at: string }> = {
  dbs: {
    url: 'dbs_file_url',
    verified: 'dbs_verified',
    expiry: 'dbs_expiry',
    uploaded_at: 'dbs_uploaded_at',
  },
  insurance: {
    url: 'insurance_file_url',
    verified: 'insurance_verified',
    expiry: 'insurance_expiry',
    uploaded_at: 'insurance_uploaded_at',
  },
  right_to_work: {
    url: 'right_to_work_file_url',
    verified: 'right_to_work_verified',
    expiry: 'right_to_work_expiry',
    uploaded_at: 'right_to_work_uploaded_at',
  },
}

export async function POST(request: NextRequest) {
  // Verify caller is admin
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabaseUser
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse multipart form
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const cleanerId = formData.get('cleanerId') as string | null
  const docType = formData.get('docType') as string | null
  const expiry = formData.get('expiry') as string | null // YYYY-MM-DD or empty string

  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  if (!cleanerId) return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })
  if (!docType || !VALID_DOC_TYPES.includes(docType as DocType)) {
    return NextResponse.json({ error: 'Invalid docType — must be dbs / insurance / right_to_work' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({
      error: `File type ${file.type} not allowed. Use PDF, JPG or PNG.`,
    }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`,
    }, { status: 400 })
  }

  // Upload to Supabase Storage
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const storagePath = `${cleanerId}/${docType}_${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('cleaner-documents')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    console.error('Storage upload failed:', uploadErr)
    return NextResponse.json({ error: 'Upload failed: ' + uploadErr.message }, { status: 500 })
  }

  // Get a signed URL (valid 1 year; admin-viewable)
  const { data: signed, error: signErr } = await admin.storage
    .from('cleaner-documents')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

  if (signErr || !signed) {
    console.error('Signed URL failed:', signErr)
    return NextResponse.json({ error: 'Could not generate file URL' }, { status: 500 })
  }

  // Update cleaner row with verified=true + URL + expiry
  const cols = COLUMN_MAP[docType as DocType]
  const updatePatch: Record<string, any> = {
    [cols.url]: signed.signedUrl,
    [cols.verified]: true,
    [cols.uploaded_at]: new Date().toISOString(),
    [cols.expiry]: expiry && expiry.trim() ? expiry : null,
  }

  // If cleaner was suspended, re-approve them automatically when all docs are verified.
  // Get the current state first.
  const { data: current } = await admin
    .from('cleaners')
    .select('application_status, dbs_verified, insurance_verified, right_to_work_verified')
    .eq('id', cleanerId)
    .single() as { data: { application_status: string; dbs_verified: boolean; insurance_verified: boolean; right_to_work_verified: boolean } | null }

  // Simulate the new state with THIS upload included
  const newVerifiedState = {
    dbs: docType === 'dbs' ? true : current?.dbs_verified ?? false,
    insurance: docType === 'insurance' ? true : current?.insurance_verified ?? false,
    right_to_work: docType === 'right_to_work' ? true : current?.right_to_work_verified ?? false,
  }

  // If suspended AND all 3 now verified, lift the suspension automatically.
  // Don't touch status in any other case — explicit "Re-approve" button handles that.
  if (current?.application_status === 'suspended' &&
      newVerifiedState.dbs && newVerifiedState.insurance && newVerifiedState.right_to_work) {
    updatePatch.application_status = 'approved'
    updatePatch.suspension_reason = null
    updatePatch.suspended_at = null
  }

  const { error: updateErr } = await admin
    .from('cleaners')
    .update(updatePatch as any)
    .eq('id', cleanerId)

  if (updateErr) {
    console.error('Cleaner row update failed:', updateErr)
    // Roll back the upload to avoid orphans
    await admin.storage.from('cleaner-documents').remove([storagePath])
    return NextResponse.json({ error: 'DB update failed: ' + updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    fileUrl: signed.signedUrl,
    autoReapproved: updatePatch.application_status === 'approved',
  })
}