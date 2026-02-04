
"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "../ui/combobox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Slider } from "../ui/slider";
import { Separator } from "../ui/separator";
import { format } from "date-fns";
import { schools as mockSchools, athletes as mockAthletes, Athlete, events as mockEvents } from "@/lib/mock-data";
import { KarateEvent } from "@/lib/mock-data";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import type { Division } from '@/app/dashboard/events/[eventId]/scoring/[divisionId]/page';
import { Badge } from "../ui/badge";
import { History, Info, Users, AlertTriangle, Edit, Trophy, Award } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useEvents } from "@/contexts/EventContext";

// --- Interfaces y Utilidades ---

interface AthleteDetails {
    id: number;
    nombres: string;
    apellidos: string;
    email: string;
    cedula: string;
    edad: number;
    dateOfBirth?: Date;
    cinturon: string;
    categoria: string;
    escuela: string;
}

interface SavedScore {
    schoolId: string;
    athleteId: string;
    ronda: string;
    kataName: string;
    tecnicaScore: number;
    kimeScore: number;
    fuerzaScore: number;
    ritmoScore: number;
    equilibrioScore: number;
    eventId: string;
    divisionId: string;
    timestamp: string;
}

const getCategory = (age: number): string => {
    if (age <= 5) return 'Hasta 5 años (mixto)';
    if (age <= 7) return 'Infantil A (6-7 años)';
    if (age <= 9) return 'Infantil B (8-9 años)';
    if (age <= 11) return 'Infantil C (10-11 años)';
    if (age <= 13) return 'Cadete (12-13 años)';
    if (age <= 15) return 'Junior (14-15 años)';
    if (age <= 17) return 'Sub-21 (16-17 años)';
    return 'Adulto (18+ años)';
};

const beltColors: { [key: string]: string } = {
    "Blanco": "bg-white text-black border border-gray-300",
    "Amarillo": "bg-yellow-400 text-black",
    "Naranja": "bg-orange-500 text-white",
    "Verde": "bg-green-600 text-white",
    "Azul": "bg-blue-600 text-white",
    "Púrpura": "bg-purple-600 text-white",
    "Marrón": "bg-amber-800 text-white",
    "Negro": "bg-black text-white",
};

const rondas = [
  "Ronda 1", "Ronda 2", "Ronda 3", "Ronda 4", "Ronda 5", 
  "Ronda 6", "Ronda 7", "Ronda 8", "Ronda 9", "Finales"
];

// --- Función para crear el esquema dinámico ---

const createFormSchema = (eventId: string, currentSavedScores: SavedScore[], editTimestamp: string | null) => 
  z.object({
    schoolId: z.string().min(1, "Debes seleccionar una escuela."),
    athleteId: z.string().min(1, "Debes seleccionar un atleta."),
    ronda: z.string().min(1, "Debes seleccionar una ronda."),
    kataName: z.string().min(3, "El nombre del kata es requerido."),
    tecnicaScore: z.number().min(0).max(100),
    kimeScore: z.number().min(0).max(100),
    fuerzaScore: z.number().min(0).max(100),
    ritmoScore: z.number().min(0).max(100),
    equilibrioScore: z.number().min(0).max(100),
  }).superRefine((data, ctx) => {
    if (!data.athleteId || !data.kataName || !data.ronda || editTimestamp) return;

    if (data.ronda !== 'Finales') {
        const usedKata = currentSavedScores.find(score => 
            score.athleteId === data.athleteId && 
            score.eventId === eventId &&
            score.kataName.toLowerCase() === data.kataName.toLowerCase()
        );

        if (usedKata) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `'${data.kataName}' ya se usó en la ${usedKata.ronda}.`,
                path: ["kataName"],
            });
        }
    }
  });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface TraditionalFormScoringProps {
    event: KarateEvent;
    division: Division;
    originUrl?: string; // Prop para la URL de origen
}

export default function TraditionalFormScoring({ event, division, originUrl }: TraditionalFormScoringProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { completeRoundAndActivateNext } = useEvents();
  
  const editTimestamp = searchParams.get('editTimestamp');
  const isEditMode = !!editTimestamp;

  const [allSavedScores, setAllSavedScores] = useState<SavedScore[]>([]);
  const [divisionAthletes, setDivisionAthletes] = useState<Athlete[]>([]);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(false);
  const [selectedAthleteDetails, setSelectedAthleteDetails] = useState<AthleteDetails | null>(null);
  const [isAthleteDetailsLoading, setIsAthleteDetailsLoading] = useState(false);
  
  const [isRoundFinished, setIsRoundFinished] = useState(false);
  const [finishedRoundInfo, setFinishedRoundInfo] = useState<{round: string; classified: string[]} | null>(null);


  // Cargar scores de localStorage
  useEffect(() => {
    const storedScores = localStorage.getItem('kataScores');
    if (storedScores) {
        setAllSavedScores(JSON.parse(storedScores));
    }
  }, []);

  const formSchema = useMemo(() => createFormSchema(event.id, allSavedScores, editTimestamp), [event.id, allSavedScores, editTimestamp]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolId: "",
      athleteId: "",
      ronda: "",
      kataName: "",
      tecnicaScore: 0,
      kimeScore: 0,
      fuerzaScore: 0,
      ritmoScore: 0,
      equilibrioScore: 0,
    },
    mode: "onChange"
  });

  const category = useMemo(() => {
    return event.categories?.find(c => c.name === division.category);
  }, [event.categories, division.category]);

  const activeRoundForDivision = useMemo(() => {
    const divisionKey = division.id;
    return event.activeRounds?.[divisionKey];
  }, [event.activeRounds, division.id]);
  
  const availableRounds = useMemo(() => {
    if (isEditMode) {
        return rondas.map(ronda_nombre => ({ value: ronda_nombre, label: ronda_nombre }));
    }
    
    // If the category is multi-round, show all rounds for selection.
    if (category && (category.progressionSystem === 'sum' || category.progressionSystem === 'wkf')) {
      return rondas.map(ronda_nombre => ({ value: ronda_nombre, label: ronda_nombre }));
    }

    if (!activeRoundForDivision) {
        return [];
    }
    return [{ value: activeRoundForDivision, label: activeRoundForDivision }];
  }, [activeRoundForDivision, isEditMode, category]);
  
  // Pre-fill form if in edit mode or only one round is active
  useEffect(() => {
    if (isEditMode && allSavedScores.length > 0) {
        const scoreToEdit = allSavedScores.find(s => s.timestamp === editTimestamp);
        if (scoreToEdit) {
            form.reset(scoreToEdit);
        }
    } else if (activeRoundForDivision && !form.getValues('ronda')) {
      // Auto-select the round if there's only one active
      form.setValue('ronda', activeRoundForDivision, { shouldValidate: true });
    }
  }, [isEditMode, editTimestamp, allSavedScores, form, activeRoundForDivision]);
  
  const watchSchoolId = form.watch("schoolId");
  const watchAthleteId = form.watch("athleteId");
  const watchRonda = form.watch("ronda");
  const watchKataName = form.watch("kataName");
  const watchScores = form.watch(["tecnicaScore", "kimeScore", "fuerzaScore", "ritmoScore", "equilibrioScore"]);

  const totalScore = useMemo(() => {
    return watchScores.reduce((acc, score) => acc + (score || 0), 0);
  }, [watchScores]);

  const selectedSchoolData = useMemo(() => {
    if (!watchSchoolId) return null;
    return mockSchools.find(s => s.value.toString() === watchSchoolId);
  }, [watchSchoolId]);
  
  const maxScore = event.maxScore || selectedSchoolData?.maxScore || 10;
  
  const athleteHistory = useMemo(() => {
    if (!watchAthleteId) return [];
    
    const history = allSavedScores
        .filter(score => score.athleteId === watchAthleteId && score.eventId === event.id)
        .sort((a, b) => rondas.indexOf(a.ronda) - rondas.indexOf(b.ronda));
    
    const kataCounts: Record<string, number> = {};
    history.forEach(score => {
        if (score.ronda !== 'Finales') {
            const kata = score.kataName.toLowerCase();
            kataCounts[kata] = (kataCounts[kata] || 0) + 1;
        }
    });

    return history.map(score => ({
        ...score,
        isDuplicate: score.ronda !== 'Finales' && kataCounts[score.kataName.toLowerCase()] > 1
    }));

  }, [watchAthleteId, event.id, allSavedScores]);

  useEffect(() => {
    if (watchSchoolId) {
        setIsLoadingAthletes(true);
        if (selectedSchoolData) {
            const athletesOfSchool = mockAthletes.filter(a => a.escuela === selectedSchoolData.label);
            setDivisionAthletes(athletesOfSchool);
        } else {
            setDivisionAthletes([]);
        }
        if (!isEditMode) {
            form.setValue("athleteId", "");
            setSelectedAthleteDetails(null);
        }
        setIsLoadingAthletes(false);
    }
  }, [watchSchoolId, selectedSchoolData, form, isEditMode]);

  useEffect(() => {
    if (watchAthleteId) {
        setIsAthleteDetailsLoading(true);
        const athlete = mockAthletes.find(a => a.id.toString() === watchAthleteId);
        if (athlete) {
            setSelectedAthleteDetails({
                id: athlete.id,
                nombres: athlete.nombres,
                apellidos: athlete.apellidos,
                email: `${athlete.nombres.split(' ')[0].toLowerCase()}@example.com`,
                cedula: `V-${(20 + (athlete.id % 10)) * 1000000 + athlete.id}`,
                edad: athlete.edad,
                dateOfBirth: athlete.dateOfBirth ? new Date(athlete.dateOfBirth) : undefined,
                cinturon: athlete.cinturon,
                categoria: getCategory(athlete.edad),
                escuela: athlete.escuela,
            });
        }
        setIsAthleteDetailsLoading(false);
    }
  }, [watchAthleteId]);
  
  const handleRoundCompletionCheck = (updatedScores: SavedScore[], round: string) => {
    const divisionParts = division.id.split('-');
    const categoryId = divisionParts.slice(1, 3).join('-');
    const modalityId = divisionParts.slice(3).join('-');
    const divisionKey = `${categoryId}-${modalityId}`;

    const judgesInDivision = event.divisions?.[divisionKey]?.judges.length || 1;
    const athletesInRound = new Set(updatedScores.filter(s => s.divisionId === division.id && s.ronda === round).map(s => s.athleteId));
    
    let allAthletesScoredByAllJudges = true;
    athletesInRound.forEach(athleteId => {
      const scoresForAthlete = updatedScores.filter(s => s.divisionId === division.id && s.ronda === round && s.athleteId === athleteId);
      // This is a simplification. A real system would check scores per judge.
      if(scoresForAthlete.length < judgesInDivision) {
          allAthletesScoredByAllJudges = false;
      }
    });

    if (allAthletesScoredByAllJudges && athletesInRound.size > 0) {
        const scoresOfRound = updatedScores.filter(s => s.divisionId === division.id && s.ronda === round);
        const athleteTotals: Record<string, number> = {};
        scoresOfRound.forEach(s => {
            const total = s.tecnicaScore + s.kimeScore + s.fuerzaScore + s.ritmoScore + s.equilibrioScore;
            if (!athleteTotals[s.athleteId]) athleteTotals[s.athleteId] = 0;
            athleteTotals[s.athleteId] += total;
        });

        const sortedAthletes = Object.keys(athleteTotals).sort((a, b) => athleteTotals[b] - athleteTotals[a]);
        const classifiedCount = Math.ceil(sortedAthletes.length / 2);
        const classifiedAthleteIds = sortedAthletes.slice(0, classifiedCount);
        
        const classifiedNames = classifiedAthleteIds.map(id => {
            const athlete = mockAthletes.find(a => a.id.toString() === id);
            return athlete ? `${athlete.nombres} ${athlete.apellidos}`: `ID: ${id}`;
        });
        
        setFinishedRoundInfo({ round, classified: classifiedNames });
        setIsRoundFinished(true);
        completeRoundAndActivateNext(event.id, divisionKey, round);
    }
  };

  async function onSubmit(values: FormValues) {
    const newScore: SavedScore = {
      ...values,
      eventId: event.id,
      divisionId: division.id,
      timestamp: isEditMode && editTimestamp ? editTimestamp : new Date().toISOString()
    };

    let updatedScores = [...allSavedScores];
    if (isEditMode) {
        const scoreIndex = updatedScores.findIndex(s => s.timestamp === editTimestamp);
        if (scoreIndex !== -1) {
            updatedScores[scoreIndex] = newScore;
            toast({
                title: "Puntaje Corregido",
                description: `Se actualizó el puntaje para ${selectedAthleteDetails?.nombres} en ${values.ronda}.`
            });
            if (originUrl) router.push(originUrl); else router.back();
        }
    } else {
        updatedScores.push(newScore);
        toast({
            title: "Puntaje enviado",
            description: `Se guardó el puntaje para ${selectedAthleteDetails?.nombres} en ${values.ronda}.`
        });
    }

    setAllSavedScores(updatedScores);
    localStorage.setItem('kataScores', JSON.stringify(updatedScores));
    
    if (!isEditMode) {
        handleRoundCompletionCheck(updatedScores, values.ronda);
    }

    // Solo actualiza el ranking si el evento es puntuable
    if (event.suma_ranking) {
      const athleteIndex = mockAthletes.findIndex(a => a.id.toString() === values.athleteId);
      if (athleteIndex !== -1) {
          const athlete = mockAthletes[athleteIndex];
          const breakdownEntry = {
              eventId: event.id,
              eventName: event.name,
              date: new Date().toISOString(),
              points: totalScore,
              category: division.category,
              modality: division.modality,
              medal: 'N/A' as 'N/A', // Lógica de medalla podría ser más compleja
              finalScore: totalScore,
          };
          
          if (isEditMode) {
              // Lógica para actualizar entrada existente si es necesario
          } else {
              if (athlete.rankingBreakdown) {
                  athlete.rankingBreakdown.push(breakdownEntry);
              } else {
                  athlete.rankingBreakdown = [breakdownEntry];
              }
          }
      }
    } else if (!isEditMode) {
        toast({
            variant: "default",
            title: "Evento no puntuable",
            description: "Este puntaje se ha guardado, pero no sumará puntos al ranking nacional.",
            duration: 5000,
        });
    }

    if (!isEditMode) {
        form.reset({
            schoolId: "",
            athleteId: "",
            ronda: "",
            kataName: "",
            tecnicaScore: 0,
            kimeScore: 0,
            fuerzaScore: 0,
            ritmoScore: 0,
            equilibrioScore: 0,
        });
        setSelectedAthleteDetails(null);
    }
  }
  
  const handleEditClick = (score: SavedScore) => {
    router.push(`/dashboard/events/${division.id.split('-').slice(0,2).join('-')}/scoring/${division.id}?judge=${searchParams.get('judge')}&editTimestamp=${score.timestamp}`);
  };

  const schoolOptions = useMemo(() => 
    mockSchools.map(s => ({ value: s.value.toString(), label: s.label }))
  , []);

  const athleteOptions = useMemo(() => 
    divisionAthletes.map(a => ({ 
        value: a.id.toString(), 
        label: `${a.nombres} ${a.apellidos}`
    }))
  , [divisionAthletes]);
  
  const isKataNameValid = useMemo(() => {
    return !form.getFieldState('kataName').invalid && watchKataName?.length >= 3;
  }, [form, watchKataName]);
  
  const isSaveDisabled = useMemo(() => {
    const scoresAreZero = watchScores.every(score => score === 0);
    if (isEditMode) {
      return !form.formState.isValid;
    }
    return !form.formState.isValid || scoresAreZero;
  }, [form.formState.isValid, watchScores, isEditMode]);
  
  const nextRound = useMemo(() => {
      if(!finishedRoundInfo) return null;
      const currentRoundIndex = rondas.indexOf(finishedRoundInfo.round);
      if (currentRoundIndex === -1 || currentRoundIndex === rondas.length - 1) return null;
      return rondas[currentRoundIndex + 1];
  }, [finishedRoundInfo]);

  const isNextRoundActive = useMemo(() => {
      if(!nextRound) return false;
      const divisionParts = division.id.split('-');
      const categoryId = divisionParts.slice(1, 3).join('-');
      const modalityId = divisionParts.slice(3).join('-');
      const divisionKey = `${categoryId}-${modalityId}`;
      return event.activeRounds?.[divisionKey] === nextRound;
  }, [event.activeRounds, division.id, nextRound]);

  return (
    <>
        <Card>
            <CardContent className="p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="schoolId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col animate-in fade-in-50">
                                        <FormLabel>1. Selecciona la Escuela</FormLabel>
                                        <Combobox
                                            items={schoolOptions}
                                            value={field.value}
                                            onSelect={(value) => {
                                                field.onChange(value);
                                                form.setValue("athleteId", "");
                                            }}
                                            searchPlaceholder="Buscar escuela..."
                                            selectPlaceholder="Seleccione una opción"
                                            noResultsMessage="No se encontró la escuela."
                                            disabled={isEditMode}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="athleteId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col animate-in fade-in-50">
                                        <FormLabel>2. Selecciona el Atleta</FormLabel>
                                        <Combobox
                                            items={athleteOptions}
                                            value={field.value}
                                            onSelect={field.onChange}
                                            searchPlaceholder="Buscar atleta..."
                                            selectPlaceholder={
                                                isLoadingAthletes ? "Cargando atletas..." : 
                                                !watchSchoolId ? "Selecciona una escuela primero" : "Seleccione una opción"
                                            }
                                            noResultsMessage="No se encontró el atleta."
                                            disabled={!watchSchoolId || isLoadingAthletes || isEditMode}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        {watchAthleteId && (
                            <div className="space-y-8 animate-in fade-in-50">
                                {isAthleteDetailsLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-1/4" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="ronda"
                                            render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>3. Ronda de Competencia</FormLabel>
                                                <Combobox
                                                    items={availableRounds}
                                                    value={field.value}
                                                    onSelect={field.onChange}
                                                    selectPlaceholder="Seleccione una ronda"
                                                    searchPlaceholder="Buscar ronda..."
                                                    noResultsMessage="No hay rondas activas."
                                                    disabled={isEditMode || availableRounds.length <= 1}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="kataName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>4. Nombre del Kata</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej: Heian Shodan" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {isKataNameValid && selectedAthleteDetails && watchRonda && (
                            <div className="space-y-8 animate-in fade-in-50">
                                <Separator />
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <Card className="lg:col-span-1 bg-muted/50">
                                        <CardHeader><CardTitle className="text-xl">Información del Atleta</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className="space-y-4 text-sm">
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                    <div><p className="font-semibold">Nombre</p><p className="text-muted-foreground truncate">{selectedAthleteDetails.nombres}</p></div>
                                                    <div><p className="font-semibold">Cédula</p><p className="text-muted-foreground">{selectedAthleteDetails.cedula}</p></div>
                                                    <div><p className="font-semibold">Edad</p><p className="text-muted-foreground">{selectedAthleteDetails.edad} años</p></div>
                                                    <div>
                                                    <p className="font-semibold">F. Nacim.</p>
                                                    <p className="text-muted-foreground">
                                                        {selectedAthleteDetails.dateOfBirth 
                                                        ? format(selectedAthleteDetails.dateOfBirth, "dd/MM/yyyy") 
                                                        : 'N/A'}
                                                    </p>
                                                    </div>
                                                    <div>
                                                    <p className="font-semibold">Categoría</p>
                                                    <p className="text-muted-foreground">
                                                        {selectedAthleteDetails.categoria}
                                                    </p>
                                                    </div>
                                                </div>
                                                <div><p className="font-semibold">Email</p><p className="text-muted-foreground truncate">{selectedAthleteDetails.email}</p></div>
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <p className="font-semibold">Cinturón</p>
                                                        <Badge variant="secondary" className={`mt-1 ${beltColors[selectedAthleteDetails.cinturon] || 'bg-gray-200'}`}>
                                                            {selectedAthleteDetails.cinturon}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-6">
                                        <Card className="bg-muted/50">
                                            <CardHeader><CardTitle className="text-xl">Información de la Escuela</CardTitle></CardHeader>
                                            <CardContent className="space-y-4 text-sm">
                                                <div><p className="font-semibold">Nombre</p><p className="text-muted-foreground">{selectedAthleteDetails.escuela}</p></div>
                                                <div className={cn("flex items-start gap-2 p-3 rounded-md bg-background border", 'border-primary/20')}>
                                                    <Info className="h-5 w-5 text-primary mt-0.5" />
                                                    <div><p className="font-semibold text-primary">Puntaje Base (Escuela)</p><p className="text-lg font-mono">{selectedSchoolData?.maxScore || 'N/A'}</p></div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        {event.maxScore && (
                                        <Card className="bg-muted/50">
                                        <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Trophy className="h-5 w-5"/>Información del Evento</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className={cn("flex items-start gap-2 p-3 rounded-md bg-background border", 'border-primary/20')}>
                                            <Info className="h-5 w-5 text-primary mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-primary">Puntaje Base (Evento)</p>
                                                <p className="text-lg font-mono">{event.maxScore}</p>
                                            </div>
                                            </div>
                                        </CardContent>
                                        </Card>
                                    )}
                                </div>
                                    
                                    <Card className="lg:col-span-1 bg-muted/50">
                                        <CardHeader>
                                            <div className="flex items-center gap-2"><History className="h-5 w-5 text-primary"/><CardTitle className="text-xl">Historial</CardTitle></div>
                                        </CardHeader>
                                        <CardContent>
                                        {athleteHistory.length > 0 ? (
                                            <ul className="space-y-2 text-sm">
                                                {athleteHistory.map((score, idx) => {
                                                    const total = (score.tecnicaScore || 0) + (score.kimeScore || 0) + (score.fuerzaScore || 0) + (score.ritmoScore || 0) + (score.equilibrioScore || 0);
                                                    return (
                                                        <li key={idx} className={cn("flex justify-between items-center p-2 rounded-md bg-background", score.isDuplicate && "border border-destructive/50")}>
                                                            <div className="flex items-center gap-2">
                                                                {score.isDuplicate && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0"/>}
                                                                <div>
                                                                    <span className="text-muted-foreground">{score.ronda}:</span>
                                                                    <span className="font-semibold ml-2">{score.kataName}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-primary font-semibold">{total.toFixed(1)}</span>
                                                                {score.isDuplicate && (
                                                                    <TooltipProvider delayDuration={100}><Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditClick(score)}>
                                                                                <Edit className="h-4 w-4"/>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent><p>Corregir esta entrada</p></TooltipContent>
                                                                    </Tooltip></TooltipProvider>
                                                                )}
                                                            </div>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        ) : <p className="text-sm text-muted-foreground text-center py-4">Sin registros.</p>}
                                        </CardContent>
                                    </Card>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-medium mb-6">5. Evaluación de Forma</h3>
                                    <div className="space-y-12">
                                        {/* Grupo 1 */}
                                        <div className="space-y-8">
                                            <h4 className="text-md font-semibold text-muted-foreground border-b pb-2">Rendimiento Técnico</h4>
                                            <FormField
                                                control={form.control}
                                                name="tecnicaScore"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between items-center">
                                                            <FormLabel>Técnica</FormLabel>
                                                            <span className="text-lg font-bold text-primary">{field.value}</span>
                                                        </div>
                                                        <FormDescription>Precisión de los golpes, bloqueos y posiciones (Dachi).</FormDescription>
                                                        <FormControl>
                                                            <Slider
                                                                min={0}
                                                                max={maxScore}
                                                                step={1}
                                                                value={[field.value]}
                                                                onValueChange={(val) => field.onChange(val[0])}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="kimeScore"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between items-center">
                                                            <FormLabel>Control y Kime</FormLabel>
                                                            <span className="text-lg font-bold text-primary">{field.value}</span>
                                                        </div>
                                                        <FormDescription>El foco de la fuerza y el control del cuerpo en el impacto.</FormDescription>
                                                        <FormControl>
                                                            <Slider
                                                                min={0}
                                                                max={maxScore}
                                                                step={1}
                                                                value={[field.value]}
                                                                onValueChange={(val) => field.onChange(val[0])}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        
                                        {/* Grupo 2 */}
                                        <div className="space-y-8">
                                            <h4 className="text-md font-semibold text-muted-foreground border-b pb-2">Rendimiento Atlético</h4>
                                            <FormField
                                                control={form.control}
                                                name="fuerzaScore"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between items-center">
                                                            <FormLabel>Fuerza y Potencia</FormLabel>
                                                            <span className="text-lg font-bold text-primary">{field.value}</span>
                                                        </div>
                                                        <FormDescription>La explosividad atlética del movimiento.</FormDescription>
                                                        <FormControl>
                                                            <Slider
                                                                min={0}
                                                                max={maxScore}
                                                                step={1}
                                                                value={[field.value]}
                                                                onValueChange={(val) => field.onChange(val[0])}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="ritmoScore"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between items-center">
                                                            <FormLabel>Velocidad y Ritmo</FormLabel>
                                                            <span className="text-lg font-bold text-primary">{field.value}</span>
                                                        </div>
                                                        <FormDescription>La fluidez y rapidez de las transiciones.</FormDescription>
                                                        <FormControl>
                                                            <Slider
                                                                min={0}
                                                                max={maxScore}
                                                                step={1}
                                                                value={[field.value]}
                                                                onValueChange={(val) => field.onChange(val[0])}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="equilibrioScore"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between items-center">
                                                            <FormLabel>Equilibrio</FormLabel>
                                                            <span className="text-lg font-bold text-primary">{field.value}</span>
                                                        </div>
                                                        <FormDescription>Vital en Karate para las patadas y giros.</FormDescription>
                                                        <FormControl>
                                                            <Slider
                                                                min={0}
                                                                max={maxScore}
                                                                step={1}
                                                                value={[field.value]}
                                                                onValueChange={(val) => field.onChange(val[0])}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center bg-primary text-primary-foreground p-4 rounded-lg">
                                    <h3 className="text-xl font-bold">Puntuación Total</h3>
                                    <p className="text-4xl font-bold">{totalScore}</p>
                                </div>
                                
                                <Button type="submit" className="w-full text-lg py-6" disabled={isSaveDisabled}>{isEditMode ? 'Guardar Corrección' : 'Guardar Puntuación'}</Button>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
        
        <AlertDialog open={isRoundFinished} onOpenChange={setIsRoundFinished}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><Award className="h-6 w-6 text-primary"/>¡Ronda Finalizada!</AlertDialogTitle>
                <AlertDialogDescription>
                    La <strong>{finishedRoundInfo?.round}</strong> ha concluido. Los siguientes atletas clasifican a la siguiente fase:
                    <ul className="list-disc pl-5 mt-2 font-medium text-foreground">
                        {finishedRoundInfo?.classified.map((name, i) => <li key={i}>{name}</li>)}
                    </ul>
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                    {isNextRoundActive && (
                        <AlertDialogAction onClick={() => setIsRoundFinished(false)}>
                            Avanzar a {nextRound}
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  )
}
