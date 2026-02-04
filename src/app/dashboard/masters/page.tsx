'use client';

import BeltsManager from "@/components/dashboard/masters/BeltsManager";
import CategoriesManager from "@/components/dashboard/masters/CategoriesManager";
import ModalitiesManager from "@/components/dashboard/masters/ModalitiesManager";
import { useSearchParams } from "next/navigation";
import { Shield, ShieldQuestion, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const masterSections = [
    { id: 'belts', label: 'Cinturones', icon: Shield },
    { id: 'categories', label: 'Categorías', icon: ShieldQuestion },
    { id: 'modalities', label: 'Modalidades', icon: Swords },
];

export default function MastersPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'belts';

  const renderContent = () => {
    switch (tab) {
      case 'belts':
        return <BeltsManager />;
      case 'categories':
        return <CategoriesManager />;
      case 'modalities':
        return <ModalitiesManager />;
      default:
        return <BeltsManager />;
    }
  };

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maestros del Sistema</h1>
        <p className="text-muted-foreground">
          Gestiona los datos fundamentales para el funcionamiento del sistema de competencias.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b">
        {masterSections.map(section => (
            <Link 
                key={section.id} 
                href={`${pathname}?tab=${section.id}`}
                className={cn(
                    "flex items-center justify-center gap-2 p-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
                    tab === section.id && "border-b-2 border-primary text-primary"
                )}
                scroll={false}
            >
                <section.icon className="mr-1 h-4 w-4" />
                {section.label}
            </Link>
        ))}
      </div>
      
      <div className="mt-2">
        {renderContent()}
      </div>
    </div>
  );
}
