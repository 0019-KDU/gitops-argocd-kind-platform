import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = {
    status: 'ok' as 'ok' | 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: 'ok' as 'ok' | 'error',
      cache: 'ok' as 'ok' | 'error',
    },
  }

  // Database check
  try {
    const db = createServerClient()
    const { error } = await db.from('urls').select('id').limit(1)
    if (error) throw error
  } catch {
    result.services.database = 'error'
    result.status = 'degraded'
  }

  // Cache check
  try {
    await redis.ping()
  } catch {
    result.services.cache = 'error'
    result.status = 'degraded'
  }

  return NextResponse.json(result, {
    status: result.status === 'ok' ? 200 : 503,
  })
}
