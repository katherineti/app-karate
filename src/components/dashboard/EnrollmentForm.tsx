'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { KarateEvent, EventCategory } from '@/lib/mock-data';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, X, Users, Loader2 } from 'lucide-react';
import { ApiDivisionModality, registerAthletesForDivision } from '@/services/event-data';

interface Student {
  id: string;
  name: string | null;
  lastname: string | null;
  email: string;
}

interface EnrollmentFormProps {
  event: KarateEvent;
  category: EventCategory;
  division: ApiDivisionModality;
  students: Student[];
  isLoadingStudents: boolean;
  onEnrollmentSuccess: () => void;
}

const formSchema = z.object({
  athleteIds: z.array(z.string()).min(1, "Debes seleccionar al menos un atleta."),
});

export default function EnrollmentForm({ event, category, division, students, isLoadingStudents, onEnrollmentSuccess }: EnrollmentFormProps) {
  const { toast } = useToast();
  const [selectedAthletes, setSelectedAthletes] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isLimitReached = useMemo(() => {
    if (!event.maxParticipants) return false;
    return selectedAthletes.length >= event.maxParticipants;
  }, [selectedAthletes.length, event.maxParticipants]);

  const form = useForm<{ athleteIds: string[] }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      athleteIds: [],
    },
  });

  const studentOptions = useMemo(() => {
    return students.map(s => {
        const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();
        const label = fullName || s.email;
        return {
            value: s.id,
            label: label,
        };
    });
  }, [students]);

  const handleSelectAthlete = (athleteId: string) => {
    if (isLimitReached) {
      toast({
        variant: "destructive",
        title: "Límite de participantes alcanzado",
        description: `Este evento tiene un límite de ${event.maxParticipants} participantes.`,
      });
      return;
    }

    const athlete = students.find(s => s.id === athleteId);
    if (athlete && !selectedAthletes.some(sa => sa.id === athleteId)) {
      const newSelection = [...selectedAthletes, athlete];
      setSelectedAthletes(newSelection);
      form.setValue('athleteIds', newSelection.map(s => s.id));
      form.trigger('athleteIds'); // Trigger validation
    }
  };

  const handleRemoveAthlete = (athleteId: string) => {
    const newSelection = selectedAthletes.filter(s => s.id !== athleteId);
    setSelectedAthletes(newSelection);
    form.setValue('athleteIds', newSelection.map(s => s.id));
  };
  
  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const onSubmit = async (values: { athleteIds: string[] }) => {
    setIsLoading(true);

    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: "No se encontró el token de acceso.",
        });
        setIsLoading(false);
        return;
    }

    try {
        const payload = {
            division_id: division.division_id,
            athlete_ids: values.athleteIds.map(id => parseInt(id, 10)),
        };

        const response = await registerAthletesForDivision(payload, token);

        toast({
            title: "Inscripción Exitosa",
            description: response.message,
        });
        setSelectedAthletes([]);
        form.reset();
        onEnrollmentSuccess();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
        toast({
            variant: "destructive",
            title: "Error en la Inscripción",
            description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
            <h3 className="text-lg font-medium">Seleccionar Atletas Elegibles</h3>
            <p className="text-sm text-muted-foreground">
                Se muestran los atletas de tu escuela que cumplen los requisitos para esta división.
            </p>
        </div>

        <Combobox
          items={studentOptions.filter(opt => !selectedAthletes.some(sa => sa.id === opt.value))}
          onSelect={handleSelectAthlete}
          selectPlaceholder={isLoadingStudents ? "Cargando atletas..." : isLimitReached ? "Límite de participantes alcanzado" : "Añadir atleta..."}
          searchPlaceholder="Buscar por nombre..."
          noResultsMessage={isLoadingStudents ? "Cargando..." : "No hay atletas disponibles."}
          disabled={isLimitReached || isLoadingStudents}
        />
        
        <FormField
            control={form.control}
            name="athleteIds"
            render={() => (
                <FormItem>
                   {selectedAthletes.length > 0 && (
                        <div className="space-y-3 pt-4">
                            <Separator />
                            <p className="text-sm text-muted-foreground">
                                Has seleccionado {selectedAthletes.length} de {event.maxParticipants ? event.maxParticipants : 'un número ilimitado de'} atleta(s).
                            </p>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {selectedAthletes.map((athlete, index) => (
                                    <div key={athlete.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="font-mono text-xs text-muted-foreground">{index + 1}.</span>
                                            <Avatar className="h-7 w-7">
                                                <AvatarFallback>{getInitials(athlete.name || '', athlete.lastname || '')}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium truncate">{`${athlete.name || ''} ${athlete.lastname || ''}`.trim() || athlete.email}</span>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6"
                                            onClick={() => handleRemoveAthlete(athlete.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                   )}
                   <FormMessage className="pt-2"/>
                </FormItem>
            )}
        />
        
        <Button type="submit" disabled={isLoading || selectedAthletes.length === 0} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Users className="mr-2 h-4 w-4" />}
            Inscribir {selectedAthletes.length > 0 ? selectedAthletes.length : ''} Atleta(s)
        </Button>
      </form>
    </Form>
  );
}
