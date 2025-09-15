import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Este middleware es crucial para la autenticación de Supabase en Next.js.
// Su única responsabilidad es refrescar el token de sesión del usuario en cada petición.
// NO debe contener lógica de redirección. La redirección se maneja en las páginas/layouts.
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
          // Si el middleware necesita establecer una cookie, debemos actualizar la petición
          // y la respuesta.
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // Si el middleware necesita eliminar una cookie, debemos actualizar la petición
          // y la respuesta.
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresca la sesión del usuario. Esto es vital para que la autenticación
  // funcione correctamente en el entorno de servidor de Next.js.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas de petición excepto las que comienzan con:
     * - api (rutas de API)
     * - _next/static (archivos estáticos)
     * - _next/image (archivos de optimización de imágenes)
     * - favicon.ico (archivo de favicon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
