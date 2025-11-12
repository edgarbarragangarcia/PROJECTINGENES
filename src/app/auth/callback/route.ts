import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  
  console.log('[auth/callback] 🔐 OAuth Callback Started')
  console.log('[auth/callback] Full URL:', request.url)
  
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    // With implicit flow, the session is already in the URL fragment
    // Supabase automatically detects and creates the session
    console.log('[auth/callback] ⏳ Waiting for session detection...')
    
    // Give the client a moment to process the URL fragment
    // Then redirect to dashboard
    const dashboardUrl = new URL('/dashboard', requestUrl.origin)
    const response = NextResponse.redirect(dashboardUrl)

    return response
    
  } catch (err) {
    console.error('[auth/callback] ❌ Unexpected error:', err)
    const message = err instanceof Error ? err.message : 'unknown_error'
    return NextResponse.redirect(
      new URL(`/login?error=callback_error&details=${encodeURIComponent(message)}`, requestUrl.origin)
    )
  }
}