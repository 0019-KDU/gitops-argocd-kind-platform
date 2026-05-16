import Redis from 'ioredis'

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined
}

function getRedisClient(): Redis {
  if (!global.__redis) {
    global.__redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    })
    global.__redis.on('error', () => {
      // Swallow — cache failures must never break core redirect flow
    })
  }
  return global.__redis
}

export const redis = getRedisClient()

// 80/20 rule: cache every URL on first redirect so the 20% that drive 80%
// of traffic stay hot. TTL = 24h; re-fresh on each cache hit is optional.
const URL_TTL_SECONDS = 60 * 60 * 24
const URL_PREFIX = 'url:'

export async function getCachedUrl(shortCode: string): Promise<string | null> {
  try {
    return await redis.get(`${URL_PREFIX}${shortCode}`)
  } catch {
    return null
  }
}

export async function setCachedUrl(shortCode: string, originalUrl: string): Promise<void> {
  try {
    await redis.setex(`${URL_PREFIX}${shortCode}`, URL_TTL_SECONDS, originalUrl)
  } catch {
    // Cache failure is non-fatal
  }
}

export async function deleteCachedUrl(shortCode: string): Promise<void> {
  try {
    await redis.del(`${URL_PREFIX}${shortCode}`)
  } catch {
    // Ignore
  }
}
