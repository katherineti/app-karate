'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { getPaginatedCategories, createCategory, updateCategory, type ApiCategory, type PaginatedCategoriesMeta, deleteCategory } from "@/services/category-data";
import { getAllKarateBelts, type ApiBelt as ApiBeltType } from "@/services/belts-data";
import { debounce } from "lodash";

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

const categoryFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  minAge: z.coerce.number().min(0, "La edad no puede ser negativa."),
  maxAge: z.coerce.number().min(1, "La edad debe ser mayor a 0."),
  belts: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Debes seleccionar al menos un cinturón.",
  }),
}).refine(data => data.maxAge > data.minAge, {
    message: "La edad máxima debe ser mayor a la edad mínima.",
    path: ['maxAge'],
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const ITEMS_PER_PAGE = 5;

export default function CategoriesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [categoryToAction, setCategoryToAction] = useState<ApiCategory | null>(null);

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [pagination, setPagination] = useState<PaginatedCategoriesMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  const [allBelts, setAllBelts] = useState<ApiBeltType[]>([]);
  const [isLoadingBelts, setIsLoadingBelts] = useState(true);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      minAge: 0,
      maxAge: 0,
      belts: [],
    },
  });

  useEffect(() => {
    if (dialogMode === 'edit' && categoryToAction) {
      const ageParts = categoryToAction.age_range.replace(/\s*años/g, '').replace(' y más', '-99').split('-').map(s => s.trim());
      const minAge = parseInt(ageParts[0], 10);
      const maxAge = parseInt(ageParts[1], 10);

      form.reset({
        name: categoryToAction.category,
        minAge: isNaN(minAge) ? 0 : minAge,
        maxAge: isNaN(maxAge) ? 99 : maxAge,
        belts: (categoryToAction.allowed_belts || []).map(String),
      });
    } else {
      form.reset({ name: "", minAge: 0, maxAge: 0, belts: [] });
    }
  }, [isDialogOpen, dialogMode, categoryToAction, form]);


  const fetchCategories = useCallback(async (page: number, search: string) => {
    setIsLoading(true);

    try {
      const response = await getPaginatedCategories({ page, limit: ITEMS_PER_PAGE, search });
      setCategories(response.data);
      setPagination(response.meta);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar categorías",
        description: error instanceof Error ? error.message : "No se pudo conectar al servidor.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const debouncedFetch = useCallback(debounce((search: string) => {
    fetchCategories(1, search);
  }, 500), [fetchCategories]);

  useEffect(() => {
    debouncedFetch(searchTerm);
    return () => debouncedFetch.cancel();
  }, [searchTerm, debouncedFetch]);

  useEffect(() => {
    fetchCategories(1, "");
  }, [fetchCategories]);
  
  useEffect(() => {
    const fetchAllBelts = async () => {
        setIsLoadingBelts(true);
        try {
            const beltsData = await getAllKarateBelts();
            setAllBelts(beltsData);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al cargar cinturones",
                description: "No se pudo obtener la lista completa de cinturones para el formulario.",
            });
        } finally {
            setIsLoadingBelts(false);
        }
    }

    fetchAllBelts();
  }, [toast]);
  
  const beltIdToNameMap = useMemo(() => {
    if (isLoadingBelts) return {};
    return allBelts.reduce((acc, belt) => {
        acc[belt.id] = belt.belt;
        return acc;
    }, {} as Record<number, string>);
  }, [allBelts, isLoadingBelts]);


  const onSubmit = async (data: CategoryFormValues) => {
    // @ts-ignore
    form.control.isSubmitting = true;
    try {
      const payload = {
        category: data.name,
        age_range: `${data.minAge}-${data.maxAge}años`,
        allowed_belts: data.belts.map(id => parseInt(id, 10)),
      };

      if (dialogMode === 'edit' && categoryToAction) {
        await updateCategory(categoryToAction.id, payload);
        toast({
          title: "Categoría Actualizada",
          description: `La categoría "${data.name}" ha sido actualizada.`,
        });
      } else {
        await createCategory(payload);
        toast({
          title: "Categoría Agregada",
          description: `La categoría "${data.name}" ha sido agregada exitosamente.`,
        });
      }
      
      fetchCategories(pagination?.page || 1, searchTerm); // Refresh list
      setIsDialogOpen(false);
    } catch (error) {
       toast({
        variant: "destructive",
        title: dialogMode === 'add' ? "Error al agregar" : "Error al actualizar",
        description: error instanceof Error ? error.message : "No se pudo guardar la categoría.",
      });
    } finally {
       // @ts-ignore
       form.control.isSubmitting = false;
    }
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= (pagination?.last_page || 1)) {
        fetchCategories(page, searchTerm);
    }
  };
  
  const handleAddClick = () => {
    setDialogMode('add');
    setCategoryToAction(null);
    setIsDialogOpen(true);
  };
  
  const handleEditClick = (category: ApiCategory) => {
    setDialogMode('edit');
    setCategoryToAction(category);
    setIsDialogOpen(true);
  };
  
  const handleDeleteClick = (category: ApiCategory) => {
    setCategoryToAction(category);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToAction) return;
    try {
      await deleteCategory(categoryToAction.id);
      toast({
        title: "Categoría Eliminada",
        description: `La categoría "${categoryToAction.category}" ha sido eliminada.`,
      });
      fetchCategories(pagination?.page || 1, searchTerm); // Refresh current page
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar la categoría.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setCategoryToAction(null);
    }
  };


  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Card>
              <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                      <CardTitle>Maestro de Categorías</CardTitle>
                      <CardDescription>
                      Define las categorías de competencia por edad y cinturón.
                      </CardDescription>
                  </div>
                   <div className="flex w-full md:w-auto gap-4">
                    <div className="relative flex-grow md:flex-grow-0">
                        <Input
                            type="search"
                            placeholder="Buscar por nombre..."
                            className="pr-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={isLoading}
                        />
                        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button onClick={handleAddClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Categoría
                    </Button>
                  </div>
              </CardHeader>
              <CardContent>
                  {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre de Categoría</TableHead>
                                <TableHead>Rango de Edad</TableHead>
                                <TableHead>Cinturones Permitidos</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categories.length > 0 ? categories.map((category) => (
                              <TableRow key={category.id}>
                                  <TableCell className="font-medium">{category.category}</TableCell>
                                  <TableCell>{category.age_range}</TableCell>
                                  <TableCell>
                                      <div className="flex flex-wrap gap-1 max-w-sm">
                                          {(category.allowed_belts || []).map(beltId => {
                                              const beltName = beltIdToNameMap[beltId];
                                              return (
                                                  <Badge key={beltId} className={cn("text-xs font-semibold", beltName && beltColors[beltName])}>
                                                      {beltName || '...'}
                                                  </Badge>
                                              )
                                          })}
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(category)}>
                                          <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(category)}>
                                          <Trash className="h-4 w-4" />
                                  </Button>
                                  </TableCell>
                              </TableRow>
                          )) : (
                             <TableRow>
                                  <TableCell colSpan={4} className="h-24 text-center">
                                      No se encontraron categorías.
                                  </TableCell>
                              </TableRow>
                          )}
                        </TableBody>
                    </Table>
                  )}
              </CardContent>
               {pagination && pagination.total > 0 && (
                    <CardFooter className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Mostrando <strong>{(pagination.page - 1) * ITEMS_PER_PAGE + 1}-
                            {Math.min(pagination.page * ITEMS_PER_PAGE, pagination.total)}</strong> de <strong>{pagination.total}</strong> categorías
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading}>
                                Anterior
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.last_page || isLoading}>
                                Siguiente
                            </Button>
                        </div>
                    </CardFooter>
              )}
          </Card>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>{dialogMode === 'add' ? 'Agregar Nueva Categoría' : 'Editar Categoría'}</DialogTitle>
                  <DialogDescription>
                      {dialogMode === 'add'
                          ? 'Completa la información para registrar una nueva categoría de competencia.'
                          : `Modifica los datos de la categoría "${categoryToAction?.category}".`}
                  </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                       <ScrollArea className="h-96 pr-4">
                          <div className="space-y-6">
                              <FormField
                                  control={form.control}
                                  name="name"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Nombre de la Categoría</FormLabel>
                                          <FormControl>
                                              <Input placeholder="Ej: Adulto Avanzado" {...field} />
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
                                                  <Input type="number" placeholder="Ej: 18" {...field} />
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
                                                  <Input type="number" placeholder="Ej: 35" {...field} />
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
                                          <div className="space-y-2 rounded-md border p-4">
                                              {isLoadingBelts ? (
                                                  <div className="flex items-center justify-center p-4">
                                                      <Loader2 className="h-5 w-5 animate-spin" />
                                                  </div>
                                              ) : allBelts.map((belt) => (
                                                  <FormField
                                                      key={belt.id}
                                                      control={form.control}
                                                      name="belts"
                                                      render={({ field }) => {
                                                      return (
                                                          <FormItem
                                                          key={belt.id}
                                                          className="flex flex-row items-center space-x-3 space-y-0"
                                                          >
                                                          <FormControl>
                                                              <Checkbox
                                                              checked={field.value?.includes(belt.id.toString())}
                                                              onCheckedChange={(checked) => {
                                                                  const beltIdStr = belt.id.toString();
                                                                  return checked
                                                                  ? field.onChange([...(field.value || []), beltIdStr])
                                                                  : field.onChange(
                                                                      (field.value || []).filter(
                                                                      (value) => value !== beltIdStr
                                                                      )
                                                                  )
                                                              }}
                                                              />
                                                          </FormControl>
                                                          <FormLabel className="font-normal">
                                                              {belt.belt}
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
                          </div>
                       </ScrollArea>
                      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {dialogMode === 'add' ? 'Guardar Categoría' : 'Guardar Cambios'}
                      </Button>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la categoría <span className="font-bold">"{categoryToAction?.category}"</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                    Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
