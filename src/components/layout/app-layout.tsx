import { Navbar } from './navbar';

type AppLayoutProps = {
  children: React.ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col pt-16 overflow-y-auto">{children}</main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t shrink-0">
        © {new Date().getFullYear()} Ingenes. Todos los derechos reservados.
      </footer>
    </div>
  );
}
