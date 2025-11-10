import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Pass the Next.js cookies helper directly so Supabase can persist cookies.
    const supabase = createRouteHandlerClient({ cookies });

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[api/auth] exchangeCodeForSession error:', error);
    } else {
      console.debug('[api/auth] session created:', data?.session);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/dashboard', request.url));
}