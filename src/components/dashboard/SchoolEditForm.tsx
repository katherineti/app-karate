

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
import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Building, Edit, Loader2 } from "lucide-react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { updateSchool, type UpdateSchoolDataPayload, type ApiSchool } from "@/services/school-data";

interface School {
  id: string;
  name: string;
  address: string;
  logoUrl?: string;
  maxScore?: number;
  is_active: boolean;
}

const formSchema = z.object({
  name: z.string().min(1, "El nombre de la escuela es requerido."),
  address: z.string().optional(),
  maxScore: z.coerce.number().min(1, "El puntaje máximo debe ser al menos 1.").optional(),
  logo: z.any().optional(),
  is_active: z.boolean().default(true),
});

interface SchoolEditFormProps {
    school: School;
    onSuccess: (updatedSchool: School) => void;
}

export default function SchoolEditForm({ school, onSuccess }: SchoolEditFormProps) {
  const { toast } = useToast();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: school.name,
      address: school.address,
      maxScore: school.maxScore ?? 10,
      is_active: school.is_active,
    },
  });

  useEffect(() => {
    if (school.logoUrl) {
        setPreviewImage(school.logoUrl);
    }
    form.reset({
      name: school.name,
      address: school.address === 'No especificada' ? '' : school.address,
      maxScore: school.maxScore ?? 10,
      is_active: school.is_active,
    });
  }, [school, form]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("logo", file);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
        const payload: UpdateSchoolDataPayload = {
            name: values.name,
            address: values.address,
            base_score: values.maxScore,
            is_active: values.is_active,
            logo: values.logo,
        };

        const updatedApiSchool: ApiSchool = await updateSchool(school.id, payload, token);

        toast({
            title: "¡Escuela Actualizada!",
            description: `La escuela ${updatedApiSchool.name} ha sido actualizada.`,
        });
        
        const updatedLocalSchool: School = {
            ...school,
            name: updatedApiSchool.name,
            address: updatedApiSchool.address || 'No especificada',
            maxScore: updatedApiSchool.base_score,
            is_active: updatedApiSchool.is_active,
            logoUrl: previewImage || school.logoUrl,
        }
        onSuccess(updatedLocalSchool);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error al actualizar",
            description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-[65vh] pr-4">
          <div className="space-y-6 p-1">
             <div className="flex flex-col items-center text-center">
              <Label htmlFor="photo-upload" className="cursor-pointer w-fit">Logo de la Escuela</Label>
               <div onClick={handlePhotoClick} className="mt-2 cursor-pointer relative group h-24 w-24">
                  <Avatar className="h-full w-full mx-auto rounded-md">
                      <AvatarImage src={previewImage || undefined} className="rounded-md"/>
                      <AvatarFallback className="rounded-md bg-muted">
                          <Building className="h-10 w-10 text-muted-foreground" />
                      </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit className="h-8 w-8 text-white" />
                  </div>
              </div>
              <FormField
                control={form.control}
                name="logo"
                render={() => (
                    <FormItem>
                    <FormControl>
                        <Input
                        id="photo-upload"
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handlePhotoChange}
                        className="sr-only"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Escuela</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Dojo Samurai"
                      {...field}
                      data-invalid={!!form.formState.errors.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Av. Principal, Edificio XYZ, Piso 1"
                      {...field}
                      data-invalid={!!form.formState.errors.address}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puntaje Máximo de Evaluación</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej: 10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Estado
                    </FormLabel>
                    <FormDescription>
                      {field.value ? "La escuela está habilitada." : "La escuela está inhabilitada."}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
        </Button>
      </form>
    </Form>
  );
}
