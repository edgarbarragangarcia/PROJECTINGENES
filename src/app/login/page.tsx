'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isTestUser, validateTestUserPassword, generateTestSession } from '@/lib/test-users';
import { TEST_USERS } from '@/lib/test-users';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('✅ User already logged in, redirecting to dashboard');
          router.replace('/dashboard');
        }
      } catch (err) {
        console.error('Error checking auth:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [supabase, router]);

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      console.log('🔐 Iniciando login con:', email);
      
      // Check if it's a test user first (local/offline testing)
      if (isTestUser(email)) {
        console.log('🧪 Test user detected, using local session simulation');
        if (!validateTestUserPassword(email, password)) {
          console.error('❌ Test user password incorrect');
          setError('Contraseña incorrecta para usuario de prueba');
          setIsLoading(false);
          return;
        }

        // Generate a fake session
        const fakeSession = generateTestSession(email);
        console.log('✅ Test session generated:', fakeSession.user.email);

        // Store in localStorage via Supabase client
        const supabaseTest = createClient();
        if (typeof (globalThis as any).localStorage !== 'undefined') {
          (globalThis as any).localStorage.setItem(
            'sb-auth-token',
            JSON.stringify(fakeSession)
          );
          console.log('✅ Test session stored in localStorage');
        }

        // Send session to server to set httpOnly cookie
        try {
          await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: fakeSession }),
          });
          console.log('✅ Test session cookie set on server');
        } catch (e) {
          console.warn('⚠️ Could not set test session cookie on server:', e);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('Redirecting to dashboard...');
        router.push('/dashboard');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1000);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        setError(error.message);
        setIsLoading(false);
        return;
      }

      console.log('✅ Sign in successful');
      console.log('Session:', data.session?.user.email);
      
      // Send real Supabase session to server to set httpOnly cookie
      try {
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: data.session }),
        });
        console.log('✅ Real session cookie set on server');
      } catch (e) {
        console.warn('⚠️ Could not set session cookie on server:', e);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('Redirecting to dashboard...');
      router.push('/dashboard');
      
      // Extra safety: if push doesn't work, try replace
      setTimeout(() => {
        router.replace('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Exception:', err);
      setError('Error al iniciar sesión');
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: '/auth/callback',
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      setError(null);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setMessage('✅ Revisa tu email para confirmar la cuenta');
      setIsLoading(false);
    } catch (err) {
      setError('Error al crear cuenta');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      console.log('🔵 Iniciando Google OAuth...');
      console.log('📍 Redirect URL:', `/auth/callback`);
      const origin = typeof (global as any).window !== 'undefined' ? (global as any).window.location.origin : 'server';
      console.log('🌐 Origin:', origin);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('❌ OAuth Error:', error);
        setError(`OAuth Error: ${error.message}`);
        setIsLoading(false);
      } else {
        console.log('✅ OAuth redirect initiated');
      }
    } catch (err) {
      console.error('❌ Exception:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      {/* Left Panel - Desktop Only */}
      <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-violet-100 via-pink-100 to-blue-100 dark:from-violet-950/50 dark:via-pink-950/50 dark:to-blue-950/50">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">PROJECTIA</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Sistema de gestión de proyectos inteligente
          </p>
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Acceso rápido, seguro y confiable a tus proyectos
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Bienvenido a PROJECTIA</h2>
            <p className="text-gray-600">Inicia sesión o crea una cuenta</p>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-100 text-red-800 border border-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-4 rounded-lg bg-green-100 text-green-800 border border-green-300">
              {message}
            </div>
          )}

          {/* Test Users Info (Dev Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-lg text-xs mb-4">
              <strong>🧪 Test users:</strong> {Object.values(TEST_USERS).map(u => `${u.email}/${u.password}`).join(', ')}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6 font-medium transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-.97 2.53-1.94 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.16c1.56 0 2.95.54 4.04 1.58l3.15-3.15C17.45 1.99 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? 'Redirigiendo...' : 'Continuar con Google'}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-950 text-gray-600">O continúa con email</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('signin')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                tab === 'signin'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                tab === 'signup'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Sign In Form */}
          {tab === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail((e.target as any).value)}
                  disabled={isLoading}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword((e.target as any).value)}
                  disabled={isLoading}
                  placeholder="Tu contraseña"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 disabled:opacity-50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {tab === 'signup' && (
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail((e.target as any).value)}
                  disabled={isLoading}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword((e.target as any).value)}
                  disabled={isLoading}
                  placeholder="Crea una contraseña segura"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword((e.target as any).value)}
                  disabled={isLoading}
                  placeholder="Repite la contraseña"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 disabled:opacity-50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
