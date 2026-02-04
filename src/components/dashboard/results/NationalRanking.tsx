'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart2, Trophy, Swords } from 'lucide-react';
import { athletes, Athlete } from '@/lib/mock-data';
import { Combobox } from '@/components/ui/combobox';
import { useRouter } from 'next/navigation';
import { Medal } from 'lucide-react';
import { useProgressBar } from '@/contexts/ProgressBarContext';


export default function NationalRanking() {
  const router = useRouter();
  const { startProgress } = useProgressBar();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    athletes.forEach(athlete => {
      athlete.rankingBreakdown?.forEach(breakdown => {
        years.add(new Date(breakdown.date).getFullYear());
      });
    });
    // Add current year if not present
    years.add(new Date().getFullYear());
    
    return Array.from(years).sort((a, b) => b - a).map(year => ({
        value: year.toString(),
        label: `Ranking Nacional ${year}`
    }));
  }, []);
  
  const sortedAthletes = useMemo(() => {
    if (!selectedYear) return [];

    const yearToFilter = parseInt(selectedYear, 10);
    
    const athletesWithFilteredRanking = athletes.map(athlete => {
      const breakdownForYear = athlete.rankingBreakdown?.filter(b => new Date(b.date).getFullYear() === yearToFilter) || [];
      const totalPoints = breakdownForYear.reduce((sum, item) => sum + item.points, 0);
      const oro = breakdownForYear.filter(b => b.medal === 'Oro').length;
      const plata = breakdownForYear.filter(b => b.medal === 'Plata').length;
      const bronce = breakdownForYear.filter(b => b.medal === 'Bronce').length;

      return {
        ...athlete,
        ranking: totalPoints,
        oro: oro,
        plata: plata,
        bronce: bronce,
        rankingBreakdown: breakdownForYear,
        competitionsInYear: breakdownForYear.length,
      };
    });

    return athletesWithFilteredRanking
      .filter(a => a.ranking > 0)
      .sort((a, b) => b.ranking - a.ranking);
  }, [selectedYear]);

  const handleRowClick = (athlete: Athlete, index: number) => {
    startProgress();
    router.push(`/dashboard/results/${athlete.id}?year=${selectedYear}&rank=${index + 1}`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            Ranking Nacional Acumulado
          </CardTitle>
          <CardDescription>
            Clasificación general de atletas por temporada. Haz clic en un atleta para ver el desglose de sus puntos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Combobox
            items={availableYears}
            value={selectedYear}
            onSelect={setSelectedYear}
            selectPlaceholder="Selecciona el año"
            searchPlaceholder="Buscar año..."
            noResultsMessage="No se encontraron años."
            className="w-full sm:w-72"
           />
          {selectedYear ? (
            <div className="animate-in fade-in-50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Posición</TableHead>
                    <TableHead>Atleta</TableHead>
                    <TableHead>Escuela</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Competencias</TableHead>
                    <TableHead>Medallas</TableHead>
                    <TableHead className="text-right">Puntos Totales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAthletes.slice(0, 20).map((athlete, index) => (
                    <TableRow key={athlete.id} onClick={() => handleRowClick(athlete, index)} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-bold text-lg text-center">
                          <div className="flex items-center justify-center">
                              {index < 3 ? <Trophy className={`h-6 w-6 ${['text-yellow-500', 'text-gray-400', 'text-amber-600'][index]}`} /> : index + 1}
                          </div>
                      </TableCell>
                      <TableCell>{athlete.nombres} {athlete.apellidos}</TableCell>
                      <TableCell>{athlete.escuela}</TableCell>
                      <TableCell>{athlete.edad}</TableCell>
                      <TableCell className="text-center font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Swords className="h-4 w-4 text-muted-foreground" />
                          {athlete.competitionsInYear || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-sm font-medium">
                          <div className="flex items-center gap-1" title="Oro">
                            <Medal className="h-4 w-4 text-yellow-500" />
                            <span className="font-mono">{athlete.oro}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Plata">
                            <Medal className="h-4 w-4 text-gray-400" />
                            <span className="font-mono">{athlete.plata}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Bronce">
                            <Medal className="h-4 w-4 text-amber-600" />
                            <span className="font-mono">{athlete.bronce}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-base">{athlete.ranking}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-lg">
                <BarChart2 className="mx-auto h-12 w-12 mb-4" />
                <p className="font-semibold">Selecciona un año</p>
                <p className="text-sm">Elige una temporada para visualizar el ranking nacional.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
