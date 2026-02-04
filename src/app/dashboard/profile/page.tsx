'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { User as UserIcon, Calendar, Mail, Award, School, Shield, Edit, Fingerprint, BarChart2, Save, X, Users, CheckCircle, Info, Loader2, KeyRound } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
  } from "@/components/ui/dialog";
import UserEditForm from '@/components/dashboard/UserEditForm';
import ChangePasswordForm from '@/components/dashboard/ChangePasswordForm';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useUser, UserRole } from '@/contexts/UserContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getUserDetail, UserData as ApiUser } from '@/services/user-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';


interface UserProfile {
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
    ranking?: number;
    representativeId?: string;
    category_id?: number;
    category?: string;
    belt_id?: number;
    status: number;
    certificate_front_url?: string;
    certificate_back_url?: string;
    master_photo_url?: string;
}


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

const roleVariantMap: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
    admin: "destructive",
    master: "default",
    alumno: "secondary",
    representante: "outline",
    juez: 'secondary'
};

const roleLabels: { [key: string]: string } = {
  admin: "Administrador",
  master: "Master",
  alumno: "Alumno",
  representante: "Representante",
  juez: "Juez",
};


const mapApiUserToProfile = (apiUser: ApiUser): UserProfile => {
  const roleMap: { [key: string]: UserRole } = {
      'administrador': 'admin', 'master': 'master', 'alumno': 'alumno', 
      'representante': 'representante', 'juez': 'juez'
  };
  const userRoles: UserRole[] = (apiUser.roles || []).map(r => roleMap[r.name.trim().toLowerCase()]).filter(Boolean);
  const cedula = apiUser.document_type && apiUser.document_number ? `${apiUser.document_type}-${apiUser.document_number}` : 'N/A';

  return {
    id: apiUser.id,
    firstName: apiUser.name || "",
    lastName: apiUser.lastname || "",
    email: apiUser.email,
    roles: userRoles,
    photoURL: apiUser.profile_picture || `https://picsum.photos/seed/${apiUser.id}/200/200`,
    dateOfBirth: apiUser.birthdate ? new Date(apiUser.birthdate) : undefined,
    cedula: cedula,
    document_type: apiUser.document_type || undefined,
    schoolId: apiUser.school_id?.toString(),
    school: apiUser.school_name || 'N/A',
    belt: apiUser.belt_name || 'N/A',
    belt_id: apiUser.belt_id || undefined,
    ranking: 0, 
    representativeId: (apiUser.representatives && apiUser.representatives.length > 0) ? apiUser.representatives[0].id.toString() : undefined,
    category: apiUser.category_name || 'N/A',
    category_id: apiUser.category_id || undefined,
    status: apiUser.status,
    certificate_front_url: apiUser.certificate_front_url,
    certificate_back_url: apiUser.certificate_back_url,
    master_photo_url: apiUser.master_photo_url,
  };
};


export default function ProfilePage() {
  const { user, setUser, hasRole } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadUserProfile() {
      if (user?.id) {
        setIsLoading(true);
        const token = localStorage.getItem('accessToken');
        if (token) {
          try {
            const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
            const detailedUser = await getUserDetail(token, userId);
            const profile = mapApiUserToProfile(detailedUser);

            const storedPhoto = localStorage.getItem(`user_photo_${userId}`);
            if (storedPhoto) {
                profile.photoURL = storedPhoto;
            }

            setUserProfile(profile);
            // Actualizar el contexto con los datos detallados, asegurando que la foto y el tipo de documento persistan
            setUser({ ...user, ...profile, photoURL: profile.photoURL, document_type: profile.document_type });
          } catch (error: any) {
            console.error("Error loading user profile:", error);
            toast({
              variant: "destructive",
              title: "Error al cargar el perfil",
              description: error.message || "No se pudo obtener la información del usuario.",
            });
            // Fallback a los datos del contexto si la API falla
            setUserProfile(user as UserProfile);
          } finally {
            setIsLoading(false);
          }
        }
      }
    }
    loadUserProfile();
  }, [user?.id, setUser, toast]);


  if (isLoading || !userProfile) {
     return (
        <div className="space-y-8">
            <div>
                <Skeleton className="h-9 w-1/2 max-w-sm" />
                <Skeleton className="h-5 w-3/4 max-w-md mt-2" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-1 space-y-8">
                    <Card className="flex flex-col items-center justify-center text-center p-8">
                        <Skeleton className="h-32 w-32 rounded-full mb-4" />
                        <Skeleton className="h-7 w-40 mb-2" />
                        <Skeleton className="h-5 w-48 mb-4" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-10 w-full mt-6" />
                    </Card>
                </div>
                <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-56 mt-2" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-56 mt-2" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
  }

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
  }
  
  const userAge = getAge(userProfile.dateOfBirth);
  
  const canApplyForJudge = hasRole('alumno') && userProfile.belt === 'Negro' && userAge >= 18;


  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Archivo no válido",
          description: "Por favor, selecciona una imagen en formato PNG, JPG o JPEG.",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = () => {
    if (newAvatar) {
      localStorage.setItem(`user_photo_${userProfile.id}`, newAvatar);
      const updatedProfile = {...userProfile, photoURL: newAvatar };
      setUserProfile(updatedProfile);
      setUser(updatedProfile as any); // Actualizar contexto global
      toast({
        title: "Foto de perfil actualizada",
        description: "Tu nueva foto de perfil ha sido guardada (simulación).",
      });
      setNewAvatar(null);
    }
  };

  const handleCancelAvatarChange = () => {
    setNewAvatar(null);
  };
  
  const handleEditSuccess = (updatedUser: any) => {
    setUserProfile(updatedUser);
    setUser(updatedUser); // Actualizar contexto global
    setEditDialogOpen(false);
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Perfil de Usuario</h1>
            <p className="text-muted-foreground">Administra la información de tu perfil y visualiza tus estadísticas.</p>
        </div>
        
        {canApplyForJudge && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Oportunidad para Jueces</AlertTitle>
                <AlertDescription>
                   Si eres alumno de cinturón negro y eres mayor de 18 años de edad, aplicas para ser juez.
                </AlertDescription>
            </Alert>
        )}

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Columna Izquierda: Perfil Principal */}
            <div className="xl:col-span-1 space-y-8">
                <Card className="flex flex-col items-center justify-center text-center p-8">
                    <div onClick={handleAvatarClick} className="cursor-pointer relative group h-32 w-32 mb-4">
                        <Avatar className="h-full w-full border-4 border-primary/20 rounded-full">
                            <AvatarImage src={newAvatar || userProfile.photoURL} />
                            <AvatarFallback className="text-4xl rounded-full">{getInitials(userProfile.firstName, userProfile.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/jpg"
                    />

                    {newAvatar && (
                        <div className="flex gap-2 mb-4 animate-in fade-in-50">
                            <Button size="sm" onClick={handleSaveAvatar}><Save className="mr-2 h-4 w-4" />Guardar Foto</Button>
                            <Button size="sm" variant="outline" onClick={handleCancelAvatarChange}><X className="mr-2 h-4 w-4" />Cancelar</Button>
                        </div>
                    )}

                    <h2 className="text-2xl font-bold">{`${userProfile.firstName} ${userProfile.lastName}`}</h2>
                    <p className="text-muted-foreground">{userProfile.email}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                        {userProfile.roles.map(role => (
                            <Badge key={role} variant={roleVariantMap[role] || "secondary"} className="capitalize text-sm">
                                {roleLabels[role]}
                            </Badge>
                        ))}
                    </div>
                     <DialogTrigger asChild>
                            <Button className="mt-6 w-full">
                                <Edit className="mr-2 h-4 w-4" />
                                Editar Perfil
                            </Button>
                    </DialogTrigger>
                    <Dialog open={isChangePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="mt-2 w-full"><KeyRound className="mr-2 h-4 w-4" />Cambiar Contraseña</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Cambiar Contraseña</DialogTitle>
                                <DialogDescription>
                                    Por tu seguridad, introduce tu contraseña actual antes de establecer una nueva.
                                </DialogDescription>
                            </DialogHeader>
                            <ChangePasswordForm onSuccess={() => setChangePasswordDialogOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </Card>
            </div>

             {/* Columna Central y Derecha: Detalles */}
            <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <UserIcon className="h-5 w-5 text-primary"/> Información de la Cuenta
                        </CardTitle>
                        <CardDescription>Tus datos personales y de acceso.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex flex-col md:flex-row md:items-start md:gap-4 p-2 rounded-lg">
                            <div className="flex items-center gap-4 mb-1 md:mb-0 md:min-w-[150px]">
                                <Fingerprint className="h-5 w-5 text-muted-foreground" />
                                <p className="text-muted-foreground">Cédula</p>
                            </div>
                            <p className="font-medium text-left md:text-right w-full">{userProfile.cedula || 'N/A'}</p>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-start md:gap-4 p-2 rounded-lg">
                            <div className="flex items-center gap-4 mb-1 md:mb-0 md:min-w-[150px]">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <p className="text-muted-foreground">Fecha de Nacimiento</p>
                            </div>
                            <p className="font-medium text-left md:text-right w-full">
                                {userProfile.dateOfBirth
                                ? format(userProfile.dateOfBirth, "d 'de' MMMM 'de' yyyy", { locale: es })
                                : 'N/A'}
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-start md:gap-4 p-2 rounded-lg">
                            <div className="flex items-center gap-4 mb-1 md:mb-0 md:min-w-[150px]">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <p className="text-muted-foreground">Edad</p>
                            </div>
                            <p className="font-medium text-left md:text-right w-full">
                                {userProfile.dateOfBirth ? `${userAge} años` : 'N/A'}
                            </p>
                        </div>
                         <div className="flex flex-col md:flex-row md:items-start md:gap-4 p-2 rounded-lg">
                             <div className="flex items-center gap-4 mb-1 md:mb-0 md:min-w-[150px]">
                                <Mail className="h-5 w-5 text-muted-foreground" />
                                <p className="text-muted-foreground">Correo Electrónico</p>
                            </div>
                            <p className="font-medium text-left md:text-right w-full">{userProfile.email}</p>
                        </div>
                    </CardContent>
                </Card>
                {hasRole(['master', 'alumno']) && (
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary"/> Detalles del Atleta
                          </CardTitle>
                          <CardDescription>Tu información como competidor en SVRAM.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-muted/50">
                              <div className='flex items-center gap-3 mb-1 md:mb-0'>
                                <School className="h-6 w-6 text-muted-foreground" />
                                <span className="font-medium">Escuela</span>
                            </div>
                            <span className="font-medium text-left md:text-right">{userProfile.school || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-muted/50">
                              <div className='flex items-center gap-3 mb-1 md:mb-0'>
                                <Users className="h-6 w-6 text-muted-foreground" />
                                <span className="font-medium">Categoría</span>
                            </div>
                            <span className="font-medium text-left md:text-right">{userProfile.category || 'N/A'}</span>
                        </div>
                          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-muted/50">
                              <div className='flex items-center gap-3 mb-1 md:mb-0'>
                                  <Shield className="h-6 w-6 text-muted-foreground" />
                                  <span className="font-medium">Cinturón</span>
                              </div>
                            <div className={`px-3 py-1 text-sm font-semibold rounded-full w-fit ${beltColors[userProfile.belt || ''] || 'bg-gray-200 text-gray-800'}`}>
                                  {userProfile.belt || 'N/A'}
                              </div>
                          </div>
                          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-muted/50">
                              <div className='flex items-center gap-3'>
                                  <BarChart2 className="h-6 w-6 text-muted-foreground" />
                                  <span className="font-medium">Ranking Nacional</span>
                              </div>
                              <span className="text-2xl font-bold text-primary">#{user?.ranking || 'N/A'}</span>
                          </div>
                      </CardContent>
                  </Card>
                )}
                 {hasRole('master') && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-primary"/>
                                Certificado de Validez
                            </CardTitle>
                            <CardDescription>Documentos para la validación de tu rol.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {(userProfile.certificate_front_url || userProfile.certificate_back_url || userProfile.master_photo_url) ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {userProfile.certificate_front_url && (
                                        <a href={userProfile.certificate_front_url} target="_blank" rel="noopener noreferrer" className="space-y-2 group">
                                            <h4 className="text-sm font-medium text-center text-muted-foreground">Frente</h4>
                                            <div className="aspect-video w-full rounded-md overflow-hidden border transition-all group-hover:border-primary">
                                                <Image src={userProfile.certificate_front_url} alt="Certificado frontal" width={200} height={125} className="w-full h-full object-contain" />
                                            </div>
                                        </a>
                                    )}
                                    {userProfile.certificate_back_url && (
                                        <a href={userProfile.certificate_back_url} target="_blank" rel="noopener noreferrer" className="space-y-2 group">
                                            <h4 className="text-sm font-medium text-center text-muted-foreground">Reverso</h4>
                                            <div className="aspect-video w-full rounded-md overflow-hidden border transition-all group-hover:border-primary">
                                                <Image src={userProfile.certificate_back_url} alt="Certificado reverso" width={200} height={125} className="w-full h-full object-contain" />
                                            </div>
                                        </a>
                                    )}
                                    {userProfile.master_photo_url && (
                                        <a href={userProfile.master_photo_url} target="_blank" rel="noopener noreferrer" className="space-y-2 group">
                                            <h4 className="text-sm font-medium text-center text-muted-foreground">Foto Adicional</h4>
                                            <div className="aspect-video w-full rounded-md overflow-hidden border transition-all group-hover:border-primary">
                                                <Image src={userProfile.master_photo_url} alt="Foto con maestro" width={200} height={125} className="w-full h-full object-contain" />
                                            </div>
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center space-y-3 p-4 bg-muted/50 rounded-lg">
                                    <Badge className="text-base py-2 px-4 bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
                                        Pendiente de Validación
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                        No has subido los documentos para la validación de tu rol.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
                <DialogDescription>
                Modifica la información de tu perfil.
                </DialogDescription>
            </DialogHeader>
            <UserEditForm
                user={userProfile as any}
                onSuccess={handleEditSuccess}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}