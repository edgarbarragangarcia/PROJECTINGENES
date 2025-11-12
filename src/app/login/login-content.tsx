'use client';

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
                    console.log('[login] Session found, redirecting to dashboard');
                    router.replace('/dashboard');
                }
            } catch (err) {
                console.error('[login] Error checking session:', err);
            }
        };
        checkSession();
    }, [router, supabase]);

    // Check for error in URL params
    useEffect(() => {
        const errorParam = searchParams.get('error');
        const detailsParam = searchParams.get('details');
        if (errorParam) {
            const errorMessages: Record<string, string> = {
                'no_code': 'No se recibió código de autenticación',
                'exchange_failed': 'Error al intercambiar código',
                'no_session': 'No se pudo crear la sesión',
            };
            const baseMessage = errorMessages[errorParam] || `Error: ${errorParam}`;
            const fullMessage = detailsParam ? `${baseMessage} (${detailsParam})` : baseMessage;
            setError(fullMessage);
            console.error('[login] Error from callback:', { error: errorParam, details: detailsParam });
        }
    }, [searchParams]);

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            router.push('/dashboard');
            router.refresh(); // Asegura que el estado del servidor se actualice
        }
    };
    
    const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setRegisterSuccess(true);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsLoading(true);
        try {
            console.log('[login] 🔵 Starting Google OAuth flow...');
            console.log('[login] Redirect URL:', `${location.origin}/auth/callback`);
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                }
            });
            
            if (error) {
                console.error('❌ [login] Error al iniciar sesión con Google:', error);
                setError(`Error: ${error.message}`);
                setIsLoading(false);
                return;
            }

            console.log('✅ [login] OAuth iniciado, esperando redirección...');
        } catch (err) {
            console.error('❌ [login] Error inesperado:', err);
            setError('Ocurrió un error al intentar iniciar sesión con Google');
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm">
            <div className="text-center mb-6">
                <h1 className="font-headline text-3xl font-bold">Bienvenido a PROJECTIA</h1>
                <p className="mt-2 text-muted-foreground">Inicia sesión o crea una cuenta para continuar.</p>
            </div>
            
            {error && <p className="mb-4 text-destructive text-sm text-center">{error}</p>}
            {registerSuccess && (
                <div className="mb-4 p-3 rounded-md bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800">
                    ¡Revisa tu correo para confirmar el registro!
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
                                    <Input id="login-email" type="email" placeholder="tu@email.com" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="login-password">Contraseña</Label>
                                    <Input id="login-password" type="password" placeholder="Tu contraseña" value={password} onChange={(e: any) => setPassword(e.target.value)} required />
                                </div>
                                <Button type="submit" className="w-full mt-2">Iniciar Sesión</Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="register">
                            <form onSubmit={handleSignUp} className="grid gap-4 pt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="register-email">Email</Label>
                                    <Input id="register-email" type="email" placeholder="tu@email.com" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="register-password">Contraseña</Label>
                                    <Input id="register-password" type="password" placeholder="Crea una contraseña segura" value={password} onChange={(e: any) => setPassword(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                                    <Input id="confirm-password" type="password" placeholder="Repite la contraseña" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} required />
                                </div>
                                <Button type="submit" className="w-full mt-2">Crear Cuenta</Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardHeader>
            </Card>
        </div>
    );
}
