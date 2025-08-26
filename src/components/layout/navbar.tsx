'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Home, FolderKanban, CalendarClock, LogOut, Zap, BarChart3, ListChecks } from 'lucide-react';
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
import { useEffect, useState } from 'react';


const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/projects', label: 'Proyectos', icon: ListChecks },
    { href: '/calendar', label: 'Calendario', icon: CalendarClock },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };
  
  const getInitials = (email: string) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center h-16 px-4 md:px-6 border-b shrink-0 bg-gradient-to-r from-violet-200/80 via-pink-200/80 to-blue-200/80 backdrop-blur-sm">
      <Link href="/dashboard" className="flex items-center gap-2 mr-6">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground">
          <Zap className="size-5" />
        </div>
        <span className="font-headline text-lg font-semibold">PROJECTIA</span>
      </Link>
      <nav className="hidden md:flex items-center gap-1">
        {menuItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            asChild
            className={cn(
                "text-muted-foreground pl-6",
                pathname === item.href && "text-foreground bg-white/50"
            )}
          >
            <Link href={item.href} className='px-4'>
              <item.icon className="mr-2 size-4 text-purple-600" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata.avatar_url} alt={user?.email || 'Usuario'} />
                        <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Mi Cuenta</p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || 'No has iniciado sesión'}
                    </p>
                </div>
                </DropdownMenuLabel>
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
