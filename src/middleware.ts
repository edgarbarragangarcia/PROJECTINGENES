import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const url = new URL(request.url);

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/api/auth'];
  const isPublicPath = publicPaths.some((path) => url.pathname.startsWith(path));

  // If not authenticated and trying to access protected route
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If authenticated and trying to access login page
  if (session && url.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icons/ (PWA icons)
     * - sw.js (Service Worker)
     * - workbox (Workbox files)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|sw\\.js|workbox).*)',
  ],
};
