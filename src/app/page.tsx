'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirecciona siempre al dashboard, el middleware se encargará
    // de la lógica de autenticación si el usuario no ha iniciado sesión.
    router.replace('/dashboard');
  }, [router]);

  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Redirigiendo...</p>
      </div>
    );
}
