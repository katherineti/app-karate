
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { events as mockEvents, officialResults, officialCombatResults } from '@/lib/mock-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Users, BarChart, ChevronDown, Award, Save, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/UserContext';
import CombatBracket from './CombatBracket';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const formModalities = ['Forma Tradicional', 'Forma con Armas', 'Formas Extremas', 'Kickboxing - Musical Forms'];

interface Standing {
  athleteId: string;
  athleteName: string;
  schoolName: string;
  final_score: number;
  final_score_breakdown: {
    scores: EditableScore[];
  };
}

interface DivisionResult {
  eventId: string;
  divisionId: string;
  category: string;
  modality: string;
  standings: Standing[];
}

interface EditableScore {
    judgeId: number;
    control: number;
    presence: number;
    presentation: number;
    total: number;
}

// Esto define un objeto cuyas llaves son strings y sus valores son DivisionResult
type ResultsDataMap = Record<string, DivisionResult>;

export default function EventResults() {
  const { hasRole } = useUser();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [isAuditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedResultForAudit, setSelectedResultForAudit] = useState<any>(null);
  const [selectedMatchForAudit, setSelectedMatchForAudit] = useState<any>(null);
  const [editableScores, setEditableScores] = useState<EditableScore[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  
  const [resultsData, setResultsData] = useState<ResultsDataMap>(officialResults.results as ResultsDataMap);

  const isAdmin = hasRole('admin');

  useEffect(() => {
    if (selectedResultForAudit && selectedResultForAudit.final_score_breakdown) {
      setEditableScores(
        selectedResultForAudit.final_score_breakdown.scores.map((s: any) => ({ ...s }))
      );
    }
  }, [selectedResultForAudit]);
  
  const handleScoreChange = (judgeIndex: number, field: 'control' | 'presence' | 'presentation', value: string) => {
    const numericValue = parseFloat(value) || 0;
    const newScores = [...editableScores];
    const scoreToUpdate = { ...newScores[judgeIndex], [field]: numericValue };

    // Recalculate total for the specific judge
    scoreToUpdate.total = scoreToUpdate.control + scoreToUpdate.presence + scoreToUpdate.presentation;
    
    newScores[judgeIndex] = scoreToUpdate;
    setEditableScores(newScores);
  };

  // Recalculate final score based on editable scores
  const recalculatedFinalScore = useMemo(() => {
    if (editableScores.length < 3) return 0;
    
    const totals = editableScores.map(s => s.total);
    const sortedTotals = [...totals].sort((a, b) => a - b);
    
    // Discard highest and lowest
    const scoresToSum = sortedTotals.slice(1, -1);
    
    const sum = scoresToSum.reduce((acc, score) => acc + score, 0);
    return parseFloat(sum.toFixed(1));
  }, [editableScores]);

  const handleRecalculate = () => {
    const resultKey = `${selectedEventId}-${selectedDivisionId}`;
    const divisionResults = resultsData[resultKey];

    if (!divisionResults || !selectedResultForAudit) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron encontrar los datos para actualizar." });
        return;
    }
    
    // Update the specific athlete's score and breakdown
    const updatedStandings = divisionResults.standings.map((standing: Standing) => {
        if (standing.athleteId === selectedResultForAudit.athleteId) {
            return {
                ...standing,
                final_score: recalculatedFinalScore,
                final_score_breakdown: {
                    ...standing.final_score_breakdown,
                    scores: editableScores,
                }
            };
        }
        return standing;
    });

    // Re-sort the standings based on the new scores
    updatedStandings.sort((a, b) => b.final_score - a.final_score);

    // Update the main results state
    setResultsData(prevData => ({
        ...prevData,
        [resultKey]: {
            ...divisionResults,
            standings: updatedStandings,
        }
    }));
    
    toast({
        title: "Puntuación Recalculada",
        description: "Los puntajes han sido corregidos y el resultado final ha sido actualizado."
    });
    
    setAuditModalOpen(false);
    setIsEditMode(false);
  };

  const finishedEvents = useMemo(() => {
    return mockEvents.filter(e => e.status === 'finalizado');
  }, []);

  const eventOptions = useMemo(() => {
    return finishedEvents.map(e => ({ value: e.id, label: e.name }));
  }, [finishedEvents]);

  const divisionsForSelectedEvent = useMemo(() => {
    if (!selectedEventId) return [];
    
    const formDivisions = Object.values(resultsData)
      .filter(r => r.eventId === selectedEventId)
      .map(r => ({ value: r.divisionId, label: `${r.category} / ${r.modality}` }));

    const combatDivisions = Object.keys(officialCombatResults)
      .filter(key => key.startsWith(selectedEventId))
      .map(key => {
        const combatData = (officialCombatResults as any)[key];
        const divisionId = key.substring(selectedEventId.length + 1); 
        const category = combatData?.category || 'Combate';
        const modality = combatData?.modality || 'Point Fighting';
        return {
          value: divisionId,
          label: `${category} / ${modality}`
        }
      });
      
    const allDivisions = [...formDivisions, ...combatDivisions];

    return allDivisions.filter((v, i, a) => a.findIndex(t => t.value === v.value) === i); // Unique divisions
  }, [selectedEventId, resultsData]);

  const results = useMemo(() => {
    if (!selectedEventId || !selectedDivisionId) return null;
    return resultsData[`${selectedEventId}-${selectedDivisionId}`] || null;
  }, [selectedEventId, selectedDivisionId, resultsData]);

  const combatResults = useMemo(() => {
    if (!selectedEventId || !selectedDivisionId) return null;
    const key = `${selectedEventId}-${selectedDivisionId}`;
    return (officialCombatResults as any)[key] || null;
  }, [selectedEventId, selectedDivisionId]);
  
  const handleAuditClick = (result: any) => {
    if (!isAdmin) return;
    setSelectedResultForAudit(result);
    setSelectedMatchForAudit(null);
    setAuditModalOpen(true);
    setIsEditMode(false); // Reset to view mode on open
  };
  
  const handleCombatAuditClick = (match: any) => {
    if (!isAdmin) return;
    const matchEvents = (officialCombatResults.matchEvents as any)[match.id];
    setSelectedMatchForAudit({ match, events: matchEvents });
    setSelectedResultForAudit(null);
    setAuditModalOpen(true);
    setIsEditMode(false); // Reset to view mode on open
  };

  const renderResults = () => {
    const selectedDivision = divisionsForSelectedEvent.find(d => d.value === selectedDivisionId);
    if (!selectedDivision) return null;

    const divisionModality = results?.modality || combatResults?.modality || '';

    if (results && formModalities.includes(divisionModality)) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Posición</TableHead>
              <TableHead>Atleta</TableHead>
              <TableHead>Escuela</TableHead>
              <TableHead className="text-right">Puntaje Final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.standings.map((res, index) => (
              <TableRow key={res.athleteId} className={isAdmin ? "cursor-pointer hover:bg-muted/50" : ""} onClick={() => isAdmin && handleAuditClick(res)}>
                <TableCell className="font-bold text-center">
                  <div className="flex items-center justify-center">
                    {index < 3 ? <Trophy className={`h-5 w-5 ${['text-yellow-500', 'text-gray-400', 'text-amber-600'][index]}`} /> : index + 1}
                  </div>
                </TableCell>
                <TableCell>{res.athleteName}</TableCell>
                <TableCell>{res.schoolName}</TableCell>
                <TableCell className="text-right font-mono">{res.final_score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (combatResults) {
        return <CombatBracket bracketData={combatResults} onMatchClick={handleCombatAuditClick} />
    }

    return null;
  };

  const renderAuditContent = () => {
    if (selectedResultForAudit) {
        // Find the discarded scores based on the raw totals
        const originalTotals = selectedResultForAudit.final_score_breakdown.scores.map((s: any) => s.total);
        const minOriginal = Math.min(...originalTotals);
        const maxOriginal = Math.max(...originalTotals);

        return (
            <div className="space-y-4 py-4">
                 <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                    <span className="font-semibold text-muted-foreground">Puntaje Final {isEditMode ? 'Recalculado' : 'Oficial'}</span>
                    <span className="font-bold text-2xl text-primary">{recalculatedFinalScore}</span>
                </div>
                <Separator/>
                <h4 className="font-semibold">Votos de los Jueces</h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Juez</TableHead>
                            <TableHead className="text-center w-24">Control</TableHead>
                            <TableHead className="text-center w-24">Presencia</TableHead>
                            <TableHead className="text-center w-24">Presentación</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {editableScores.map((score, index) => {
                            const originalScore = selectedResultForAudit.final_score_breakdown.scores[index];
                            const isDiscarded = originalScore.total === minOriginal || originalScore.total === maxOriginal;
                            return (
                                <TableRow key={index} className={cn(isDiscarded && !isEditMode && "bg-muted/30 opacity-70")}>
                                    <TableCell className="font-medium">Juez {score.judgeId}</TableCell>
                                    <TableCell>
                                        {isEditMode ? (
                                            <Input type="number" step="0.1" className="h-8 text-center" value={score.control} onChange={(e) => handleScoreChange(index, 'control', e.target.value)} />
                                        ) : (
                                            <div className="text-center">{score.control.toFixed(1)}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {isEditMode ? (
                                            <Input type="number" step="0.1" className="h-8 text-center" value={score.presence} onChange={(e) => handleScoreChange(index, 'presence', e.target.value)} />
                                        ) : (
                                             <div className="text-center">{score.presence.toFixed(1)}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {isEditMode ? (
                                            <Input type="number" step="0.1" className="h-8 text-center" value={score.presentation} onChange={(e) => handleScoreChange(index, 'presentation', e.target.value)} />
                                        ) : (
                                            <div className="text-center">{score.presentation.toFixed(1)}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">{score.total.toFixed(1)}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                {!isEditMode && <p className="text-xs text-muted-foreground pt-2">Las filas atenuadas representan los puntajes originales más alto y más bajo que fueron descartados del cálculo inicial.</p>}
             </div>
        )
    }
    if (selectedMatchForAudit) {
        return (
             <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="font-bold text-lg text-red-600">{combatResults.getAthlete(selectedMatchForAudit.match.athlete1Id)}</p>
                        <p className="font-mono text-3xl">{selectedMatchForAudit.match.score1}</p>
                    </div>
                     <div>
                        <p className="font-bold text-lg text-blue-600">{combatResults.getAthlete(selectedMatchForAudit.match.athlete2Id)}</p>
                        <p className="font-mono text-3xl">{selectedMatchForAudit.match.score2}</p>
                    </div>
                </div>
                <Separator/>
                <h4 className="font-semibold">Historial del Encuentro</h4>
                {selectedMatchForAudit.events && selectedMatchForAudit.events.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tiempo</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead className="text-right">Marcador</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedMatchForAudit.events.map((event: any, index: number) => (
                                <TableRow key={index}>
                                    <TableCell className="font-mono text-xs">{event.timestamp}</TableCell>
                                    <TableCell className={event.player === 'red' ? 'text-red-600' : 'text-blue-600'}>{event.event}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{event.scoreRed} - {event.scoreBlue}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay eventos registrados para este encuentro.</p>
                )}
             </div>
        )
    }
    return null;
  }
  
  const getAuditDescription = () => {
    if (selectedResultForAudit) return `Desglose de la puntuación para ${selectedResultForAudit?.athleteName}.`;
    if (selectedMatchForAudit && combatResults) return `Historial del encuentro entre ${combatResults.getAthlete(selectedMatchForAudit.match.athlete1Id)} y ${combatResults.getAthlete(selectedMatchForAudit.match.athlete2Id)}.`;
    return "";
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Resultados por Evento
        </CardTitle>
        <CardDescription>
          Selecciona un evento y una división para ver la clasificación final.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Combobox
            items={eventOptions}
            value={selectedEventId}
            onSelect={(value) => {
              setSelectedEventId(value);
              setSelectedDivisionId('');
            }}
            selectPlaceholder="Selecciona un Evento"
            searchPlaceholder="Buscar evento..."
            noResultsMessage="No hay eventos finalizados."
          />
          <Combobox
            items={divisionsForSelectedEvent}
            value={selectedDivisionId}
            onSelect={setSelectedDivisionId}
            selectPlaceholder="Selecciona una División"
            searchPlaceholder="Buscar división..."
            noResultsMessage="No hay divisiones."
            disabled={!selectedEventId}
          />
        </div>

        { (results || combatResults) && (
          <div className="pt-4 animate-in fade-in-50">
            <h3 className="text-lg font-semibold mb-4">Clasificación: {divisionsForSelectedEvent.find(d => d.value === selectedDivisionId)?.label}</h3>
            {renderResults()}
          </div>
        )}

        <Dialog open={isAuditModalOpen} onOpenChange={setAuditModalOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Auditoría de Puntuación</DialogTitle>
                    <DialogDescription>
                       {getAuditDescription()}
                    </DialogDescription>
                </DialogHeader>
                 {renderAuditContent()}
                 {selectedResultForAudit && (
                    <DialogFooter>
                        {isEditMode ? (
                            <>
                                <Button variant="ghost" onClick={() => setIsEditMode(false)}>Cancelar</Button>
                                <Button onClick={handleRecalculate}><Save className="mr-2 h-4 w-4" />Guardar Correcciones</Button>
                            </>
                        ) : (
                            <>
                                <Button variant="secondary" onClick={() => setAuditModalOpen(false)}>Cerrar</Button>
                                <Button onClick={() => setIsEditMode(true)}><Edit className="mr-2 h-4 w-4" />Habilitar Edición</Button>
                            </>
                        )}
                    </DialogFooter>
                 )}
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
