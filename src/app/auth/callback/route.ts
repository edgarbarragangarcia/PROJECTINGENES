import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  
  console.log('[auth/callback] 🔐 OAuth Callback Started')
  console.log('[auth/callback] Code present:', !!code)
  console.log('[auth/callback] Error:', error || 'none')
  
  // Handle OAuth errors from provider
  if (error) {
    console.error('[auth/callback] ❌ OAuth Error:', error, error_description)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}&description=${encodeURIComponent(error_description || '')}`, requestUrl.origin)
    )
  }

  // Handle missing code
  if (!code) {
    console.error('[auth/callback] ❌ No authorization code received')
    return NextResponse.redirect(
      new URL('/login?error=no_code', requestUrl.origin)
    )
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    console.log('[auth/callback] 🔄 Exchanging code for session...')
    
    // Exchange the code for a session
    // The code_verifier is automatically handled by Supabase library
    // It retrieves it from browser storage (set by signInWithOAuth)
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[auth/callback] ❌ Code exchange failed:', exchangeError.message)
      
      // Redirect to login with error message
      return NextResponse.redirect(
        new URL(`/login?error=exchange_failed&details=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      )
    }

    if (!data?.session) {
      console.error('[auth/callback] ❌ No session in exchange response')
      return NextResponse.redirect(
        new URL('/login?error=no_session', requestUrl.origin)
      )
    }

    // Session successfully created!
    console.log('[auth/callback] ✅ Session created successfully')
    console.log('[auth/callback] User:', data.session.user.email)

    // Redirect to dashboard
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