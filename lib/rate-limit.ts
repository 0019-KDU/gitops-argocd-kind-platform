import { redis } from './redis'

const WINDOW_SECONDS = 60
const MAX_REQUESTS = 10

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetIn: number
}

// Fixed-window rate limiter using Redis INCR + EXPIRE.
// Simple and cheap; upgrade to sliding-window token bucket if needed.
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const key = `rl:${ip}`
  try {
    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, WINDOW_SECONDS)
    }
    const ttl = await redis.ttl(key)
    return {
      allowed: current <= MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - current),
      resetIn: ttl,
    }
  } catch {
    // Fail open: if Redis is down, let the request through
    return { allowed: true, remaining: MAX_REQUESTS, resetIn: WINDOW_SECONDS }
  }
}
