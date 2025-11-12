import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  console.log('[auth/callback] 🔐 Callback received')
  console.log('[auth/callback] Code present:', !!code)
  
  if (!code) {
    console.error('[auth/callback] ❌ No code received')
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error de Autenticación</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #f5f5f5;">
          <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
            <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px;">
              <h1>❌ Error de Autenticación</h1>
              <p>No se recibió código de autenticación</p>
              <p style="font-size: 14px; color: #999;">Redirigiendo a login...</p>
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = '/login?error=no_code';
            }, 2000);
          </script>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  console.log('[auth/callback] 🔄 Processing PKCE callback with code')
  
  // Return an HTML page that handles the PKCE exchange on the client side
  // The Supabase client has already stored the code_verifier in localStorage
  // and will process the code automatically when detectSessionInUrl is true
  
  return new NextResponse(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Completando autenticación...</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #f5f5f5;">
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
          <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px;">
            <h1>🔐 Completando autenticación...</h1>
            <p>Por favor espera mientras procesamos tu login con Google.</p>
            <div style="margin-top: 20px; display: inline-block; width: 40px; height: 40px; border: 4px solid #f0f0f0; border-top: 4px solid #1976d2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          </div>
        </div>
        
        <script>
          // The Supabase client (detectSessionInUrl: true) will handle the code exchange
          // Wait for it to complete, then redirect to dashboard
          const checkAuth = async () => {
            try {
              // Wait for Supabase to process the callback
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Try to access a protected resource to verify auth worked
              const response = await fetch('/api/auth/user', {
                method: 'GET',
                credentials: 'include'
              });
              
              if (response.ok) {
                console.log('✅ Authentication successful');
                window.location.href = '/dashboard';
              } else {
                console.log('⏳ Auth not ready yet, trying again...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                window.location.href = '/dashboard';
              }
            } catch (err) {
              console.error('Error checking auth:', err);
              // Even if the check fails, try redirecting to dashboard
              // The middleware will verify the session
              window.location.href = '/dashboard';
            }
          };
          
          checkAuth();
        </script>
        
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </body>
    </html>
  `, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}