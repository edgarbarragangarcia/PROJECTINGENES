// Supabase client configuration for data access only (no auth)
// Auth is handled by NextAuth.js

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

// For data operations, we still use Supabase
// Note: This is just for database access, not authentication
export function createClient(): SupabaseClient {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // These environment variables should still exist for data access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables for data access');
  }

  // Create new instance only once
  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Don't persist auth sessions (using NextAuth instead)
      autoRefreshToken: false, // Don't auto-refresh tokens
      detectSessionInUrl: false, // Don't detect sessions in URL
    },
  });

  return supabaseInstance;
}
