'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventResults from '@/components/dashboard/results/EventResults';
import NationalRanking from '@/components/dashboard/results/NationalRanking';

export default function ResultsPage() {
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Resultados Oficiales y Ranking
        </h1>
        <p className="text-muted-foreground">
          Consulta los resultados de eventos finalizados y la clasificación nacional.
        </p>
      </div>

      <Tabs defaultValue="event-results" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="event-results">Resultados por Evento</TabsTrigger>
          <TabsTrigger value="national-ranking">Ranking Nacional</TabsTrigger>
        </TabsList>
        <TabsContent value="event-results" className="mt-6">
          <EventResults />
        </TabsContent>
        <TabsContent value="national-ranking" className="mt-6">
          <NationalRanking />
        </TabsContent>
      </Tabs>
    </div>
  );
}
