

'use client';
import UserTable from '@/components/dashboard/UserTable';
import { useState, useEffect, useCallback } from 'react';
import { getPaginatedUsers, UserData as ApiUser } from '@/services/user-data';
import { useToast } from '@/hooks/use-toast';
import { useUser, UserRole } from '@/contexts/UserContext';
import { debounce } from 'lodash';

interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  roles: UserRole[];
  photoURL?: string;
  cedula?: string;
  dateOfBirth?: Date;
  schoolId?: string;
  school?: string;
  belt?: string;
  ranking?: number;
  representativeId?: string;
  status: number;
  status_name?: string;
  is_active: boolean;
}

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

  return {
    id: apiUser.id,
    firstName: apiUser.name || "",
    lastName: apiUser.lastname || "",
    email: apiUser.email,
    roles: userRoles,
    photoURL: apiUser.profile_picture || `https://picsum.photos/seed/${apiUser.id}/200/200`,
    dateOfBirth: apiUser.birthdate ? new Date(apiUser.birthdate) : undefined,
    cedula: cedula,
    schoolId: apiUser.school_id?.toString(),
    school: apiUser.school_name || 'N/A',
    belt: apiUser.belt_name || 'N/A',
    ranking: 0,
    status: apiUser.status,
    status_name: apiUser.status_name,
    is_active: apiUser.is_active,
  };
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    currentPage: 1,
    totalPages: 1,
    pageSize: 5,
  });
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  const fetchUsers = useCallback(async (page: number, limit: number, search?: string, roleFilter?: string) => {
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
      const response = await getPaginatedUsers(token, page, limit, search, roleFilter);
      setUsers(response.data.map(mapApiUserToUser));
      setPagination({
        totalRecords: response.totalRecords,
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        pageSize: response.pageSize,
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
            ? error.message 
            : "Error desconocido al cargar los usuarios.";
      toast({
        variant: "destructive",
        title: "Error al Cargar Usuarios",
        description: errorMessage,
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers(1, 5);
  }, [fetchUsers]);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">
          Visualiza, crea, edita y elimina usuarios del sistema.
        </p>
      </div>
      <UserTable 
        initialUsers={users}
        pagination={pagination}
        fetchUsers={fetchUsers}
        isLoading={isLoading}
        currentUserRole={currentUser?.roles}
       />
    </div>
  );
}
