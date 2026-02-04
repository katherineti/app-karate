'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = "admin" | "master" | "alumno" | "representante" | "juez";

// Define la interfaz para un usuario.
interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  username?: string; // Nombre de usuario derivado del email
  email: string;
  roles: UserRole[];
  photoURL?: string;
  cedula?: string;
  dateOfBirth?: Date;
  schoolId?: string;
  school?: string;
  belt?: string;
  ranking?: number;
  representedStudents?: Pick<User, 'id' | 'firstName' | 'lastName'>[];
  document_type?: string; // <--- Añade esto
}

// Define la interfaz para el valor del contexto.
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

// Crea el contexto con un valor predeterminado.
const UserContext = createContext<UserContextType | undefined>(undefined);


// Crea el proveedor del contexto.
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.some(r => user.roles.includes(r));
  };

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, setIsLoading, hasRole }}>
      {children}
    </UserContext.Provider>
  );
};


// Hook personalizado para usar el contexto de usuario.
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
