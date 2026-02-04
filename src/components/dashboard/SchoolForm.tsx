

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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Building, Edit, Loader2 } from "lucide-react";
import { Label } from "../ui/label";
import { createSchool, ApiSchool, CreateSchoolPayload } from "@/services/school-data";

const formSchema = z.object({
  name: z.string().min(1, "El nombre de la escuela es requerido."),
  address: z.string().optional(),
  logo: z.any().optional(),
  maxScore: z.coerce.number().min(1, "El puntaje máximo debe ser al menos 1.").optional(),
});

interface SchoolFormProps {
    onSuccess: () => void;
}

export default function SchoolForm({ onSuccess }: SchoolFormProps) {
  const { toast } = useToast();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  });

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
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: "No se encontró token. Por favor, inicia sesión de nuevo.",
        });
        return;
    }

    setIsLoading(true);

    try {
        const payload: CreateSchoolPayload = {
            name: values.name,
            address: values.address,
            base_score: values.maxScore,
            logo: values.logo,
        };
        const newSchool: ApiSchool = await createSchool(payload, token);
        
        toast({
            title: "¡Escuela Creada!",
            description: `La escuela ${newSchool.name} ha sido registrada.`,
        });

        onSuccess();
        form.reset();
        setPreviewImage(null);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error al crear la escuela",
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
                render={({ field }) => (
                    <FormItem>
                    <FormControl>
                        <Input
                        id="photo-upload"
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handlePhotoChange}
                        className="sr-only"
                        disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</> : "Crear Escuela"}
        </Button>
      </form>
    </Form>
  );
}
