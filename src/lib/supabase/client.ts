'use client';

import { createBrowserClient } from '@supabase/ssr';

// Create the client a single time
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Export the single instance
export function createClient() {
  return supabase;
}
