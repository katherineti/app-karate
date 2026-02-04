'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { Toaster } from '@/components/ui/toaster';
import { UserProvider, useUser, UserRole } from '@/contexts/UserContext';
import { PanelLeft } from 'lucide-react';
import PageProgressBar from '@/components/dashboard/PageProgressBar';
import { ProgressBarProvider } from '@/contexts/ProgressBarContext';
import { athletes } from '@/lib/mock-data';
import { EventProvider } from '@/contexts/EventContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { getUserDetail, UserData as ApiUser } from '@/services/user-data';

// Helper to decode JWT token
function decodeJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Error decoding JWT:", error);
        return null;
    }
}


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, setUser, isLoading, setIsLoading } = useUser();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadUserAndSchool = async () => {
      setIsLoading(true);
      const storedEmail = localStorage.getItem('userEmail');
      const token = localStorage.getItem('accessToken');
      
      if (storedEmail && token) {
        const decodedToken = decodeJwt(token);
        
        let schoolName: string | undefined;
        let schoolId: string | undefined = decodedToken?.school_id?.toString();
        let userDetails: ApiUser | null = null;

        try {
            if (decodedToken && decodedToken.sub) {
                userDetails = await getUserDetail(token, decodedToken.sub);
                schoolName = userDetails.school_name || undefined;
                if (userDetails.school_id) {
                    schoolId = userDetails.school_id.toString();
                }
            }
        } catch(e) {
            console.error("Could not fetch user school details on layout load, school name may be missing.", e)
        }
        
        const roleMapping: { [key: string]: UserRole } = {
          'administrador': 'admin',
          'master': 'master',
          'alumno': 'alumno',
          'representante': 'representante',
          'juez': 'juez',
        };
        
        const rolesFromToken = (decodedToken?.roles || []) as string[];
        const userRoles = rolesFromToken.map(r => roleMapping[r.toLowerCase().trim()]).filter(Boolean);

        const mockUser = athletes.find(a => 
          `${a.nombres.split(' ')[0].toLowerCase()}.${a.apellidos.split(' ')[0].toLowerCase()}@example.com` === storedEmail
        );
        
        const username = storedEmail.split('@')[0];
        const firstName = userDetails?.name || decodedToken?.name || '';
        const lastName = userDetails?.lastname || decodedToken?.lastname || '';

        const storedPhoto = typeof window !== 'undefined' ? localStorage.getItem(`user_photo_${decodedToken.sub}`) : null;
        const photoURL = storedPhoto || userDetails?.profile_picture || `https://picsum.photos/seed/${decodedToken.sub}/200/200`;

        setUser({
          id: decodedToken?.sub || "1",
          firstName: firstName,
          lastName: lastName,
          username: username,
          email: storedEmail,
          roles: userRoles.length > 0 ? userRoles : ['alumno'], // Default to 'alumno' if no roles found
          photoURL: photoURL,
          cedula: mockUser?.cedula || "V-12.345.678",
          dateOfBirth: new Date(1990, 5, 15),
          schoolId: schoolId,
          school: schoolName,
          belt: mockUser?.cinturon ||"Negro",
          ranking: mockUser?.ranking || 1,
          representedStudents: [
            { id: 202501, firstName: 'Pedro', lastName: 'Salas' },
            { id: 202502, firstName: 'Ana', lastName: 'González' }
          ]
        });
      }

      setIsLoading(false);
    }
    
    loadUserAndSchool();
  }, [setUser, setIsLoading]);

  useEffect(() => {
    if (!isLoading && !user) {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null; // O un componente de redirección
  }

  return (
    <ProgressBarProvider>
      <NotificationProvider>
        <EventProvider>
          <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <PageProgressBar />
            <Sidebar isOpen={isSidebarOpen} />
            <div className={`flex flex-col sm:gap-4 sm:py-4 transition-all duration-300 ${isSidebarOpen ? 'sm:pl-64' : 'sm:pl-14'}`}>
              <DashboardHeader>
                  <button onClick={() => setSidebarOpen(prev => !prev)} className="hidden sm:inline-flex p-2 rounded-md hover:bg-muted-foreground/20 transition-colors">
                      <PanelLeft className="h-5 w-5" />
                  </button>
              </DashboardHeader>
              <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="mx-auto grid w-full max-w-7xl gap-2">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </EventProvider>
      </NotificationProvider>
    </ProgressBarProvider>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <NotificationProvider>
        <EventProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
          <Toaster />
        </EventProvider>
      </NotificationProvider>
    </UserProvider>
  );
}
