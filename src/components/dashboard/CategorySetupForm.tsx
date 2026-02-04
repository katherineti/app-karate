'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { EventCategory } from '@/lib/mock-data';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { useEffect, useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { createCategory, CreateCategoryPayload, updateCategory, UpdateCategoryPayload, getAllCategories, ApiCategory } from '@/services/category-data';
import { Loader2 } from 'lucide-react';
import { Combobox } from '../ui/combobox';
import { cn } from '@/lib/utils';
import { toggleCategoryForEvent } from '@/services/event-data';

const belts = ["Blanco", "Amarillo", "Naranja", "Verde", "Azul", "Púrpura", "Marrón", "Negro"];

const beltIdToNameMap: Record<number, string> = {
    1: "Blanco", 2: "Amarillo", 3: "Naranja", 4: "Verde", 
    5: "Azul", 6: "Púrpura", 7: "Marrón", 8: "Negro"
};

const baseFormObject = {
  name: z.string().min(1, 'El nombre es requerido.'),
  minAge: z.coerce.number().int().min(0, 'La edad mínima no puede ser negativa.'),
  maxAge: z.coerce.number().int().min(1, 'La edad máxima debe ser al menos 1.'),
  belts: z.array(z.string()),
  progressionSystem: z.enum(['simple', 'sum', 'wkf'], { required_error: 'Debes seleccionar un sistema de progresión.' }),
};

const baseSchema = z.object(baseFormObject);


interface CategorySetupFormProps {
  eventId: string;
  onSave: (category: EventCategory) => void;
  category?: EventCategory | null;
}

export default function CategorySetupForm({ eventId, onSave, category }: CategorySetupFormProps) {
  const { toast } = useToast();
  const isEditMode = !!category;
  const [isSaving, setIsSaving] = useState(false);

  const [allCategories, setAllCategories] = useState<ApiCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const formSchema = useMemo(() => {
    let schema;
    if (isEditMode) {
      schema = baseSchema;
    } else {
      schema = baseSchema.extend({
        categoryId: z.string().min(1, 'Debes seleccionar una categoría para continuar.'),
      });
    }
    
    return schema.refine(data => data.maxAge >= data.minAge, {
        message: 'La edad máxima no puede ser menor que la edad mínima.',
        path: ['maxAge'],
    });
  }, [isEditMode]);


  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      minAge: 0,
      maxAge: 0,
      belts: [],
      progressionSystem: 'simple',
      ...(!isEditMode && { categoryId: '' }),
    } as any,
  });

  const selectedCategoryId = isEditMode ? null : form.watch('categoryId');

  useEffect(() => {
    if (isEditMode && category) {
      form.reset({
        name: category.name,
        minAge: category.minAge,
        maxAge: category.maxAge,
        belts: category.belts,
        progressionSystem: category.progressionSystem,
      });
    } else {
        const fetchCategories = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) return;
            setIsLoadingCategories(true);
            try {
                const categoriesData = await getAllCategories(token);
                setAllCategories(categoriesData);
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error al cargar categorías",
                    description: "No se pudo obtener la lista de categorías existentes.",
                });
            } finally {
                setIsLoadingCategories(false);
            }
        };
        fetchCategories();
    }
  }, [isEditMode, category, form, toast]);

  useEffect(() => {
    if (!isEditMode && selectedCategoryId) {
        const selectedCatData = allCategories.find(c => c.id.toString() === selectedCategoryId);
        if (selectedCatData) {
            const ageRangeStr = selectedCatData.age_range.replace(/\s*años/g, '').replace(' y más', '-99');
            const [minAgeStr, maxAgeStr] = ageRangeStr.split('-').map(s => s.trim());
            const minAge = parseInt(minAgeStr, 10);
            const maxAge = parseInt(maxAgeStr, 10);
            
            const beltNames = (selectedCatData.allowed_belts || []).map(id => beltIdToNameMap[id]).filter(Boolean);
            
            form.reset({
                categoryId: selectedCatData.id.toString(),
                name: selectedCatData.category,
                minAge: isNaN(minAge) ? 0 : minAge,
                maxAge: isNaN(maxAge) ? 0 : maxAge,
                belts: beltNames,
                progressionSystem: form.getValues('progressionSystem') || 'simple',
            });
        }
    }
  }, [selectedCategoryId, allCategories, form, isEditMode]);


  async function onSubmit(data: FormValues) {
    setIsSaving(true);
    
    if (isEditMode && category?.id) {
        const updatedCategoryForUI: EventCategory = {
            ...category,
            ...data,
        };
        onSave(updatedCategoryForUI);
        toast({
            title: 'Categoría Actualizada en el Evento',
            description: `Los detalles de la categoría "${data.name}" han sido actualizados para este evento.`,
        });
        setIsSaving(false);
        return;
    }
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({
            variant: "destructive",
            title: "Error de autenticación",
            description: "No se encontró el token de acceso.",
        });
        setIsSaving(false);
        return;
    }
    
    if (!('categoryId' in data) || !data.categoryId) {
        toast({
            variant: "destructive",
            title: "Error de validación",
            description: "Por favor, selecciona una categoría.",
        });
        setIsSaving(false);
        return;
    }
    
    try {
        const payload = {
            event_id: parseInt(eventId, 10),
            category_id: parseInt(data.categoryId, 10),
            is_active: "true"
        };
        
        await toggleCategoryForEvent(payload, token);

        const filledData = form.getValues();
        const newCategoryForEvent: EventCategory = {
            id: filledData.categoryId!,
            enabled: true,
            name: filledData.name!,
            minAge: filledData.minAge!,
            maxAge: filledData.maxAge!,
            belts: filledData.belts!,
            progressionSystem: filledData.progressionSystem,
        };

        onSave(newCategoryForEvent);
        toast({
            title: 'Categoría Agregada',
            description: `La categoría "${filledData.name}" se ha agregado al evento.`,
        });
        
        form.reset();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "No se pudo agregar la categoría.";
        toast({
            variant: "destructive",
            title: "Error de API",
            description: errorMessage,
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const categoryOptions = useMemo(() => (allCategories || []).map(c => ({
      value: c.id.toString(),
      label: `${c.category} (${c.age_range})`,
  })), [allCategories]);

  const selectedCategory = !isEditMode && selectedCategoryId ? allCategories.find(c => c.id.toString() === selectedCategoryId) : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 p-1">
            {!isEditMode && (
                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Categoría Existente <span className="text-destructive">*</span></FormLabel>
                            <Combobox
                                items={categoryOptions}
                                value={field.value}
                                onSelect={field.onChange}
                                selectPlaceholder="Selecciona una categoría"
                                searchPlaceholder="Buscar categoría..."
                                noResultsMessage={isLoadingCategories ? "Cargando..." : "No se encontraron categorías."}
                                disabled={isLoadingCategories}
                            />
                            <FormDescription>Selecciona una categoría predefinida para agregarla al evento.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {selectedCategory && (
              <div className="space-y-6 animate-in fade-in-50">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Categoría</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Infantil A, Adultos Kyu A" {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edad Mínima</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edad Máxima</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="belts"
                  render={() => (
                    <FormItem>
                      <FormLabel>Cinturones Permitidos</FormLabel>
                      <ScrollArea className="h-40 rounded-md border p-4">
                        <div className="space-y-2">
                            {belts.map(belt => (
                            <FormField
                                key={belt}
                                control={form.control}
                                name="belts"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(belt)}
                                        disabled
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal text-muted-foreground">{belt}</FormLabel>
                                </FormItem>
                                )}
                            />
                            ))}
                        </div>
                      </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <FormField
              control={form.control}
              name="progressionSystem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sistema de Progresión</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un sistema" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="simple">Puntuación Simple (1 Ronda)</SelectItem>
                          <SelectItem value="sum">Suma de Rondas (2 o más)</SelectItem>
                          <SelectItem value="wkf">Eliminatoria WKF</SelectItem>
                        </SelectContent>
                      </Select>
                  <FormDescription>
                    Define cómo avanzarán los atletas en esta categoría dentro de este evento.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>
        <Button type="submit" className="w-full mt-6" disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : isEditMode ? 'Guardar Cambios' : 'Agregar Categoría'}
        </Button>
      </form>
    </Form>
  );
}
