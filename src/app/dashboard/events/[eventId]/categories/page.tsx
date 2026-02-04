

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { PlusCircle, Trash2, Shield, MoreHorizontal, Power, PowerOff, Edit, ArrowLeft, GitBranch, ChevronsRight, Repeat, Loader2 } from 'lucide-react';
import CategorySetupForm from '@/components/dashboard/CategorySetupForm';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useEvents } from '@/contexts/EventContext';
import type { KarateEvent, EventCategory } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getEventById } from '@/services/event-data';

const beltColors: { [key: string]: string } = {
  Blanco: 'bg-white text-black border border-gray-300',
  Amarillo: 'bg-yellow-400 text-black',
  Naranja: 'bg-orange-500 text-white',
  Verde: 'bg-green-600 text-white',
  Azul: 'bg-blue-600 text-white',
  Púrpura: 'bg-purple-600 text-white',
  Marrón: 'bg-amber-800 text-white',
  Negro: 'bg-black text-white',
};

const progressionIcons: Record<EventCategory['progressionSystem'], React.ElementType> = {
    simple: Repeat,
    sum: GitBranch,
    wkf: ChevronsRight,
};

const progressionLabels: Record<EventCategory['progressionSystem'], string> = {
    simple: 'Puntuación Simple',
    sum: 'Suma de Rondas',
    wkf: 'Eliminatoria WKF',
};

export default function EventCategoriesPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const { toast } = useToast();
  const { events, updateEvent, isLoading: isContextLoading } = useEvents();

  const [event, setEvent] = useState<KarateEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchEvent = async () => {
        if (!eventId) {
            setIsLoading(false);
            return;
        };

        setIsLoading(true);
        const eventFromContext = events.find(e => e.id === eventId);
        if (eventFromContext) {
            setEvent(eventFromContext);
            setIsLoading(false);
            return;
        }

        if (!isContextLoading) {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const fetchedEvent = await getEventById(eventId, token);
                    setEvent(fetchedEvent);
                } catch (error) {
                    console.error("Failed to fetch event", error);
                    toast({
                        variant: "destructive",
                        title: "Error al cargar el evento",
                        description: "No se pudo encontrar el evento seleccionado.",
                    });
                    notFound();
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
                notFound();
            }
        }
    };
    
    fetchEvent();

  }, [eventId, events, isContextLoading, toast]);


  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [categoryToEdit, setCategoryToEdit] = useState<EventCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<EventCategory | null>(null);
  const [categoryToToggle, setCategoryToToggle] = useState<EventCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  useEffect(() => {
    if (event) {
        setCategories(event.categories || []);
    }
  }, [event]);
  
  const handleSaveCategory = (category: EventCategory) => {
    if (!event) return;
    
    const isEditing = categories.some(c => c.id === category.id);
    let newCategories;

    if (isEditing) {
        newCategories = categories.map(c => c.id === category.id ? category : c);
    } else {
        newCategories = [...categories, category];
    }
    
    setCategories(newCategories);
    updateEvent({ ...event, categories: newCategories });
    setIsFormOpen(false);
    setCategoryToEdit(null);
  };
  
  const handleEditClick = (category: EventCategory) => {
    setCategoryToEdit(category);
    setIsFormOpen(true);
  }
  
  const handleDeleteCategory = (categoryId: string) => {
    if (!event) return;

    const newCategories = categories.filter(c => c.id !== categoryId);
    setCategories(newCategories);
    updateEvent({ ...event, categories: newCategories });
    setCategoryToDelete(null);
     toast({
        title: "Categoría Eliminada",
        description: "La categoría ha sido eliminada de este evento.",
    });
  }

  const handleToggleClick = (category: EventCategory) => {
    setCategoryToToggle(category);
  }

  const confirmToggleStatus = () => {
    if (!categoryToToggle || !event) return;
    
    const newCategories = categories.map(c => 
        c.id === categoryToToggle.id ? { ...c, enabled: !c.enabled } : c
    );
    
    setCategories(newCategories);
    updateEvent({ ...event, categories: newCategories });

    toast({
      title: `Categoría ${categoryToToggle.enabled ? 'Inhabilitada' : 'Habilitada'}`,
      description: `La categoría "${categoryToToggle.name}" ha sido actualizada.`,
    });
    setCategoryToToggle(null);
  };

  if (isLoading || !event) {
    return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/events`)}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Paso 1 de 2: Gestionar Categorías
                </h1>
                <p className="text-muted-foreground">
                   Define las categorías por edad y cinturón para el evento: <span className="font-semibold text-foreground">{event?.name}</span>
                </p>
            </div>
        </div>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setCategoryToEdit(null);
        }}>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Lista de Categorías</CardTitle>
                        <CardDescription>
                            {categories.length > 0 ? `Has creado ${categories.length} categoría(s). Haz clic en una para configurar sus modalidades.` : 'Crea tu primera categoría para este evento.'}
                        </CardDescription>
                    </div>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nueva Categoría
                        </Button>
                    </DialogTrigger>
                </div>
            </CardHeader>
            <CardContent>
                {categories.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map(cat => {
                            const ProgressionIcon = cat.progressionSystem ? progressionIcons[cat.progressionSystem] : GitBranch;
                            return (
                            <Link key={cat.id} href={`/dashboard/events/${eventId}/scoring-divisions?category=${cat.id}`} passHref>
                                <Card className={cn(
                                    "flex flex-col h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer", 
                                    !cat.enabled && "opacity-60 bg-muted/50 hover:border-transparent"
                                )}>
                                    <CardHeader className="flex flex-row items-start justify-between pb-4">
                                        <h3 className="font-semibold text-lg">{cat.name}</h3>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
                                                <DropdownMenuItem onClick={() => handleEditClick(cat)}>
                                                    <Edit className="mr-2 h-4 w-4"/>
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleClick(cat)}>
                                                    {cat.enabled ? <PowerOff className="mr-2 h-4 w-4"/> : <Power className="mr-2 h-4 w-4"/>}
                                                    {cat.enabled ? 'Inhabilitar' : 'Habilitar'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator/>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setCategoryToDelete(cat)}>
                                                    <Trash2 className="mr-2 h-4 w-4"/>
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardHeader>
                                    <CardContent className="space-y-4 flex-grow flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                Edades: {cat.minAge}-{cat.maxAge}
                                            </div>
                                            <Separator className="my-3"/>
                                            <div className="flex items-start gap-2">
                                                <Shield className="h-4 w-4 text-muted-foreground mt-1.5 flex-shrink-0" />
                                                <div className="flex flex-wrap gap-2">
                                                    {cat.belts.map(belt => (
                                                        <Badge key={belt} className={cn("text-xs font-semibold", beltColors[belt])}>{belt}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                         <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-3 border-t">
                                            <ProgressionIcon className="h-4 w-4" />
                                            <span className="font-medium">{cat.progressionSystem ? progressionLabels[cat.progressionSystem] : 'No definido'}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )})}
                    </div>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
                        <PlusCircle className="h-10 w-10 text-muted-foreground mb-4"/>
                        <p className="text-muted-foreground font-medium">Aún no has creado ninguna categoría.</p>
                        <p className="text-sm text-muted-foreground">Usa el botón 'Nueva Categoría' para empezar.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{categoryToEdit ? 'Editar Categoría' : 'Agregar Categoría al Evento'}</DialogTitle>
                <DialogDescription>
                    {categoryToEdit ? 'Modifica los parámetros de la categoría.' : 'Selecciona una categoría predefinida para agregarla a este evento.'}
                </DialogDescription>
            </DialogHeader>
            <CategorySetupForm eventId={eventId} onSave={handleSaveCategory} category={categoryToEdit} />
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro de eliminar esta categoría?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará la categoría <span className="font-bold">"{categoryToDelete?.name}"</span> de este evento.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => categoryToDelete && handleDeleteCategory(categoryToDelete.id)}
                    >
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!categoryToToggle} onOpenChange={(open) => !open && setCategoryToToggle(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Seguro que quieres {categoryToToggle?.enabled ? 'inhabilitar' : 'habilitar'} esta categoría?</AlertDialogTitle>
                    {categoryToToggle && (
                      <AlertDialogDescription>
                          {categoryToToggle.enabled
                              ? `La categoría "${categoryToToggle.name}" no estará disponible para la puntuación.`
                              : `La categoría "${categoryToToggle.name}" volverá a estar disponible para la puntuación.`
                          }
                      </AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCategoryToToggle(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmToggleStatus}>
                        Confirmar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
