'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      router.push('/');
      router.refresh();
    }
  };
  
  const handleSignUp = async () => {
    setError(null);
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="flex items-center justify-center size-12 rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-7" />
            </div>
          </div>
          <CardTitle className="font-headline text-2xl">Bienvenido a PROJECTIA</CardTitle>
          <CardDescription>Inicia sesión para gestionar tus proyectos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-destructive text-sm text-center">{error}</p>}
              <div className="flex flex-col space-y-2">
                <Button type="submit">Iniciar Sesión</Button>
                <Button type="button" variant="outline" onClick={handleSignUp}>Registrarse</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
