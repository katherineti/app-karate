'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, User, BarChart2, Users, Building, LogOut, Calendar, ClipboardList, FileText, Gavel, Medal, Settings, BookCopy, Shield, ShieldQuestion, BookOpen, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import KarateLogo from '@/app/components/KarateLogo';
import { useProgressBar } from '@/contexts/ProgressBarContext';
import { useMemo, Fragment } from 'react';

const allMenuItems: any[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'master', 'alumno', 'representante', 'juez'] },
  { href: '/dashboard/users', label: 'Usuarios', icon: Users, roles: ['admin', 'master'] },
  { href: '/dashboard/schools', label: 'Escuelas', icon: Building, roles: ['admin', 'master'] },
  { href: '/dashboard/events', label: 'Eventos', icon: ClipboardList, roles: ['admin', 'master', 'juez', 'representante', 'alumno'] },
  { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar, roles: ['admin', 'master', 'alumno', 'representante', 'juez'] },
  { href: '/dashboard/results', label: 'Resultados', icon: Medal, roles: ['admin', 'master', 'alumno', 'representante', 'juez'] },
  { href: '/dashboard/claims', label: 'Reclamos', icon: FileText, roles: ['admin', 'master', 'representante'] },
  { 
    href: '/dashboard/masters', 
    label: 'Maestros', 
    icon: BookCopy, 
    roles: ['admin', 'master'],
    subItems: [
        { href: '/dashboard/masters?tab=belts', label: 'Cinturones', icon: Shield },
        { href: '/dashboard/masters?tab=categories', label: 'Categorías', icon: ShieldQuestion },
        { href: '/dashboard/masters?tab=modalities', label: 'Modalidades', icon: Swords },
    ]
  },
];

const roleLabels: { [key: string]: string } = {
  admin: "Administrador",
  master: "Master",
  alumno: "Alumno",
  representante: "Representante",
  juez: "Juez",
};


export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, hasRole } = useUser();
  const { startProgress } = useProgressBar();
  
  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => hasRole(item.roles as any));
  }, [hasRole]);

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const currentUrl = pathname + '?' + searchParams.toString();
    const targetUrl = href;

    if (currentUrl.split('?')[0] !== targetUrl.split('?')[0] || currentUrl.split('?')[1] !== targetUrl.split('?')[1]) {
        startProgress();
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };
  
  const capitalizeWords = (str?: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <aside className={cn(
        "fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-sidebar sm:flex transition-all duration-300",
        isOpen ? "w-64" : "w-14"
      )}>
        <TooltipProvider>
            <nav className="flex flex-col items-center gap-4 px-2 py-4">
                <Link
                    href="/dashboard"
                    onClick={(e) => handleNavigation(e, '/dashboard')}
                    className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                >
                    <KarateLogo className="h-5 w-5 text-primary-foreground transition-all group-hover:scale-110" />
                    <span className="sr-only">SVRAM</span>
                </Link>
                {menuItems.map((item) => (
                <Fragment key={item.label}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                href={item.href}
                                onClick={(e) => handleNavigation(e, item.href)}
                                className={cn(
                                    'flex h-9 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-muted hover:text-sidebar-foreground md:h-8',
                                    (item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)) && 'bg-sidebar-accent text-sidebar-accent-foreground',
                                    isOpen ? 'w-full justify-start px-2' : 'w-9 md:w-8'
                                )}
                            >
                                <item.icon className={cn("h-5 w-5", isOpen && "mr-3")} />
                                <span className={cn("sr-only text-sm font-medium", isOpen && "not-sr-only")}>{item.label}</span>
                            </Link>
                        </TooltipTrigger>
                        {!isOpen && <TooltipContent side="right">{item.label}</TooltipContent>}
                    </Tooltip>
                    {isOpen && item.subItems && pathname.startsWith(item.href) && (
                        <div className="pl-8 -my-2 flex flex-col gap-1 w-full animate-in fade-in-50 duration-300">
                            {item.subItems.map((subItem: any) => {
                            const tabValue = new URLSearchParams(subItem.href.split('?')[1]).get('tab');
                            const currentTab = searchParams.get('tab');
                            const isActive = currentTab === tabValue || (!currentTab && tabValue === 'belts');
                            
                            return (
                                <Link
                                key={subItem.label}
                                href={subItem.href}
                                onClick={(e) => handleNavigation(e, subItem.href)}
                                className={cn(
                                    'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground',
                                    isActive && 'bg-sidebar-accent/70 text-sidebar-accent-foreground',
                                )}
                                >
                                <subItem.icon className="h-4 w-4" />
                                {subItem.label}
                                </Link>
                            )
                            })}
                        </div>
                    )}
                </Fragment>
            ))}
            </nav>
            <nav className="mt-auto flex flex-col items-center gap-2 px-2 py-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href="/dashboard/profile"
                            onClick={(e) => handleNavigation(e, '/dashboard/profile')}
                            className={cn(
                                "flex h-auto items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-muted",
                                isOpen ? 'w-full flex-col gap-2 p-2' : 'w-9 md:w-8 h-9 md:h-8'
                            )}
                        >
                            <Avatar className={cn("h-8 w-8")}>
                                <AvatarImage src={user?.photoURL || undefined} />
                                <AvatarFallback>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
                            </Avatar>
                             <div className={cn("sr-only text-center", isOpen && "not-sr-only")}>
                                <p className='font-semibold text-sm text-sidebar-foreground'>{capitalizeWords(`${user?.firstName} ${user?.lastName}`)}</p>
                                {user?.roles && <p className='text-xs text-sidebar-muted-foreground'>{user.roles.map(r => roleLabels[r]).join(', ')}</p>}
                             </div>
                        </Link>
                    </TooltipTrigger>
                    {!isOpen && <TooltipContent side="right">Perfil</TooltipContent>}
                </Tooltip>
            </nav>
        </TooltipProvider>
    </aside>
  );
}
