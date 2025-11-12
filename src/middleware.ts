import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Helper to extract projectRef from Supabase URL
function getProjectRefFromUrl(url?: string) {
  if (!url) return 'sb';
  try {
    const u = new URL(url);
    const host = u.host; // e.g., ytljrvcjstbuhrdothhf.supabase.co
    const parts = host.split('.');
    return parts[0] || 'sb';
  } catch (e) {
    return 'sb';
  }
}

export async function middleware(request: NextRequest) {
  // Create an initial response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  // Debug logging
  console.log('[middleware] Processing request for:', request.nextUrl.pathname);
  
  const publicPaths = ['/login', '/auth/callback', '/auth/auth-code-error', '/auth/debug-callback'];

  // Allow public paths and auth callbacks to pass through without auth check
  if (publicPaths.includes(request.nextUrl.pathname)) {
    console.log('[middleware] Public path, allowing without auth check');
    return response;
  }

  // Get the correct cookie name dynamically
  const projectRef = getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const cookieName = `sb-${projectRef}-auth-token`;
  
  // Try to get the auth token from cookies
  const authTokenCookie = request.cookies.get(cookieName);
  const hasAuthToken = !!authTokenCookie?.value;
  
  console.log('[middleware] Looking for cookie:', cookieName);
  console.log('[middleware] Auth token present:', hasAuthToken);
  
  // Also log all available cookies for debugging
  if (isDevelopment) {
    const allCookies = request.cookies.getAll();
    console.log('[middleware] Available cookies:', allCookies.map((c: any) => c.name).join(', '));
  }

  // If there's no auth token, allow HTML navigations (client will handle auth)
  // but redirect non-HTML requests to login
  if (!hasAuthToken) {
    const accept = request.headers.get('accept') || '';
    const isHtmlNavigation = accept.includes('text/html');

    if (isHtmlNavigation) {
      console.debug('[middleware] No auth token, but allowing HTML navigation for client-side auth');
      return response;
    }

    console.debug('[middleware] No auth token, redirecting non-HTML request to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If we have a token, try to validate it with Supabase
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = request.cookies.get(name);
            return cookie?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ 
              name, 
              value, 
              ...options,
              path: options.path || '/',
              sameSite: isDevelopment ? 'lax' : (options.sameSite as 'lax' | 'strict' | 'none' || 'lax'),
              secure: isDevelopment ? false : true,
              httpOnly: true,
            });
          },
          remove(name: string, options: CookieOptions) {
            console.debug('[middleware] Removing invalid cookie:', name);
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

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.log('[middleware] Auth validation error (non-critical):', error.message);
      // Don't fail on validation errors - let the client handle it
      return response;
    }

    if (user) {
      console.log('[middleware] ✅ User authenticated:', user.email);
      
      // if the user is logged in and on the login page, redirect to dashboard
      if (request.nextUrl.pathname === '/login') {
        console.log('[middleware] User on login page, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      return response;
    } else {
      console.log('[middleware] ❌ No user found even with auth token');
      
      // Check if it's HTML navigation
      const accept = request.headers.get('accept') || '';
      const isHtmlNavigation = accept.includes('text/html');

      if (isHtmlNavigation) {
        console.log('[middleware] HTML navigation without valid user, allowing client to handle');
        return response;
      }

      console.log('[middleware] Non-HTML request without user, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch (error) {
    console.log('[middleware] ❌ Auth check error:', error);
    
    // For non-critical errors, allow HTML navigations through
    const accept = request.headers.get('accept') || '';
    const isHtmlNavigation = accept.includes('text/html');

    if (isHtmlNavigation) {
      console.log('[middleware] Error during auth check, allowing HTML navigation');
      return response;
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }
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
