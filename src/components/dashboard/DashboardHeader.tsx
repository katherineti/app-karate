

'use client';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Home, Users, Building, BarChart2, Calendar, ClipboardList, Menu, LogOut, User as UserIcon, FileText, Gavel, Medal, Bell, Check, Info, XCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/contexts/UserContext";
import { useState, useMemo } from "react";
import KarateLogo from "@/app/components/KarateLogo";
import { useProgressBar } from "@/contexts/ProgressBarContext";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useEvents } from "@/contexts/EventContext";
import ParticipantRequestForm from "./ParticipantRequestForm";
import { Loader2 } from "lucide-react";
import { approveParticipantRequest, rejectParticipantRequest } from '@/services/participant-request-data';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";


const allMenuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'master', 'alumno', 'representante', 'juez'] },
    { href: '/dashboard/users', label: 'Usuarios', icon: Users, roles: ['admin', 'master'] },
    { href: '/dashboard/schools', label: 'Escuelas', icon: Building, roles: ['admin', 'master'] },
    { href: '/dashboard/events', label: 'Eventos', icon: ClipboardList, roles: ['admin', 'master', 'juez', 'representante', 'alumno'] },
    { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar, roles: ['admin', 'master', 'alumno', 'representante', 'juez'] },
    { href: '/dashboard/results', label: 'Resultados', icon: Medal, roles: ['admin', 'master', 'alumno', 'representante', 'juez'] },
    { href: '/dashboard/claims', label: 'Reclamos', icon: FileText, roles: ['admin', 'master', 'representante'] },
];

const requestStatusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const requestStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export default function DashboardHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasRole } = useUser();
  const { notifications, setNotifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { toast } = useToast();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { startProgress } = useProgressBar();
  const { events } = useEvents();
  const [isRequestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedNotificationForRequest, setSelectedNotificationForRequest] = useState<Notification | null>(null);

  const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [notificationToReject, setNotificationToReject] = useState<Notification | null>(null);


  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => hasRole(item.roles as any));
  }, [hasRole]);

  const selectedEventForRequest = useMemo(() => {
    if (!selectedNotificationForRequest?.href) return null;
    const eventId = selectedNotificationForRequest.href.split('/').pop();
    if (!eventId) return null;
    return events.find(e => e.id === eventId);
  }, [selectedNotificationForRequest, events]);

  const handleSignOut = async () => {
    // Simulate sign out
    router.push('/login');
  };
  
  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      startProgress();
    }
    router.push(href);
    setSheetOpen(false);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };
  
  const capitalizeWords = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getDisplayName = () => {
    if (!user) return 'Usuario';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (fullName) return capitalizeWords(fullName);
    return user.email || 'Usuario';
  };

  const displayName = getDisplayName();

  const handleRequestStatusUpdate = async (notification: Notification, newStatus: 'approved' | 'rejected', reason?: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token || !notification.participant_request_id) {
        toast({ title: 'Error', description: 'No estás autenticado o falta ID de solicitud.', variant: 'destructive' });
        return;
    }
    
    try {
        let response;
        if (newStatus === 'approved') {
            response = await approveParticipantRequest(notification.participant_request_id, token);
        } else {
            if (!reason) {
                toast({ title: 'Error', description: 'Se requiere una razón para rechazar la solicitud.', variant: 'destructive' });
                return;
            }
            response = await rejectParticipantRequest(notification.participant_request_id, reason, token);
        }

        toast({ title: 'Éxito', description: response.message });

        setNotifications(prev => prev.map(n => 
            n.id === notification.id 
                ? { ...n, participant_request_status: newStatus } 
                : n
        ));

    } catch (error) {
        toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
        if (newStatus === 'rejected') {
            setRejectDialogOpen(false);
            setRejectionReason("");
            setNotificationToReject(null);
        }
    }
  };


  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                  <Button size="icon" variant="outline" className="sm:hidden">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Abrir Menú</span>
                  </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b">
                      <SheetTitle asChild>
                          <Link href="/" className="flex items-center gap-2" onClick={() => setSheetOpen(false)}>
                              <KarateLogo />
                              <span className="text-2xl font-headline font-bold">SVRAM</span>
                          </Link>
                      </SheetTitle>
                  </SheetHeader>
                  <nav className="grid gap-2 text-lg font-medium p-4">
                      {menuItems.map(item => (
                          <button
                              key={item.label}
                              onClick={() => handleNavigation(item.href)}
                              className={`flex items-center gap-4 px-3 py-2 rounded-md transition-colors w-full text-left ${pathname === item.href ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                          >
                              <item.icon className="h-5 w-5" />
                              {item.label}
                          </button>
                      ))}
                  </nav>

                  <SheetFooter className="mt-auto border-t p-4">
                      <div className="w-full flex flex-col gap-2">
                          <button onClick={() => handleNavigation('/dashboard/profile')} className="w-full">
                              <div className="w-full flex items-center justify-start gap-3 h-auto p-2 rounded-md hover:bg-muted">
                                      <Avatar className="h-10 w-10">
                                      <AvatarImage src={user?.photoURL || undefined} alt={displayName} />
                                      <AvatarFallback>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
                                  </Avatar>
                                  <div className="text-left">
                                      <p className="font-semibold text-sm">{displayName}</p>
                                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                                  </div>
                              </div>
                          </button>
                          <Button variant="outline" onClick={handleSignOut} className="w-full">
                              <LogOut className="mr-2 h-4 w-4" />
                              Cerrar Sesión
                          </Button>
                      </div>
                  </SheetFooter>
              </SheetContent>
          </Sheet>
          <div className="hidden sm:block">
              {children}
          </div>
          <div className="flex-1" />

          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                      )}
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex justify-between items-center">
                      Notificaciones
                      {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length > 0 ? (
                      <>
                          {notifications.slice(0, 5).map(n => {
                            const status = n.participant_request_status;
                            const hasRequestId = !!n.participant_request_id;
                            const isMasterWithSchool = hasRole('master') && user?.schoolId;

                            const isApprovedByTitle = n.title.toLowerCase().includes('solicitud de participantes aprobada');
                            const isRejectedByTitle = n.title.toLowerCase().includes('solicitud de participantes rechazada');

                            const canRequest = isMasterWithSchool && !isApprovedByTitle && !isRejectedByTitle;
                            const canEnroll = isMasterWithSchool && isApprovedByTitle && n.event_id;
                            const canApproveOrReject = hasRole(['admin', 'master']) && hasRequestId && status === 'pending';
                            
                            return (
                                <DropdownMenuSub key={n.id}>
                                <DropdownMenuSubTrigger
                                    onClick={() => markAsRead(n.id)}
                                    className={cn("flex flex-col items-start gap-1 whitespace-normal h-auto py-2", !n.read && "bg-primary/5")}
                                >
                                    <div className="w-full flex justify-between items-center gap-2">
                                        <p className="font-semibold text-sm">{n.title}</p>
                                        {status && (
                                            <Badge variant={requestStatusVariantMap[status] || 'secondary'} className="capitalize whitespace-nowrap">
                                                {requestStatusLabels[status] || status}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{n.description}</p>
                                    <p className="text-xs text-muted-foreground/80 mt-1">{formatDistanceToNow(n.date, { addSuffix: true, locale: es })}</p>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onSelect={() => handleNavigation(n.href || '#')}>
                                        <Info className="mr-2 h-4 w-4" />
                                        Ver Detalles del Evento
                                    </DropdownMenuItem>
                                    
                                    {canRequest && (
                                        <>
                                            <DropdownMenuItem onSelect={() => {
                                                setSelectedNotificationForRequest(n);
                                                setRequestDialogOpen(true);
                                            }}>
                                                <Users className="mr-2 h-4 w-4" />
                                                Solicitud de Participante
                                            </DropdownMenuItem>
                                            {n.event_id && (
                                                <DropdownMenuItem onSelect={() => handleNavigation(`/dashboard/events/${n.event_id}/enroll`)}>
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                    Inscribir Atletas
                                                </DropdownMenuItem>
                                            )}
                                        </>
                                    )}

                                    {canEnroll && n.event_id && (
                                        <DropdownMenuItem onSelect={() => handleNavigation(`/dashboard/events/${n.event_id}/enroll`)}>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Inscribir Atletas
                                        </DropdownMenuItem>
                                    )}
                                    
                                    {canApproveOrReject && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => handleRequestStatusUpdate(n, 'approved')}>
                                            <Check className="mr-2 h-4 w-4 text-green-500" />
                                            Aprobar Solicitud
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                onSelect={() => {
                                                    setNotificationToReject(n);
                                                    setRejectDialogOpen(true);
                                                }} 
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Rechazar Solicitud
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            )
                          })}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={markAllAsRead}>
                              <Check className="mr-2 h-4 w-4" />
                              Marcar todas como leídas
                          </DropdownMenuItem>
                      </>
                  ) : (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No tienes notificaciones.
                      </div>
                  )}
              </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer rounded-lg p-2 hover:bg-muted/50 transition-colors">
                      <span className='text-sm font-medium hidden sm:inline-block'>{displayName}</span>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.photoURL || undefined} alt={displayName} />
                        <AvatarFallback>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
                      </Avatar>
                  </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigation('/dashboard/profile')} className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-500 focus:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
      </header>
      <Dialog open={isRequestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Solicitud de Participantes</DialogTitle>
                <DialogDescription>
                    Completa el formulario para solicitar cupos en el siguiente evento.
                </DialogDescription>
            </DialogHeader>
            {selectedEventForRequest ? (
                <div className="space-y-4 pt-4">
                    <div className="p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-semibold text-lg">{selectedEventForRequest.name}</h4>
                        <p className="text-sm text-muted-foreground">
                            {format(selectedEventForRequest.date, "EEEE, d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                         <p className="text-sm text-muted-foreground">
                            {selectedEventForRequest.location}
                        </p>
                    </div>
                    <ParticipantRequestForm event={selectedEventForRequest} onSuccess={() => setRequestDialogOpen(false)} />
                </div>
            ) : (
                <div className="h-40 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Solicitud de Participación</AlertDialogTitle>
            <AlertDialogDescription>
                Por favor, proporciona una razón para rechazar la solicitud. Esta razón será enviada al solicitante.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
            <Textarea 
                placeholder="Ej: Capacidad máxima del evento alcanzada."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
            />
            </div>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNotificationToReject(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
                onClick={() => {
                if (notificationToReject) {
                    handleRequestStatusUpdate(notificationToReject, 'rejected', rejectionReason);
                }
                }}
                disabled={!rejectionReason.trim()}
                className="bg-destructive hover:bg-destructive/90"
            >
                Confirmar Rechazo
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
