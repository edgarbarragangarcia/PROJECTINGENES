import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  
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
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error al intercambiar código por sesión:', error)
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
  } catch (err) {
    console.error('Error inesperado:', err)
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }
}