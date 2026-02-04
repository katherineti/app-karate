'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Eye,
  Info,
  MapPin,
  Calendar as CalendarIcon,
  Edit,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addYears,
  subYears,
  startOfDay,
  parseISO,
  isAfter,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { type KarateEvent } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    PopoverFooter,
  } from "@/components/ui/popover"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import YearView from './YearView';
import { useEvents } from '@/contexts/EventContext';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import EventEditForm from './EventEditForm';
import { useUser } from '@/contexts/UserContext';
import { getCalendarEvents, type CalendarEventsResponse, type CalendarEvent, getEventById } from '@/services/event-data';
import { useToast } from '@/hooks/use-toast';


const competitionColors = 'bg-blue-500 hover:bg-blue-600';
const seminarioColors = 'bg-primary hover:bg-primary/90';
const exhibicionColors = 'bg-emerald-500 hover:bg-emerald-600';
const examenColors = 'bg-purple-500 hover:bg-purple-600';


const typeVariantMap: Record<KarateEvent['type'], string> = {
    competencia: `text-white ${competitionColors}`,
    seminario: `text-primary-foreground ${seminarioColors}`,
    exhibicion: `text-white ${exhibicionColors}`,
    'examen-de-grado': `text-white ${examenColors}`,
};

const typeDotColorMap: Record<KarateEvent['type'], string> = {
    competencia: "bg-blue-500",
    seminario: "bg-primary",
    exhibicion: "bg-emerald-500",
    'examen-de-grado': "bg-purple-500",
};


const typeIconMap: Record<KarateEvent['type'], React.ElementType> = {
  competencia: Trophy,
  seminario: Info,
  exhibicion: Eye,
  'examen-de-grado': GraduationCap,
};

type ViewMode = 'mes' | 'año';

interface DisplayEvent {
    id: string;
    name: string;
    description: string;
    date: Date;
    location: string;
    type: KarateEvent['type'];
    status: string;
    isActive: boolean;
}

export default function CalendarView() {
  const { updateEvent } = useEvents();
  const { hasRole } = useUser();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('mes');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventsResponse>({});
  const [isLoading, setIsLoading] = useState(true);

  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<KarateEvent | null>(null);

  const canManageEvents = hasRole(['admin', 'master']);

  const fetchAndSetEvents = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({ variant: 'destructive', title: 'Error de autenticación' });
        setIsLoading(false);
        return;
    }

    const year = currentDate.getFullYear();
    const month = viewMode === 'mes' ? currentDate.getMonth() + 1 : undefined;

    try {
        const eventsData = await getCalendarEvents(token, year, month);
        setCalendarEvents(eventsData);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error al cargar eventos', description: (error as Error).message });
    } finally {
        setIsLoading(false);
    }
  }, [currentDate, viewMode, toast]);

  useEffect(() => {
    fetchAndSetEvents();
  }, [fetchAndSetEvents]);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(firstDayOfMonth, { locale: es }),
    end: endOfWeek(lastDayOfMonth, { locale: es }),
  });

  const getEventsForDay = (day: Date): DisplayEvent[] => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const apiEvents = calendarEvents[dateKey] || [];

    return apiEvents.map(event => {
        const eventDate = parseISO(`${event.date}T00:00:00`);
        // Defaulting type to 'competencia' as the API doesn't provide it.
        const typeId = event.type_id || 1; 
        const typeMap: Record<number, KarateEvent['type']> = {
            1: 'competencia', 3: 'seminario', 4: 'exhibicion', 2: 'examen-de-grado',
        };

        return {
            id: event.id.toString(),
            name: event.name,
            description: event.description,
            date: eventDate,
            location: event.location,
            type: typeMap[typeId] || 'competencia',
            status: event.status_name,
            isActive: isAfter(startOfDay(eventDate), startOfDay(new Date())),
        }
    });
  };

  const weekDaysShort = ["D", "L", "M", "X", "J", "V", "S"];
  const weekDaysLong = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const handlePrev = () => {
    if (viewMode === 'mes') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subYears(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'mes') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addYears(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  const handleEditClick = (event: DisplayEvent) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({ variant: 'destructive', title: 'Error de autenticación' });
        return;
    }
    
    getEventById(event.id, token)
        .then(fullEventDetails => {
            setSelectedEventForEdit(fullEventDetails);
            setEditDialogOpen(true);
        })
        .catch(error => {
            toast({
                variant: 'destructive',
                title: 'Error al Cargar Evento',
                description: `No se pudieron cargar los detalles del evento. ${error.message}`
            });
        });
  };
  
  const handleEditSuccess = (updatedEvent: KarateEvent) => {
    updateEvent(updatedEvent);
    fetchAndSetEvents();
    setEditDialogOpen(false);
  };
  
  const eventsForYearView = useMemo(() => {
    if (viewMode !== 'año') return [];
    
    return Object.values(calendarEvents).flat().map(event => {
        const eventDate = parseISO(`${event.date}T00:00:00`);
        const typeId = event.type_id || 1; 
        const typeMap: Record<number, KarateEvent['type']> = {
            1: 'competencia', 3: 'seminario', 4: 'exhibicion', 2: 'examen-de-grado',
        };
        return {
            id: event.id.toString(),
            name: event.name,
            description: event.description,
            date: eventDate,
            location: event.location,
            type: typeMap[typeId] || 'competencia',
            status: event.status_name,
            isActive: isAfter(startOfDay(eventDate), startOfDay(new Date())),
        }
    });
  }, [calendarEvents, viewMode]);

  const headerLabel = viewMode === 'mes' 
    ? format(currentDate, 'MMMM yyyy', { locale: es })
    : format(currentDate, 'yyyy', { locale: es });
    
  if (isLoading) {
    return (
        <div className="flex h-96 items-center justify-center bg-card rounded-lg border shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col bg-card rounded-lg border shadow-sm">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b px-4 py-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={goToToday} className="flex-grow sm:flex-grow-0">
                  Hoy
              </Button>
              <div className="flex items-center gap-1">
                  <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  aria-label={viewMode === 'mes' ? 'Mes anterior' : 'Año anterior'}
                  >
                  <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  aria-label={viewMode === 'mes' ? 'Siguiente mes' : 'Siguiente año'}
                  >
                  <ChevronRight className="h-5 w-5" />
                  </Button>
              </div>
              <h2 className="text-lg font-semibold capitalize text-center flex-grow sm:hidden">
                  {headerLabel}
              </h2>
          </div>
          <h2 className="text-lg font-semibold capitalize hidden sm:block">
            {headerLabel}
          </h2>
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Vista" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="mes">Mes</SelectItem>
                  <SelectItem value="año">Año</SelectItem>
              </SelectContent>
          </Select>
        </header>
        
        {viewMode === 'mes' ? (
          <TooltipProvider>
              <div className="grid flex-1 grid-cols-7 grid-rows-[auto,1fr]">
                  {weekDaysLong.map((day, index) => (
                  <div
                      key={day}
                      className="border-b border-r p-2 text-center text-sm font-medium text-muted-foreground"
                  >
                      <span className='hidden sm:inline'>{day}</span>
                      <span className='sm:hidden'>{weekDaysShort[index]}</span>
                  </div>
                  ))}
                  
                  <div className="col-span-7 grid grid-cols-7 grid-rows-6">
                      {daysInMonth.map(day => {
                      const eventsForDay = getEventsForDay(day);
                      return (
                          <div
                          key={day.toString()}
                          className={cn(
                              'relative flex flex-col border-b border-r p-1 transition-colors duration-200 min-h-[6rem]',
                              isSameMonth(day, currentDate)
                              ? 'hover:bg-accent/50'
                              : 'bg-muted/30 text-muted-foreground',
                          )}
                          >
                          <time
                              dateTime={format(day, 'yyyy-MM-dd')}
                              className={cn(
                                  'flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium mb-1',
                                  isToday(day) && 'bg-primary text-primary-foreground'
                              )}
                          >
                              {format(day, 'd')}
                          </time>
                          <div className="mt-1 flex-1 space-y-1 overflow-y-auto">
                              {eventsForDay.map(event => {
                                  const Icon = typeIconMap[event.type];
                                  const isPastEvent = !event.isActive;

                                  return (
                                  <Popover key={event.id}>
                                      <PopoverTrigger asChild>
                                          <div className="w-full">
                                              {/* Vista para pantallas grandes */}
                                              <Badge
                                                  className={cn(
                                                      "hidden w-full cursor-pointer items-center gap-1.5 p-1 text-xs hover:opacity-80 sm:flex",
                                                      typeVariantMap[event.type],
                                                      isPastEvent && "opacity-60 pointer-events-none"
                                                  )}
                                                  >
                                                  <Icon className="h-3 w-3 flex-shrink-0" />
                                                  <p className="truncate font-medium">{event.name}</p>
                                              </Badge>
                                              {/* Vista para pantallas pequeñas */}
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <div className={cn(
                                                        "sm:hidden w-full flex justify-center",
                                                        typeDotColorMap[event.type],
                                                        isPastEvent && "opacity-60"
                                                        )} style={{height: '0.5rem', borderRadius: '0.25rem', marginBlock: '0.25rem'}}>
                                                          <span className="sr-only">{event.name}</span>
                                                      </div>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                      <p>{event.name}</p>
                                                  </TooltipContent>
                                              </Tooltip>
                                          </div>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-80">
                                        <div className="grid gap-4">
                                            <div className="space-y-2">
                                                <h3 className="font-medium leading-none flex items-center gap-2">
                                                    <Icon className="h-5 w-5 text-primary" />
                                                    {event.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                {format(event.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                                                </p>
                                            </div>
                                            <Separator />
                                            <div className="space-y-4 text-sm">
                                                <div className="flex items-start gap-3">
                                                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                    <p className="text-muted-foreground">{event.description}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    <p className="text-muted-foreground">{event.location}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                    <p className="text-muted-foreground capitalize">{event.status}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {canManageEvents && (
                                            <PopoverFooter>
                                                <Button className="w-full mt-4" size="sm" onClick={() => handleEditClick(event)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Editar Evento
                                                </Button>
                                            </PopoverFooter>
                                        )}
                                      </PopoverContent>
                                  </Popover>
                                  );
                              })}
                              </div>
                          </div>
                      );
                      })}
                  </div>
              </div>
          </TooltipProvider>
        ) : (
          <YearView year={currentDate.getFullYear()} events={eventsForYearView} />
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Modifica la información del evento seleccionado.
            </DialogDescription>
          </DialogHeader>
          {selectedEventForEdit && (
            <EventEditForm
              event={selectedEventForEdit}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
