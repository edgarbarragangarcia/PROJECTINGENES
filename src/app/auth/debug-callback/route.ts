import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * DEBUG endpoint: Renders the session state received by the server during OAuth callback
 * Helps troubleshoot cookie issues and session exchange
 * 
 * Access via: http://localhost:9003/auth/debug-callback
 * (This is NOT the actual OAuth callback, just a debug page)
 */
export async function GET() {
  const cookieStore = await cookies();
  
  // Get all cookies
  const allCookies: Record<string, string> = {};
  cookieStore.getAll().forEach((cookie) => {
    allCookies[cookie.name] = cookie.value;
  });

  // Look for Supabase auth cookie
  const supabaseAuthCookie = Object.entries(allCookies).find(
    ([name]) => name.startsWith('sb-') && name.endsWith('-auth-token')
  );

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OAuth Debug - PROJECTINGENES</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #000;
      margin-bottom: 24px;
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 12px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-weight: 600;
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status.ok {
      background: #dcfce7;
      color: #166534;
    }
    .status.warning {
      background: #fef3c7;
      color: #92400e;
    }
    .status.error {
      background: #fee2e2;
      color: #991b1b;
    }
    .code-block {
      background: #f3f4f6;
      border-left: 3px solid #7c3aed;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: "Monaco", "Courier New", monospace;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
    }
    .cookie-item {
      background: #f9fafb;
      padding: 12px;
      margin: 8px 0;
      border-radius: 4px;
      border-left: 3px solid #3b82f6;
    }
    .cookie-name {
      font-weight: 600;
      color: #1f2937;
      font-family: monospace;
      font-size: 13px;
    }
    .cookie-value {
      color: #4b5563;
      font-family: monospace;
      font-size: 11px;
      word-break: break-all;
      margin-top: 4px;
    }
    .action {
      margin-top: 24px;
    }
    button {
      background: #7c3aed;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    button:hover {
      background: #6d28d9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 OAuth Debug Info</h1>
    
    <div class="section">
      <div class="section-title">🔐 Supabase Auth Cookie</div>
      ${
        supabaseAuthCookie
          ? `
        <div class="status ok">✅ Cookie found</div>
        <div class="cookie-item">
          <div class="cookie-name">${supabaseAuthCookie[0]}</div>
          <div class="cookie-value">${supabaseAuthCookie[1]}</div>
          <div style="margin-top: 8px; font-size: 11px; color: #6b7280;">
            Length: ${supabaseAuthCookie[1].length} characters
          </div>
        </div>
      `
          : `
        <div class="status error">❌ No Supabase auth cookie</div>
        <p style="color: #666; font-size: 13px;">
          Expected: Cookie named <code>sb-&lt;projectRef&gt;-auth-token</code>
        </p>
      `
      }
    </div>

    <div class="section">
      <div class="section-title">📦 All Server Cookies</div>
      ${
        Object.entries(allCookies).length > 0
          ? `
        <div class="status ok">${Object.entries(allCookies).length} cookie(s) found</div>
        ${Object.entries(allCookies)
          .map(
            ([name, value]) => `
          <div class="cookie-item">
            <div class="cookie-name">${name}</div>
            <div class="cookie-value">${value.substring(0, 100)}${value.length > 100 ? '...' : ''}</div>
          </div>
        `
          )
          .join('')}
      `
          : `
        <div class="status warning">⚠️ No cookies detected</div>
      `
      }
    </div>

    <div class="section">
      <div class="section-title">📋 Debug Information</div>
      <div class="code-block">
URL: http://localhost:9003/auth/debug-callback
Request Method: GET
Server Time: ${new Date().toISOString()}
Node Env: ${process.env.NODE_ENV}
      </div>
    </div>

    <div class="section">
      <div class="section-title">💡 What to check</div>
      <ul style="color: #666; font-size: 13px; line-height: 1.8;">
        <li>✅ If you see "Supabase Auth Cookie" → Server received the token</li>
        <li>❌ If you see "No Supabase auth cookie" → Token was not persisted in the callback</li>
        <li>📍 If multiple cookies shown → Check if the auth cookie is one of them</li>
        <li>🔄 Refresh this page after making a test OAuth request to update the data</li>
      </ul>
    </div>

    <div class="action">
      <button onclick="location.href = '/login'">← Back to Login</button>
      <button onclick="location.reload()" style="margin-left: 10px; background: #64748b;">🔄 Refresh</button>
    </div>
  </div>

  <script>
    console.log('🔍 Debug page loaded');
    console.log('All cookies:', ${JSON.stringify(allCookies)});
    console.log('Supabase cookie:', ${JSON.stringify(supabaseAuthCookie ? supabaseAuthCookie[0] : null)});
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
