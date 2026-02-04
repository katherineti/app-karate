

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
import { Separator } from "../ui/separator";
import { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createProtectedUser } from "@/services/user-create";
import { Combobox } from "../ui/combobox";
import { schools as mockSchools } from "@/lib/mock-data";
import { useUser } from "@/contexts/UserContext";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";


const formSchema = z.object({
  email: z.string().email("Por favor, introduce un correo electrónico válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres."),
  roles_id: z.array(z.string()).min(1, "Se debe seleccionar al menos un rol."),
  school_id: z.number().optional(),
  category_id: z.number().optional(),
  modality_id: z.number().optional(),
}).refine(data => {
    if (data.roles_id.includes("2") || data.roles_id.includes("5")) {
        return !!data.school_id;
    }
    return true;
}, {
    message: "Debe seleccionar una escuela para los roles de Master o Alumno.",
    path: ["school_id"],
});


const allRoles = [
    { label: "Administrador", value: "1", id: 1 },
    { label: "Master", value: "2", id: 2 },
    { label: "Juez", value: "3", id: 3 },
    { label: "Representante", value: "4", id: 4 },
    { label: "Alumno", value: "5", id: 5 },
];

const modalities = [
    { id: 1, name: 'Forma Tradicional' },
    { id: 2, name: 'Forma con Armas' },
    { id: 3, name: 'Formas Extremas' },
    { id: 4, name: 'Kickboxing - Musical Forms' },
    { id: 5, name: 'Combate Point Fighting' },
    { id: 6, name: 'Kickboxing - Light Contact' },
    { id: 7, name: 'Kickboxing - Full Contact' },
];

interface UserFormProps {
    onSuccess: (newUser: any) => void;
    categoryId?: number;
    categoryName?: string;
}

export default function UserForm({ onSuccess, categoryId, categoryName }: UserFormProps) {
  const { user: currentUser, hasRole } = useUser();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = hasRole('admin');
  const isMasterOnly = hasRole('master') && !isAdmin;

  const availableRoles = useMemo(() => {
    if (isAdmin) {
      return allRoles;
    }
    if (isMasterOnly) {
      return allRoles.filter(r => r.label === 'Alumno');
    }
    return [];
  }, [isAdmin, isMasterOnly]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      roles_id: isMasterOnly ? ["5"] : [],
      category_id: categoryId,
    },
  });
  
  const watchedRoles = form.watch("roles_id");
  
  useEffect(() => {
    if (isMasterOnly && currentUser?.schoolId) {
        const schoolIdAsNumber = typeof currentUser.schoolId === 'string' 
            ? parseInt(currentUser.schoolId, 10) 
            : currentUser.schoolId;

        if (schoolIdAsNumber && !isNaN(schoolIdAsNumber)) {
           form.setValue('school_id', schoolIdAsNumber);
        }
    }
    if (categoryId) {
        form.setValue('category_id', categoryId);
    }
  }, [isMasterOnly, currentUser, categoryId, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: "No se encontró el token de administrador. Por favor, inicia sesión de nuevo.",
        });
        setIsLoading(false);
        return;
    }

    try {
        const selectedRoleIdsAsNumbers = values.roles_id.map(id => parseInt(id, 10));

        const dataToSubmit: any = {
            email: values.email,
            password: values.password,
            roles_ids: selectedRoleIdsAsNumbers,
        };
        
        const isCreatingMaster = selectedRoleIdsAsNumbers.includes(2);
        
        if (isAdmin && (isCreatingMaster || selectedRoleIdsAsNumbers.includes(5)) && values.school_id) {
            dataToSubmit.school_id = values.school_id;
        } else if (isMasterOnly && currentUser?.schoolId) {
             const schoolIdAsNumber = typeof currentUser.schoolId === 'string' ? parseInt(currentUser.schoolId, 10) : currentUser.schoolId;
             if (schoolIdAsNumber) dataToSubmit.school_id = schoolIdAsNumber;
        }

        const response = await createProtectedUser(dataToSubmit, token);

        toast({
            title: "¡Usuario Creado!",
            description: response.description || `El usuario ${values.email} ha sido registrado con éxito.`,
        });
        
        onSuccess({
            id: response.id,
            nombres: values.email.split('@')[0],
            apellidos: '',
            email: values.email,
            edad: 0,
            escuela: mockSchools.find(s => s.value === dataToSubmit.school_id)?.label || 'N/A',
            cinturon: 'Blanco',
            ranking: 0,
            cedula: '',
            oro: 0,
            plata: 0,
            bronce: 0,
            registrationDate: new Date(),
        });
        form.reset();

    } catch (error) {
        console.error("Error al crear usuario:", error);
        const errorMessage = error instanceof Error 
            ? error.message 
            : "Error desconocido al intentar crear el usuario.";

        toast({
            variant: "destructive",
            title: "Error al Crear Usuario",
            description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  }
  
  const togglePasswordVisibility = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    setShowPassword(prev => !prev);
  };
  
  const schoolOptions = useMemo(() => {
    return mockSchools.map(school => ({
      value: school.value.toString(),
      label: school.label
    }));
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-[65vh] pr-4">
          <div className="space-y-8 p-1">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Credenciales de Acceso</h3>
              <Separator />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="usuario@email.com"
                        {...field}
                        data-invalid={!!form.formState.errors.email}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          data-invalid={!!form.formState.errors.password}
                          disabled={isLoading}
                        />
                        <span
                            className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-muted-foreground"
                            onMouseDown={togglePasswordVisibility}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="roles_id"
                  render={() => (
                    <FormItem>
                        <FormLabel>Roles</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                        {availableRoles.map((role) => (
                            <FormField
                            key={role.id}
                            control={form.control}
                            name="roles_id"
                            render={({ field }) => {
                                const isChecked = field.value?.includes(role.value);
                                const isDisabledForMaster = isMasterOnly;
                                
                                return (
                                <FormItem
                                    key={role.id}
                                    className="flex flex-row items-center space-x-3 space-y-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          if (isMasterOnly) return;
                                          
                                          return checked
                                              ? field.onChange([...(field.value || []), role.value])
                                              : field.onChange(
                                                  (field.value || []).filter(
                                                  (value) => value !== role.value
                                                  )
                                              )
                                        }}
                                        disabled={isDisabledForMaster || isLoading}
                                    />
                                    </FormControl>
                                    <FormLabel className={cn("font-normal", isDisabledForMaster && "text-muted-foreground")}>
                                        {role.label}
                                    </FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                  )}
                />

                {(isAdmin && (watchedRoles.includes("2") || watchedRoles.includes("5"))) && (
                    <FormField
                        control={form.control}
                        name="school_id"
                        render={({ field }) => (
                            <FormItem className="flex flex-col animate-in fade-in-50">
                                <FormLabel>Escuela</FormLabel>
                                <Combobox
                                    items={schoolOptions}
                                    value={field.value}
                                    onSelect={(value) => field.onChange(value ? parseInt(value, 10) : undefined)}
                                    searchPlaceholder="Buscar escuela..."
                                    selectPlaceholder="Selecciona una escuela"
                                    noResultsMessage="No se encontró la escuela."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                 
                 {isMasterOnly && (
                     <FormItem className="flex flex-col animate-in fade-in-50">
                        <FormLabel>Escuela</FormLabel>
                        <FormControl>
                            <Input
                                value={mockSchools.find(s => s.value.toString() === currentUser?.schoolId)?.label || "Escuela no encontrada"}
                                disabled
                            />
                        </FormControl>
                     </FormItem>
                 )}
            </div>

            {/* Asignar Kata/Combate Section */}
            {categoryId && categoryName && (
              <div className="space-y-4">
                  <h3 className="font-medium text-lg">Asignar Kata/Combate</h3>
                  <Separator />
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría de Competencia</FormLabel>
                        <FormControl>
                          <Input value={categoryName} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="modality_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modalidad de Competencia</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una modalidad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {modalities.map(modality => (
                              <SelectItem key={modality.id} value={modality.id.toString()}>
                                {modality.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            )}
          </div>
        </ScrollArea>
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading ? 'Creando...' : 'Crear Usuario'}
        </Button>
      </form>
    </Form>
  );
}
