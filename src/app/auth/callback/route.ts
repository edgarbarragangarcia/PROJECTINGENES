import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  console.log('[auth/callback] 🔐 Callback received')
  console.log('[auth/callback] Code present:', !!code)
  
  if (!code) {
    console.error('[auth/callback] ❌ No code received')
    return NextResponse.redirect(
      new URL('/login?error=no_code', requestUrl.origin)
    )
  }

  // Redirect to login with the code in URL
  // The login component will process it with Supabase's detectSessionInUrl
  console.log('[auth/callback] 🔄 Redirecting to login with code')
  
  const loginUrl = new URL('/login', requestUrl.origin)
  loginUrl.searchParams.set('code', code)
  
  return NextResponse.redirect(loginUrl)
}