import { ChatWidget } from '../chat/chat-widget';
import { FloatingActionMenu } from './floating-action-menu';
import { Navbar } from './navbar';
import { LoadingIndicator } from './loading-indicator';
import TelemetryPanel from './telemetry-panel';

type AppLayoutProps = {
  children: React.ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      <LoadingIndicator />
      <Navbar />
      <main className="flex-1 flex flex-col overflow-y-auto pt-16">
        {children}
      </main>
      <TelemetryPanel />
      <footer className="py-4 text-center text-sm text-muted-foreground border-t shrink-0">
          © {new Date().getFullYear()} Ingenes. Todos los derechos reservados.
      </footer>
      <FloatingActionMenu />
    </div>
  );
}
