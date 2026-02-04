

'use client';

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, Eye, Trash, Search, Edit, Building, Download, Loader2, User as UserIcon, X, UserX, UserCheck, Mail, Fingerprint, Calendar as CalendarIcon, Shield, School as SchoolIcon, Users as UsersIcon, ArrowLeft, ChevronRight, PowerOff, Power, Settings, Trophy, Info, GraduationCap, Star, Users, PersonStanding, Filter, MapPin, Gavel } from "lucide-react";
import EventForm from "./EventForm";
import EventEditForm from "./EventEditForm";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { useUser } from "@/contexts/UserContext";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "../ui/alert";
import { debounce } from "lodash";
import { getPaginatedEvents, ApiEvent, mapApiEventToKarateEvent, deleteEvent as apiDeleteEvent, getEventById, updateEvent as apiUpdateEvent, PaginatedEventsResponse, updateEventStatus } from "@/services/event-data";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { DatePicker } from "../ui/date-picker";
import { format, startOfDay, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { KarateEvent } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";


const ITEMS_PER_PAGE = 8;

const statusVariantMap: Record<KarateEvent['status'], "default" | "secondary" | "destructive" | "outline"> = {
  programado: "secondary",
  'en-curso': "default",
  finalizado: "outline",
  cancelado: "destructive",
};

const statusLabels: Record<KarateEvent['status'], string> = {
  programado: "Programado",
  'en-curso': "En Curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const typeVariantMap: Record<KarateEvent['type'], string> = {
    competencia: "bg-primary text-primary-foreground",
    seminario: "bg-secondary text-secondary-foreground",
    exhibicion: "bg-accent text-accent-foreground",
    'examen-de-grado': 'bg-purple-500 text-white',
};

const typeLabels: Record<KarateEvent['type'], string> = {
    competencia: "Competencia",
    seminario: "Seminario",
    exhibicion: "Exhibición",
    'examen-de-grado': 'Examen de Grado',
};

const eventTypesForFilter = [
    { id: 1, label: 'Competencia' },
    { id: 2, label: 'Examen de Grado' },
    { id: 3, label: 'Seminario' },
    { id: 4, label: 'Exhibición' },
];


const typeIconMap: Record<KarateEvent['type'], React.ElementType> = {
    competencia: Trophy,
    seminario: Info,
    exhibicion: Eye,
    'examen-de-grado': GraduationCap,
};

const modalityTypes = {
  forma: ['forma-tradicional', 'forma-con-armas', 'formas-extremas', 'kickboxing-musical-forms'],
  combate: ['combate-point-fighting', 'kickboxing-light-contact', 'kickboxing-full-contact']
};

export default function EventTable() {
  const { hasRole } = useUser();
  const { toast } = useToast();
  
  const [eventsData, setEventsData] = useState<KarateEvent[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedEventsResponse, 'data'>>({
      totalRecords: 0,
      currentPage: 1,
      totalPages: 1,
      pageSize: ITEMS_PER_PAGE,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setViewDialogOpen] = useState(false);
  const [isToggleStateDialogOpen, setToggleStateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<KarateEvent | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>();
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>();

  const canManageEvents = hasRole(['admin', 'master']);
  const isJudgeOnly = hasRole('juez') && !canManageEvents;
  
  const fetchEvents = useCallback(async (page: number, limit: number) => {
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: "No se encontró token. Por favor, inicia sesión de nuevo.",
        });
        setIsLoading(false);
        return;
    }
    try {
        const filters = {
            search: searchTerm,
            typeFilter: typeFilter !== 'all' ? typeFilter : undefined,
            statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
            startDateFilter: dateRangeStart ? format(dateRangeStart, 'yyyy-MM-dd') : undefined,
            endDateFilter: dateRangeEnd ? format(dateRangeEnd, 'yyyy-MM-dd') : undefined,
        };
        const response = await getPaginatedEvents(token, page, limit, filters);
        setEventsData(response.data.map(mapApiEventToKarateEvent));
        setPagination({
            totalRecords: response.totalRecords,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al cargar los eventos.";
        toast({
            variant: "destructive",
            title: "Error al Cargar Eventos",
            description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast, searchTerm, typeFilter, statusFilter, dateRangeStart, dateRangeEnd]);
  
  const debouncedFetch = useCallback(debounce(() => {
    fetchEvents(1, ITEMS_PER_PAGE);
  }, 500), [fetchEvents]);


  useEffect(() => {
    debouncedFetch();
    return debouncedFetch.cancel;
  }, [searchTerm, typeFilter, statusFilter, dateRangeStart, dateRangeEnd, debouncedFetch]);

  
  const handleEditSuccess = (updatedEvent: KarateEvent) => {
    fetchEvents(pagination.currentPage, pagination.pageSize);
    setEditDialogOpen(false);
  };
  
  const handleAddSuccess = () => {
    fetchEvents(1, ITEMS_PER_PAGE);
    setAddDialogOpen(false);
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= pagination.totalPages) {
        fetchEvents(page, pagination.pageSize);
    }
  };
  
  const handleViewClick = async (event: KarateEvent) => {
    setViewDialogOpen(true);
    setIsViewLoading(true);
    setSelectedEvent(null);
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            const detailedEvent = await getEventById(event.id, token);
            setSelectedEvent(detailedEvent);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al cargar",
                description: "No se pudieron obtener los detalles completos del evento.",
            });
            setSelectedEvent(event);
        } finally {
            setIsViewLoading(false);
        }
    } else {
        toast({ variant: "destructive", title: "Error de autenticación" });
        setSelectedEvent(event);
        setIsViewLoading(false);
    }
  };

  const handleEditClick = async (event: KarateEvent) => {
    setIsEditLoading(true);
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            const detailedEvent = await getEventById(event.id, token);
            setSelectedEvent(detailedEvent);
            setEditDialogOpen(true);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los datos para editar.",
            });
        } finally {
            setIsEditLoading(false);
        }
    } else {
        toast({ variant: "destructive", title: "No autenticado" });
        setIsEditLoading(false);
    }
  };

  const handleToggleStatusClick = (event: KarateEvent) => {
    setSelectedEvent(event);
    setToggleStateDialogOpen(true);
  }

  const confirmToggleStatus = async () => {
    if (!selectedEvent) return;
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({ variant: "destructive", title: "Error de Autenticación" });
        setToggleStateDialogOpen(false);
        return;
    }

    const isDisabling = selectedEvent.status !== 'cancelado';
    const newStatusId = isDisabling ? 7 : 4; 

    try {
        await updateEventStatus(selectedEvent.id, newStatusId, token);
        toast({
            title: `Evento ${isDisabling ? 'Cancelado' : 'Habilitado'}`,
            description: `El evento "${selectedEvent.name}" ha sido actualizado.`,
        });
        fetchEvents(pagination.currentPage, pagination.pageSize);
    } catch (error) {
         const errorMessage = error instanceof Error ? error.message : "Error desconocido al cambiar el estado.";
        toast({
            variant: "destructive",
            title: "Error al Actualizar",
            description: errorMessage,
        });
    } finally {
        setToggleStateDialogOpen(false);
    }
  };
  
  const getCompetitionConfig = (event: KarateEvent) => {
    if (event.type !== 'competencia') return null;
    const enabledCategories = event.categories?.filter(c => c.enabled).length || 0;
    let formaCount = 0;
    let combateCount = 0;

    if (event.divisions) {
        Object.keys(event.divisions).forEach(key => {
            const division = event.divisions![key];
            if (division.enabled) {
                const modalityId = key.split('-').slice(2).join('-');
                if (modalityTypes.forma.includes(modalityId)) formaCount++;
                else if (modalityTypes.combate.includes(modalityId)) combateCount++;
            }
        });
    }
    return { enabledCategories, formaCount, combateCount };
  };
  
  const renderTableRow = (event: KarateEvent) => (
    <TableRow key={event.id} className={cn(event.status === 'cancelado' && 'opacity-60')}>
      <TableCell>
        <div className="font-medium">{event.name}</div>
        <p className="text-muted-foreground text-sm lg:hidden">{typeLabels[event.type] || event.type}</p>
      </TableCell>
      <TableCell className="hidden sm:table-cell">{format(event.date, "d MMM, yyyy", { locale: es })}</TableCell>
      <TableCell className="hidden lg:table-cell"><Badge variant={typeVariantMap[event.type] as any}>{typeLabels[event.type]}</Badge></TableCell>
      <TableCell className="hidden md:table-cell"><Badge variant={statusVariantMap[event.status]}>{statusLabels[event.status]}</Badge></TableCell>
      <TableCell className="text-right">
        {isJudgeOnly ? (
          event.type === "competencia" ? (
            <Button asChild size="sm"><Link href={`/dashboard/events/${event.id}`}>{event.isActive ? "Puntuar" : "Ver"}</Link></Button>
          ) : (
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleViewClick(event)}><Eye className="mr-2 h-4 w-4" /> Ver</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          )
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewClick(event)}><Eye className="mr-2 h-4 w-4" />Ver</DropdownMenuItem>
              {canManageEvents && (<DropdownMenuItem onClick={() => handleEditClick(event)} disabled={event.status === 'finalizado'}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>)}
              {hasRole(["admin", "master"]) && event.type === "competencia" && (<DropdownMenuItem asChild disabled={event.status === 'cancelado'}><Link href={`/dashboard/events/${event.id}`}><Settings className="mr-2 h-4 w-4" />Configurar Torneo</Link></DropdownMenuItem>)}
              {canManageEvents && event.status !== 'finalizado' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className={cn(event.status === 'cancelado' ? "text-green-600 focus:text-green-600" : "text-red-600 focus:text-red-600", "focus:bg-accent")}
                    onClick={() => handleToggleStatusClick(event)}
                  >
                    {event.status === 'cancelado' ? <Power className="mr-2 h-4 w-4" /> : <PowerOff className="mr-2 h-4 w-4" />}
                    {event.status === 'cancelado' ? 'Habilitar' : 'Inhabilitar'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <>
       <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Filtros de Búsqueda</CardTitle>
              {canManageEvents && (
              <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isLoading}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Agregar Evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Evento</DialogTitle>
                    <DialogDescription>Completa el formulario para registrar un nuevo evento o competencia.</DialogDescription>
                  </DialogHeader>
                  <EventForm onSuccess={handleAddSuccess} />
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">Búsqueda</label>
                          <div className="relative"><Input type="search" placeholder="Buscar por nombre o lugar..." className="pr-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoading} /><Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /></div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium">Tipo de Evento</label>
                          <Select value={typeFilter} onValueChange={setTypeFilter} disabled={isLoading}>
                            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Tipos</SelectItem>
                                {eventTypesForFilter.map(type => (
                                    <SelectItem key={type.id} value={type.id.toString()}>{type.label}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                      </div>
                       <div className="space-y-2">
                          <label className="text-sm font-medium">Estado del Evento</label>
                          <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isLoading}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los Estados</SelectItem><SelectItem value="4">Programado</SelectItem><SelectItem value="5">En Curso</SelectItem><SelectItem value="6">Finalizado</SelectItem><SelectItem value="7">Cancelado</SelectItem></SelectContent></Select>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><label className="text-sm font-medium">Fecha de Inicio</label><DatePicker mode="single" selected={dateRangeStart} onSelect={setDateRangeStart} /></div>
                      <div className="space-y-2"><label className="text-sm font-medium">Fecha de Fin</label><DatePicker mode="single" selected={dateRangeEnd} onSelect={setDateRangeEnd}  disabled={!dateRangeStart}/></div>
                  </div>
              </div>
               {(dateRangeStart) && (
                <Alert className="mt-4">
                  <Filter className="h-4 w-4" />
                  <AlertDescription>
                    {dateRangeStart && !dateRangeEnd ? `Mostrando eventos para el ${format(dateRangeStart, "d 'de' MMMM, yyyy", { locale: es })}.` : `Mostrando eventos entre ${format(dateRangeStart!, "d 'de' MMMM, yyyy", { locale: es })} y ${format(dateRangeEnd!, "d 'de' MMMM, yyyy", { locale: es })}.`}
                    <Button variant="link" className="p-0 h-auto ml-2" onClick={() => { setDateRangeStart(undefined); setDateRangeEnd(undefined); }}>Limpiar</Button>
                  </AlertDescription>
                </Alert>
              )}
          </CardContent>
      </Card>
      
      <div className="border rounded-lg w-full bg-card text-card-foreground shadow-sm">
        {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground">Cargando eventos...</p></div>
        ): (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre del Evento</TableHead><TableHead className="hidden sm:table-cell">Fecha</TableHead><TableHead className="hidden lg:table-cell">Tipo</TableHead><TableHead className="hidden md:table-cell">Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>{eventsData.length > 0 ? eventsData.map(renderTableRow) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No se encontraron eventos.</TableCell></TableRow>}</TableBody>
            </Table>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">{pagination.totalRecords > 0 ? <>Mostrando <strong>{((pagination.currentPage - 1) * pagination.pageSize) + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords)}</strong> de <strong>{pagination.totalRecords}</strong> eventos</> : 'No hay eventos que mostrar'}</div>
                  <div className="flex items-center gap-2"><Button variant="outline" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1}>Anterior</Button><span className="text-sm text-muted-foreground">Página {pagination.currentPage} de {pagination.totalPages}</span><Button variant="outline" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages}>Siguiente</Button></div>
              </div>
            )}
          </>
        )}
      </div>

       <Dialog open={isViewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {isViewLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando detalles del evento...</p>
            </div>
          ) : selectedEvent && (
             <Card className="border-0 shadow-none">
                <CardHeader className="p-6"><div className="flex items-start justify-between gap-4"><div className="flex-1 space-y-1"><DialogTitle className="text-2xl font-bold">{selectedEvent.name}</DialogTitle><p className="text-sm text-muted-foreground">{format(selectedEvent.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p></div><div className={cn("p-3 rounded-lg text-primary-foreground", typeVariantMap[selectedEvent.type] || "bg-secondary")}>{React.createElement(typeIconMap[selectedEvent.type] || Info, { className: "h-6 w-6" })}</div></div></CardHeader>
                <CardContent className="px-6 pb-6 text-sm space-y-6"><div><h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2"><Info className="h-4 w-4"/>Descripción</h4><p className="text-foreground text-base">{selectedEvent.description}</p></div><Separator/><div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6"><div className="flex items-start gap-3"><Trophy className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><h4 className="font-semibold">Tipo</h4><Badge variant={typeVariantMap[selectedEvent.type] as any} className="capitalize mt-1">{typeLabels[selectedEvent.type] || selectedEvent.type}</Badge></div></div><div className="flex items-start gap-3"><Gavel className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><h4 className="font-semibold">Subtipo</h4><p className="text-foreground">{selectedEvent.subtype || 'No Asignado'}</p></div></div><div className="flex items-start gap-3"><CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><h4 className="font-semibold">Estado</h4><Badge variant={statusVariantMap[selectedEvent.status]} className="mt-1">{statusLabels[selectedEvent.status]}</Badge></div></div>{selectedEvent.maxScore != null && (<div className="flex items-start gap-3"><Star className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><h4 className="font-semibold">Puntaje Máximo</h4><p className="text-foreground font-mono">{selectedEvent.maxScore}</p></div></div>)}
                    <div className="flex items-start gap-3">
                        <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Máx. Participantes</h4>
                            <p className="text-foreground font-mono">
                                {(selectedEvent.maxParticipants && selectedEvent.maxParticipants > 0)
                                ? selectedEvent.maxParticipants
                                : 'Ilimitado'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 sm:col-span-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><h4 className="font-semibold">Lugar</h4><p className="text-foreground">{selectedEvent.location}</p></div></div></div>
                    {/*getCompetitionConfig(selectedEvent) && (<><Separator /><div className="space-y-4"><h4 className="font-semibold flex items-center gap-2"><Settings className="h-4 w-4"/>Configuración del Torneo</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center"><div className="p-3 bg-muted/50 rounded-lg"><Users className="h-6 w-6 mx-auto text-primary mb-1"/><p className="font-bold text-lg">{getCompetitionConfig(selectedEvent)?.enabledCategories}</p><p className="text-xs text-muted-foreground">Categorías</p></div><div className="p-3 bg-muted/50 rounded-lg"><PersonStanding className="h-6 w-6 mx-auto text-primary mb-1"/><p className="font-bold text-lg">{getCompetitionConfig(selectedEvent)?.formaCount}</p><p className="text-xs text-muted-foreground">Katas</p></div><div className="p-3 bg-muted/50 rounded-lg"><Gavel className="h-6 w-6 mx-auto text-primary mb-1"/><p className="font-bold text-lg">{getCompetitionConfig(selectedEvent)?.combateCount}</p><p className="text-xs text-muted-foreground">Combates</p></div></div></div></>)*/}
                </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Editar Evento</DialogTitle>
                <DialogDescription>
                Modifica la información del evento seleccionado.
                </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
                <EventEditForm
                    key={selectedEvent.id}
                    event={selectedEvent}
                    onSuccess={handleEditSuccess}
                />
            )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isToggleStateDialogOpen} onOpenChange={setToggleStateDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro de {selectedEvent?.status === 'cancelado' ? 'habilitar' : 'inhabilitar'} este evento?</AlertDialogTitle>
              <AlertDialogDescription>
                    Esta acción {selectedEvent?.status === 'cancelado' ? 'habilitará' : 'inhabilitará'} el evento <span className="font-medium">"{selectedEvent?.name}"</span>. 
                    {selectedEvent?.status === 'cancelado' ? ' Volverá a estar "Programado".' : ' Su estado cambiará a "Cancelado".'}
                    Podrás revertir esta acción más tarde.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmToggleStatus}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
