'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
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
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

// ** IMPORTAR SERVICIO DE REGISTRO **
import { registerUser } from "@/services/auth"; 

// 1. Definición del Esquema y Tipado
const formSchema = z.object({
  email: z.string().email("Correo electrónico no válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."), 
  // roles_ids es obligatorio a nivel de datos, aunque no se muestre
  roles_ids: z.array(z.number()).min(1, "Debe asignarse al menos un rol."),
});

type RegisterFormValues = z.infer<typeof formSchema>;

// Constante para el ID del rol de Administrador
const ID_ROL_ADMINISTRADOR = 1;


export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      // 💥 CRÍTICO: Asignación del valor de Rol usando la constante
      roles_ids: [ID_ROL_ADMINISTRADOR], 
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsLoading(true);
    
    try {
        // La variable 'values' incluye automáticamente 'roles_ids'
        const successMessage = await registerUser(values); 

        toast({
            title: "Registro Exitoso",
            description: successMessage,
        });

        // Redirigir a Login después de un breve momento
        setTimeout(() => {
             router.push("/login");
        }, 1500);

    } catch (error) {
        console.error("Error al registrar usuario:", error);
        
        const errorMessage = error instanceof Error 
            ? error.message 
            : "Error desconocido al intentar registrarse.";
        
        toast({
            title: "Error de Registro",
            description: errorMessage,
            variant: "destructive",
        });

    } finally {
        setIsLoading(false);
    }
  }

  const togglePasswordVisibility = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    setShowPassword(prev => !prev);
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="hidden lg:block lg:fixed lg:top-0 lg:right-0 lg:w-1/2 lg:h-full">
        <div className="relative flex flex-col items-center justify-center h-full bg-gray-900 text-white text-center p-12">
          <video
            src="/videos/videoQuienesSomos.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative z-10 space-y-4">
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight">
              Únete a la comunidad SVRAM
            </h1>
            <p className="text-lg xl:text-xl text-white/80 max-w-lg">
              Crea tu cuenta y empieza a forjar tu camino.
            </p>
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-1/2 lg:mr-[50%] h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto min-h-screen">
        <div className="mx-auto grid w-full max-w-md gap-8">
            <Link href="/" className="justify-self-start">
                <Button variant="ghost">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al inicio
                </Button>
            </Link>
          <div className="grid gap-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Crear una Cuenta</h1>
            <p className="text-muted-foreground">
              Introduce tus datos para registrarte.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              {/* Campo Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Campo Password (con visibilidad) */}
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
                          disabled={isLoading}
                          {...field} 
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
              {/* 💥 CAMPO ROLES_IDS OMITIDO DEL JSX 💥 - Se envía automáticamente con el valor por defecto */}
              
              <Button 
                type="submit" 
                className="w-full py-6 text-base font-semibold mt-2"
                disabled={isLoading} 
              >
                {isLoading ? 'Registrando...' : 'Registrarse'}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="underline font-semibold">
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
