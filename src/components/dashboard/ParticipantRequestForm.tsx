
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { KarateEvent } from "@/lib/mock-data";
import { Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { requestSlots } from "@/services/participant-request-data";

const formSchema = z.object({
  participantCount: z.coerce
    .number()
    .int("El número debe ser entero.")
    .min(1, "Debe solicitar al menos 1 cupo."),
});

interface ParticipantRequestFormProps {
  event: KarateEvent;
  onSuccess: () => void;
}

export default function ParticipantRequestForm({ event, onSuccess }: ParticipantRequestFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      participantCount: 1,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({
            variant: "destructive",
            title: "Error de autenticación",
            description: "No se pudo encontrar tu sesión.",
        });
        setIsLoading(false);
        return;
    }

    try {
        const payload = {
            event_id: parseInt(event.id, 10),
            num_participants_requested: values.participantCount,
        };

        const response = await requestSlots(payload, token);
    
        toast({
          title: "¡Solicitud Enviada!",
          description: response.message,
        });
        
        onSuccess();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar la solicitud.";
        toast({
            variant: "destructive",
            title: "Error al enviar la solicitud",
            description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
            name="school"
            render={() => (
                <FormItem>
                    <FormLabel>Escuela</FormLabel>
                    <FormControl>
                        <Input
                            value={user?.school || 'No asignada'}
                            disabled
                        />
                    </FormControl>
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="participantCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Participantes</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Ej: 5"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Indica cuántos cupos deseas solicitar para tu escuela.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <p className="text-xs text-muted-foreground text-center">
            Se enviará una notificación al creador del evento para que apruebe tu solicitud.
        </p>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar Solicitud"}
        </Button>
      </form>
    </Form>
  );
}
