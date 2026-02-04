
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
import type { KarateEvent } from "@/lib/mock-data";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useEffect, useMemo, useState } from "react";
import { updateEvent } from "@/services/event-data";

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

const eventStatuses = [
    { id: 4, label: 'Programado' },
    { id: 5, label: 'En Curso' },
    { id: 6, label: 'Finalizado' },
    { id: 7, label: 'Cancelado' },
];

const rankingSubtypes = [
    'Oficial Federada (Nacional/Estadal)',
    'Liga de Élite (Serie)'
];

const formSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto"),
  description: z.string().min(10, "La descripción es muy corta"),
  date: z.date({ required_error: "La fecha es requerida" }),
  location: z.string().min(2, "La ubicación es requerida"),
  type_id: z.number({ required_error: "El tipo es requerido" }),
  subtype_id: z.number().optional(),
  status_id: z.number({ required_error: "El estado es requerido" }),
  max_evaluation_score: z.number().optional(),
  max_participants: z.union([z.number().int().nonnegative(), z.literal('')]).optional(),
}).refine(data => {
    if (data.type_id === 1) { // 1 es 'Competencia'
        return data.max_evaluation_score !== undefined && data.max_evaluation_score >= 0;
    }
    return true;
}, {
    message: "El Puntaje Máximo de Evaluación es requerido para las competencias.",
    path: ["max_evaluation_score"],
});

interface EventEditFormProps {
  event: KarateEvent;
  onSuccess: (updatedEvent: KarateEvent) => void; 
}

export default function EventEditForm({ event, onSuccess }: EventEditFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: event.name || "",
        description: event.description || "",
        date: event.date ? new Date(event.date) : new Date(),
        location: event.location || "",
        type_id: event.type_id,
        subtype_id: event.subtype_id,
        status_id: event.status_id,
        max_evaluation_score: event.maxScore ?? 0,
        max_participants: event.maxParticipants ?? "",
    },
  });

  const eventTypeId = form.watch('type_id');
  const eventSubtypeId = form.watch("subtype_id");
  const currentSubtypes = useMemo(() => {
    return eventTypeId ? eventSubtypes[eventTypeId.toString() as keyof typeof eventSubtypes] || [] : [];
  }, [eventTypeId]);

  const showMaxScore = useMemo(() => {
    return eventTypeId === 1; // Competencia
  }, [eventTypeId]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setIsLoading(true);
    try {
      const updatedData = await updateEvent(
        event.id, 
        {
          ...values,
          max_participants: values.max_participants === '' || values.max_participants === undefined ? null : Number(values.max_participants)
        },
        token
      );
console.log("enviando data",updatedData)
      if (updatedData) {
        toast({ title: "Éxito", description: "Evento actualizado correctamente" });
        onSuccess(updatedData);
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Evento</FormLabel>
                  <FormControl><Input placeholder="Ej: Campeonato Nacional Juvenil" {...field} /></FormControl>
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
                  <FormLabel>Ubicación</FormLabel>
                  <FormControl><Input placeholder="Ej: Caracas, Distrito Capital" {...field} /></FormControl>
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
                  <Select 
                    onValueChange={(val) => {
                        field.onChange(Number(val));
                        form.setValue('subtype_id', undefined);
                    }} 
                    value={field.value ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eventTypes.map(t => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.label}
                        </SelectItem>
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
                            <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString()}>
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
                name="max_evaluation_score"
                render={({ field }) => (
                    <FormItem className="animate-in fade-in-50">
                    <FormLabel>Puntaje Máximo de Evaluación</FormLabel>
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
              name="max_participants"
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
                    Deja este campo vacío o en 0 para no establecer un límite.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eventStatuses.map(status => (
                        <SelectItem key={status.id} value={status.id.toString()}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Guardar Cambios"}
        </Button>
      </form>
    </Form>
  );
}
