import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProvider } from '@/providers/app-provider';

export const metadata: Metadata = {
  title: 'PROJECTIA',
  description: 'Gestiona tus proyectos con PROJECTIA.',
  manifest: '/manifest.json',
  themeColor: '#ffffff',
  icons: {
    apple: "/icons/icon-192x192.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
        <link rel='manifest' href='/manifest.json' />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png"></link>
        <meta name='theme-color' content='#fff' />
      </head>
      <body className="font-body antialiased">
        <AppProvider>
          {children}
        </AppProvider>
        <Toaster />
      </body>
    </html>
  );
}
