import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    try {
      await supabase.auth.exchangeCodeForSession(code)
      
      // 🆕 Get the newly created session and sync to httpOnly cookie
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log('✅ OAuth session received, syncing to httpOnly cookie')
        // Call API to sync to httpOnly cookie so middleware can read it
        try {
          const response = await fetch(`${requestUrl.origin}/api/auth/set-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session }),
          })
          
          if (!response.ok) {
            console.error('Failed to set session cookie:', await response.text())
          } else {
            console.log('✅ OAuth session synced to httpOnly cookie')
          }
        } catch (syncError) {
          console.error('Error syncing session to cookie:', syncError)
        }
      }
    } catch (error) {
      console.error('Error exchanging code:', error)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
