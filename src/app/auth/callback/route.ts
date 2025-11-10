import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error en auth callback:', error);
      return NextResponse.redirect(new URL('/login', requestUrl.origin));
    }

    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  }

  // Si no hay código, redirigir a la página de login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
