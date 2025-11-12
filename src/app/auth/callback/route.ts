import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const cookieStore = await cookies()

  if (code) {
    // Use createServerClient to properly handle cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set(name, value, options)
            } catch (error) {
              console.error('Error setting cookie:', error)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete(name)
            } catch (error) {
              console.error('Error removing cookie:', error)
            }
          },
        },
      }
    )

    try {
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code)
      console.log('✅ OAuth code exchanged for session')
      
      // Get the session that was just created
      const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
      
      if (getSessionError) {
        console.error('Error getting session after exchange:', getSessionError)
      }
      
      if (session) {
        console.log('✅ OAuth session received, access_token present')
        
        // Manually set the auth token cookie so middleware can read it
        const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0].split('//')[1] || 'sb'
        const cookieName = `sb-${projectRef}-auth-token`
        
        try {
          cookieStore.set(cookieName, session.access_token, {
            maxAge: session.expires_in || 3600,
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          })
          console.log('✅ OAuth session token set in httpOnly cookie')
        } catch (cookieError) {
          console.error('Error setting auth token cookie:', cookieError)
        }
      } else {
        console.warn('⚠️ No session returned after code exchange')
      }
    } catch (error) {
      console.error('Error exchanging code:', error)
    }
  }

  // Always redirect to dashboard - let middleware handle auth check
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
