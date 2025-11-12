import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Helper to extract projectRef from Supabase URL
function getProjectRefFromUrl(url?: string) {
  if (!url) return 'sb'
  try {
    const u = new URL(url)
    const host = u.host // e.g ytljrvcjstbuhrdothhf.supabase.co
    const parts = host.split('.')
    return parts[0] || 'sb'
  } catch (e) {
    return 'sb'
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  
  console.log('[/auth/callback] Processing OAuth callback')
  console.log('[/auth/callback] Code present:', !!code)
  console.log('[/auth/callback] Error param:', error || 'none')

  // Handle error from OAuth provider
  if (error) {
    const details = requestUrl.searchParams.get('error_description')
    console.error('[/auth/callback] OAuth error:', error, details)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${error}&details=${details || 'Unknown error'}`)
  }

  if (!code) {
    console.error('[/auth/callback] No code received')
    return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`)
  }

  const cookieStore = await cookies()
  const projectRef = getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const cookieName = `sb-${projectRef}-auth-token`

  console.log('[/auth/callback] Using cookie name:', cookieName)

  // Create response that will be returned
  const response = NextResponse.redirect(`${requestUrl.origin}/dashboard`)

  // Use createServerClient to exchange code
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = cookieStore.get(name)?.value
          console.log(`[/auth/callback] Getting cookie: ${name} = ${value ? 'present' : 'missing'}`)
          return value
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log(`[/auth/callback] Setting cookie: ${name}`)
          try {
            cookieStore.set(name, value, {
              ...options,
              path: options.path || '/',
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            })
            response.cookies.set(name, value, {
              ...options,
              path: options.path || '/',
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            })
          } catch (err) {
            console.error(`[/auth/callback] Error setting cookie ${name}:`, err)
          }
        },
        remove(name: string, options: CookieOptions) {
          console.log(`[/auth/callback] Removing cookie: ${name}`)
          try {
            cookieStore.delete(name)
            response.cookies.delete(name)
          } catch (err) {
            console.error(`[/auth/callback] Error removing cookie ${name}:`, err)
          }
        },
      },
    }
  )

  try {
    console.log('[/auth/callback] Exchanging code for session...')
    // Exchange the code for a session
    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('[/auth/callback] ❌ Code exchange failed:', exchangeError)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=exchange_failed&details=${exchangeError.message}`)
    }

    if (!exchangeData?.session) {
      console.error('[/auth/callback] ❌ No session in exchange response')
      return NextResponse.redirect(`${requestUrl.origin}/login?error=no_session`)
    }

    const session = exchangeData.session
    console.log('[/auth/callback] ✅ Code exchanged successfully')
    console.log('[/auth/callback] Session email:', session.user?.email)
    console.log('[/auth/callback] Access token present:', !!session.access_token)

    // Explicitly set the auth token in a cookie so middleware can read it
    if (session.access_token) {
      console.log('[/auth/callback] Setting auth token in cookie...')
      response.cookies.set({
        name: cookieName,
        value: session.access_token,
        maxAge: session.expires_in || 3600,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      console.log('[/auth/callback] ✅ Auth token cookie set in response')
    }

    return response
  } catch (err) {
    console.error('[/auth/callback] ❌ Callback error:', err)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_error&details=${err instanceof Error ? err.message : 'Unknown'}`)
  }
}
