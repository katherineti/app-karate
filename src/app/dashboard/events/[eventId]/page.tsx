'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Loader2,
    Trophy,
    Info,
    MapPin,
    Calendar as CalendarIcon,
    Gavel,
    Star,
    Users,
    Settings,
    Eye,
    GraduationCap,
    PersonStanding,
    Swords,
    ChevronRight,
    Shield,
    PlusCircle,
    UserPlus,
} from 'lucide-react';
import { type KarateEvent, type EventCategory } from '@/lib/mock-data';
import { useEvents } from '@/contexts/EventContext';
import { useUser } from '@/contexts/UserContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProgressBar } from '@/contexts/ProgressBarContext';
import { getEventSummary, type ApiEventSummaryItem, getEventById } from '@/services/event-data';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { isEqual } from 'lodash';
import CategorySetupForm from '@/components/dashboard/CategorySetupForm';


const statusVariantMap: Record<KarateEvent['status'], "default" | "secondary" | "destructive" | "outline"> = {
  programado: "secondary",
  'en-curso': "default",
  finalizado: "outline",
  cancelado: "destructive",
};

const typeVariantMap: Record<KarateEvent['type'], string> = {
    competencia: "bg-primary text-primary-foreground",
    seminario: "bg-secondary text-secondary-foreground",
    exhibicion: "bg-accent text-accent-foreground",
    'examen-de-grado': 'bg-purple-500 text-white',
};

const typeIconMap: Record<KarateEvent['type'], React.ElementType> = {
    competencia: Trophy,
    seminario: Info,
    exhibicion: Eye,
    'examen-de-grado': GraduationCap,
};

const beltColors: Record<string, string> = {
    "Blanco": "bg-white text-black border border-gray-300",
    "Amarillo": "bg-yellow-400 text-black",
    "Naranja": "bg-orange-500 text-white",
    "Verde": "bg-green-600 text-white",
    "Azul": "bg-blue-600 text-white",
    "Púrpura": "bg-purple-600 text-white",
    "Marrón": "bg-amber-800 text-white",
    "Negro": "bg-black text-white",
};


export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  
  const { events, isLoading: isEventsLoading, updateEvent } = useEvents();
  const { user, hasRole, isLoading: isUserLoading } = useUser();
  const { startProgress } = useProgressBar();
  const { toast } = useToast();

  const [categoriesSummary, setCategoriesSummary] = useState<ApiEventSummaryItem[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  
  const selectedEvent = useMemo(() => {
    if (!eventId) return null;
    return events.find(e => e.id === eventId);
  }, [eventId, events]);
  
  const canManageEvent = hasRole(['admin', 'master']);
  const isJudgeOnly = hasRole('juez') && !canManageEvent;
  
  const fetchDetailsAndSummary = useCallback(async () => {
      if (!eventId) return;
      const token = localStorage.getItem('accessToken');
      if (token) {
        setIsSummaryLoading(true);
        try {
          const [summaryData, detailedEvent] = await Promise.all([
             getEventSummary(eventId, token),
             getEventById(eventId, token),
          ]);
          
          setCategoriesSummary(summaryData);

          const eventToUpdate = { ...detailedEvent };

          const newCategories: EventCategory[] = summaryData.map(summaryItem => {
              const ageParts = summaryItem.age_range.replace(' años', '').split('-').map(s => parseInt(s.trim()));
              return {
                  id: summaryItem.category_id.toString(),
                  name: summaryItem.category_name,
                  minAge: ageParts[0] || 0,
                  maxAge: ageParts[1] || 99,
                  belts: summaryItem.allowed_belts.map(b => b.name),
                  enabled: summaryItem.category_is_active !== false,
                  progressionSystem: eventToUpdate.categories?.find(c => c.id === summaryItem.category_id.toString())?.progressionSystem || 'sum',
                  kataCount: summaryItem.kata_count,
                  combateCount: summaryItem.combate_count,
              };
          });

          if (!isEqual(eventToUpdate.categories, newCategories)) {
              eventToUpdate.categories = newCategories;
          }
          
          // Only update context if the data is different to prevent loops
          const eventInContext = events.find(e => e.id === eventId);
          if (!isEqual(eventInContext, eventToUpdate)) {
              updateEvent(eventToUpdate);
          }

        } catch (error) {
          console.error("Failed to fetch event data:", error);
          toast({
            variant: "destructive",
            title: "Error al cargar datos",
            description: "No se pudo obtener la información del evento.",
          });
        } finally {
          setIsSummaryLoading(false);
        }
      }
  }, [eventId, events, toast, updateEvent]);
  
  useEffect(() => {
    if ((isJudgeOnly || canManageEvent) && eventId) {
      fetchDetailsAndSummary();
    }
  }, [isJudgeOnly, canManageEvent, eventId, fetchDetailsAndSummary]);

  const handleCategoryClick = (categoryId: string) => {
    startProgress();
    router.push(`/dashboard/events/${eventId}/scoring-divisions?category=${categoryId}`);
  };

  const handleSaveCategorySuccess = () => {
    setIsAddCategoryOpen(false);
    fetchDetailsAndSummary();
  };
  
  const canEnroll = hasRole('master') && selectedEvent?.status === 'programado';

  if (isUserLoading || isEventsLoading || !user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedEvent) {
    return (
       <div className="flex h-96 items-center justify-center">
        <p>Evento no encontrado.</p>
      </div>
    );
  }

  const Icon = typeIconMap[selectedEvent.type] || Info;

  return (
    <div className="grid gap-8 animate-in fade-in-50">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/events')}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Detalles del Evento
            </h1>
            <p className="text-muted-foreground">
                Revisa la información y configura el evento.
            </p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="p-6 flex flex-row items-start justify-between">
            <div>
                <CardTitle className="text-2xl font-bold">{selectedEvent.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {format(selectedEvent.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
            </div>
            <div className={cn("p-3 rounded-lg text-primary-foreground", typeVariantMap[selectedEvent.type] || "bg-secondary")}>
                <Icon className="h-6 w-6" />
            </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 text-sm space-y-6">
            <div className="space-y-2">
                <h4 className="font-semibold text-muted-foreground">Descripción</h4>
                <p>{selectedEvent.description}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                    <Trophy className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                        <h4 className="font-semibold">Tipo</h4>
                        <p className="text-foreground capitalize">{selectedEvent.type}</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3">
                    <Gavel className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                        <h4 className="font-semibold">Subtipo</h4>
                        <p className="text-foreground capitalize">{selectedEvent.subtype}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                        <h4 className="font-semibold">Estado</h4>
                        <Badge variant={statusVariantMap[selectedEvent.status]}>{selectedEvent.status}</Badge>
                    </div>
                </div>
                {selectedEvent.maxScore != null && (
                    <div className="flex items-start gap-3">
                        <Star className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                            <h4 className="font-semibold">Puntaje Máximo de Evaluación</h4>
                            <p className="font-mono text-foreground">{selectedEvent.maxScore}</p>
                        </div>
                    </div>
                )}
                 {selectedEvent.maxParticipants !== undefined && (
                    <div className="flex items-start gap-3">
                        <Users className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                            <h4 className="font-semibold">Máx. Participantes</h4>
                            <p className="font-mono text-foreground">{selectedEvent.maxParticipants}</p>
                        </div>
                    </div>
                )}
                 <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                        <h4 className="font-semibold">Lugar</h4>
                        <p className="text-foreground">{selectedEvent.location}</p>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
      
      {selectedEvent.type === 'competencia' && canManageEvent && (
        <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary"/>Configuración del Torneo</CardTitle>
                            <CardDescription>Categorías y divisiones habilitadas para este evento.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                           {canEnroll && (
                            <Button asChild variant="outline">
                                <Link href={`/dashboard/events/${eventId}/enroll`}>
                                    <UserPlus className="mr-2 h-4 w-4"/>Inscribir Atletas
                                </Link>
                            </Button>
                           )}
                           <DialogTrigger asChild>
                                <Button><PlusCircle className="mr-2 h-4 w-4"/>Nueva Categoría</Button>
                           </DialogTrigger>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isSummaryLoading ? (
                      <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : categoriesSummary.length > 0 ? (
                      <div className="space-y-6">
                        {categoriesSummary.map((cat, index) => (
                          <div key={cat.category_id} className={cn(cat.category_is_active === false && "opacity-50")}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-lg">{cat.category_name} <span className="text-muted-foreground font-normal">({cat.age_range})</span></h4>
                                    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                        <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" />Cinturones:</span>
                                        {cat.allowed_belts.length > 0 ? (
                                            cat.allowed_belts.map(belt => (
                                                <Badge key={belt.id} className={cn("text-xs", beltColors[belt.name])}>{belt.name}</Badge>
                                            ))
                                        ) : (
                                            <span className="font-medium text-foreground">N/A</span>
                                        )}
                                    </div>
                                </div>
                                <Button asChild variant="outline" size="sm" disabled={cat.category_is_active === false}>
                                    <Link href={`/dashboard/events/${eventId}/scoring-divisions?category=${cat.category_id}`}>
                                        Gestionar <ChevronRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <PersonStanding className="h-5 w-5 text-muted-foreground" />
                                        <p className="font-medium">Modalidades de Kata</p>
                                    </div>
                                    <Badge variant={cat.kata_count > 0 ? "default" : "secondary"}>{cat.kata_count} Activas</Badge>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Swords className="h-5 w-5 text-muted-foreground" />
                                        <p className="font-medium">Modalidades de Combate</p>
                                    </div>
                                    <Badge variant={cat.combate_count > 0 ? "default" : "secondary"}>{cat.combate_count} Activas</Badge>
                                </div>
                            </div>
                            {index < categoriesSummary.length - 1 && <Separator className="my-6" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>No hay categorías configuradas para este evento.</p>
                            <Button asChild variant="secondary" className="mt-4" onClick={() => setIsAddCategoryOpen(true)}>
                                <span><PlusCircle className="mr-2 h-4 w-4" />Crear Categorías</span>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Agregar Categoría al Evento</DialogTitle>
                    <DialogDescription>
                        Selecciona una categoría predefinida para agregarla a este evento.
                    </DialogDescription>
                </DialogHeader>
                <CategorySetupForm eventId={eventId} onSave={handleSaveCategorySuccess} />
            </DialogContent>
        </Dialog>
      )}

      {isJudgeOnly && (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary"/>Categorías Asignadas</CardTitle>
                <CardDescription>Selecciona una categoría para comenzar a puntuar.</CardDescription>
            </CardHeader>
            <CardContent>
                {isSummaryLoading ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : categoriesSummary.length > 0 ? (
                    <div className="space-y-4">
                    {categoriesSummary.map(cat => (
                      <div key={cat.category_id} className={cn(cat.category_is_active === false && "opacity-50 pointer-events-none")}>
                        <div className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex-1">
                                <h4 className="font-semibold text-lg">{cat.category_name}</h4>
                                <p className="text-sm text-muted-foreground">{cat.age_range}</p>
                                <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                                    <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" />Cinturones:</span>
                                    {cat.allowed_belts.length > 0 ? (
                                        cat.allowed_belts.map(belt => (
                                            <Badge key={belt.id} className={cn("text-xs", beltColors[belt.name])}>{belt.name}</Badge>
                                        ))
                                    ) : (
                                        <span className="font-medium text-foreground">N/A</span>
                                    )}
                                </div>
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div className="flex items-center gap-2 text-muted-foreground"><PersonStanding className="h-4 w-4"/><span>{cat.kata_count} Modalidades de Kata</span></div>
                                  <div className="flex items-center gap-2 text-muted-foreground"><Swords className="h-4 w-4"/><span>{cat.combate_count} Modalidades de Combate</span></div>
                                </div>
                            </div>
                             <div className="flex items-center gap-2 text-primary font-semibold">
                                <Button size="sm" onClick={() => cat.category_is_active !== false && handleCategoryClick(cat.category_id.toString())} disabled={cat.category_is_active === false}>
                                    Puntuar
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay categorías activas asignadas a este evento.
                  </p>
                )}
            </CardContent>
        </Card>
      )}
    </div>
  )
}
