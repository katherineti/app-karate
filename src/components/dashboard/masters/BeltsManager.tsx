'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash, Loader2, Search } from "lucide-react";
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
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getKarateBelts, createKarateBelt, type ApiBelt, type PaginatedBeltsMeta, deleteKarateBelt, updateKarateBelt } from "@/services/belts-data";
import { debounce } from "lodash";

const beltFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  rank_order: z.coerce.number({invalid_type_error: "El orden es requerido."}).int("El orden debe ser un número entero.").min(1, "El orden debe ser un número positivo."),
  grade: z.string().optional(),
});

type BeltFormValues = z.infer<typeof beltFormSchema>;

const ITEMS_PER_PAGE = 5;

export default function BeltsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [belts, setBelts] = useState<ApiBelt[]>([]);
  const [pagination, setPagination] = useState<PaginatedBeltsMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [beltToAction, setBeltToAction] = useState<ApiBelt | null>(null);

  const fetchBelts = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast({ variant: "destructive", title: "Error de autenticación." });
      setIsLoading(false);
      return;
    }

    try {
      const response = await getKarateBelts(token, { page, limit: ITEMS_PER_PAGE, search });
      setBelts(response.data);
      setPagination(response.meta);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar cinturones",
        description: error instanceof Error ? error.message : "No se pudo conectar al servidor.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const debouncedFetch = useCallback(debounce((search: string) => {
    fetchBelts(1, search);
  }, 500), [fetchBelts]);

  useEffect(() => {
    debouncedFetch(searchTerm);
    return () => debouncedFetch.cancel();
  }, [searchTerm, debouncedFetch]);

  useEffect(() => {
    fetchBelts(1, "");
  }, [fetchBelts]);


  const form = useForm<BeltFormValues>({
    resolver: zodResolver(beltFormSchema),
    defaultValues: { name: "", rank_order: undefined, grade: "" },
  });
  
  useEffect(() => {
    if (dialogMode === 'edit' && beltToAction) {
        form.reset({
            name: beltToAction.belt,
            rank_order: beltToAction.rank_order,
            grade: beltToAction.grade || "",
        });
    } else {
        form.reset({ name: "", rank_order: undefined, grade: "" });
    }
  }, [dialogMode, beltToAction, form])

  const onSubmit = async (data: BeltFormValues) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast({ variant: "destructive", title: "Error de autenticación." });
      return;
    }

    try {
        if (dialogMode === 'add') {
            await createKarateBelt({ belt: data.name, rank_order: data.rank_order, grade: data.grade }, token);
            toast({ title: "Cinturón Agregado", description: `El cinturón "${data.name}" ha sido agregado.` });
        } else if (dialogMode === 'edit' && beltToAction) {
            await updateKarateBelt(beltToAction.id, { belt: data.name, rank_order: data.rank_order, grade: data.grade }, token);
            toast({ title: "Cinturón Actualizado", description: `El cinturón "${data.name}" ha sido actualizado.` });
        }
        
        fetchBelts(pagination?.page || 1, searchTerm);
        setIsDialogOpen(false);
    } catch (error) {
       toast({
        variant: "destructive",
        title: dialogMode === 'add' ? "Error al agregar" : "Error al actualizar",
        description: error instanceof Error ? error.message : "No se pudo guardar el cinturón.",
      });
    }
  };
  
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= (pagination?.lastPage || 1)) {
        fetchBelts(page, searchTerm);
    }
  };
  
  const handleEditClick = (belt: ApiBelt) => {
    setDialogMode('edit');
    setBeltToAction(belt);
    setIsDialogOpen(true);
  }
  
  const handleAddClick = () => {
    setDialogMode('add');
    setBeltToAction(null);
    setIsDialogOpen(true);
  }

  const handleDeleteClick = (belt: ApiBelt) => {
    setBeltToAction(belt);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!beltToAction) return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast({ variant: "destructive", title: "Error de autenticación." });
      return;
    }
    try {
      await deleteKarateBelt(beltToAction.id, token);
      toast({
        title: "Cinturón Eliminado",
        description: `El cinturón "${beltToAction.belt}" ha sido eliminado.`,
      });
      fetchBelts(pagination?.page || 1, searchTerm); // Refresh current page
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar el cinturón.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setBeltToAction(null);
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                  <CardTitle>Maestro de Cinturones</CardTitle>
                  <CardDescription>
                  Administra los diferentes niveles de cinturones reconocidos en el sistema.
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
                    Agregar
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
                              <TableHead>Nombre</TableHead>
                              <TableHead>Grado</TableHead>
                              <TableHead>Orden</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {belts.length > 0 ? belts.map((belt) => (
                              <TableRow key={belt.id}>
                                  <TableCell className="font-medium">{belt.belt}</TableCell>
                                  <TableCell>{belt.grade || 'N/A'}</TableCell>
                                  <TableCell>{belt.rank_order}</TableCell>
                                  <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(belt)}>
                                          <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(belt)}>
                                          <Trash className="h-4 w-4" />
                                  </Button>
                                  </TableCell>
                              </TableRow>
                          )) : (
                              <TableRow>
                                  <TableCell colSpan={4} className="h-24 text-center">
                                      No se encontraron cinturones.
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
                          {Math.min(pagination.page * ITEMS_PER_PAGE, pagination.total)}</strong> de <strong>{pagination.total}</strong> cinturones
                      </div>
                      <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading}>
                              Anterior
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.lastPage || isLoading}>
                              Siguiente
                          </Button>
                      </div>
                  </CardFooter>
            )}
          </Card>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>{dialogMode === 'add' ? 'Agregar Nuevo Cinturón' : 'Editar Cinturón'}</DialogTitle>
                  <DialogDescription>
                      {dialogMode === 'add' ? 'Completa la información para registrar un nuevo nivel de cinturón.' : `Modifica los datos del cinturón "${beltToAction?.belt}".`}
                  </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Nombre del Cinturón</FormLabel>
                                  <FormControl>
                                      <Input placeholder="Ej: Rojo" {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="rank_order"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Orden de Progresión</FormLabel>
                                  <FormControl>
                                      <Input type="number" placeholder="Ej: 1" {...field} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="grade"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Grado del Cinturón (Opcional)</FormLabel>
                                  <FormControl>
                                      <Input type="text" placeholder="Ej: 1º Kyu" {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {dialogMode === 'add' ? 'Guardar Cinturón' : 'Guardar Cambios'}
                      </Button>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente el cinturón <span className="font-bold">"{beltToAction?.belt}"</span>.
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
