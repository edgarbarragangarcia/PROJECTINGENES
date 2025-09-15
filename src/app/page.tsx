'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// Esta página actúa como el punto de entrada principal y gestiona la redirección inicial.
export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Si hay una sesión, redirige al dashboard.
        router.replace('/dashboard');
      } else {
        // Si NO hay sesión, redirige a la página de login.
        router.replace('/login');
      }
    };

    checkSession();
  }, [router, supabase]);

  // Muestra un mensaje de carga mientras se determina la redirección.
  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Cargando...</p>
      </div>
    );
}
