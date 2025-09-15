'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Home, FolderKanban, CalendarClock, LogOut, Zap, BarChart3, ListChecks, GanttChartSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useEffect, useState, useMemo } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { InstallPWAButton } from '../pwa/install-pwa-button';


const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3, admin: false },
    { href: '/projects', label: 'Proyectos', icon: ListChecks, admin: false },
    { href: '/calendar', label: 'Calendario', icon: CalendarClock, admin: false },
    { href: '/gantt', label: 'Gantt', icon: GanttChartSquare, admin: true },
    { href: '/user-management', label: 'Usuarios', icon: Users, admin: true },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const { allUsers } = useTasks();

  const currentUserProfile = useMemo(() => {
      if (!user || allUsers.length === 0) return null;
      return allUsers.find(u => u.id === user.id);
  }, [user, allUsers]);

  const isAdmin = currentUserProfile?.role === 'admin';

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        // Si se cierra la sesión, refrescar la página para que el middleware actúe.
        if (event === 'SIGNED_OUT') {
           router.refresh();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Redirige a la página raíz, que a su vez redirigirá a /login.
    // Esto asegura que el flujo de redirección sea consistente.
    router.push('/'); 
    router.refresh(); // Fuerza la recarga para limpiar el estado del servidor.
  };
  
  const getInitials = () => {
    if (!user) return 'U';
    if (currentUserProfile?.full_name) {
      return currentUserProfile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    }
    return user.email?.substring(0, 2).toUpperCase() || 'U';
  }
  
  const getUserFullName = () => {
      if (!user) return 'Usuario';
      return currentUserProfile?.full_name || user.email;
  }


  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center h-16 px-4 md:px-6 shrink-0 bg-gradient-to-r from-primary-darker to-primary text-primary-foreground shadow-lg">
      <Link href="/dashboard" className="flex items-center gap-2 mr-6">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary-foreground text-primary">
          <Zap className="size-5" />
        </div>
        <span className="font-headline text-lg font-semibold">PROJECTIA</span>
      </Link>
      <nav className="hidden md:flex items-center gap-1">
        {menuItems.filter(item => !item.admin || isAdmin).map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            asChild
            className={cn(
                "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10",
                pathname === item.href && "text-primary-foreground bg-primary-foreground/20"
            )}
          >
            <Link href={item.href} className='px-3'>
              <item.icon className="mr-2 size-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <button className="flex items-center gap-2 text-sm font-medium text-left">
                    <Avatar className="h-8 w-8 border-2 border-primary-foreground/50">
                        <AvatarImage src={user?.user_metadata.avatar_url} alt={user?.email || 'Usuario'} />
                        <AvatarFallback className='text-primary'>{getInitials()}</AvatarFallback>
                    </Avatar>
                    <div className='hidden md:flex flex-col'>
                      <span className='font-bold leading-tight'>{getUserFullName()}</span>
                      <span className='text-xs text-primary-foreground/80 leading-tight'>{currentUserProfile?.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
                    </div>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getUserFullName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || 'No has iniciado sesión'}
                    </p>
                </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <InstallPWAButton />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
