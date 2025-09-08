

'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap, LayoutDashboard, ListChecks, Sparkles } from "lucide-react";
import Link from "next/link";

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5 mr-2" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-.97 2.53-1.94 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.16c1.56 0 2.95.54 4.04 1.58l3.15-3.15C17.45 1.99 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        <path d="M1 1h22v22H1z" fill="none"/>
    </svg>
);


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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
      router.refresh();
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
      alert('¡Revisa tu correo para confirmar el registro!');
    }
  };
  
  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar',
      },
    });
    if (error) {
      setError(error.message);
    }
  };


  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-violet-100 via-pink-100 to-blue-100 dark:from-violet-950/50 dark:via-pink-950/50 dark:to-blue-950/50 border-r">
          <div className="max-w-md w-full">
            <Link href="/" className="flex items-center gap-3 mb-8">
                <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-primary-foreground">
                    <Zap className="size-6" />
                </div>
                <span className="font-headline text-2xl font-bold">PROJECTIA</span>
            </Link>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
                Transforma tus ideas en proyectos exitosos.
            </h1>
            <p className="mt-4 text-muted-foreground">
                Gestiona tus proyectos con una herramienta visual, intuitiva y potenciada por IA que se adapta a tu forma de trabajar.
            </p>
            <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-full border shadow-sm">
                        <LayoutDashboard className="size-5 text-primary"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">Paneles Visuales</h3>
                        <p className="text-sm text-muted-foreground">Organiza todo con tableros Kanban, calendarios y diagramas de Gantt.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-full border shadow-sm">
                        <Sparkles className="size-5 text-primary"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">Asistente IA</h3>
                        <p className="text-sm text-muted-foreground">Deja que la IA te sugiera prioridades y te ayude a optimizar tu flujo de trabajo.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-full border shadow-sm">
                        <ListChecks className="size-5 text-primary"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">Seguimiento de Progreso</h3>
                        <p className="text-sm text-muted-foreground">Monitoriza el avance de tus proyectos y tareas con dashboards claros y concisos.</p>
                    </div>
                </div>
            </div>
          </div>
      </div>
      <div className="flex items-center justify-center p-6 min-h-screen">
        <Card className="w-full max-w-sm border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">Bienvenido a PROJECTIA</CardTitle>
                <CardDescription>Elige tu método preferido para continuar.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                        <GoogleIcon />
                        Continuar con Google
                    </Button>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                            O continuar con email
                            </span>
                        </div>
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                            <TabsTrigger value="register">Registrarse</TabsTrigger>
                        </TabsList>
                        <TabsContent value="login">
                            <form onSubmit={handleSignIn} className="grid gap-4 pt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="login-email">Email</Label>
                                    <Input id="login-email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="login-password">Contraseña</Label>
                                    <Input id="login-password" type="password" placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                </div>
                                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                                <Button type="submit" className="w-full mt-2">Iniciar Sesión</Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="register">
                            <form onSubmit={handleSignUp} className="grid gap-4 pt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="register-email">Email</Label>
                                    <Input id="register-email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="register-password">Contraseña</Label>
                                    <Input id="register-password" type="password" placeholder="Crea una contraseña segura" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                                    <Input id="confirm-password" type="password" placeholder="Repite la contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                                </div>
                                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                                <Button type="submit" className="w-full mt-2">Crear Cuenta</Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
