
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, notFound, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import TraditionalFormScoring from '@/components/dashboard/TraditionalFormScoring';
import { KarateEvent } from '@/lib/mock-data';
import CombatScoring from '@/components/dashboard/CombatScoring';
import { useEvents } from '@/contexts/EventContext';
import { Loader2 } from 'lucide-react';
import { PersonStanding, Swords, Gavel } from 'lucide-react';
import { getAllModalities, ApiModality } from '@/services/modalities-data';

export interface Division {
  id: string;
  category: string;
  modality: string;
  type: 'forma' | 'combate';
  icon: React.ElementType;
}

export default function ScoringFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { eventId, divisionId: rawDivisionId } = params;
  
  const [divisionId, categoryId, modalityId] = useMemo(() => {
    const parts = (rawDivisionId as string).split('-');
    return [rawDivisionId as string, parts[0], parts[1]];
  }, [rawDivisionId]);

  const judgeId = searchParams.get('judge');
  
  const [judgeName, setJudgeName] = useState<string | null>(null);

  const { events, isLoading: isEventsLoading } = useEvents();
  const [event, setEvent] = useState<KarateEvent | null>(null);
  const [division, setDivision] = useState<Division | null>(null);
  const [modalities, setModalities] = useState<ApiModality[]>([]);
  const [isModalitiesLoading, setIsModalitiesLoading] = useState(true);

  useEffect(() => {
    const storedJudge = sessionStorage.getItem('svram.selectedJudge');
    if (storedJudge) {
      try {
        const judge = JSON.parse(storedJudge);
        if (judge.id === judgeId) {
          setJudgeName(judge.name);
        }
      } catch (e) {
        console.error("Failed to parse judge info from sessionStorage", e);
      }
    }
  }, [judgeId]);
  
  useEffect(() => {
    getAllModalities()
        .then(setModalities)
        .catch(err => console.error("Failed to fetch modalities", err))
        .finally(() => setIsModalitiesLoading(false));
  }, []);

  useEffect(() => {
    if (!isEventsLoading && !isModalitiesLoading && eventId && categoryId && modalityId) {
      const foundEvent = events.find(e => e.id === eventId);
      if (foundEvent) {
        setEvent(foundEvent);
        
        const category = foundEvent.categories?.find(c => c.id === categoryId);
        const modality = modalities.find(m => m.id.toString() === modalityId);
        
        if (category && modality) {
            const modalityIcons: Record<string, React.ElementType> = {
                'Forma Tradicional': PersonStanding,
                'Forma con Armas': Swords,
                'Formas Extremas': Swords,
                'Combate Point Fighting': Swords,
                'Kickboxing - Musical Forms': PersonStanding,
                'Kickboxing - Light Contact': Swords,
                'Kickboxing - Full Contact': Swords,
            };
            setDivision({
                id: divisionId,
                category: category.name,
                modality: modality.name,
                type: modality.type === 'kata' ? 'forma' : 'combate',
                icon: modalityIcons[modality.name] || Gavel,
            });
            return;
        }

      } else {
        notFound();
      }
    }
  }, [eventId, divisionId, categoryId, modalityId, events, isEventsLoading, modalities, isModalitiesLoading]);


  if (isEventsLoading || isModalitiesLoading || !event || !division) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const commonProps = {
    event: event,
    division: division,
  };

  return (
    <div className="grid gap-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Puntuación de Atleta
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Evento: <span className="font-semibold">{event.name}</span> /
            División: <span className="font-semibold">{division.category} - {division.modality}</span>
            {judgeName && <> / Juez: <span className="font-semibold">{judgeName}</span></>}
          </p>
        </div>
      </div>
      {division.type === 'forma' ? (
        <TraditionalFormScoring {...commonProps} />
      ) : (
        <CombatScoring {...commonProps} />
      )}
    </div>
  );
}
