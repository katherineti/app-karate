'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getPaginatedModalities, createModality, updateModality, deleteModality, type ApiModality, type ModalityPayload, type ModalitiesMeta } from "@/services/modalities-data";
import { debounce } from "lodash";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const modalityFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  type: z.enum(['kata', 'combate'], { required_error: 'Debe seleccionar un tipo.' }),
  style: z.string().optional(),
  description: z.string().optional(),
}).refine(data => {
    if (data.type === 'kata') {
        return !!data.style && data.style.trim().length > 0;
    }
    return true;
}, {
    message: "El estilo es requerido para el tipo Forma / Kata.",
    path: ["style"],
});

type ModalityFormValues = z.infer<typeof modalityFormSchema>;

const ITEMS_PER_PAGE = 10;

export default function ModalitiesManager() {
  const [modalities, setModalities] = useState<ApiModality[]>([]);
  const [pagination, setPagination] = useState<ModalitiesMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [modalityToAction, setModalityToAction] = useState<ApiModality | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'kata' | 'combate'>("all");
  const { toast } = useToast();

  const fetchModalities = useCallback(async (page: number, search: string, type: 'all' | 'kata' | 'combate') => {
    setIsLoading(true);
    try {
      const response = await getPaginatedModalities({ page, limit: ITEMS_PER_PAGE, search, type });
      setModalities(response.data);
      setPagination(response.meta);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar modalidades",
        description: error instanceof Error ? error.message : "No se pudo conectar al servidor.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const debouncedFetch = useCallback(debounce((page, search, type) => {
    fetchModalities(page, search, type);
  }, 300), [fetchModalities]);
  
  useEffect(() => {
    debouncedFetch(1, searchTerm, typeFilter);
    return () => debouncedFetch.cancel();
  }, [searchTerm, typeFilter, debouncedFetch]);

  const form = useForm<ModalityFormValues>({
    resolver: zodResolver(modalityFormSchema),
    defaultValues: { name: "", type: "kata", style: "", description: "" },
  });
  
  const modalityType = form.watch("type");

  const handleAddClick = () => {
    setDialogMode('add');
    setModalityToAction(null);
    form.reset({ name: "", type: "kata", style: "", description: "" });
    setIsDialogOpen(true);
  };

  const handleEditClick = (modality: ApiModality) => {
    setDialogMode('edit');
    setModalityToAction(modality);
    form.reset({
      name: modality.name,
      type: modality.type,
      style: modality.style || "",
      description: modality.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (modality: ApiModality) => {
    setModalityToAction(modality);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = async (data: ModalityFormValues) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast({ variant: "destructive", title: "Error de autenticación." });
      return;
    }
    
    const payload: ModalityPayload = {
        name: data.name,
        type: data.type,
        style: data.style || null,
        description: data.description || null,
    };

    try {
      if (dialogMode === 'add') {
        await createModality(payload, token);
        toast({ title: "Modalidad Agregada", description: `La modalidad "${data.name}" ha sido creada.` });
      } else if (modalityToAction) {
        await updateModality(modalityToAction.id, payload, token);
        toast({ title: "Modalidad Actualizada", description: `La modalidad "${data.name}" ha sido actualizada.` });
      }
      
      fetchModalities(pagination?.page || 1, searchTerm, typeFilter);
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: dialogMode === 'add' ? "Error al agregar" : "Error al actualizar",
        description: error instanceof Error ? error.message : "No se pudo guardar la modalidad.",
      });
    }
  };

  const confirmDelete = async () => {
    if (!modalityToAction) return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({ variant: "destructive", title: "Error de autenticación." });
        return;
    }
    try {
      await deleteModality(modalityToAction.id, token);
      toast({ title: "Modalidad Eliminada", description: `La modalidad "${modalityToAction.name}" ha sido eliminada.` });
      fetchModalities(pagination?.page || 1, searchTerm, typeFilter);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar la modalidad.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setModalityToAction(null);
    }
  };
  
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= (pagination?.last_page || 1)) {
        fetchModalities(page, searchTerm, typeFilter);
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>Gestión de Modalidades</CardTitle>
              <CardDescription>
                Administra los tipos de competencia, tanto formas (kata) como combates (kumite).
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
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Tipos</SelectItem>
                        <SelectItem value="kata">Forma / Kata</SelectItem>
                        <SelectItem value="combate">Combate</SelectItem>
                    </SelectContent>
                </Select>
                <DialogTrigger asChild>
                  <Button onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Modalidad
                  </Button>
                </DialogTrigger>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estilo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalities.length > 0 ? modalities.map((modality) => (
                    <TableRow key={modality.id}>
                      <TableCell className="font-medium">{modality.name}</TableCell>
                      <TableCell>
                        <Badge variant={modality.type === 'kata' ? 'secondary' : 'default'} className={cn(modality.type === 'combate' && 'bg-blue-600 hover:bg-blue-700')}>
                          {modality.type === 'kata' ? 'Forma / Kata' : 'Combate'}
                        </Badge>
                      </TableCell>
                      <TableCell>{modality.style || 'N/A'}</TableCell>
                      <TableCell>{modality.description || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(modality)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(modality)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No se encontraron modalidades.
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
                      {Math.min(pagination.page * ITEMS_PER_PAGE, pagination.total)}</strong> de <strong>{pagination.total}</strong> modalidades
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Agregar Nueva Modalidad' : 'Editar Modalidad'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add' ? 'Completa la información para registrar una nueva modalidad.' : `Modifica los datos de la modalidad "${modalityToAction?.name}".`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Kumite Individual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tipo de Modalidad</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="kata" /></FormControl>
                          <FormLabel className="font-normal">Forma / Kata</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="combate" /></FormControl>
                          <FormLabel className="font-normal">Combate</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {modalityType === 'kata' && (
                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in-50">
                      <FormLabel>Estilo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Shotokan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe brevemente la modalidad..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogMode === 'add' ? 'Guardar Modalidad' : 'Guardar Cambios'}
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
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la modalidad <span className="font-bold">"{modalityToAction?.name}"</span>.
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
