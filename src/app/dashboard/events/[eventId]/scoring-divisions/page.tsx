
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { notFound, useRouter, useSearchParams, useParams } from 'next/navigation';
import { X, Loader2, ArrowLeft, PersonStanding, Sword, Shield, Users, Calendar, ShieldCheck, ChevronRight, Swords, Gavel, Save, Play, PowerOff, UserPlus, UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { UserRole, useUser } from '@/contexts/UserContext';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { EventCategory, Athlete } from '@/lib/mock-data';
import { useEvents } from '@/contexts/EventContext';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useProgressBar } from '@/contexts/ProgressBarContext';
import { athletes as mockAthletes, schools } from '@/lib/mock-data';
import { getUsersByRole, UserData as ApiUser } from '@/services/user-data';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import UserForm from '@/components/dashboard/UserForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAllModalities, ApiModality } from '@/services/modalities-data';
import { getModalitiesForDivision, type ApiDivisionModality, toggleModalityStatus, ToggleModalityPayload } from '@/services/event-data';
import { isEqual, debounce } from 'lodash';


const mapApiUserToLocal = (apiUser: ApiUser) => ({
  id: apiUser.id.toString(),
  name: apiUser.name,
  lastname: apiUser.lastname,
  email: apiUser.email,
  roles: (apiUser.roles?.map(r => r.name.toLowerCase() as UserRole) || [])
});

const beltColors: { [key: string]: string } = {
  Blanco: 'bg-white text-black border border-gray-300',
  Amarillo: 'bg-yellow-400 text-black',
  Naranja: 'bg-orange-500 text-white',
  Verde: 'bg-green-600 text-white',
  Azul: 'bg-blue-600 text-white',
  Púrpura: 'bg-purple-600 text-white',
  Marrón: 'bg-amber-800 text-white',
  Negro: 'bg-black text-white',
};

// Se asume que la estructura guardada para un puntaje es así.
interface SavedScore {
  athleteId: string;
  divisionId: string;
  eventId: string;
  ronda: string;
  [key: string]: any;
}

interface Modality extends ApiModality {
    label: string;
    icon: React.ElementType;
}

const RONDAS = ["Ronda 1", "Ronda 2", "Ronda 3", "Ronda 4", "Ronda 5", "Ronda 6", "Ronda 7", "Ronda 8", "Ronda 9", "Finales"];


export default function ScoringDivisionsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('category');
  const { toast } = useToast();
  const { user, isLoading: isUserLoading, hasRole } = useUser();
  const { events, updateEvent, isLoading: isEventsLoading, activateRound, deactivateRound } = useEvents();
  const { startProgress } = useProgressBar();

  const [isClient, setIsClient] = useState(false);
  const [judges, setJudges] = useState<ReturnType<typeof mapApiUserToLocal>[]>([]);
  const [isJudgesLoading, setIsJudgesLoading] = useState(true);
  
  const [savedScores, setSavedScores] = useState<SavedScore[]>([]);
  
  const [roundToDeactivate, setRoundToDeactivate] = useState<{ divisionKey: string } | null>(null);
  
  const [isAddUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [isModalitiesLoading, setIsModalitiesLoading] = useState(true);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  const event = useMemo(() => {
    if (!eventId) return null;
    return events.find(e => e.id === eventId);
  }, [eventId, events]);

  const selectedCategory = useMemo(() => {
    if (!event || !categoryId) return null;
    return event.categories?.find(c => c.id === categoryId);
  }, [event, categoryId]);

  const [categoryAthletes, setCategoryAthletes] = useState<Athlete[]>([]);

  useEffect(() => {
    if (selectedCategory) {
      const athletes = mockAthletes.filter(athlete => 
        athlete.edad >= selectedCategory.minAge &&
        athlete.edad <= selectedCategory.maxAge &&
        selectedCategory.belts.includes(athlete.cinturon)
      );
      setCategoryAthletes(athletes);
    }
  }, [selectedCategory]);


  const isJudgeOnly = hasRole('juez') && !hasRole(['admin', 'master']);
  
  const fetchJudges = useCallback(async () => {
    setIsJudgesLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
        setJudges([]);
        setIsJudgesLoading(false);
        return;
    }
    try {
        const judgesData = await getUsersByRole(token, 3); // Juez tiene el ID de rol 3
        setJudges(judgesData.map(mapApiUserToLocal));
    } catch (error) {
        console.error("Failed to fetch judges:", error);
        setJudges([]);
    } finally {
        setIsJudgesLoading(false);
    }
  }, [toast]);
  
    const fetchModalities = useCallback(async () => {
        setIsModalitiesLoading(true);
        try {
            const apiModalities = await getAllModalities();
            const modalityIcons: Record<string, React.ElementType> = {
                'Forma Tradicional': PersonStanding,
                'Forma con Armas': Sword,
                'Formas Extremas': Sword,
                'Combate Point Fighting': Swords,
                'Kickboxing - Musical Forms': PersonStanding,
                'Kickboxing - Light Contact': Swords,
                'Kickboxing - Full Contact': Swords,
            };

            setModalities(apiModalities.map(m => ({
                ...m,
                label: m.name,
                icon: modalityIcons[m.name] || Gavel,
            })));
        } catch (error) {
            console.error("Failed to fetch modalities:", error);
            toast({ 
                variant: "destructive", 
                title: "Error de Conexión", 
                description: "No se pudieron cargar las modalidades de competencia."
            });
        } finally {
            setIsModalitiesLoading(false);
        }
    }, [toast]);

  const fetchDivisionConfig = useCallback(() => {
    if (!eventId || !categoryId) return;
    
    setIsConfigLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({ variant: "destructive", title: "Error de autenticación", description: "No se encontró token de acceso."});
        setIsConfigLoading(false);
        return;
    }

    getModalitiesForDivision(eventId, categoryId, token)
        .then(divisionConfigFromApi => {
             updateEvent(prevEvents => {
                const eventToUpdate = prevEvents.find(e => e.id === eventId);
                if (!eventToUpdate) return prevEvents;

                const newDivisionsForCategory = divisionConfigFromApi.reduce((acc, config) => {
                    const divisionKey = `${categoryId}-${config.modality_id}`;
                    acc[divisionKey] = {
                        enabled: config.is_active,
                        judges: (config.assigned_judges || []).map(j => ({
                            id: j.id.toString(),
                            name: j.name,
                            lastname: j.lastname,
                            email: j.email,
                            is_active: j.is_active,
                        }))
                    };
                    return acc;
                }, {} as NonNullable<Required<typeof event>['divisions']>);
                
                const mergedDivisions = { ...(eventToUpdate.divisions || {}), ...newDivisionsForCategory };

                if (isEqual(eventToUpdate.divisions, mergedDivisions)) {
                    return prevEvents;
                }
                
                const newEvent = { ...eventToUpdate, divisions: mergedDivisions };
                return prevEvents.map(e => e.id === eventId ? newEvent : e);
            });
        })
        .catch(error => {
            toast({
                variant: "destructive",
                title: "Error al Cargar Configuración",
                description: error instanceof Error ? error.message : "No se pudo obtener la configuración de la división.",
            });
        })
        .finally(() => {
            setIsConfigLoading(false);
        });
  }, [eventId, categoryId, toast, updateEvent]);


  useEffect(() => {
    setIsClient(true);
    fetchJudges();
    fetchModalities();
  }, [fetchJudges, fetchModalities]);

  useEffect(() => {
    if (isClient && !isModalitiesLoading) {
      fetchDivisionConfig();
    }
  }, [isClient, isModalitiesLoading, fetchDivisionConfig]);
  
  const judgeOptions = useMemo(() => {
      return judges.map(j => ({
          value: j.id.toString(),
          label: `${j.name || ''} ${j.lastname || ''}`.trim() || j.email
      }));
  }, [judges]);

  
  useEffect(() => {
    if (!isUserLoading && !hasRole(['admin', 'master', 'juez'])) {
      toast({
        variant: "destructive",
        title: "Acceso Denegado",
        description: "No tienes permiso para acceder a esta página.",
      });
      router.push('/dashboard/events');
    }
  }, [isUserLoading, hasRole, router, toast]);
  
  const getEvaluatedCount = (divisionId: string, round: string) => {
    const uniqueAthletes = new Set(
        savedScores
            .filter(score => score.divisionId === divisionId && score.ronda === round)
            .map(score => score.athleteId)
    );
    return uniqueAthletes.size;
  };

  const saveChanges = useCallback(debounce(async (modalityId: string, isEnabled: boolean, judgesPayload: { judge_id: number; is_active: boolean }[]) => {
      const token = localStorage.getItem('accessToken');
      if (!token || !event || !selectedCategory) return;
      
      const payload: ToggleModalityPayload = {
        event_id: parseInt(event.id),
        category_id: parseInt(selectedCategory.id),
        modality_id: parseInt(modalityId),
        is_active: isEnabled,
        judges: judgesPayload,
      };

      try {
        await toggleModalityStatus(payload, token);
        toast({
            title: "Configuración guardada",
            description: "Los cambios se han sincronizado con el servidor."
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "No se pudo guardar la configuración.";
        toast({
            variant: "destructive",
            title: "Error de Sincronización",
            description: errorMessage,
        });
        // Re-fetch to correct optimistic update
        fetchDivisionConfig();
      }
  }, 500), [event, selectedCategory, toast, fetchDivisionConfig]);


  if (!isClient || isUserLoading || isEventsLoading || !user || !eventId || !selectedCategory || isJudgesLoading || isModalitiesLoading || isConfigLoading) {
    return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!event) {
    notFound();
  }
  
  const handleFinish = () => {
    router.push('/dashboard/events');
  };

  const handleDivisionToggle = (categoryId: string, modalityId: string) => {
    if (!event) return;

    const key = `${categoryId}-${modalityId}`;
    const currentDivision = event.divisions?.[key];
    const newIsActive = !currentDivision?.enabled;
    const judges = currentDivision?.judges || [];

    updateEvent(prevEvents => {
      const eventToUpdate = prevEvents.find(e => e.id === event.id);
      if (!eventToUpdate) return prevEvents;

      const newDivisions = { ...(eventToUpdate.divisions || {}) };
      const current = newDivisions[key] || { enabled: false, judges: [] };
      newDivisions[key] = { ...current, enabled: newIsActive };

      const newEvent = { ...eventToUpdate, divisions: newDivisions };
      return prevEvents.map(e => (e.id === event.id ? newEvent : e));
    });

    const judgesPayload = judges.map(j => ({ judge_id: parseInt(j.id), is_active: j.is_active }));
    saveChanges(modalityId, newIsActive, judgesPayload);
  };

  const handleJudgeChange = (categoryId: string, modalityId: string, judgeId: string) => {
    if (!event) return;
    const key = `${categoryId}-${modalityId}`;
    const judgeToAdd = judges.find(j => j.id.toString() === judgeId);
    if (!judgeToAdd) return;
    
    const currentDivision = event.divisions?.[key] || { enabled: true, judges: [] };
    
    let newJudgesForState;
    const existingJudgeIndex = currentDivision.judges.findIndex(j => j.id === judgeId);

    if (existingJudgeIndex > -1) {
        newJudgesForState = currentDivision.judges.map((j, index) => 
            index === existingJudgeIndex ? { ...j, is_active: true } : j
        );
    } else {
        newJudgesForState = [...currentDivision.judges, { id: judgeToAdd.id, name: judgeToAdd.name, lastname: judgeToAdd.lastname, email: judgeToAdd.email, is_active: true }];
    }
    
    updateEvent(prevEvents => {
      const eventToUpdate = prevEvents.find(e => e.id === event.id);
      if (!eventToUpdate) return prevEvents;
      
      const newDivisions = { ...(eventToUpdate.divisions || {}) };
      newDivisions[key] = { ...currentDivision, judges: newJudgesForState };
      
      const newEvent = { ...eventToUpdate, divisions: newDivisions };
      return prevEvents.map(e => (e.id === event.id ? newEvent : e));
    });

    const judgesPayload = newJudgesForState.map(j => ({ judge_id: parseInt(j.id), is_active: j.is_active }));
    saveChanges(modalityId, currentDivision.enabled, judgesPayload);
  };
  
  const handleRemoveJudge = (e: React.MouseEvent, categoryId: string, modalityId: string, judgeIdToRemove: string) => {
    if (!event) return;
    e.stopPropagation();
    e.preventDefault();
    const key = `${categoryId}-${modalityId}`;
    const currentDivision = event.divisions?.[key];
    if (!currentDivision) return;
    
    const newJudgesForState = currentDivision.judges.map(j =>
      j.id === judgeIdToRemove ? { ...j, is_active: false } : j
    );
    
    updateEvent(prevEvents => {
      const eventToUpdate = prevEvents.find(e => e.id === event.id);
      if (!eventToUpdate) return prevEvents;

      const newDivisions = { ...(eventToUpdate.divisions || {}) };
      newDivisions[key] = { ...currentDivision, judges: newJudgesForState };
      
      const newEvent = { ...eventToUpdate, divisions: newDivisions };
      return prevEvents.map(e => (e.id === event.id ? newEvent : e));
    });
    
    const judgesPayload = newJudgesForState.map(j => ({
        judge_id: parseInt(j.id),
        is_active: j.is_active
    }));

    saveChanges(modalityId, currentDivision.enabled, judgesPayload);
  };
  
   const handleActivateRound = (divisionKey: string, round: string) => {
    activateRound(event.id, divisionKey, round);
    toast({
        title: `Ronda Activada`,
        description: `La ${round} para esta división ahora está activa para los jueces.`
    })
  }

  const handleAdvanceRound = (divisionId: string, currentRound: string) => {
      const currentIndex = RONDAS.indexOf(currentRound);
      if (currentIndex !== -1 && currentIndex < RONDAS.length - 1) {
          const nextRound = RONDAS[currentIndex + 1];
          handleActivateRound(divisionId, nextRound);
      }
  };
  
  const confirmDeactivateRound = () => {
    if (roundToDeactivate) {
        deactivateRound(event.id, roundToDeactivate.divisionKey);
        toast({
            title: `Ronda Desactivada`,
            description: `La ronda para esta división ya no está activa.`
        })
        setRoundToDeactivate(null);
    }
  };

  const getAssignedJudges = (categoryId: string, modalityId: string): { id: string; name: string | null; lastname: string | null; email: string; is_active: boolean; }[] => {
    const key = `${categoryId}-${modalityId}`;
    return event.divisions?.[key]?.judges || [];
  };

  if (!hasRole(['admin', 'master', 'juez'])) {
    return null;
  }
  
  const filterModalitiesForJudge = (modalitiesList: Modality[]) => {
    if (!isJudgeOnly || !event.divisions) return modalitiesList;
    
    return modalitiesList.filter(modality => {
        const divisionKey = `${selectedCategory.id}-${modality.id}`;
        const divisionConfig = event.divisions![divisionKey];
        return divisionConfig?.enabled && divisionConfig.judges.filter(j => j.is_active).some(j => j.id === user.id.toString());
    });
  };

  const kataModalities = filterModalitiesForJudge(modalities.filter(m => m.type === 'kata'));
  const combatModalities = filterModalitiesForJudge(modalities.filter(m => m.type === 'combate'));

  const pageTitle = isJudgeOnly ? 'Tus Asignaciones de Evaluación' : 'Paso 2 de 2: Habilita modalidades, asigna jueces y gestiona las rondas de competencia.';
  const pageDescription = isJudgeOnly 
    ? 'Haz clic en una modalidad para comenzar a puntuar.' 
    : 'Habilita modalidades, asigna jueces y gestiona las rondas de competencia.';

  const handleJudgeLinkClick = (e: React.MouseEvent<HTMLElement>) => {
    startProgress();
  };

  const handleUserCreationSuccess = (newAthlete: any) => {
    setAddUserDialogOpen(false);
    // Add the new athlete to the list, simulating a refresh
    setCategoryAthletes(prev => [...prev, newAthlete as Athlete]);
  };
  
  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const renderModalityCard = (modality: Modality) => {
    const divisionKey = `${selectedCategory.id}-${modality.id}`;
    const divisionConfig = event.divisions?.[divisionKey];
    const isEnabled = divisionConfig?.enabled || false;
    const assignedJudges = getAssignedJudges(selectedCategory.id, modality.id.toString()).filter(j => j.is_active);
    
    const activeRound = event.activeRounds?.[divisionKey];
    const currentRound = activeRound || RONDAS[0];
    const evaluatedCount = getEvaluatedCount(divisionKey, currentRound);
    
    const isRoundCompleted = categoryAthletes.length > 0 && evaluatedCount >= categoryAthletes.length && assignedJudges.length > 0;
    
    const judge = isJudgeOnly ? judges.find(j => j.id === user.id.toString()) : null;
    const judgeName = judge ? `${judge.name || ''} ${judge.lastname || ''}`.trim() || judge.email : 'Desconocido';
    const judgeId = judge ? judge.id : '';

    const cardContent = (
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div
            className="space-y-1"
          >
            <p className="font-medium flex items-center gap-2">
              <modality.icon className={cn("h-4 w-4", isEnabled ? "text-primary" : "text-muted-foreground")} />
              {modality.label} <span className="text-xs text-muted-foreground">(ID: {modality.id})</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isJudgeOnly && <Switch checked={isEnabled} onCheckedChange={() => handleDivisionToggle(selectedCategory.id, modality.id.toString())} />}
          </div>
        </div>
        {isEnabled && (
          <div
            className="space-y-3 animate-in fade-in-50"
            onClick={e => {
              if (!isJudgeOnly) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <Separator />
             {/* Sección de Rondas para Admin/Master */}
            {!isJudgeOnly && (selectedCategory.progressionSystem === 'sum' || selectedCategory.progressionSystem === 'wkf') && (
                 <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Gestión de Rondas</h4>
                    <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                        {activeRound ? (
                            <div className='flex flex-col gap-1'>
                                <Badge variant='default'>{currentRound}: Activa</Badge>
                                <span className="text-xs text-muted-foreground">Evaluados: {evaluatedCount} / {categoryAthletes.length}</span>
                            </div>
                        ) : (
                            <Badge variant='secondary'>{currentRound}: Pendiente</Badge>
                        )}
                        
                        <div className="flex items-center gap-1">
                          {!activeRound ? (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleActivateRound(divisionKey, RONDAS[0])}>
                                  <Play className="mr-2 h-3 w-3"/>Activar
                              </Button>
                          ) : isRoundCompleted ? (
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleAdvanceRound(divisionKey, currentRound)}>
                                  <ChevronRight className="mr-2 h-3 w-3"/>Finalizar y Avanzar
                              </Button>
                          ) : (
                               <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive" onClick={() => setRoundToDeactivate({ divisionKey })}>
                                  <PowerOff className="mr-2 h-3 w-3"/>Desactivar
                              </Button>
                          )}
                        </div>
                    </div>
                </div>
            )}
            {!isJudgeOnly && (
              <Combobox
                items={judgeOptions.filter(j => !assignedJudges.some(aj => aj.id === j.value.toString()))}
                onSelect={(value) => handleJudgeChange(selectedCategory.id, modality.id.toString(), value)}
                selectPlaceholder="Asignar Juez"
                searchPlaceholder="Buscar juez..."
                noResultsMessage="No hay más jueces."
                className="w-full"
              />
            )}
            {assignedJudges.length > 0 && (
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-medium text-muted-foreground">{isJudgeOnly ? 'Juez Asignado' : 'Jueces Asignados:'}</h4>
                <div className="flex flex-wrap gap-2">
                  {assignedJudges.map(judge => {
                    if (isJudgeOnly && judge.id !== user.id.toString()) return null;
                    const fullName = `${judge.name || ''} ${judge.lastname || ''}`.trim();
                    const judgeName = fullName || judge.email || 'Desconocido';
                    return (
                       <div key={judge.id} className="flex items-center rounded-full bg-secondary text-secondary-foreground pr-1">
                          <Button asChild variant="link" size="sm" className="h-auto text-secondary-foreground hover:no-underline pl-3 pr-2 py-1">
                              <span className="text-xs">{judgeName}</span>
                          </Button>
                          {!isJudgeOnly && (
                              <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => handleRemoveJudge(e, selectedCategory.id, modality.id.toString(), judge.id)}>
                                  <X className="h-3 w-3" />
                              </Button>
                          )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    );
    
    if (isJudgeOnly && isEnabled) {
      return (
        <Link 
            key={modality.id} 
            href={`/dashboard/events/${eventId}/scoring/${divisionKey}?judge=${judgeId}`}
            onClick={(e) => handleJudgeLinkClick(e)}
            className="block hover:shadow-lg transition-shadow"
            passHref
        >
            <Card className={cn("transition-all duration-300 h-full", isEnabled ? "bg-card shadow-sm" : "bg-muted/40")}>
                {cardContent}
            </Card>
        </Link>
      )
    }

    return (
       <Card key={modality.id} className={cn("transition-all duration-300", isEnabled ? "bg-card shadow-sm" : "bg-muted/40")}>
          {cardContent}
       </Card>
    );
  };

  return (
    <>
      <div className="grid gap-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/events/${eventId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
              <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
              <p className="text-muted-foreground">{pageTitle}</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
              <CardTitle>{isJudgeOnly ? 'Divisiones Asignadas' : 'Configuración para'}: <span className="text-primary">{selectedCategory.name}</span></CardTitle>
              <CardDescription>{pageDescription}</CardDescription>
              <div className="text-sm text-muted-foreground pt-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> Edades: {selectedCategory.minAge}-{selectedCategory.maxAge}</span>
                      <div className="flex items-center gap-1.5"><Shield className="h-4 w-4"/> Cinturones:
                        <div className="flex flex-wrap gap-1">
                            {selectedCategory.belts.map(belt => (
                                <Badge key={belt} className={cn("text-xs font-semibold", beltColors[belt])}>{belt}</Badge>
                            ))}
                        </div>
                      </div>
                  </div>
              </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6 pt-2">
              
              {/* KATA MODALITIES */}
              {kataModalities.length > 0 && (
                  <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                          <PersonStanding className="h-5 w-5"/>
                          Katas / Formas ({categoryAthletes.length} atletas)
                      </h3>
                      <Separator />
                      {kataModalities.map(renderModalityCard)}
                  </div>
              )}


              {/* COMBAT MODALITIES */}
              {combatModalities.length > 0 && (
                  <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Users className="h-5 w-5"/>
                          Combates ({categoryAthletes.length} atletas)
                      </h3>
                      <Separator />
                      {combatModalities.map(renderModalityCard)}
                  </div>
              )}
              
              {(kataModalities.length === 0 && combatModalities.length === 0) && (
                  <div className="md:col-span-2 text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
                      <Gavel className="h-10 w-10 text-muted-foreground mb-4"/>
                      <p className="text-muted-foreground font-medium">No tienes divisiones asignadas.</p>
                      <p className="text-sm text-muted-foreground">Contacta al administrador del torneo si crees que esto es un error.</p>
                  </div>
              )}
          </CardContent>
        </Card>
        
         {hasRole('master') && (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Gestión de Atletas</CardTitle>
                            <CardDescription>
                                Añade o visualiza atletas para esta categoría.
                            </CardDescription>
                        </div>
                        <Dialog open={isAddUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline"><UserPlus className="mr-2 h-4 w-4"/>Agregar Usuario</Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>Añadir Nuevo Usuario (Atleta)</DialogTitle>
                                  <DialogDescription>
                                      Crea una cuenta para un nuevo atleta. Se asignará a tu escuela y tendrá el rol de "Alumno" por defecto.
                                  </DialogDescription>
                              </DialogHeader>
                              <UserForm 
                                onSuccess={handleUserCreationSuccess}
                                categoryId={parseInt(selectedCategory.id, 10)}
                                categoryName={selectedCategory.name}
                              />
                          </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                  {categoryAthletes.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Atleta</TableHead>
                                <TableHead className="hidden sm:table-cell">Escuela</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead className="hidden md:table-cell">Modalidad</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categoryAthletes.map(athlete => {
                                const fullName = `${athlete.nombres || ''} ${athlete.apellidos || ''}`.trim();
                                return (
                                <TableRow key={athlete.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={`https://picsum.photos/seed/${athlete.id}/200/200`} />
                                                <AvatarFallback>{getInitials(athlete.nombres, athlete.apellidos)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{fullName || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{athlete.escuela}</TableCell>
                                    <TableCell>{selectedCategory.name}</TableCell>
                                    <TableCell className="hidden md:table-cell">No asignada</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="secondary">Pendiente</Badge>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                        <Users className="mx-auto h-8 w-8 mb-2" />
                        <p>Aún no hay atletas inscritos en esta categoría.</p>
                    </div>
                  )}
                </CardContent>
            </Card>
        )}
        
        {!isJudgeOnly && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleFinish}>Finalizar</Button>
            </div>
        )}
      </div>

       <AlertDialog open={!!roundToDeactivate} onOpenChange={() => setRoundToDeactivate(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Seguro que quieres desactivar esta ronda?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción impedirá que los jueces puntúen en esta ronda hasta que se vuelva a activar. No se perderá ningún puntaje ya guardado.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={confirmDeactivateRound}
                    >
                        Desactivar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

    
