

'use client';

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, Eye, Trash, Search, Edit, Loader2, User as UserIcon, X, UserX, UserCheck, Mail, Fingerprint, Calendar as CalendarIcon, Shield, School as SchoolIcon, Users as UsersIcon, ArrowLeft, Building, ChevronRight, MapPin } from "lucide-react";
import UserForm from "./UserForm";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { schools } from "@/lib/mock-data";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import UserEditForm from "./UserEditForm";
import { useUser, UserRole } from "@/contexts/UserContext";
import { debounce } from "lodash";
import { getUserDetail, UserData as ApiUser, changeUserStatus } from "@/services/user-data";
import { getSchoolById, mapApiSchoolToLocal, type School as SchoolType } from "@/services/school-data";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

export interface User {
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
  ranking?: number;
  category_id?: number;
  category?: string;
  belt_id?: number;
  belt?: string;
  status: number;
  status_name?: string;
  representatives?: { 
    id: number; 
    name: string | null; 
    lastname: string | null;
    email: string; 
  }[];
  is_active: boolean;
  certificate_front_url?: string;
  certificate_back_url?: string;
  master_photo_url?: string;
}

const roleVariantMap: Record<
  UserRole,
  "default" | "secondary" | "destructive" | "outline"
> = {
  admin: "destructive",
  master: "default",
  alumno: "secondary",
  representante: "outline",
  juez: "secondary",
};

const roleLabels: { [key in UserRole]: string } = {
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

const statusLabelMap: Record<number, string> = {
    1: "Activo",
    2: "Inactivo",
    3: "Actualizado",
};
  
const statusVariantMap: Record<number, "secondary" | "destructive" | "default"> = {
    1: "secondary",
    2: "destructive",
    3: "default",
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

const mapApiUserToUser = (apiUser: ApiUser): User => {
    const roleMap: { [key: string]: UserRole } = {
      'administrador': 'admin',
      'master': 'master',
      'alumno': 'alumno',
      'representante': 'representante',
      'juez': 'juez',
    };
    
    const userRoles: UserRole[] = (apiUser.roles || [])
      .map(r => roleMap[r.name.trim().toLowerCase()])
      .filter(Boolean);
  
    const cedula = apiUser.document_type && apiUser.document_number 
      ? `${apiUser.document_type}-${apiUser.document_number}` 
      : 'N/A';

    // Cargar foto de perfil desde localStorage si existe
    const storedPhoto = typeof window !== 'undefined' ? localStorage.getItem(`user_photo_${apiUser.id}`) : null;
  
    return {
      id: apiUser.id,
      firstName: apiUser.name || "",
      lastName: apiUser.lastname || "",
      email: apiUser.email,
      roles: userRoles,
      photoURL: storedPhoto || apiUser.profile_picture || undefined,
      dateOfBirth: apiUser.birthdate ? new Date(apiUser.birthdate) : undefined,
      cedula: cedula, 
      schoolId: apiUser.school_id?.toString(),
      school: apiUser.school_name || 'N/A',
      belt: apiUser.belt_name || 'N/A',
      belt_id: apiUser.belt_id || undefined,
      ranking: 0,
      category: apiUser.category_name || 'N/A',
      category_id: apiUser.category_id || undefined,
      status: apiUser.status,
      status_name: apiUser.status_name,
      representatives: apiUser.representatives || [],
      is_active: apiUser.is_active,
      certificate_front_url: apiUser.certificate_front_url || undefined,
      certificate_back_url: apiUser.certificate_back_url || undefined,
      master_photo_url: apiUser.master_photo_url || undefined,
    };
  };

const getCategory = (age: number): string => {
    if (age <= 5) return 'Hasta 5 años (mixto)';
    if (age <= 7) return 'Infantil A';
    if (age <= 9) return 'Infantil B';
    if (age <= 11) return 'Infantil C';
    if (age <= 13) return 'Cadete';
    if (age <= 15) return 'Junior';
    if (age <= 17) return 'Sub-21';
    return 'Adulto';
};

interface UserTableProps {
  initialUsers: User[];
  pagination: {
    totalRecords: number;
    currentPage: number;
    totalPages: number;
    pageSize: number;
  },
  fetchUsers: (page: number, limit: number, search?: string, roleFilter?: string) => void;
  isLoading: boolean;
  currentUserRole?: UserRole[];
}

const UserDetailsSkeleton = () => (
    <div className="flex flex-col gap-6 py-4">
        <div className="flex flex-col items-center text-center gap-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-6 w-32 mx-auto" />
        </div>
        <Card>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    </div>
);


export default function UserTable({ initialUsers, pagination, fetchUsers, isLoading, currentUserRole }: UserTableProps) {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isToggleStateDialogOpen, setToggleStateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const { toast } = useToast();
  const { user: currentUser, setUser: setCurrentUser, hasRole } = useUser();
  
  const [usersData, setUsersData] = useState<User[]>(initialUsers);
  
  const [viewingRepresentative, setViewingRepresentative] = useState<User | null>(null);
  const [viewingSchool, setViewingSchool] = useState<SchoolType | null>(null);
  const [isRepViewLoading, setIsRepViewLoading] = useState(false);
  const [isSchoolViewLoading, setIsSchoolViewLoading] = useState(false);
  
  useEffect(() => {
    // Cargar fotos de localStorage al estado inicial
    const usersWithPhotos = initialUsers.map(user => {
      const storedPhoto = localStorage.getItem(`user_photo_${user.id}`);
      return storedPhoto ? { ...user, photoURL: storedPhoto } : user;
    });
    setUsersData(usersWithPhotos);
  }, [initialUsers]);

  const isAdmin = hasRole('admin');
  const isMaster = hasRole('master');

  const debouncedFetch = useCallback(
    debounce((page: number, limit: number, search: string, role: string) => {
        fetchUsers(page, limit, search, role);
    }, 500),
    [fetchUsers]
  );
  
  useEffect(() => {
    debouncedFetch(1, pagination.pageSize, searchTerm, roleFilter);
  }, [searchTerm, roleFilter, debouncedFetch, pagination.pageSize]);

  const handleEditSuccess = (updatedUser: User) => {
    const userWithUpdatedStatus = { ...updatedUser, status: 3 };
    
    setUsersData(prev => 
        prev.map(u => u.id === userWithUpdatedStatus.id ? userWithUpdatedStatus : u)
    );
    
    if (currentUser && userWithUpdatedStatus.id === currentUser.id) {
      setCurrentUser(userWithUpdatedStatus as any);
    }
    
    setEditDialogOpen(false);
  };
  
  const startIndex = (pagination.currentPage - 1) * pagination.pageSize + 1;
  const endIndex = Math.min(startIndex + pagination.pageSize - 1, pagination.totalRecords);


  const handlePageChange = (page: number) => {
    if (page > 0 && page <= pagination.totalPages) {
      fetchUsers(page, pagination.pageSize, searchTerm, roleFilter);
    }
  };
  
  const handleViewClick = async (user: User) => {
    setIsViewLoading(true);
    setViewDialogOpen(true);
    setSelectedUser(null);
    setViewingRepresentative(null);
  
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            const localUserData = usersData.find(u => u.id === user.id);
            const detailedUser = await getUserDetail(token, user.id as number);
            const profile = mapApiUserToUser(detailedUser);
             setSelectedUser({ ...profile, photoURL: localUserData?.photoURL || profile.photoURL });
        } catch (error) {
            console.error("Fallo al obtener detalles completos del usuario:", error);
             const localUserData = usersData.find(u => u.id === user.id);
            setSelectedUser(localUserData || user);
            toast({
                variant: 'destructive',
                title: "Error de red",
                description: "No se pudieron cargar todos los detalles. Mostrando información local."
            })
        } finally {
            setIsViewLoading(false);
        }
    } else {
        const localUserData = usersData.find(u => u.id === user.id);
        setSelectedUser(localUserData || user);
        setIsViewLoading(false);
    }
  };
  
  const handleEditClick = async (user: User) => {
    setIsEditLoading(true);
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            const detailedUser = await getUserDetail(token, user.id as number);
            setSelectedUser(mapApiUserToUser(detailedUser));
            setEditDialogOpen(true);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los datos para editar.",
            });
        } finally {
            setIsEditLoading(false);
        }
    } else {
        toast({ variant: "destructive", title: "No autenticado" });
        setIsEditLoading(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    if (!isAdmin) return;
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }
  
  const handleToggleStateClick = (user: User) => {
    if (!isAdmin && !isMaster) return;
    setSelectedUser(user);
    setToggleStateDialogOpen(true);
  }
  
  const handleViewRepresentative = async (repId: number) => {
    setIsRepViewLoading(true);
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const repDetails = await getUserDetail(token, repId);
        setViewingRepresentative(mapApiUserToUser(repDetails));
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el perfil del representante." });
      } finally {
        setIsRepViewLoading(false);
      }
    }
  };

  const handleViewSchool = async (schoolId?: string) => {
    if (!schoolId) {
      toast({ variant: "destructive", title: "Error", description: "ID de escuela no disponible." });
      return;
    }
    setIsSchoolViewLoading(true);
    setViewingSchool(null);
    setViewingRepresentative(null);

    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({ variant: "destructive", title: "Error de autenticación" });
        setIsSchoolViewLoading(false);
        return;
    }

    try {
        const apiSchool = await getSchoolById(schoolId, token);
        const localSchool = mapApiSchoolToLocal(apiSchool);
        setViewingSchool(localSchool);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error al cargar escuela",
            description: error instanceof Error ? error.message : "No se pudo obtener la información.",
        });
    } finally {
        setIsSchoolViewLoading(false);
    }
  };

  const confirmToggleState = async () => {
    if (!selectedUser) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: "No se encontró token. Por favor, inicia sesión de nuevo.",
        });
        return;
    }
    const shouldInactivate = selectedUser.status === 1 || selectedUser.status === 3;
    const newStatus = shouldInactivate ? 2 : 1;
    const roleIds = selectedUser.roles.map(role => roleApiMap[role]);

    try {
        await changeUserStatus(token, {
            id: selectedUser.id as number,
            email: selectedUser.email,
            roles_ids: roleIds,
            status: newStatus,
        });

        setUsersData(prev => 
            prev.map(u => 
                u.id === selectedUser.id ? { ...u, status: newStatus, status_name: newStatus === 1 ? 'Activo' : 'Inactivo' } : u
            )
        );

        toast({
            title: `¡Estado Cambiado!`,
            description: `El usuario ${selectedUser.email} ha sido ${shouldInactivate ? 'inhabilitado' : 'habilitado'}.`,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
        toast({
            variant: "destructive",
            title: "Error al cambiar estado",
            description: errorMessage,
        });
    } finally {
        setToggleStateDialogOpen(false);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getAge = (dateOfBirth?: Date) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  
  const getAgeInYearsString = (dateOfBirth?: Date) => {
    if (!dateOfBirth) return 'N/A';
    const age = getAge(dateOfBirth);
    return `${age} años`;
  }
  
  const formatCedula = (cedula?: string) => {
    if (!cedula || cedula === 'N/A') return 'N/A';
  
    const parts = cedula.split(/-(.+)/);
    if (parts.length < 2) return cedula;
  
    const prefix = parts[0];
    let numbers = parts[1];
    
    if (prefix === 'V' && !isNaN(Number(numbers))) {
      const formattedNumbers = new Intl.NumberFormat('es-VE').format(Number(numbers));
      return `${prefix}-${formattedNumbers}`;
    }
    
    return cedula;
  };
  
  const displayedUser = viewingRepresentative || selectedUser;
  
  return (
    <>
      <div className="border rounded-lg w-full bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b">
           <div className="relative w-full md:max-w-xs">
            <Input
              type="search"
              placeholder="Buscar por nombre, email..."
              className="pr-8 sm:w-full"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              disabled={isLoading}
            />
             {searchTerm ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setSearchTerm('')}
                    >
                    <X className="h-4 w-4" />
                </Button>
            ) : (
                <Search className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            )}
          </div>
          <div className="flex w-full md:w-auto items-center gap-4">
             <Select value={roleFilter} onValueChange={(value) => {
                setRoleFilter(value);
             }}
             disabled={isLoading}
             >
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="1">Administrador</SelectItem>
                    <SelectItem value="2">Master</SelectItem>
                    <SelectItem value="3">Juez</SelectItem>
                    <SelectItem value="4">Representante</SelectItem>
                    <SelectItem value="5">Alumno</SelectItem>
                </SelectContent>
            </Select>
            {(isAdmin || isMaster) && (
              <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                      Completa el formulario para añadir un nuevo miembro al sistema. Se creará una cuenta y perfil de usuario.
                    </DialogDescription>
                  </DialogHeader>
                  <UserForm onSuccess={() => {
                      setAddDialogOpen(false);
                      fetchUsers(1, pagination.pageSize);
                  }} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando lista de usuarios...</p>
            </div>
        ): (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Correo Electrónico</TableHead>
                  <TableHead className="hidden md:table-cell">Rol</TableHead>
                  <TableHead className="hidden lg:table-cell">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData && usersData.length > 0 ? (
                  usersData.map((user) => (
                    <TableRow key={user.id} className={cn(user.status === 2 && "opacity-60")}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Avatar className="h-9 w-9">
                                <AvatarImage src={user.photoURL || undefined} alt={`${user.firstName} ${user.lastName}`} />
                                <AvatarFallback>
                                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                                </AvatarFallback>
                           </Avatar>
                          <div className="font-medium">
                            {(user.firstName || user.lastName) ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : (
                                <span className="text-muted-foreground italic">(Nombre no asignado)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? user.roles.map(role => (
                                <Badge
                                    key={role}
                                    variant={roleVariantMap[role] || "secondary"}
                                    className="capitalize"
                                >
                                    {roleLabels[role]}
                                </Badge>
                            )) : (
                                <Badge variant="outline">Sin Rol Asignado</Badge>
                            )}
                        </div>
                      </TableCell>
                       <TableCell className="hidden lg:table-cell">
                          <Badge variant={statusVariantMap[user.status]} className={cn(user.status === 1 && 'bg-green-100 text-green-800 border-green-200')}>
                            {user.status_name ? user.status_name.charAt(0).toUpperCase() + user.status_name.slice(1) : statusLabelMap[user.status] || "Desconocido"}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isEditLoading && selectedUser?.id === user.id}>
                                {isEditLoading && selectedUser?.id === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                )}
                              <span className="sr-only">Abrir menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewClick(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver
                            </DropdownMenuItem>
                            {(isAdmin || isMaster) && user.status !== 2 && (
                                <DropdownMenuItem onClick={() => handleEditClick(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                            )}
                            {(isAdmin || isMaster) && (
                                <>
                                 <DropdownMenuItem onClick={() => handleToggleStateClick(user)}>
                                    {user.status === 1 || user.status === 3 ? (
                                        <UserX className="mr-2 h-4 w-4" />
                                    ) : (
                                        <UserCheck className="mr-2 h-4 w-4" />
                                    )}
                                    <span>{user.status === 1 || user.status === 3 ? 'Inhabilitar' : 'Habilitar'}</span>
                                </DropdownMenuItem>
                                </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No se encontraron usuarios.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-muted-foreground">
                        {pagination.totalRecords > 0 ? (
                        <>
                            Mostrando <strong>{startIndex} - {endIndex}</strong> de <strong>{pagination.totalRecords}</strong> usuarios
                        </>
                        ) : (
                        'No hay usuarios que mostrar'
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Página {pagination.currentPage} de {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={pagination.currentPage === pagination.totalPages}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}
          </>
        )}
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={(isOpen) => {
        setViewDialogOpen(isOpen);
        if (!isOpen) {
          setViewingRepresentative(null);
          setViewingSchool(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg p-0">
           <DialogHeader className="p-6 pb-0">
               {(viewingRepresentative || viewingSchool) && (
                <Button variant="ghost" size="sm" className="absolute left-4 top-4 w-fit px-2 z-10" onClick={() => {
                    setViewingRepresentative(null);
                    setViewingSchool(null);
                }}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              )}
              <DialogTitle className={cn("text-2xl text-center", (viewingRepresentative || viewingSchool) && "pt-8")}>
                {viewingSchool ? 'Detalles de la Escuela' : (viewingRepresentative ? 'Detalles del Representante' : 'Detalles del Usuario')}
              </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
          <div className="px-6 pb-6">
            {isViewLoading ? (
                <UserDetailsSkeleton />
            ) : isRepViewLoading || isSchoolViewLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Cargando detalles...</p>
                </div>
            ) : viewingSchool ? (
                <div className="grid gap-4 py-4 text-sm animate-in fade-in-50">
                    <div className="flex flex-col items-center space-y-4">
                      <Avatar className="h-24 w-24 rounded-md">
                        <AvatarImage src={viewingSchool.logoUrl || undefined} className="rounded-md object-contain"/>
                        <AvatarFallback className="rounded-md bg-muted">
                            <Building className="h-10 w-10 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="rounded-lg border p-4 grid gap-3">
                      <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                        <label className="text-right font-medium text-muted-foreground">Nombre</label>
                        <p className="font-semibold">{viewingSchool.name}</p>
                      </div>
                      <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                        <label className="text-right font-medium text-muted-foreground">Dirección</label>
                        <p>{viewingSchool.address}</p>
                      </div>
                      <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                        <label className="text-right font-medium text-muted-foreground">Puntaje Máximo</label>
                        <p>{viewingSchool.maxScore ?? 'No definido'}</p>
                      </div>
                       <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                        <label className="text-right font-medium text-muted-foreground">Estado</label>
                        <p>
                            <Badge variant={viewingSchool.is_active ? 'secondary' : 'destructive'} className={cn(viewingSchool.is_active && 'bg-green-100 text-green-800 border-green-200')}>
                              {viewingSchool.is_active ? 'Habilitado' : 'Inhabilitado'}
                            </Badge>
                        </p>
                      </div>
                    </div>
                </div>
            ) : viewingRepresentative ? (
                <div className="flex flex-col gap-6 pt-4">
                      <div className="flex flex-col items-center text-center gap-4">
                        {viewingRepresentative.photoURL && (
                            <Avatar className="h-24 w-24 border-2 border-primary">
                                <AvatarImage src={viewingRepresentative.photoURL} />
                                <AvatarFallback className="text-3xl bg-muted">{getInitials(viewingRepresentative.firstName, viewingRepresentative.lastName)}</AvatarFallback>
                            </Avatar>
                        )}
                          <div className="space-y-2">
                              <h3 className="font-bold text-2xl">{`${viewingRepresentative.firstName || ''} ${viewingRepresentative.lastName || ''}`.trim()}</h3>
                              <div className="flex flex-wrap gap-2 justify-center">
                                  {viewingRepresentative.roles.map(role => <Badge key={role} variant={roleVariantMap[role]}>{roleLabels[role]}</Badge>)}
                              </div>
                          </div>
                      </div>
                    <Card>
                        <CardHeader><h4 className="font-semibold">Información Personal</h4></CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-start gap-3"><Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5"/><div><p className="text-muted-foreground">Email</p><p className="font-semibold break-all">{viewingRepresentative.email}</p></div></div>
                            <Separator/>
                            <div className="flex items-start gap-3"><Fingerprint className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5"/><div><p className="text-muted-foreground">Cédula</p><p className="font-semibold">{formatCedula(viewingRepresentative.cedula)}</p></div></div>
                        </CardContent>
                    </Card>
                </div>
            ) : displayedUser ? (
                  <div className="flex flex-col gap-6 pt-4">
                      <div className="flex flex-col items-center text-center gap-4">
                        {displayedUser.photoURL && (
                            <Avatar className="h-24 w-24 border-2 border-primary">
                                <AvatarImage src={displayedUser.photoURL} />
                                <AvatarFallback className="text-3xl bg-muted">{getInitials(displayedUser.firstName, displayedUser.lastName)}</AvatarFallback>
                            </Avatar>
                        )}
                          <div className="space-y-2">
                              <h3 className="font-bold text-2xl">{`${displayedUser.firstName || ''} ${displayedUser.lastName || ''}`.trim()}</h3>
                              <div className="flex flex-wrap gap-2 justify-center">
                                  {displayedUser.roles.map(role => <Badge key={role} variant={roleVariantMap[role]}>{roleLabels[role]}</Badge>)}
                              </div>
                          </div>
                      </div>

                    <Card>
                        <CardHeader><h4 className="font-semibold">Información Personal</h4></CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-start gap-3"><Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5"/><div><p className="text-muted-foreground">Email</p><p className="font-semibold break-all">{displayedUser.email}</p></div></div>
                            <Separator/>
                            <div className="flex items-start gap-3"><Fingerprint className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5"/><div><p className="text-muted-foreground">Cédula</p><p className="font-semibold">{formatCedula(displayedUser.cedula)}</p></div></div>
                            <Separator/>
                            <div className="flex items-start gap-3"><CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5"/><div><p className="text-muted-foreground">F. de Nacimiento</p><p className="font-semibold">{displayedUser.dateOfBirth ? format(displayedUser.dateOfBirth, "d 'de' MMMM, yyyy", { locale: es }) : 'N/A'}</p></div></div>
                            <Separator/>
                            <div className="flex items-start gap-3"><UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5"/><div><p className="text-muted-foreground">Edad</p><p className="font-semibold">{getAgeInYearsString(displayedUser.dateOfBirth)}</p></div></div>
                        </CardContent>
                    </Card>

                    {(displayedUser.roles.includes('alumno') || displayedUser.roles.includes('master')) && (
                        <Card>
                            <CardHeader><h4 className="font-semibold">Información de Atleta</h4></CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-center justify-between gap-3 p-2">
                                    <div className='flex items-center gap-3'>
                                        <SchoolIcon className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                        <p className="text-muted-foreground">Escuela</p>
                                    </div>
                                    {displayedUser.schoolId ? (
                                        <Button variant="link" className="p-0 h-auto font-semibold" onClick={() => handleViewSchool(displayedUser.schoolId)}>
                                            {displayedUser.school || 'N/A'}
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    ) : (
                                        <p className="font-semibold">{displayedUser.school || 'N/A'}</p>
                                    )}
                                </div>
                                <Separator/>
                                <div className="flex items-center justify-between gap-3 p-2">
                                    <div className='flex items-center gap-3'><Shield className="h-4 w-4 text-muted-foreground flex-shrink-0"/> <p className="text-muted-foreground">Cinturón</p></div>
                                    {displayedUser.belt && displayedUser.belt !== 'N/A' ? <Badge className={cn("text-xs", beltColors[displayedUser.belt])}>{displayedUser.belt}</Badge> : <p className="font-semibold">N/A</p>}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {displayedUser.roles.includes('alumno') && displayedUser.representatives && displayedUser.representatives.length > 0 && (
                        <Card>
                            <CardHeader><h4 className="font-semibold flex items-center gap-2"><UsersIcon className="h-5 w-5 text-primary"/>Representantes Asignados</h4></CardHeader>
                            <CardContent className="space-y-3">
                                {displayedUser.representatives.map(rep => {
                                    const fullName = `${rep.name || ''} ${rep.lastname || ''}`.trim();
                                    return (
                                        <button key={rep.id} className="flex w-full items-center justify-between gap-3 bg-muted/50 p-2 rounded-md hover:bg-muted/80 transition-colors text-left" onClick={() => handleViewRepresentative(rep.id)}>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8"><AvatarFallback>{getInitials(rep.name || '', rep.lastname || rep.email)}</AvatarFallback></Avatar>
                                                <div>
                                                    <p className="text-sm font-semibold">{fullName || '(Nombre no disponible)'}</p>
                                                    <p className="text-xs text-muted-foreground">{rep.email}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}
                  </div>
                ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información del usuario seleccionado.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <UserEditForm
              user={selectedUser}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de inhabilitar este usuario?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción marcará al usuario <span className="font-medium">{selectedUser?.email}</span> como inactivo y no podrá acceder al sistema. No se eliminará permanentemente.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog open={isToggleStateDialogOpen} onOpenChange={setToggleStateDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de {selectedUser?.status === 1 || selectedUser?.status === 3 ? 'inhabilitar' : 'habilitar'} a este usuario?</AlertDialogTitle>
                <AlertDialogDescription>
                     Esta acción {selectedUser?.status === 1 || selectedUser?.status === 3 ? 'inhabilitará' : 'habilitará'} al usuario <span className="font-medium">{selectedUser?.email}</span>.
                     {selectedUser?.status === 1 || selectedUser?.status === 3 ? ' El usuario ya no podrá acceder al sistema.' : ' El usuario recuperará el acceso al sistema.'}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmToggleState}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
