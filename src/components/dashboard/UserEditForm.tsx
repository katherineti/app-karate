

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState, useEffect, useMemo } from "react";
import NextImage from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { CalendarIcon, User as UserIcon, Edit, Upload, Loader2, Hourglass, X } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { DatePicker } from "../ui/date-picker";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { schools } from "@/lib/mock-data";
import { Combobox } from "../ui/combobox";
import { es } from "date-fns/locale";
import { useUser, UserRole } from "@/contexts/UserContext";
import { Checkbox } from "../ui/checkbox";
import { updateUser, getUsersByRole, UserData as ApiUser } from "@/services/user-data";
import { Badge } from "../ui/badge";
import { User } from "./UserTable";

/* interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  roles: UserRole[];
  photoURL?: string;
  cedula?: string;
  document_type?: string;
  dateOfBirth?: Date;
  schoolId?: string;
  school?: string;
  belt?: string;
  belt_id?: number;
  category?: string;
  category_id?: number;
  representativeIds?: string[];
  representatives?: { id: number; name: string | null; lastname: string | null; email: string }[];
  representativeName?: string;
  representative_email?: string | null;
  status: number;
  certificate_front_url?: string;
  certificate_back_url?: string;
  master_photo_url?: string;
} */

const allRoles: UserRole[] = ["admin", "master", "juez", "representante", "alumno"];
const belts = [
        { id:1, belt: 'Blanco' },
        { id:2, belt: 'Amarillo' },
        { id:3, belt: 'Naranja' },
        { id:4, belt: 'Verde' },
        { id:5, belt: 'Azul' },
        { id:6, belt: 'Púrpura' },
        { id:7, belt: 'Marrón' },
        { id:8, belt: 'Negro' },
    ];
const document_types = ["V", "E", "P", "T"];
const categories = [
        {id:1, category: 'Hasta 5 años (mixto)' },
        {id:2, category: 'Infantil' },
        {id:3, category: 'Juvenil' },
        {id:4, category: 'Cadete' },
        {id:5, category: 'Junior' },
        {id:6, category: 'Sub-21' },
        {id:7, category: 'Senior' },
    ];

const roleLabels: { [key: string]: string } = {
  admin: "Administrador",
  master: "Master",
  alumno: "Alumno",
  representante: "Representante",
  juez: "Juez",
};

const roleApiMap: { [key in UserRole]: number } = {
  admin: 1,
  master: 2,
  juez: 3,
  representante: 4,
  alumno: 5,
};

// Mapeos para IDs de cinturón y categoría
const categoryNameToIdMap: { [key: string]: number | undefined } = {
    'Hasta 5 años (mixto)': 1, 
    'Infantil': 2,
    'Juvenil': 3,
    'Cadete': 4,
    'Junior': 5,
    'Sub-21': 6,
    'Senior': 7,
};

const today = new Date();
today.setHours(23, 59, 59, 999);

const getAge = (dateOfBirth?: Date) => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getCategoryNameFromAge = (age: number): string => {
    if (age <= 5) return 'Hasta 5 años (mixto)';
    if (age <= 9) return 'Infantil';
    if (age <= 13) return 'Cadete';
    if (age <= 17) return 'Junior';
    if (age <= 21) return 'Sub-21';
    return 'Senior';
};

const getCedulaParts = (cedula?: string) => {
    if (!cedula || !cedula.includes('-')) return { document_type: '', document_number: '' };
    const parts = cedula.split(/-(.+)/)
    if (parts.length < 2) return { document_type: '', document_number: '' };
    return { document_type: parts[0], document_number: parts[1].replace(/\./g, '') };
}


export default function UserEditForm({ user, onSuccess }: { user: User; onSuccess: (updatedUser: User) => void }) {
  const { user: currentUser, hasRole } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [representatives, setRepresentatives] = useState<ApiUser[]>([]);

  const [certFrontPreview, setCertFrontPreview] = useState<string | null>(null);
  const [certBackPreview, setCertBackPreview] = useState<string | null>(null);
  const [certPhotoPreview, setCertPhotoPreview] = useState<string | null>(null);
  
  const [certFrontFileName, setCertFrontFileName] = useState<string | null>(null);
  const [certBackFileName, setCertBackFileName] = useState<string | null>(null);
  const [certPhotoFileName, setCertPhotoFileName] = useState<string | null>(null);

  const certFrontInputRef = useRef<HTMLInputElement>(null);
  const certBackInputRef = useRef<HTMLInputElement>(null);
  const certPhotoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = hasRole('admin');

  const formSchema = useMemo(() => z.object({
    firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
    email: z.string().email("Por favor, introduce un correo electrónico válido."),
    roles: z.array(z.string()).min(1, "Se debe seleccionar al menos un rol."),
    photo: z.any().optional(),
    document_type: z.string({ required_error: "Por favor, selecciona un tipo de documento." }),
    document_number: z.string({required_error: "El número de documento es requerido."}).min(6, "El documento debe tener entre 6 y 9 dígitos.").max(9, "El documento debe tener entre 6 y 9 dígitos."),
    dateOfBirth: z.date({
      required_error: "La fecha de nacimiento es requerida.",
    }).max(today, { message: "La fecha de nacimiento no puede ser en el futuro." }),
    schoolId: z.string().optional(),
    belt_id: z.string().optional(),
    category_id: z.string().optional(),
    representativeIds: z.array(z.string()).optional(), // Ahora es un array de IDs
    certificateFront: z.any().optional(),
    certificateBack: z.any().optional(),
    certificatePhoto: z.any().optional(),
    }).refine(data => {
        // Si el rol no es 'alumno', los campos de atleta no son requeridos.
        if (!data.roles.includes('alumno')) {
        return true;
        }
        // Si el rol es 'alumno', los campos son requeridos.
        return !!data.schoolId && !!data.belt_id;
    }, {
        message: "La escuela y el cinturón son requeridos para el rol de alumno.",
        path: ["schoolId"], 
    }).refine(data => {
        if (!data.roles.includes('master')) return true;
        return !!data.certificateFront || !!user.certificate_front_url;
    }, {
        message: "Debe adjuntar la parte frontal del certificado de validez.",
        path: ["certificateFront"],
    }).refine(data => {
        if (!data.roles.includes('master')) return true;
        return !!data.certificateBack || !!user.certificate_back_url;
    }, {
        message: "Debe adjuntar la parte trasera del certificado de validez.",
        path: ["certificateBack"],
    }), [user]);

  useEffect(() => {
    async function fetchRepresentatives() {
        const token = localStorage.getItem('accessToken');
        if (token && user.roles.includes('alumno')) {
            try {
                // El ID del rol "Representante" es 4
                const reps = await getUsersByRole(token, 4);
                setRepresentatives(reps);
            } catch (error) {
                console.error("Failed to fetch representatives:", error);
                toast({
                    variant: "destructive",
                    title: "Error al cargar representantes",
                    description: "No se pudo obtener la lista de representantes.",
                });
            }
        }
    }
    fetchRepresentatives();
  }, [toast, user.roles]);
  
    const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        firstName: "",
        lastName: "",
        email: "",
        roles: [],
        document_type: "",
        document_number: "",
        schoolId: undefined,
        belt_id: undefined,
        category_id: undefined,
        representativeIds: [],
    },
  });
  
  const dateOfBirth = form.watch('dateOfBirth');
  const userRoles = form.watch('roles');
  const selectedRepresentativeIds = form.watch('representativeIds') || [];


  useEffect(() => {
    if (user) {
        if (user.photoURL) {
            setPreviewImage(user.photoURL);
        }
        if (user.certificate_front_url) {
            setCertFrontPreview(user.certificate_front_url);
        }
        if (user.certificate_back_url) {
            setCertBackPreview(user.certificate_back_url);
        }
        if (user.master_photo_url) {
            setCertPhotoPreview(user.master_photo_url);
        }

        // 1. Extraer los IDs de los representantes actuales del alumno
        const currentRepIds = user.representatives?.map(rep => rep.id.toString()) || [];
        
        const cedulaParts = getCedulaParts(user.cedula);
        const initialRepIds = user.representatives?.map(r => r.id.toString()) || [];
        
        const dataToSet = {
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            roles: user.roles || [],
            document_type: user.document_type || cedulaParts.document_type || "V",
            document_number: cedulaParts.document_number || "",
            dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : undefined,
            schoolId: user.schoolId?.toString() ?? undefined,
            belt_id: user.belt_id?.toString() || undefined,
            category_id: user.category_id?.toString() || undefined,
            representativeIds: currentRepIds,
        };

        form.reset(dataToSet); 

        if (dataToSet.document_type) {
        const timeoutId = setTimeout(() => {
            form.setValue('document_type', dataToSet.document_type, {
            shouldValidate: true,
            shouldDirty: false
            });
        }, 50);

        return () => clearTimeout(timeoutId);
        }
    }
}, [user, form]);
  
  useEffect(() => {
    if (dateOfBirth) {
        const newAge = getAge(dateOfBirth);
        const newCategoryName = getCategoryNameFromAge(newAge);
        const categoryIdNumber = categoryNameToIdMap[newCategoryName]; 
        
        if (categoryIdNumber !== undefined) {
            form.setValue('category_id', categoryIdNumber.toString());
        } 
    }
}, [dateOfBirth, form]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("photo", file);
    }
  };

  const handleCertificateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string | null>>,
    fileNameSetter: React.Dispatch<React.SetStateAction<string | null>>,
    fieldName: "certificateFront" | "certificateBack" | "certificatePhoto"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
        fileNameSetter(file.name);
        const reader = new FileReader();
        reader.onloadend = () => {
            setter(reader.result as string);
        };
        reader.readAsDataURL(file);
        form.setValue(fieldName, file);
        form.trigger(fieldName);
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

    const rolesIds = values.roles.map(role => roleApiMap[role as UserRole]);
    
    const updateData: any = {
        id: user.id as number,
        name: values.firstName,
        lastname: values.lastName,
        email: values.email,
        roles_ids: rolesIds,
        document_type: values.document_type,
        document_number: values.document_number,
        birthdate: values.dateOfBirth ? format(values.dateOfBirth, 'yyyy-MM-dd') : null,
        school_id: values.schoolId ? parseInt(values.schoolId, 10) : null,
        belt_id: values.belt_id ? parseInt(values.belt_id, 10) : null,
        category_id: values.category_id ? parseInt(values.category_id, 10) : null,
    };
    
    // Map form file fields to API keys
    if (values.photo) {
        updateData.profile_picture = values.photo;
    }
    if (values.certificateFront) {
        updateData.certificate_front = values.certificateFront;
    }
    if (values.certificateBack) {
        updateData.certificate_back = values.certificateBack;
    }
    if (values.certificatePhoto) {
        updateData.master_photo = values.certificatePhoto;
    }

    if (values.roles.includes('alumno') && values.representativeIds && values.representativeIds.length > 0) {
        updateData.representative_ids = values.representativeIds.map(id => parseInt(id, 10));
    }
    
    try {
        await updateUser(token, updateData);
        
        // Guardar la foto en localStorage si hay una nueva
        if (previewImage && previewImage !== user.photoURL) {
          localStorage.setItem(`user_photo_${user.id}`, previewImage);
        }

        const fullCedula = values.document_type && values.document_number ? `${values.document_type}-${values.document_number}` : undefined;
        
        const newRepresentatives = (values.representativeIds || []).map(id => {
            const rep = representatives.find(r => r.id.toString() === id);
            return { id: parseInt(id, 10), name: rep?.name || null, lastname: rep?.lastname || null, email: rep?.email || '' };
        });

        const categoryLabel = categories.find(c => c.id.toString() === values.category_id)?.category;
        const beltId = values.belt_id ? parseInt(values.belt_id, 10) : null;
        const category_id = values.category_id ? parseInt(values.category_id, 10) : null;

        const updatedUser: User = {
            ...user,
            ...values,
            roles: values.roles as UserRole[],
            school: schools.find(s => s.value.toString() === values.schoolId)?.label || '',
            photoURL: previewImage || user.photoURL,
            cedula: fullCedula,
            belt: belts.find(b => b.id.toString() === values.belt_id)?.belt || '',
            belt_id: beltId ?? undefined,
            category: categoryLabel,
            category_id: category_id ?? undefined,
            representatives: newRepresentatives,
            status: 3,
        };
        
        toast({
            title: "¡Usuario Actualizado!",
            description: `El usuario ${values.email} ha sido actualizado con éxito.`,
        });
        onSuccess(updatedUser);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
        toast({
            variant: "destructive",
            title: "Error al actualizar",
            description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  } 
  
    const getInitials = (firstName?: string, lastName?: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    };

    const isSchoolVisible = useMemo(() => {
        if (!userRoles) return false;
        return userRoles.includes('master') || userRoles.includes('alumno');
    }, [userRoles]);
    
    const isSchoolLocked = useMemo(() => {
      if (!currentUser?.roles) return false;
      return currentUser.roles.includes('master') && !currentUser.roles.includes('admin');
    }, [currentUser]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-[65vh] pr-4">
          <div className="space-y-8 p-1">

            {/* Profile Information Section */}
            <div className="space-y-4">
               <h3 className="font-medium text-lg">Información de Perfil</h3>
                <Separator />
                <div className="flex flex-col items-center text-center">
                    <Label>Foto de Perfil</Label>
                    <div onClick={handlePhotoClick} className="mt-2 cursor-pointer relative group h-24 w-24 mb-4">
                        <Avatar className="h-full w-full rounded-full">
                            <AvatarImage src={previewImage || undefined} />
                             <AvatarFallback className="rounded-full">
                                {getInitials(form.getValues('firstName'), form.getValues('lastName')) || <UserIcon className="h-10 w-10" />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <FormField
                    control={form.control}
                    name="photo"
                    render={() => (
                        <FormItem>
                        <FormControl>
                            <Input
                            id="photo-upload"
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handlePhotoChange}
                            className="hidden"
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                        <Input placeholder="John" {...field} data-invalid={!!form.formState.errors.firstName} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                        <Input placeholder="Doe" {...field} data-invalid={!!form.formState.errors.lastName} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <FormField
                        control={form.control}
                        name="document_type"
                        render={({ field }) => ( 
                            <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                <SelectTrigger data-invalid={!!form.formState.errors.document_type}>
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {document_types.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="document_number"
                        render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel>Nº de Documento</FormLabel>
                            <FormControl>
                            <Input placeholder="12345678" {...field} data-invalid={!!form.formState.errors.document_number} onChange={(e) => {
                                const { value } = e.target;
                                field.onChange(value.replace(/[^0-9]/g, ''));
                            }} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                  <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Nacimiento</FormLabel>
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
                          <DatePicker
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            onMonthChange={(newMonth) => {
                                if (field.value) {
                                  const currentDay = field.value.getDate();
                                  const newDate = new Date(newMonth);
                                  newDate.setDate(currentDay);
                                  field.onChange(newDate);
                                } else {
                                  field.onChange(newMonth);
                                }
                            }}
                            defaultMonth={field.value}
                            disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            locale={es}
                          />
                      </PopoverContent>
                      </Popover>
                      <FormMessage />
                  </FormItem>
                  )}
              />
            </div>

            {/* Credentials Section */}
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
                            <Input type="email" placeholder="usuario@email.com" {...field} data-invalid={!!form.formState.errors.email} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <div className="space-y-4">
                <h3 className="font-medium text-lg">Permisos y Afiliación</h3>
                <Separator />
                 <FormField
                    control={form.control}
                    name="roles"
                    render={() => (
                        <FormItem>
                            <FormLabel>Roles</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                                {allRoles.map((role) => (
                                    <FormField
                                        key={role}
                                        control={form.control}
                                        name="roles"
                                        render={({ field }) => (
                                            <FormItem
                                                key={role}
                                                className="flex flex-row items-center space-x-2 space-y-0"
                                            >
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(role)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                            ? field.onChange([...field.value, role])
                                                            : field.onChange(
                                                                field.value?.filter(
                                                                (value) => value !== role
                                                                )
                                                            )
                                                        }}
                                                        disabled={!isAdmin}
                                                    />
                                                </FormControl>
                                                <FormLabel className={cn("font-normal capitalize", !isAdmin && "text-muted-foreground")}>
                                                    {roleLabels[role]}
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                {isSchoolVisible && (
                    isSchoolLocked ? (
                        <FormItem>
                            <FormLabel>Escuela</FormLabel>
                            <FormControl>
                                <Input
                                value={schools.find(s => s.value.toString() === currentUser?.schoolId)?.label || "N/A"}
                                disabled
                                />
                            </FormControl>
                        </FormItem>
                    ) : (
                        <FormField
                            control={form.control}
                            name="schoolId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Escuela</FormLabel>
                                <Combobox
                                    items={schools.map(s => ({ value: s.value.toString(), label: s.label }))}
                                    value={field.value}
                                    onSelect={(value) => field.onChange(value)}
                                    searchPlaceholder="Buscar escuela..."
                                    selectPlaceholder="Seleccionar escuela"
                                    noResultsMessage="No se encontró la escuela."
                                />
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )
                )}
            </div>


            {/* Certificate Upload Section */}
            {userRoles?.includes('master') && (
                <div className="space-y-4 animate-in fade-in-50">
                    <h3 className="font-medium text-lg">Certificado de Validez</h3>
                    <Separator />
                    <FormField
                        control={form.control}
                        name="certificateFront"
                        render={() => (
                            <FormItem>
                                <FormLabel>Certificado (Parte Frontal) <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <div>
                                        <Input
                                            ref={certFrontInputRef}
                                            type="file"
                                            className="sr-only"
                                            onChange={(e) => handleCertificateChange(e, setCertFrontPreview, setCertFrontFileName, "certificateFront")}
                                            accept="image/png, image/jpeg, image/jpg"
                                        />
                                        {!certFrontPreview ? (
                                            <div 
                                                className={cn("flex flex-col items-center justify-center w-full min-h-[8rem] border-2 border-dashed rounded-lg cursor-pointer hover:border-primary p-2 text-center text-muted-foreground",
                                                    form.formState.errors.certificateFront && "border-destructive"
                                                )}
                                                onClick={() => certFrontInputRef.current?.click()}
                                            >
                                                <Upload className="mx-auto h-8 w-8"/>
                                                <p>Click para subir imagen</p>
                                            </div>
                                        ) : (
                                            <div className="w-full text-center">
                                                <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                                                    <NextImage src={certFrontPreview} alt="Vista previa frontal" layout="fill" objectFit="contain" />
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2 truncate">{certFrontFileName}</p>
                                                <Button variant="link" size="sm" type="button" onClick={() => certFrontInputRef.current?.click()}>Cambiar</Button>
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="certificateBack"
                        render={() => (
                            <FormItem>
                                <FormLabel>Certificado (Parte Trasera) <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                   <div>
                                        <Input
                                            ref={certBackInputRef}
                                            type="file"
                                            className="sr-only"
                                            onChange={(e) => handleCertificateChange(e, setCertBackPreview, setCertBackFileName, "certificateBack")}
                                            accept="image/png, image/jpeg, image/jpg"
                                        />
                                        {!certBackPreview ? (
                                            <div 
                                                className={cn("flex flex-col items-center justify-center w-full min-h-[8rem] border-2 border-dashed rounded-lg cursor-pointer hover:border-primary p-2 text-center text-muted-foreground",
                                                    form.formState.errors.certificateBack && "border-destructive"
                                                )}
                                                onClick={() => certBackInputRef.current?.click()}
                                            >
                                                <Upload className="mx-auto h-8 w-8"/>
                                                <p>Click para subir imagen</p>
                                            </div>
                                        ) : (
                                            <div className="w-full text-center">
                                                <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                                                    <NextImage src={certBackPreview} alt="Vista previa trasera" layout="fill" objectFit="contain" />
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2 truncate">{certBackFileName}</p>
                                                <Button variant="link" size="sm" type="button" onClick={() => certBackInputRef.current?.click()}>Cambiar</Button>
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="certificatePhoto"
                        render={() => (
                            <FormItem>
                                <FormLabel>Foto con Maestro/Superior (Opcional)</FormLabel>
                                <FormControl>
                                    <div>
                                        <Input
                                            ref={certPhotoInputRef}
                                            type="file"
                                            className="sr-only"
                                            onChange={(e) => handleCertificateChange(e, setCertPhotoPreview, setCertPhotoFileName, "certificatePhoto")}
                                            accept="image/png, image/jpeg, image/jpg"
                                        />
                                        {!certPhotoPreview ? (
                                            <div 
                                                className="flex flex-col items-center justify-center w-full min-h-[8rem] border-2 border-dashed rounded-lg cursor-pointer hover:border-primary p-2 text-center text-muted-foreground"
                                                onClick={() => certPhotoInputRef.current?.click()}
                                            >
                                                <Upload className="mx-auto h-8 w-8"/>
                                                <p>Click para subir imagen</p>
                                            </div>
                                        ) : (
                                            <div className="w-full text-center">
                                                <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                                                    <NextImage src={certPhotoPreview} alt="Vista previa foto con maestro" layout="fill" objectFit="contain" />
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2 truncate">{certPhotoFileName}</p>
                                                <Button variant="link" size="sm" type="button" onClick={() => certPhotoInputRef.current?.click()}>Cambiar</Button>
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}


            {/* Athlete Information Section */}
            {userRoles?.includes('alumno') && (
                <div className="space-y-4">
                    <h3 className="font-medium text-lg">Información de Atleta</h3>
                    <Separator />
                    
                    <FormField
                        control={form.control}
                        name="belt_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cinturón</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger data-invalid={!!form.formState.errors.belt_id}>
                                        <SelectValue placeholder="Selecciona un cinturón" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {belts.map((beltObj) => (
                                        <SelectItem key={beltObj.id} value={beltObj.id.toString()} className="capitalize">
                                        {beltObj.belt}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                      control={form.control}
                      name="category_id"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Categoría</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                              <SelectTrigger data-invalid={!!form.formState.errors.category_id}>
                                <SelectValue placeholder="Selecciona una categoría" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="null">Selecciona una categoría</SelectItem>
                              {categories.map((categoryObj, index) => (
                                <SelectItem key={`${categoryObj.id}-${index}`} value={categoryObj.id.toString()}>
                                  {categoryObj.category}
                                </SelectItem>
                              ))}
                          </SelectContent>
                          </Select>
                            <FormDescription>
                              Calculada por edad. Puedes ajustarla si es necesario.
                            </FormDescription>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                    <FormField
                        control={form.control}
                        name="representativeIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Representantes</FormLabel>
                                <Combobox
                                    items={representatives.filter(rep => !selectedRepresentativeIds.includes(rep.id.toString()))
                                        .map(rep => ({ value: rep.id.toString(), label: `${rep.name || ''} ${rep.lastname || ''}`.trim() || rep.email }))}
                                    onSelect={(value) => {
                                        if (value) {
                                            field.onChange([...selectedRepresentativeIds, value]);
                                        }
                                    }}
                                    selectPlaceholder="Añadir representante..."
                                    searchPlaceholder="Buscar representante..."
                                    noResultsMessage="No hay más representantes."
                                />
                                <div className="space-y-2 mt-2">
                                    {selectedRepresentativeIds.map(id => {
                                        const rep = representatives.find(r => r.id.toString() === id);
                                        const repLabel = rep ? (`${rep.name || ''} ${rep.lastname || ''}`.trim() || rep.email) : `ID: ${id}`;
                                        return (
                                            <Badge key={id} variant="secondary" className="flex items-center justify-between">
                                                <span>{repLabel}</span>
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-4 w-4 ml-2"
                                                    onClick={() => {
                                                        field.onChange(selectedRepresentativeIds.filter(repId => repId !== id));
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </Badge>
                                        );
                                    })}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
          </div>
        </ScrollArea>
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
        </Button>
      </form>
    </Form>
  );
}


