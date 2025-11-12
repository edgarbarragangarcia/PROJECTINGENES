import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Create an initial response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  // Debug logging
  console.debug('[middleware] Processing request for:', request.nextUrl.pathname);
  console.debug('[middleware] Cookies present:', request.cookies.getAll().length > 0);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name);
          console.debug('[middleware] Reading cookie:', name, !!cookie);
          return cookie?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          console.debug('[middleware] Setting cookie:', name, { value: value.substring(0, 20) + '...', ...options });
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ 
            name, 
            value, 
            ...options,
            // Ensure cookies are set with proper attributes
            path: options.path || '/',
            sameSite: isDevelopment ? 'lax' : (options.sameSite as 'lax' | 'strict' | 'none' || 'lax'),
            secure: isDevelopment ? false : true, // Allow non-secure in development
            httpOnly: true,
          });
        },
        remove(name: string, options: CookieOptions) {
          console.debug('[middleware] Removing cookie:', name);
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ 
            name, 
            value: '', 
            ...options,
            path: options.path || '/',
            expires: new Date(0),
            sameSite: isDevelopment ? 'lax' : (options.sameSite as 'lax' | 'strict' | 'none' || 'lax'),
            secure: isDevelopment ? false : true,
          });
        },
      },
    }
  );

  const publicPaths = ['/login', '/auth/callback', '/auth/auth-code-error'];

  // Allow public paths and auth callbacks to pass through without auth check
  if (publicPaths.includes(request.nextUrl.pathname)) {
    return response;
  }

  // IMPORTANT: refreshing the session is crucial for server-side auth to work correctly.
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // if the user is not logged in and not on a public path, redirect to login
    if (!user) {
      console.debug('[middleware] No user found, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    console.debug('[middleware] User authenticated:', user.email);

    // if the user is logged in and on the login page, redirect to dashboard
    if (user && request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (error) {
    console.error('[middleware] Auth check error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icons/ (PWA icons)
     * - sw.js (Service Worker)
     * - workbox (Workbox files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons/|sw\\.js|workbox).*)',
  ],
};
