'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * AuthSyncProvider: Listens to auth state changes and syncs the session to the server
 * by calling POST /api/auth/set-session. This ensures the server's httpOnly cookie
 * is always in sync with the client-side session.
 */
export function AuthSyncProvider() {
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function syncSessionToServer(session: any) {
      if (!mounted) return;

      try {
        if (session?.access_token) {
          console.log('[AuthSync] Session detected, syncing to server...');
          const response = await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session }),
          });
          if (response.ok) {
            console.log('[AuthSync] ✅ Session synced to server');
          } else {
            console.error('[AuthSync] ❌ Failed to sync session:', response.status);
          }
        } else {
          console.log('[AuthSync] No session, clearing server cookie...');
          const response = await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: null }),
          });
          if (response.ok) {
            console.log('[AuthSync] ✅ Server cookie cleared');
          }
        }
      } catch (error) {
        console.error('[AuthSync] Error syncing session:', error);
      }
    }

    // Get initial session
    async function getInitialSession() {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        await syncSessionToServer(data.session);
      }
    }

    getInitialSession();

    // Listen to auth state changes and sync whenever they occur
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (mounted) {
        console.log('[AuthSync] Auth state changed:', _event);
        await syncSessionToServer(session);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // This provider doesn't render anything, it just manages side effects
  return null;
}
