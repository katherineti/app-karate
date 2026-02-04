'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { athletes, Athlete, events } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Calendar, Download, Medal, Swords, Trophy, User, Fingerprint, Building } from 'lucide-react';
import { generateAthleteHistoryReport } from '@/lib/pdf-generator';

export default function AthleteRankingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const athleteId = params.athleteId as string;
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const rank = searchParams.get('rank');

  const athleteData = useMemo(() => {
    if (!athleteId) return null;
    const baseAthlete = athletes.find(a => a.id.toString() === athleteId);
    if (!baseAthlete) return null;

    const yearToFilter = parseInt(year, 10);
    const breakdownForYear = baseAthlete.rankingBreakdown
      ?.map(breakdown => {
        const event = events.find(e => e.id === breakdown.eventId);
        return { ...breakdown, type: event?.type, subtype: event?.subtype };
      })
      .filter(b => new Date(b.date).getFullYear() === yearToFilter) || [];

    const totalPoints = breakdownForYear.reduce((sum, item) => sum + item.points, 0);
    const oro = breakdownForYear.filter(b => b.medal === 'Oro').length;
    const plata = breakdownForYear.filter(b => b.medal === 'Plata').length;
    const bronce = breakdownForYear.filter(b => b.medal === 'Bronce').length;
    
    return {
      ...baseAthlete,
      ranking: totalPoints,
      oro,
      plata,
      bronce,
      rankingBreakdown: breakdownForYear,
      competitionsInYear: breakdownForYear.length,
    };
  }, [athleteId, year]);

  if (!athleteData) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Atleta no encontrado</h1>
        <p>No se pudo encontrar la información para el atleta seleccionado.</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Ranking
        </Button>
      </div>
    );
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };
  
  const handleDownloadCSV = () => {
    if (!athleteData || !athleteData.rankingBreakdown) return;

    const headers = [
      'Cedula',
      'Fecha del Evento',
      'Nombre del Evento',
      'Tipo de Evento',
      'Subtipo de Evento',
      'Categoría de Edad',
      'Modalidad Específica',
      'Puntaje / Marcador Final',
      'Medalla Obtenida',
      'Puntos Ganados',
    ];

    const csvRows = [headers.join(',')];

    athleteData.rankingBreakdown.forEach(item => {
      const row = [
        athleteData.cedula,
        format(new Date(item.date), 'yyyy-MM-dd', { locale: es }),
        `"${item.eventName}"`,
        item.type || 'N/A',
        item.subtype || 'N/A',
        `"${item.category}"`,
        `"${item.modality}"`,
        item.finalScore,
        `"${item.medal}"`,
        item.points,
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const fileName = `historial_medallas_${athleteData.nombres}_${athleteData.apellidos}.csv`.replace(/ /g, '_');
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
   const handleDownloadPDF = () => {
    const pdfBlob = generateAthleteHistoryReport(athleteData);
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `historial_medallas_${athleteData.nombres}_${athleteData.apellidos}.pdf`.replace(/ /g, '_');
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/dashboard/results')} className="w-fit">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Ranking
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
               <Avatar className="h-16 w-16 border">
                <AvatarImage src={`https://picsum.photos/seed/${athleteData.id}/200/200`} />
                <AvatarFallback>{getInitials(athleteData.nombres, athleteData.apellidos)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{athleteData.nombres} {athleteData.apellidos}</CardTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5">
                        <Building className="h-4 w-4"/>
                        <span>{athleteData.escuela}</span>
                    </div>
                     <div className="flex items-center gap-1.5">
                        <Fingerprint className="h-4 w-4"/>
                        <span className="font-mono">{athleteData.cedula}</span>
                    </div>
                </div>
              </div>
            </div>
             <div className="flex gap-4">
                {rank && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Posición ({year})</p>
                    <p className="text-4xl font-bold text-primary">#{rank}</p>
                  </div>
                )}
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Puntos Totales ({year})</p>
                    <p className="text-4xl font-bold text-primary">{athleteData.ranking}</p>
                </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between items-center text-sm">
             <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1.5" title="Competencias en el año">
                  <Swords className="h-4 w-4" />
                  <span className="font-medium">{athleteData.competitionsInYear || 0} Competencias</span>
                </div>
                 <div className="flex items-center gap-1.5" title="Edad del atleta">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{athleteData.edad} años</span>
                </div>
             </div>
             <div className="flex items-center gap-3 font-medium">
                <div className="flex items-center gap-1" title="Medallas de Oro">
                  <Medal className="h-5 w-5 text-yellow-500" />
                  <span className="font-mono">{athleteData.oro}</span>
                </div>
                <div className="flex items-center gap-1" title="Medallas de Plata">
                  <Medal className="h-5 w-5 text-gray-400" />
                  <span className="font-mono">{athleteData.plata}</span>
                </div>
                <div className="flex items-center gap-1" title="Medallas de Bronce">
                  <Medal className="h-5 w-5 text-amber-600" />
                  <span className="font-mono">{athleteData.bronce}</span>
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">Desglose de Puntuación ({year})</h3>
          {athleteData.rankingBreakdown && athleteData.rankingBreakdown.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo / Subtipo</TableHead>
                  <TableHead>Categoría / Modalidad</TableHead>
                  <TableHead>Medalla</TableHead>
                  <TableHead>Puntaje</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {athleteData.rankingBreakdown.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, index) => {
                  return (
                    <TableRow key={`${item.eventId}-${index}`}>
                      <TableCell className="font-medium">
                        <p>{item.eventName}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(item.date), 'dd MMM yyyy', {locale: es})}</TableCell>
                      <TableCell>
                        <p className="font-medium capitalize">{item.type || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{item.subtype || 'N/A'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.category}</p>
                        <p className="text-xs text-muted-foreground">{item.modality}</p>
                      </TableCell>
                      <TableCell>
                        {item.medal !== 'N/A' ? (
                          <Medal className={`h-5 w-5 ${item.medal === 'Oro' ? 'text-yellow-500' : item.medal === 'Plata' ? 'text-gray-400' : 'text-amber-600'}`} />
                        ): 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono">{item.finalScore}</TableCell>
                      <TableCell className="text-right font-mono text-primary font-semibold">+{item.points}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-lg">
                <Calendar className="mx-auto h-10 w-10 mb-4" />
                <p className="font-semibold">Sin Historial</p>
                <p className="text-sm">No hay registros de puntos para este atleta en el año {year}.</p>
            </div>
          )}
        </CardContent>
        <CardContent>
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleDownloadCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar CSV
                </Button>
                <Button variant="secondary" onClick={handleDownloadPDF}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
