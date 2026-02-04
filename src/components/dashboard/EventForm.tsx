

"use client";

import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building, CalendarIcon, Loader2, X } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useMemo, useState, useEffect } from "react";
import { createEvent, CreateEventPayload, mapApiEventToKarateEvent } from "@/services/event-data";
import { useEvents } from "@/contexts/EventContext";
import { Separator } from "../ui/separator";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Combobox } from "../ui/combobox";
import { Badge } from "../ui/badge";
import { getUsersByRole, UserData as ApiUser } from "@/services/user-data";


const eventTypes = [
    { id: 1, label: 'Competencia' },
    { id: 2, label: 'Examen de Grado' },
    { id: 3, label: 'Seminario' },
    { id: 4, label: 'Exhibición' },
];

const eventSubtypes = {
  '1': [ // Competencia
    { id: 1, label: 'Oficial Federada (Nacional/Estadal)' },
    { id: 2, label: 'Copa o Invitacional (Amistosa)' },
    { id: 3, label: 'Liga de Élite (Serie)' },
    { id: 4, label: 'Chequeo o Tope' }
  ],
  '2': [ // Examen de Grado
    { id: 5, label: 'Paso de Kyu (Colores)' },
    { id: 6, label: 'Paso de Dan (Cinturón Negro)' },
    { id: 7, label: 'Homologación de Grado' }
  ],
  '3': [ // Seminario
    { id: 8, label: 'Técnico (Kata/Kumite)' },
    { id: 9, label: 'Arbitraje' },
    { id: 10, label: 'Capacitación para Coaches' },
    { id: 11, label: 'Maestría (Gasshuku)' }
  ],
  '4': [ // Exhibición
    { id: 12, label: 'Promocional' },
    { id: 13, label: 'Gala Marcial' },
    { id: 14, label: 'Protocolar' }
  ]
};

const rankingSubtypes = [
    'Oficial Federada (Nacional/Estadal)',
    'Liga de Élite (Serie)'
];

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  date: z.date({ required_error: "La fecha es requerida." }),
  location: z.string().min(3, "La ubicación es requerida."),
  type_id: z.number({ required_error: "Por favor, selecciona un tipo." }),
  subtype_id: z.number({ required_error: "El subtipo de evento es requerido." }),
  maxScore: z.union([z.number(), z.undefined()]),
  maxParticipants: z.union([z.number().int().nonnegative("Debe ser un número no negativo."), z.literal('')]).optional(),
  notification_type: z.enum(['all', 'selected']).default('all'),
  selected_masters: z.array(z.string()).optional(),
}).refine(data => {
    if (data.type_id === 1) { // 1 es 'Competencia'
        return data.maxScore !== undefined && data.maxScore >= 0;
    }
    return true;
}, {
    message: "El Puntaje Máximo de Evaluación es requerido para las competencias.",
    path: ["maxScore"],
});

type EventFormValues = z.infer<typeof formSchema>;

interface EventFormProps {
    onSuccess: () => void;
}

export default function EventForm({ onSuccess }: EventFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { addEvent } = useEvents();

  const [masters, setMasters] = useState<ApiUser[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(true);

  useEffect(() => {
    const fetchMasters = async () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            setIsLoadingMasters(true);
            try {
                // Role ID for 'Master' is 2
                const masterUsers = await getUsersByRole(token, 2);
                setMasters(masterUsers);
            } catch (error) {
                console.error("Failed to fetch masters:", error);
                toast({
                    variant: "destructive",
                    title: "Error al cargar Directores",
                    description: "No se pudo obtener la lista de Directores (Masters).",
                });
            } finally {
                setIsLoadingMasters(false);
            }
        }
    };
    fetchMasters();
  }, [toast]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      maxScore: undefined,
      maxParticipants: "",
      notification_type: 'all',
      selected_masters: [],
    },
  });
  
  const eventTypeId = form.watch("type_id");
  const eventSubtypeId = form.watch("subtype_id");
  const currentSubtypes = eventTypeId ? eventSubtypes[eventTypeId as unknown as keyof typeof eventSubtypes] : [];
  
  const showMaxScore = useMemo(() => {
    return eventTypeId === 1; // Competencia
  }, [eventTypeId]);

  const notificationType = form.watch("notification_type");
  const selectedMasters = form.watch("selected_masters") || [];

  async function onSubmit(values: EventFormValues) {
    setIsLoading(true);
    
    try {
      const payload: CreateEventPayload = {
        name: values.name,
        description: values.description,
        date: format(values.date, 'yyyy-MM-dd'),
        location: values.location,
        subtype_id: values.subtype_id,
        max_evaluation_score: values.maxScore,
        max_participants: values.maxParticipants === '' || values.maxParticipants === undefined ? null : Number(values.maxParticipants),
      };

      if (values.notification_type === 'all') {
        payload.send_to_all_masters = true;
      } else if (values.notification_type === 'selected' && values.selected_masters && values.selected_masters.length > 0) {
        payload.selected_master_ids = values.selected_masters.map(id => parseInt(id, 10));
      }

      const newApiEvent = await createEvent(payload);
      const newKarateEvent = mapApiEventToKarateEvent(newApiEvent);
      
      addEvent(newKarateEvent, {
        type: values.notification_type,
        masters: values.selected_masters
      });

      toast({
        title: '¡Evento Creado!',
        description: `El evento ${values.name} ha sido registrado con éxito.`,
      });
      onSuccess();
      form.reset();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido al intentar crear el evento.';
      
      if (errorMessage.includes('Token de autorización no proporcionado')) {
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: "No se encontró tu sesión. Por favor, inicia sesión de nuevo.",
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al Crear Evento',
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-[65vh] pr-4">
          <div className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Evento</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Campeonato Nacional Juvenil"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe brevemente el evento..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Fecha del Evento</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                            )}
                        >
                            {field.value ? (
                            format(field.value, "PPP", { locale: es })
                            ) : (
                            <span>Elige una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        mode="single"
                        locale={es}
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lugar</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Caracas, Distrito Capital"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="type_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Evento</FormLabel>
                        <Select onValueChange={(value) => {
                            field.onChange(parseInt(value, 10));
                            form.resetField('subtype_id');
                        }} value={field.value?.toString()}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un tipo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {eventTypes.map(type => (
                                    <SelectItem key={type.id} value={type.id.toString()}>{type.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {eventTypeId && currentSubtypes.length > 0 && (
                <FormField
                    control={form.control}
                    name="subtype_id"
                    render={({ field }) => (
                        <FormItem className="animate-in fade-in-50">
                            <FormLabel>Subtipo de Evento</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={field.value?.toString()}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un subtipo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {currentSubtypes.map(subtype => (
                                        <SelectItem key={subtype.id} value={subtype.id.toString()}>{subtype.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {eventSubtypeId && (
                                <FormDescription className={cn("!mt-2 font-semibold", rankingSubtypes.includes(currentSubtypes.find(st => st.id === eventSubtypeId)?.label || '') ? "text-green-600" : "text-amber-600")}>
                                    {rankingSubtypes.includes(currentSubtypes.find(st => st.id === eventSubtypeId)?.label || '') 
                                        ? "Este evento suma puntos al ranking nacional."
                                        : "Este evento NO suma puntos al ranking nacional."
                                    }
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {showMaxScore && (
                <FormField
                control={form.control}
                name="maxScore"
                render={({ field }) => (
                    <FormItem className="animate-in fade-in-50">
                    <FormLabel>Puntaje Máximo de Evaluación <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                        <Input
                        type="number"
                        placeholder="Ej: 10"
                        {...field}
                        onChange={e => {
                          const value = e.target.value;
                          field.onChange(value === '' ? undefined : parseInt(value, 10));
                        }}
                        value={field.value ?? ""}
                        />
                    </FormControl>
                    <FormDescription>
                        Este puntaje se usará para la evaluación de katas en el evento.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            <FormField
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máximo de Participantes</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej: 100"
                      {...field}
                      onChange={e => {
                        const value = e.target.value;
                        field.onChange(value === '' ? '' : parseInt(value, 10));
                      }}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Deja este campo vacío para no establecer un límite.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <Separator />
              <h3 className="font-medium text-lg">Notificaciones</h3>

              <FormField
                control={form.control}
                name="notification_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Opciones de Notificación</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="all" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Enviar notificación a todos los masters
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="selected" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Enviar notificación sólo a los masters seleccionados
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {notificationType === 'selected' && (
                  <FormField
                      control={form.control}
                      name="selected_masters"
                      render={({ field }) => (
                          <FormItem className="flex flex-col animate-in fade-in-50">
                              <FormLabel>Seleccionar Masters</FormLabel>
                              <Combobox
                                  items={masters
                                      .filter(m => !selectedMasters.includes(m.id.toString()))
                                      .map(m => {
                                          const masterName = (`${m.name || ''} ${m.lastname || ''}`.trim() || m.email);
                                          const schoolName = m.school_name;
                                          
                                          const label = (
                                              <div className="flex items-center justify-between w-full">
                                                  <span>{masterName}</span>
                                                  {schoolName && (
                                                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                          <Building className="h-3 w-3" />
                                                          {schoolName}
                                                      </span>
                                                  )}
                                              </div>
                                          );
                                          const searchValue = `${masterName} ${schoolName || ''}`;

                                          return { 
                                              value: m.id.toString(), 
                                              label: label,
                                              searchValue: searchValue.trim(),
                                          };
                                      })
                                  }
                                  onSelect={(value) => {
                                      if (value && !selectedMasters.includes(value)) {
                                          field.onChange([...selectedMasters, value]);
                                      }
                                  }}
                                  selectPlaceholder="Añadir master..."
                                  searchPlaceholder="Buscar master..."
                                  noResultsMessage={isLoadingMasters ? "Cargando..." : "No hay más masters."}
                              />
                              <div className="space-y-2 mt-2">
                                  {selectedMasters.map(id => {
                                      const master = masters.find(m => m.id.toString() === id);
                                      const masterName = master ? (`${master.name || ''} ${master.lastname || ''}`.trim() || master.email) : `ID: ${id}`;
                                      const schoolName = master?.school_name;
                                      return (
                                          <Badge key={id} variant="secondary" className="flex items-center justify-between w-full h-auto py-1.5 px-2">
                                              <div className="flex items-center gap-2">
                                                  <span>{masterName}</span>
                                                  {schoolName && (
                                                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                          <Building className="h-3 w-3" />
                                                          {schoolName}
                                                      </span>
                                                  )}
                                              </div>
                                              <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-4 w-4 ml-2"
                                                  onClick={() => field.onChange(selectedMasters.filter(masterId => masterId !== id))}
                                              >
                                                  <X className="h-3 w-3" />
                                              </Button>
                                          </Badge>
                                      )
                                  })}
                              </div>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              )}
            </div>
          </div>
        </ScrollArea>
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</> : "Crear Evento"}
        </Button>
      </form>
    </Form>
  );
}
