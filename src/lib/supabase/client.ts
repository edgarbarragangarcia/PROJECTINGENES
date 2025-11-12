'use client';

import { createBrowserClient } from '@supabase/ssr';

// Cache the browser client in this module so multiple components
// calling `createClient()` will reuse the same instance. Creating
// many clients causes multiple GoTrueClient instances which acquire
// locks and can lead to race conditions where session storage reads
// return null (observed in logs).

let _cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof globalThis === 'undefined' || typeof (globalThis as any).window === 'undefined') {
    // Defensive: this file is intended for client usage only.
    throw new Error('createClient() must be called from the browser.');
  }

  if (_cachedClient) return _cachedClient;

  _cachedClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use PKCE flow for security
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-auth-token',
        debug: true, // Enable debug logging
      },
    }
  );

  // Also attach to window for access across module reloads in dev
  try {
    (globalThis as any).__PROJECTINGENES_supabase_client = _cachedClient;
  } catch (e) {
    // ignore in environments where globalThis isn't writable
  }

  return _cachedClient;
}
