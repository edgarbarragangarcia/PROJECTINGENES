'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Esta página actúa como el punto de entrada principal y redirige al dashboard.
// El middleware ya se encarga de proteger las rutas y redirigir a /login si no hay sesión.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  // Muestra un mensaje de carga mientras se realiza la redirección inicial.
  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Cargando...</p>
      </div>
    );
}
