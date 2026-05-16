import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { deleteCachedUrl } from '@/lib/redis'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params
  const db = createServerClient()

  const { error } = await db
    .from('urls')
    .update({ is_active: false })
    .eq('short_code', shortCode)

  if (error) {
    return NextResponse.json({ error: 'Failed to deactivate URL' }, { status: 500 })
  }

  // Invalidate cache so the redirect 404s immediately
  await deleteCachedUrl(shortCode)

  return NextResponse.json({ message: 'URL deactivated' })
}
