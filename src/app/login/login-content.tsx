'use client';

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5 mr-2" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-.97 2.53-1.94 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.16c1.56 0 2.95.54 4.04 1.58l3.15-3.15C17.45 1.99 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        <path d="M1 1h22v22H1z" fill="none"/>
    </svg>
);

export default function LoginContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    
    // Redirige al dashboard si ya hay una sesión activa.
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    console.log('[login] ✅ Session found, redirecting to dashboard');
                    router.replace('/dashboard');
                }
            } catch (err) {
                console.error('[login] ❌ Error checking session:', err);
            }
        };
        checkSession();
    }, [router, supabase]);

    // Check for error in URL params
    useEffect(() => {
        const errorParam = searchParams.get('error');
        const detailsParam = searchParams.get('details');
        
        if (errorParam) {
            console.log('[login] OAuth error from callback:', errorParam);
            const errorMessages: Record<string, string> = {
                'no_code': '❌ No se recibió código de autenticación',
                'exchange_failed': '❌ Error al intercambiar código de autenticación',
                'no_session': '❌ No se pudo crear la sesión',
                'callback_error': '❌ Error en el callback de autenticación',
                'access_denied': '❌ Acceso denegado por Google',
            };
            const message = errorMessages[errorParam] || `❌ Error: ${errorParam}`;
            setError(message);
        }
    }, [searchParams]);

    // Handle OAuth callback code in URL
    useEffect(() => {
        const handleOAuthCallback = async () => {
            const code = searchParams.get('code');
            
            if (!code) return;
            
            console.log('[login] 🔐 Detected OAuth callback code, processing...');
            setIsLoading(true);
            
            try {
                // Wait a moment for Supabase to process the code
                // The detectSessionInUrl setting will handle the exchange
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if session was created
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                    console.log('[login] ✅ Session created from OAuth callback');
                    router.push('/dashboard');
                } else {
                    console.log('[login] ⚠️ No session yet, waiting more...');
                    // Wait more and try again
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const { data: { session: session2 } } = await supabase.auth.getSession();
                    
                    if (session2) {
                        console.log('[login] ✅ Session created (second attempt)');
                        router.push('/dashboard');
                    } else {
                        console.error('[login] ❌ Failed to create session from OAuth code');
                        setError('❌ No se pudo completar la autenticación. Por favor intenta de nuevo.');
                    }
                }
            } catch (err) {
                console.error('[login] Error processing OAuth callback:', err);
                setError('❌ Error procesando autenticación');
            } finally {
                setIsLoading(false);
            }
        };
        
        handleOAuthCallback();
    }, [searchParams, supabase, router]);

    const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('[login] ❌ Sign in error:', error.message);
                setError(`❌ ${error.message}`);
                setIsLoading(false);
                return;
            }
            
            console.log('[login] ✅ Sign in successful, redirecting...');
            router.push('/dashboard');
        } catch (err) {
            console.error('[login] ❌ Unexpected error:', err);
            setError('❌ Error inesperado al iniciar sesión');
            setIsLoading(false);
        }
    };
    
    const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        
        if (password !== confirmPassword) {
            setError("❌ Las contraseñas no coinciden.");
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("❌ La contraseña debe tener al menos 6 caracteres.");
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (error) {
                console.error('[login] ❌ Sign up error:', error.message);
                setError(`❌ ${error.message}`);
                setIsLoading(false);
                return;
            }
            
            console.log('[login] ✅ Sign up successful');
            setRegisterSuccess(true);
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error('[login] ❌ Unexpected error during signup:', err);
            setError('❌ Error inesperado al crear la cuenta');
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsLoading(true);
        try {
            console.log('[login] 🔵 Starting Google OAuth...');
            const redirectTo = (typeof globalThis !== 'undefined' && (globalThis as any).location)
                ? (globalThis as any).location.origin + '/auth/callback'
                : 'http://localhost:9003/auth/callback';
            console.log('[login] Redirect URL:', redirectTo);

            // Call signInWithOAuth but do not await it synchronously so the
            // browser treats the resulting navigation as user-initiated. Some
            // browsers (Safari) block navigations that happen after an awaited
            // async boundary.
            const promise = supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo },
            });

            promise.then((res: any) => {
                const data = res?.data;
                const error = res?.error;
                if (error) {
                    console.error('[login] ❌ Google OAuth error (async):', error.message || error);
                    setError(`❌ ${error.message || JSON.stringify(error)}`);
                    setIsLoading(false);
                    return;
                }
                const redirectUrl = data?.url;
                if (redirectUrl) {
                    console.log('[login] ▶️ Async redirect to OAuth URL', redirectUrl);
                    try { (globalThis as any).location.assign(redirectUrl); } catch (e) { console.error(e); }
                } else {
                    console.log('[login] ✅ Google OAuth initiated (async, no redirect URL)');
                }
            }).catch((err: any) => {
                console.error('[login] ❌ signInWithOAuth promise rejected:', err);
                setError('❌ Error iniciando OAuth');
                setIsLoading(false);
            });
        } catch (err) {
            console.error('[login] ❌ Unexpected error:', err);
            setError('❌ Error inesperado al iniciar sesión con Google');
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm">
            <div className="text-center mb-6">
                <h1 className="font-headline text-3xl font-bold">Bienvenido a PROJECTIA</h1>
                <p className="mt-2 text-muted-foreground">Inicia sesión o crea una cuenta para continuar.</p>
            </div>
            
            {error && (
                <div className="mb-4 p-3 rounded-md bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 text-sm">
                    {error}
                </div>
            )}
            
            {registerSuccess && (
                <div className="mb-4 p-3 rounded-md bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                    ✅ ¡Revisa tu correo para confirmar el registro!
                </div>
            )}

            <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleSignIn}
                disabled={isLoading}
            >
                <GoogleIcon />
                {isLoading ? 'Redirigiendo a Google...' : 'Continuar con Google'}
            </Button>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    O continuar con email
                    </span>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                            <TabsTrigger value="register">Registrarse</TabsTrigger>
                        </TabsList>
                        <TabsContent value="login">
                            <form onSubmit={handleSignIn} className="grid gap-4 pt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="login-email">Email</Label>
                                    <input 
                                        id="login-email" 
                                        type="email" 
                                        placeholder="tu@email.com" 
                                        value={email} 
                                        onChange={(e) => setEmail((e.target as any).value)}
                                        disabled={isLoading}
                                        required 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="login-password">Contraseña</Label>
                                    <input 
                                        id="login-password" 
                                        type="password" 
                                        placeholder="Tu contraseña" 
                                        value={password} 
                                        onChange={(e) => setPassword((e.target as any).value)}
                                        disabled={isLoading}
                                        required 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                    />
                                </div>
                                <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                                    {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                                </Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="register">
                            <form onSubmit={handleSignUp} className="grid gap-4 pt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="register-email">Email</Label>
                                    <input 
                                        id="register-email" 
                                        type="email" 
                                        placeholder="tu@email.com" 
                                        value={email} 
                                        onChange={(e) => setEmail((e.target as any).value)}
                                        disabled={isLoading}
                                        required 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="register-password">Contraseña</Label>
                                    <input 
                                        id="register-password" 
                                        type="password" 
                                        placeholder="Crea una contraseña segura" 
                                        value={password} 
                                        onChange={(e) => setPassword((e.target as any).value)}
                                        disabled={isLoading}
                                        required 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                                    <input 
                                        id="confirm-password" 
                                        type="password" 
                                        placeholder="Repite la contraseña" 
                                        value={confirmPassword} 
                                        onChange={(e) => setConfirmPassword((e.target as any).value)}
                                        disabled={isLoading}
                                        required 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                    />
                                </div>
                                <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                                    {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardHeader>
            </Card>
        </div>
    );
}
