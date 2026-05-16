import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { setCachedUrl } from '@/lib/redis'
import { generateShortCode } from '@/lib/base58'
import { checkRateLimit } from '@/lib/rate-limit'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const MAX_ALIAS_LENGTH = 11
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { allowed, remaining, resetIn } = await checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${resetIn}s.` },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(resetIn),
        },
      }
    )
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { originalUrl, customAlias, expiresAt } = body as {
    originalUrl?: string
    customAlias?: string
    expiresAt?: string
  }

  if (!originalUrl) {
    return NextResponse.json({ error: 'originalUrl is required' }, { status: 400 })
  }

  // Validate URL format
  let parsedUrl: URL
  try {
    parsedUrl = new URL(originalUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only http/https URLs are allowed')
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid URL'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Validate custom alias
  if (customAlias !== undefined && customAlias !== '') {
    if (customAlias.length > MAX_ALIAS_LENGTH) {
      return NextResponse.json(
        { error: `Custom alias must be ≤ ${MAX_ALIAS_LENGTH} characters` },
        { status: 400 }
      )
    }
    if (!ALIAS_PATTERN.test(customAlias)) {
      return NextResponse.json(
        { error: 'Custom alias may only contain letters, numbers, hyphens and underscores' },
        { status: 400 }
      )
    }
  }

  const db = createServerClient()
  const alias = customAlias?.trim() || ''

  if (alias) {
    // Check alias availability
    const { data: existing } = await db
      .from('urls')
      .select('id')
      .eq('short_code', alias)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Custom alias is already taken' }, { status: 409 })
    }
  }

  // Generate a unique short code (retries guard against the tiny collision probability)
  let shortCode = alias || generateShortCode()
  if (!alias) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await db.from('urls').select('id').eq('short_code', shortCode).single()
      if (!data) break
      shortCode = generateShortCode()
    }
  }

  const expiryDate = expiresAt ? new Date(expiresAt).toISOString() : null

  const { data, error } = await db
    .from('urls')
    .insert({
      short_code: shortCode,
      original_url: parsedUrl.toString(),
      expires_at: expiryDate,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[/api/shorten]', error?.message)
    return NextResponse.json({ error: error?.message ?? 'Failed to save URL' }, { status: 500 })
  }

  await setCachedUrl(shortCode, parsedUrl.toString())

  return NextResponse.json(
    {
      shortCode: data.short_code,
      shortUrl: `${BASE_URL}/${data.short_code}`,
      originalUrl: data.original_url,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    },
    {
      status: 201,
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': String(remaining),
      },
    }
  )
}
