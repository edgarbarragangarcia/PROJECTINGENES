import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  console.log('[auth/callback] 🔐 Callback received with code:', !!code)
  
  // IMPORTANT: With PKCE flow, we must keep the ?code= parameter in the URL
  // so the client-side Supabase library can detect it and exchange it for a session.
  // The code_verifier is in localStorage from signInWithOAuth.
  
  // Return an HTML page that waits for the client-side auth to complete
  return new NextResponse(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Processing authentication...</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
          <div style="text-align: center;">
            <h1>Procesando autenticación...</h1>
            <p>Por favor espera mientras completamos el login.</p>
            <div style="margin-top: 20px;">
              <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            </div>
          </div>
        </div>
        <script>
          // Wait a moment for Supabase to process the URL
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        </script>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </body>
    </html>
  `, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}