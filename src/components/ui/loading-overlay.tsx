'use client';

// Importaciones removidas ya que no usamos el Loader2

interface LoadingOverlayProps {
  loading: boolean;
}

export function LoadingOverlay({ loading }: LoadingOverlayProps) {
  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-1">
      <div className="h-1 bg-primary animate-pulse w-full" />
    </div>
  );
}