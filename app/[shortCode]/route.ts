import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getCachedUrl, setCachedUrl } from '@/lib/redis'

// Paths that must never be treated as short codes
const RESERVED = new Set(['favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json'])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params

  if (RESERVED.has(shortCode)) {
    return new NextResponse(null, { status: 404 })
  }

  // ── Cache hit (80/20 fast path) ───────────────────────────
  const cached = await getCachedUrl(shortCode)
  if (cached) {
    // Fire-and-forget: don't block the 301 on the DB write
    void incrementClickCount(shortCode)
    return NextResponse.redirect(cached, {
      status: 301,
      headers: { 'X-Cache': 'HIT' },
    })
  }

  // ── Cache miss: query Supabase ────────────────────────────
  const db = createServerClient()
  const { data } = await db
    .from('urls')
    .select('original_url, expires_at, is_active')
    .eq('short_code', shortCode)
    .single()

  if (!data) {
    return NextResponse.redirect(new URL('/?error=not_found', request.url))
  }

  if (!data.is_active) {
    return NextResponse.redirect(new URL('/?error=deactivated', request.url))
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/?error=expired', request.url))
  }

  // Warm cache for next request
  await setCachedUrl(shortCode, data.original_url)

  void incrementClickCount(shortCode)

  return NextResponse.redirect(data.original_url, {
    status: 301,
    headers: { 'X-Cache': 'MISS' },
  })
}

async function incrementClickCount(shortCode: string) {
  const db = createServerClient()
  await db.rpc('increment_click_count', { code: shortCode })
}
