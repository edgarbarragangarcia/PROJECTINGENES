'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Procesando autenticación...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        console.log('[callback] Starting callback processing');
        console.log('[callback] Code:', !!code);
        console.log('[callback] Error:', error);

        if (error) {
          console.error('[callback] Error from OAuth provider:', error);
          setError(`Error: ${error}`);
          setTimeout(() => {
            router.push('/login?error=' + encodeURIComponent(error));
          }, 2000);
          return;
        }

        if (!code) {
          console.error('[callback] No code received');
          setError('No se recibió código de autenticación');
          setTimeout(() => {
            router.push('/login?error=no_code');
          }, 2000);
          return;
        }

        // The Supabase client with PKCE will automatically:
        // 1. Detect the code in the URL
        // 2. Get the code_verifier from localStorage (stored by signInWithOAuth)
        // 3. Exchange code + code_verifier for a session
        
        setStatus('Intercambiando código por sesión...');
        console.log('[callback] Waiting for Supabase to process...');

        // Wait a moment for Supabase to process the callback
        // The detectSessionInUrl setting handles the exchange
        await new Promise(resolve => setTimeout(resolve, 2000));

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('[callback] ✅ Session created successfully');
          setStatus('¡Sesión iniciada! Redirigiendo...');
          router.push('/dashboard');
        } else {
          console.log('[callback] No session yet, trying again...');
          // Try once more
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: { session: session2 } } = await supabase.auth.getSession();
          
          if (session2) {
            console.log('[callback] ✅ Session created (second attempt)');
            router.push('/dashboard');
          } else {
            console.error('[callback] Failed to create session');
            setError('No se pudo crear la sesión');
            setTimeout(() => {
              router.push('/login?error=no_session');
            }, 2000);
          }
        }
      } catch (err) {
        console.error('[callback] Error during callback:', err);
        const message = err instanceof Error ? err.message : 'Error desconocido';
        setError(message);
        setTimeout(() => {
          router.push(`/login?error=callback_error&details=${encodeURIComponent(message)}`);
        }, 2000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '400px'
      }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>
          {error ? '❌ Error' : '🔐 Autenticación'}
        </h1>
        <p style={{ color: error ? '#d32f2f' : '#666', marginBottom: '20px' }}>
          {error || status}
        </p>
        {!error && (
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #f0f0f0',
            borderTop: '4px solid #1976d2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
        {error && (
          <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
            Redirigiendo en 2 segundos...
          </p>
        )}
      </div>
    </div>
  );
}
