'use client';

import { createBrowserClient } from '@supabase/ssr';

// Cache the browser client in this module so multiple components
// calling `createClient()` will reuse the same instance. Creating
// many clients causes multiple GoTrueClient instances which acquire
// locks and can lead to race conditions where session storage reads
// return null (observed in logs).

let _cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // If we are running on the server (SSR), return a lightweight stub
  // client with the minimal `auth` methods used by server code. This
  // prevents server-side imports from crashing while keeping behavior
  // predictable. Client-side calls will use the real browser client.
  if (typeof globalThis === 'undefined' || typeof (globalThis as any).window === 'undefined') {
    // Return a minimal stub that matches the calls used in SSR contexts.
    const stub: any = {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        getUser: async () => ({ data: { user: null } }),
        onAuthStateChange: (_: any) => ({ data: { subscription: null } }),
        signInWithPassword: async (_: any) => ({ data: null, error: { message: 'SSR stub: cannot sign in on server' } }),
        signUp: async (_: any) => ({ data: null, error: { message: 'SSR stub: cannot sign up on server' } }),
        signInWithOAuth: async (_: any) => ({ data: null, error: { message: 'SSR stub: cannot sign in with OAuth on server' } }),
        signOut: async () => ({ error: null }),
      },
    };

    return stub;
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
        detectSessionInUrl: false, // Disabled - server handles OAuth callback
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
