import { createClient } from '@supabase/supabase-js'

export type Url = {
  id: number
  short_code: string
  original_url: string
  expires_at: string | null
  click_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Public client — safe to use in browser (anon key, RLS enforced)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server-only client — uses service role key, bypasses RLS
// Never expose this to the client
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
