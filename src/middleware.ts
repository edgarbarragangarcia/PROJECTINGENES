import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(request.url);

  // Permitir acceso inicial a /dashboard tras login aunque no haya usuario
  if (!user && url.pathname === '/dashboard' && request.method === 'GET') {
    console.log('[middleware] Permitiendo acceso inicial a /dashboard para sincronizar sesión');
    return response;
  }

  // Si no hay usuario y no está en /login ni /auth, redirigir a login
  if (!user && url.pathname !== '/login' && !url.pathname.startsWith('/auth/')) {
    console.log('[middleware] No user found, redirecting to /login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si hay usuario y está en /login, redirigir a dashboard
  if (user && url.pathname === '/login') {
    console.log('[middleware] User is on login page, redirecting to /dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  console.log('[middleware] User check passed for path:', url.pathname);
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
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons/|sw\.js|workbox).*)',
  ],
};
