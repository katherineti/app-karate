
import SchoolTable from '@/components/dashboard/SchoolTable';

export default function SchoolsPage() {
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Escuelas</h1>
        <p className="text-muted-foreground">
          Visualiza, crea, edita y elimina escuelas del sistema.
        </p>
      </div>
      <SchoolTable />
    </div>
  );
}
