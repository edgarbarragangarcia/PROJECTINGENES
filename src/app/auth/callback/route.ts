import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  
  console.debug('[auth/callback] Starting auth callback with:', { 
    code: code ? 'present' : 'missing',
    error,
    error_description,
    url: request.url
  })
  
  if (error) {
    console.error('Error en autenticación:', error, error_description)
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  if (!code) {
    console.error('No se recibió código de autenticación')
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    }, {
      cookies: {
        name: 'sb-auth-token',
        lifetime: 60 * 60 * 24 * 7, // 1 week
        domain: 'localhost',
        path: '/',
        sameSite: 'lax'
      }
    })
    
    console.debug('[auth/callback] Exchanging code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error al intercambiar código por sesión:', error)
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

  console.debug('[auth/callback] session created:', data?.session)

  // For debugging: set a temporary non-httpOnly cookie so you can inspect
  // whether this route is returning Set-Cookie headers in the response.
  const redirectUrl = new URL('/dashboard', requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl);
  // Non-sensitive debug cookie (visible in DevTools) to confirm Set-Cookie
  response.cookies.set({ name: 'auth_debug', value: '1', path: '/', httpOnly: false });

  return response
  } catch (err) {
    console.error('Error inesperado:', err)
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }
}