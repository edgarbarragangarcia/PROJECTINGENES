import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  
  console.log('[auth/callback] 🔐 Starting auth callback with:', { 
    code: code ? '✓ present' : '✗ missing',
    error: error || 'none',
    error_description: error_description || 'none',
  })
  
  if (error) {
    console.error('❌ [auth/callback] Error en autenticación:', error, error_description)
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(error), requestUrl.origin))
  }

  if (!code) {
    console.error('❌ [auth/callback] No se recibió código de autenticación')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    console.log('[auth/callback] 🔄 Exchanging code for session...')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ [auth/callback] Error al intercambiar código por sesión:', exchangeError.message)
      return NextResponse.redirect(new URL('/login?error=exchange_failed', requestUrl.origin))
    }

    if (!data?.session) {
      console.error('❌ [auth/callback] No session returned from exchange')
      return NextResponse.redirect(new URL('/login?error=no_session', requestUrl.origin))
    }

    console.log('✅ [auth/callback] Sesión creada exitosamente:', {
      user: data.session.user.email,
      expiresAt: data.session.expires_at
    })

    // Create response and redirect to dashboard
    const redirectUrl = new URL('/dashboard', requestUrl.origin)
    const response = NextResponse.redirect(redirectUrl)
    
    // Log that we're redirecting
    console.log('[auth/callback] ✅ Redirecting to dashboard')

    return response
  } catch (err) {
    console.error('❌ [auth/callback] Error inesperado:', err)
    const errorMessage = err instanceof Error ? err.message : 'unknown_error'
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(errorMessage), requestUrl.origin))
  }
}