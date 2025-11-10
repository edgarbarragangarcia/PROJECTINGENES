import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Get all cookies for debugging
    const allCookies = cookieStore.getAll().map((cookie: ResponseCookie) => ({ 
        name: cookie.name,
        // Don't expose actual values, just presence
        present: true,
        attributes: {
          path: cookie.path,
          domain: cookie.domain,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
        }
      }))

    return NextResponse.json({
      debug_time: new Date().toISOString(),
      has_session: !!session,
      session_user_email: session?.user?.email,
      user_email: user?.email,
      cookies_present: allCookies,
      errors: {
        session: sessionError?.message,
        user: userError?.message
      }
    })
  } catch (err) {
    console.error('Debug endpoint error:', err)
    return NextResponse.json({ error: 'Internal error in debug endpoint' }, { status: 500 })
  }
}