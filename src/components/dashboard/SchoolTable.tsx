

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
import { PlusCircle, MoreHorizontal, Eye, Trash, Search, Edit, Building, Download, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { useToast } from "@/hooks/use-toast";
import { athletes } from "@/lib/mock-data";
import SchoolForm from "./SchoolForm";
import SchoolEditForm from "./SchoolEditForm";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getPaginatedSchools, deleteSchool as apiDeleteSchool, mapApiSchoolToLocal, type School, API_DOMAIN } from "@/services/school-data";
import { debounce } from "lodash";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";


const ITEMS_PER_PAGE = 8;

export default function SchoolTable() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  
  const [schoolsData, setSchoolsData] = useState<School[]>([]);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    currentPage: 1,
    totalPages: 1,
    pageSize: ITEMS_PER_PAGE,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

  const fetchSchools = useCallback(async (page: number, search?: string) => {
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({ variant: 'destructive', title: 'Error de Autenticación' });
        setIsLoading(false);
        return;
    }
    try {
        const response = await getPaginatedSchools(token, page, ITEMS_PER_PAGE, search);
        setSchoolsData(response.data.map(mapApiSchoolToLocal));
        setPagination({
            totalRecords: response.totalRecords,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize,
        });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error al cargar escuelas', description: (error as Error).message });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  const debouncedFetch = useCallback(debounce((search: string) => {
    fetchSchools(1, search);
  }, 500), [fetchSchools]);
  
  useEffect(() => {
    debouncedFetch(searchTerm);
    return () => debouncedFetch.cancel;
  }, [searchTerm, debouncedFetch]);

  const startIndex = (pagination.currentPage - 1) * pagination.pageSize + 1;
  const endIndex = Math.min(startIndex + pagination.pageSize - 1, pagination.totalRecords);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= pagination.totalPages) {
      fetchSchools(page, searchTerm);
    }
  };
  
  const handleViewClick = (school: School) => {
    setSelectedSchool(school);
    setViewDialogOpen(true);
  };

  const handleEditClick = (school: School) => {
    setSelectedSchool(school);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (school: School) => {
    setDeleteDialogOpen(true);
    setSelectedSchool(school);
  }
  
  const handleDownload = (school: School) => {
    setIsGeneratingPdf(school.id);
    const worker = new Worker(new URL('@/workers/pdf-worker', import.meta.url));

    worker.onmessage = (event: MessageEvent<Blob>) => {
      const blob = event.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${school.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      worker.terminate();
      setIsGeneratingPdf(null);
    };

    worker.onerror = (error) => {
      console.error('PDF Worker Error:', error);
      toast({
        variant: "destructive",
        title: "Error al generar PDF",
        description: "Hubo un problema al crear el reporte. Por favor, intenta de nuevo.",
      });
      worker.terminate();
      setIsGeneratingPdf(null);
    };

    const schoolAthletes = athletes.filter(a => a.escuela === school.name);
    const schoolToExport = {
        value: parseInt(school.id),
        label: school.name,
        logoUrl: school.logoUrl,
        maxScore: school.maxScore ?? 10
    };

    worker.postMessage({
      school: schoolToExport,
      athletes: schoolAthletes,
      maxScore: school.maxScore,
    });
  };

  const handleAddSuccess = () => {
    setAddDialogOpen(false);
    setSearchTerm("");
    fetchSchools(1, "");
  };

  const handleEditSuccess = (updatedSchool: School) => {
    setEditDialogOpen(false);
    fetchSchools(pagination.currentPage, searchTerm);
  };

  const confirmDelete = async () => {
    if (!selectedSchool) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
        toast({ variant: 'destructive', title: 'Error de Autenticación' });
        return;
    }
    
    try {
      await apiDeleteSchool(selectedSchool.id, token);
      toast({
          title: "Escuela Eliminada",
          description: `La escuela ${selectedSchool.name} ha sido eliminada con éxito.`,
      });
      fetchSchools(pagination.currentPage, searchTerm);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error al eliminar', description: (error as Error).message });
    } finally {
       setDeleteDialogOpen(false);
    }
  };
  
  return (
    <>
      <div className="border rounded-lg w-full bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b">
          <div className="relative w-full md:max-w-xs">
            <Input
              type="search"
              placeholder="Buscar por nombre..."
              className="pr-8 sm:w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
            />
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                <Button className="w-full md:w-auto" disabled={isLoading}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Agregar
                </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Registrar Nueva Escuela</DialogTitle>
                    <DialogDescription>
                    Completa el formulario para añadir una nueva escuela al sistema.
                    </DialogDescription>
                </DialogHeader>
                <SchoolForm onSuccess={handleAddSuccess} />
                </DialogContent>
            </Dialog>
        </div>
        
        {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Dirección</TableHead>
                  <TableHead className="hidden md:table-cell">Puntaje Máx.</TableHead>
                  <TableHead className="hidden lg:table-cell">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schoolsData.length > 0 ? (
                  schoolsData.map((school) => (
                    <TableRow key={school.id} className={cn(!school.is_active && "opacity-60")}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-md">
                                <AvatarImage src={school.logoUrl || undefined} className="rounded-md" />
                                <AvatarFallback className="rounded-md bg-muted">
                                    <Building className="h-5 w-5 text-muted-foreground" />
                                </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{school.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{school.address}</TableCell>
                      <TableCell className="hidden md:table-cell">{school.maxScore ?? 'N/A'}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={school.is_active ? 'secondary' : 'destructive'} className={cn(school.is_active && 'bg-green-100 text-green-800 border-green-200')}>
                          {school.is_active ? 'Habilitado' : 'Inhabilitado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewClick(school)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleEditClick(school)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(school)} disabled>
                                {isGeneratingPdf === school.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                {isGeneratingPdf === school.id ? 'Generando...' : 'Descargar PDF'}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50"
                                onClick={() => handleDeleteClick(school)}
                            >
                            <Trash className="mr-2 h-4 w-4" />
                            Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No se encontraron escuelas.
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
                        Mostrando <strong>{startIndex} - {endIndex}</strong> de <strong>{pagination.totalRecords}</strong> escuelas
                      </>
                    ) : (
                      'No hay escuelas que mostrar'
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1 || isLoading}
                    >
                      Anterior
                    </Button>
                     <span className="text-sm text-muted-foreground">
                        Página {pagination.currentPage} de {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages || isLoading}
                    >
                      Siguiente
                    </Button>
                  </div>
              </div>
            )}
          </>
        )}
      </div>

       {/* View School Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la Escuela</DialogTitle>
            <DialogDescription>
                Información de la escuela seleccionada.
            </DialogDescription>
          </DialogHeader>
          {selectedSchool && (
            <div className="grid gap-4 py-4 text-sm">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24 rounded-md">
                    <AvatarImage src={selectedSchool.logoUrl || undefined} className="rounded-md"/>
                    <AvatarFallback className="rounded-md bg-muted">
                        <Building className="h-10 w-10 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="rounded-lg border p-4 grid gap-3">
                  <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                    <label className="text-right font-medium text-muted-foreground">Nombre</label>
                    <p>{selectedSchool.name}</p>
                  </div>
                  <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                    <label className="text-right font-medium text-muted-foreground">Dirección</label>
                    <p>{selectedSchool.address}</p>
                  </div>
                  <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                    <label className="text-right font-medium text-muted-foreground">Puntaje Máximo</label>
                    <p>{selectedSchool.maxScore ?? 'No definido'}</p>
                  </div>
                   <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                    <label className="text-right font-medium text-muted-foreground">Estado</label>
                    <p>
                        <Badge variant={selectedSchool.is_active ? 'secondary' : 'destructive'} className={cn(selectedSchool.is_active && 'bg-green-100 text-green-800 border-green-200')}>
                          {selectedSchool.is_active ? 'Habilitado' : 'Inhabilitado'}
                        </Badge>
                    </p>
                  </div>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Edit School Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Escuela</DialogTitle>
            <DialogDescription>
              Modifica la información de la escuela seleccionada.
            </DialogDescription>
          </DialogHeader>
          {selectedSchool && (
            <SchoolEditForm
              school={selectedSchool}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
      
       {/* Delete School Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la escuela <span className="font-medium">{selectedSchool?.name}</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
