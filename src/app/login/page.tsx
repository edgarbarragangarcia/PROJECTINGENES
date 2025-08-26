
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
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="size-5 mr-2">
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.63-4.5 1.63-5.52 0-10-4.48-10-10s4.48-10 10-10c3.04 0 5.25 1.22 6.46 2.35l-2.65 2.65C14.54 9.17 13.56 8.5 12 8.5c-4.42 0-8 3.58-8 8s3.58 8 8 8c4.89 0 7.23-3.23 7.5-6.82h-7.5Z" />
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
