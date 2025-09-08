'use client';

export default function Home() {
  // The redirection logic is now fully handled by the middleware.
  // This page will likely not be seen by users, but serves as a fallback.
  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Cargando...</p>
      </div>
    );
}
