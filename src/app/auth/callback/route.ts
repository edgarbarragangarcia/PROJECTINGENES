import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  
  console.log('[auth/callback] 🔐 Starting auth callback with:', { 
    code: code ? `✓ present (${code.substring(0, 20)}...)` : '✗ missing',
    error: error || 'none',
    error_description: error_description || 'none',
    url: requestUrl.toString().substring(0, 100),
  })
  
  if (error) {
    console.error('❌ [auth/callback] Error en autenticación:', error, error_description)
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(error), requestUrl.origin))
  }

  // Check for access_token in URL (implicit flow)
  const accessToken = requestUrl.hash ? new URLSearchParams(requestUrl.hash.substring(1)).get('access_token') : null
  if (accessToken) {
    console.log('[auth/callback] 🎯 Found access_token in URL (implicit flow)')
    // Implicit flow: token is in URL, redirect to dashboard and let client handle it
    const redirectUrl = new URL('/dashboard', requestUrl.origin)
    const response = NextResponse.redirect(redirectUrl)
    console.log('[auth/callback] ✅ Redirecting to dashboard with implicit flow')
    return response
  }

  if (!code) {
    console.error('❌ [auth/callback] No se recibió código de autenticación ni token')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    console.log('[auth/callback] 🔄 Attempting to exchange code for session...')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ [auth/callback] Error al intercambiar código por sesión:')
      console.error('  Message:', exchangeError.message)
      console.error('  Status:', (exchangeError as any).status)
      console.error('  Code:', (exchangeError as any).code)
      
      // Check if this is a code+verifier issue (PKCE problem)
      if (exchangeError.message.includes('code_verifier') || exchangeError.message.includes('code verifier')) {
        console.error('  Root cause: PKCE code_verifier missing - falling back to implicit flow')
        const redirectUrl = new URL('/dashboard', requestUrl.origin)
        return NextResponse.redirect(redirectUrl)
      }
      
      return NextResponse.redirect(new URL('/login?error=exchange_failed&details=' + encodeURIComponent(exchangeError.message), requestUrl.origin))
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
    
    console.log('[auth/callback] ✅ Redirecting to dashboard')

    return response
  } catch (err) {
    console.error('❌ [auth/callback] Error inesperado:', err)
    const errorMessage = err instanceof Error ? err.message : 'unknown_error'
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(errorMessage), requestUrl.origin))
  }
}