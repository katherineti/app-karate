'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useEvents } from '@/contexts/EventContext';
import { useUser, UserRole } from '@/contexts/UserContext';
import { getEventById, getEventSummary, ApiEventSummaryItem, getModalitiesForDivision, ApiDivisionModality } from '@/services/event-data';
import { getSchoolAlumnos, UserData as ApiUser, getUserDetail } from '@/services/user-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Calendar as CalendarIcon, MapPin, Trophy, Info, Eye, GraduationCap, Star, Users, Gavel, Building, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { KarateEvent, EventCategory } from '@/lib/mock-data';
import EnrollmentForm from '@/components/dashboard/EnrollmentForm';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';


type Student = {
  id: string;
  name: string | null;
  lastname: string | null;
  email: string;
};

const typeIconMap: Record<KarateEvent['type'], React.ElementType> = {
    competencia: Trophy,
    seminario: Info,
    exhibicion: Eye,
    'examen-de-grado': GraduationCap,
};

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

export default function EventEnrollmentPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const { toast } = useToast();

  const { events, isLoading: isEventsLoading } = useEvents();
  const { user, setUser, hasRole, isLoading: isUserLoading } = useUser();
  
  const [event, setEvent] = useState<KarateEvent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [divisionModalities, setDivisionModalities] = useState<ApiDivisionModality[]>([]);
  const [isLoadingDivisionModalities, setIsLoadingDivisionModalities] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedModalityId, setSelectedModalityId] = useState<string>('');

  const [categoriesSummary, setCategoriesSummary] = useState<ApiEventSummaryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const selectedDivision = useMemo(() => {
    if (!selectedModalityId) return null;
    return divisionModalities.find(d => d.modality_id.toString() === selectedModalityId);
  }, [selectedModalityId, divisionModalities]);

  const loadStudentsForDivision = useCallback(async () => {
    if (!selectedDivision || !user?.schoolId) {
        setStudents([]);
        return;
    }

    setIsLoadingStudents(true);
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            const schoolIdNumber = parseInt(user.schoolId, 10);
            const divisionIdNumber = selectedDivision.division_id;
            const schoolAlumnosData = await getSchoolAlumnos(token, schoolIdNumber, divisionIdNumber);
            
            const mappedStudents = schoolAlumnosData.map(apiUser => ({
                id: apiUser.id.toString(),
                name: apiUser.name,
                lastname: apiUser.lastname,
                email: apiUser.email,
            }));
            setStudents(mappedStudents);

        } catch (error) {
            console.error("Failed to fetch students for division", error);
            toast({
                variant: "destructive",
                title: "Error al cargar alumnos",
                description: "No se pudieron cargar los alumnos para esta división."
            });
            setStudents([]);
        } finally {
            setIsLoadingStudents(false);
        }
    }
  }, [selectedDivision, user?.schoolId, toast]);

  useEffect(() => {
    loadStudentsForDivision();
  }, [loadStudentsForDivision]);

  useEffect(() => {
    const loadDivisionModalities = async () => {
      if (!eventId || !selectedCategoryId) {
        setDivisionModalities([]);
        return;
      }
      setIsLoadingDivisionModalities(true);
      setSelectedModalityId('');
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const mods = await getModalitiesForDivision(eventId, selectedCategoryId, token);
          setDivisionModalities(mods);
        } catch (error) {
          console.error("Failed to fetch division modalities", error);
          toast({
            variant: "destructive",
            title: "Error al cargar modalidades",
            description: "No se pudieron cargar las modalidades para esta categoría."
          })
        } finally {
          setIsLoadingDivisionModalities(false);
        }
      }
    };
    loadDivisionModalities();
  }, [eventId, selectedCategoryId, toast]);
  
  useEffect(() => {
    const loadCategories = async () => {
      if (!eventId) return;
      setIsLoadingCategories(true);
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const summary = await getEventSummary(eventId, token);
          setCategoriesSummary(summary);
        } catch (error) {
          console.error("Failed to fetch event categories summary", error);
          toast({
            variant: "destructive",
            title: "Error al cargar categorías",
            description: "No se pudieron cargar las categorías para este evento."
          })
        } finally {
          setIsLoadingCategories(false);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "No se encontró token de acceso."
        });
        setIsLoadingCategories(false);
      }
    };
    loadCategories();
  }, [eventId, toast]);

  useEffect(() => {
    const loadData = async () => {
      if (isUserLoading || isEventsLoading || !user) {
        return;
      }

      if (!hasRole('master')) {
        router.push('/dashboard/events');
        return;
      }
      
      setIsLoading(true);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        router.push('/login');
        return;
      }
      
      let currentSchoolId: number | null = null;

      try {
        const userDetails = await getUserDetail(token, user.id as number);
        currentSchoolId = userDetails.school_id || null;
        
        if (user.school !== userDetails.school_name && userDetails.school_name) {
            setUser({ ...user, school: userDetails.school_name, schoolId: userDetails.school_id?.toString() });
        }

        if (!currentSchoolId) {
          toast({
            variant: "destructive",
            title: "Sin Escuela Asignada",
            description: "No tienes una escuela asignada para inscribir atletas."
          });
          router.push('/dashboard/events');
          setIsLoading(false);
          return;
        }

      } catch (error) {
        console.error("Failed to fetch user details", error);
        toast({
          variant: "destructive",
          title: "Error de usuario",
          description: "No se pudo obtener la información de la escuela."
        });
        setIsLoading(false);
        return;
      }

      // Fetch Event Details
      let eventData = events.find(e => e.id === eventId);
      if (!eventData) {
        try {
          eventData = await getEventById(eventId, token);
        } catch (e) {
          notFound();
          return;
        }
      }
      setEvent(eventData || null);
      
      setIsLoading(false);
    };

    loadData();
  }, [eventId, events, isEventsLoading, user, isUserLoading, hasRole, router, toast, setUser]);

  const selectedCategory = useMemo(() => {
    if (!event || !selectedCategoryId || !categoriesSummary.length) return null;
    const summaryItem = categoriesSummary.find(c => c.category_id.toString() === selectedCategoryId);
    if (!summaryItem) return null;
    
    const ageParts = summaryItem.age_range.replace(/\s*años/g, '').replace(' y más', '-99').split('-').map(s => s.trim());
    
    return {
      id: summaryItem.category_id.toString(),
      name: summaryItem.category_name,
      minAge: parseInt(ageParts[0], 10) || 0,
      maxAge: parseInt(ageParts[1], 10) || 99,
      belts: summaryItem.allowed_belts.map(b => b.name),
      enabled: summaryItem.category_is_active ?? true,
      progressionSystem: 'sum', // Defaulting, as this info is not in the summary
    } as EventCategory;
  }, [event, selectedCategoryId, categoriesSummary]);

  const categoryOptions = useMemo(() => {
    return (categoriesSummary || [])
        .filter(c => c.category_is_active)
        .map(c => ({ value: c.category_id.toString(), label: c.category_name }));
  }, [categoriesSummary]);

  const modalityOptions = useMemo(() => {
    return divisionModalities
        .filter(m => m.is_active)
        .map(m => ({ value: m.modality_id.toString(), label: m.modality_name }));
  }, [divisionModalities]);

  if (isLoading || isUserLoading || isEventsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold">Evento no encontrado</h2>
        <Button onClick={() => router.push('/dashboard/events')} className="mt-4">
          Volver a Eventos
        </Button>
      </div>
    );
  }

  const Icon = typeIconMap[event.type] || Trophy;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inscripción de Atletas</h1>
          <p className="text-muted-foreground">
            Inscribe a los atletas de tu escuela en el evento.
          </p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card className="lg:sticky lg:top-24">
            <CardHeader className="p-6 flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-2xl font-bold">{event.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {format(event.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                </div>
                <div className={cn("p-3 rounded-lg text-primary-foreground", typeVariantMap[event.type] || "bg-secondary")}>
                    <Icon className="h-6 w-6" />
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 text-sm space-y-6">
                <div className="space-y-2">
                    <h4 className="font-semibold text-muted-foreground">Descripción</h4>
                    <p>{event.description}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                        <Trophy className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                            <h4 className="font-semibold">Tipo</h4>
                            <p className="text-foreground capitalize">{event.type}</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <Gavel className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                            <h4 className="font-semibold">Subtipo</h4>
                            <p className="text-foreground capitalize">{event.subtype}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                            <h4 className="font-semibold">Estado</h4>
                            <Badge variant={statusVariantMap[event.status]}>{event.status}</Badge>
                        </div>
                    </div>
                    {event.maxScore !== undefined && (
                        <div className="flex items-start gap-3">
                            <Star className="h-4 w-4 text-muted-foreground mt-1" />
                            <div>
                                <h4 className="font-semibold">Puntaje Máximo</h4>
                                <p className="font-mono text-foreground">{event.maxScore}</p>
                            </div>
                        </div>
                    )}
                     {event.maxParticipants !== undefined && (
                        <div className="flex items-start gap-3">
                            <Users className="h-4 w-4 text-muted-foreground mt-1" />
                            <div>
                                <h4 className="font-semibold">Máx. Participantes</h4>
                                <p className="font-mono text-foreground">{event.maxParticipants}</p>
                            </div>
                        </div>
                    )}
                     <div className="flex items-start gap-3 sm:col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                            <h4 className="font-semibold">Lugar</h4>
                            <p className="text-foreground">{event.location}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Building className="h-6 w-6 text-primary" />
                    <div>
                        <CardTitle>Inscribiendo los atletas de la Escuela</CardTitle>
                        <CardDescription className="text-lg font-bold text-foreground">{user?.school || 'N/A'}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Categoría</label>
                        <Combobox
                            items={categoryOptions}
                            value={selectedCategoryId}
                            onSelect={(value) => {
                              setSelectedCategoryId(value);
                              setSelectedModalityId(''); // Reset modality on category change
                            }}
                            selectPlaceholder="Selecciona una categoría"
                            searchPlaceholder="Buscar categoría..."
                            noResultsMessage={isLoadingCategories ? "Cargando..." : "No hay categorías."}
                            disabled={isLoadingCategories}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Modalidad</label>
                        <Combobox
                            items={modalityOptions}
                            value={selectedModalityId}
                            onSelect={(value) => setSelectedModalityId(value)}
                            selectPlaceholder="Selecciona una modalidad"
                            searchPlaceholder="Buscar modalidad..."
                            noResultsMessage={isLoadingDivisionModalities ? "Cargando..." : "No hay modalidades."}
                            disabled={!selectedCategoryId || isLoadingDivisionModalities}
                        />
                    </div>
                </div>
                {selectedCategoryId && selectedModalityId && selectedCategory && selectedDivision && (
                    <div className="pt-4 animate-in fade-in-50">
                        <Separator className="mb-6"/>
                        <EnrollmentForm
                            event={event}
                            category={selectedCategory}
                            division={selectedDivision}
                            students={students}
                            isLoadingStudents={isLoadingStudents}
                            onEnrollmentSuccess={loadStudentsForDivision}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
