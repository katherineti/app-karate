"use client";

import { useState, useReducer, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KarateEvent, schools as mockSchools, athletes as mockAthletes, Athlete } from '@/lib/mock-data';
import type { Division } from '@/app/dashboard/scoring/page';
import { cn } from '@/lib/utils';
import { Play, Pause, RefreshCw, AlertTriangle, Users, School, Loader2, ArrowLeftRight } from 'lucide-react';
import { Combobox } from '../ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';

interface CombatScoringProps {
  event: KarateEvent;
  division: Division;
}

interface MatchState {
  score_red: number;
  score_blue: number;
  fouls_red: number;
  fouls_blue: number;
  time_seconds: number;
  is_running: boolean;
  is_finished: boolean;
}

type MatchAction =
  | { type: 'ADD_SCORE'; player: 'red' | 'blue'; points: number }
  | { type: 'ADD_FOUL'; player: 'red' | 'blue' }
  | { type: 'START_TIMER' }
  | { type: 'PAUSE_TIMER' }
  | { type: 'TICK' }
  | { type: 'FINISH_MATCH' }
  | { type: 'RESET_MATCH' };

const initialTime = 0; // 2 minutes

const matchReducer = (state: MatchState, action: MatchAction): MatchState => {
  switch (action.type) {
    case 'ADD_SCORE':
      return {
        ...state,
        [`score_${action.player}`]: state[`score_${action.player}`] + action.points,
      };
    case 'ADD_FOUL':
      return {
        ...state,
        [`fouls_${action.player}`]: state[`fouls_${action.player}`] + 1,
      };
    case 'START_TIMER':
      return { ...state, is_running: true, is_finished: false };
    case 'PAUSE_TIMER':
      return { ...state, is_running: false };
    case 'TICK':
      return { ...state, time_seconds: state.time_seconds + 1 };
    case 'FINISH_MATCH':
      return { ...state, is_running: false, is_finished: true };
    case 'RESET_MATCH':
      return {
        score_red: 0,
        score_blue: 0,
        fouls_red: 0,
        fouls_blue: 0,
        time_seconds: initialTime,
        is_running: false,
        is_finished: false,
      };
    default:
      return state;
  }
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const capitalize = (s: string | null) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export default function CombatScoring({ event, division }: CombatScoringProps) {
  const { toast } = useToast();

  // States for Red Athlete
  const [schoolRed, setSchoolRed] = useState<string>("");
  const [athletesRed, setAthletesRed] = useState<Athlete[]>([]);
  const [isLoadingAthletesRed, setIsLoadingAthletesRed] = useState(false);
  const [athleteRed, setAthleteRed] = useState<Athlete | null>(null);

  // States for Blue Athlete
  const [schoolBlue, setSchoolBlue] = useState<string>("");
  const [athletesBlue, setAthletesBlue] = useState<Athlete[]>([]);
  const [isLoadingAthletesBlue, setIsLoadingAthletesBlue] = useState(false);
  const [athleteBlue, setAthleteBlue] = useState<Athlete | null>(null);
  
  const [isMatchStarted, setIsMatchStarted] = useState(false);

  const [state, dispatch] = useReducer(matchReducer, {
    score_red: 0,
    score_blue: 0,
    fouls_red: 0,
    fouls_blue: 0,
    time_seconds: initialTime,
    is_running: false,
    is_finished: false,
  });
  
  const fetchAthletesForSchool = async (schoolId: string, side: 'red' | 'blue') => {
    if (!schoolId) return;
    
    const setIsLoading = side === 'red' ? setIsLoadingAthletesRed : setIsLoadingAthletesBlue;
    const setAthletes = side === 'red' ? setAthletesRed : setAthletesBlue;
    const setAthlete = side === 'red' ? setAthleteRed : setAthleteBlue;

    setIsLoading(true);
    setAthletes([]);
    setAthlete(null);
    
    const selectedSchool = mockSchools.find(s => s.value.toString() === schoolId);
    if (selectedSchool) {
        const athletesOfSchool = mockAthletes.filter(a => a.escuela === selectedSchool.label);
        setAthletes(athletesOfSchool);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (state.is_running) {
      interval = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.is_running]);
  
  const handleScore = (player: 'red' | 'blue', points: number) => {
    if (!state.is_finished && state.is_running) {
        dispatch({ type: 'ADD_SCORE', player, points });
    }
  };
  
  const handleFoul = (player: 'red' | 'blue') => {
    if (!state.is_finished && state.is_running) {
        dispatch({ type: 'ADD_FOUL', player });
    }
  };

  const handleToggleTimer = () => {
    if (state.is_finished) return;
    if (state.is_running) {
      dispatch({ type: 'PAUSE_TIMER' });
    } else {
      dispatch({ type: 'START_TIMER' });
    }
  };

  const handleFinishReset = () => {
    if (state.is_finished || !state.is_running) {
      dispatch({ type: 'RESET_MATCH' });
    } else {
      dispatch({ type: 'FINISH_MATCH' });
    }
  };
  
  const getWinner = () => {
    if (!state.is_finished) return null;
    if (state.score_red > state.score_blue) return athleteRed ? `${athleteRed.nombres} ${athleteRed.apellidos}` : 'Rojo';
    if (state.score_blue > state.score_red) return athleteBlue ? `${athleteBlue.nombres} ${athleteBlue.apellidos}`: 'Azul';
    return 'Empate';
  }

  const schoolOptions = mockSchools.map(s => ({ value: s.value.toString(), label: s.label }));
  const athletesRedOptions = athletesRed.map(a => ({ value: a.id.toString(), label: `${a.nombres} ${a.apellidos}` }));
  const athletesBlueOptions = athletesBlue.map(a => ({ value: a.id.toString(), label: `${a.nombres} ${a.apellidos}` }));

  if (!isMatchStarted) {
    return (
      <Card className="w-full">
        <CardContent className="p-4 sm:p-6">
            <h3 className="text-xl font-semibold mb-4 text-center">Seleccionar Competidores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Red Athlete Selection */}
                <div className="space-y-4 p-4 rounded-lg bg-red-600/10 border border-red-600/20">
                    <h4 className="font-bold text-lg text-red-700">Atleta Rojo</h4>
                    <Combobox
                        items={schoolOptions}
                        value={schoolRed}
                        onSelect={(value) => {
                            setSchoolRed(value);
                            setAthleteRed(null);
                            fetchAthletesForSchool(value, 'red');
                        }}
                        searchPlaceholder="Buscar escuela..."
                        selectPlaceholder="Selecciona una escuela"
                        noResultsMessage="No se encontró la escuela."
                    />
                    {schoolRed && (
                         <Combobox
                            items={athletesRedOptions}
                            value={athleteRed?.id.toString() || ""}
                            onSelect={(value) => setAthleteRed(athletesRed.find(a => a.id.toString() === value) || null)}
                            searchPlaceholder="Buscar atleta..."
                            selectPlaceholder={isLoadingAthletesRed ? "Cargando..." : "Selecciona un atleta"}
                            noResultsMessage="No hay atletas."
                            disabled={!schoolRed || isLoadingAthletesRed}
                        />
                    )}
                </div>
                {/* Blue Athlete Selection */}
                <div className="space-y-4 p-4 rounded-lg bg-blue-600/10 border border-blue-600/20">
                    <h4 className="font-bold text-lg text-blue-700">Atleta Azul</h4>
                     <Combobox
                        items={schoolOptions}
                        value={schoolBlue}
                        onSelect={(value) => {
                            setSchoolBlue(value);
                            setAthleteBlue(null);
                            fetchAthletesForSchool(value, 'blue');
                        }}
                        searchPlaceholder="Buscar escuela..."
                        selectPlaceholder="Selecciona una escuela"
                        noResultsMessage="No se encontró la escuela."
                    />
                     {schoolBlue && (
                        <Combobox
                            items={athletesBlueOptions}
                            value={athleteBlue?.id.toString() || ""}
                            onSelect={(value) => setAthleteBlue(athletesBlue.find(a => a.id.toString() === value) || null)}
                            searchPlaceholder="Buscar atleta..."
                            selectPlaceholder={isLoadingAthletesBlue ? "Cargando..." : "Selecciona un atleta"}
                            noResultsMessage="No hay atletas."
                            disabled={!schoolBlue || isLoadingAthletesBlue}
                        />
                     )}
                </div>
            </div>
            <div className="mt-8 flex justify-center">
                <Button
                    size="lg"
                    onClick={() => setIsMatchStarted(true)}
                    disabled={!athleteRed || !athleteBlue}
                >
                    Iniciar Combate
                </Button>
            </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={() => setIsMatchStarted(false)}>
                <ArrowLeftRight className="mr-2 h-4 w-4"/>
                Cambiar Atletas
            </Button>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
          {/* Panel Rojo */}
          <PlayerPanel
            color="red"
            athleteName={`${capitalize(athleteRed?.nombres)} ${capitalize(athleteRed?.apellidos)}`}
            schoolName={mockSchools.find(s => s.value.toString() === schoolRed)?.label || 'N/A'}
            fouls={state.fouls_red}
            onScore={handleScore}
            onFoul={handleFoul}
            disabled={state.is_finished || !state.is_running}
          />

          {/* Panel Central */}
          <CentralPanel
            time={state.time_seconds}
            scoreRed={state.score_red}
            scoreBlue={state.score_blue}
            isRunning={state.is_running}
            isFinished={state.is_finished}
            winner={getWinner()}
            onToggleTimer={handleToggleTimer}
            onFinishReset={handleFinishReset}
          />

          {/* Panel Azul */}
          <PlayerPanel
            color="blue"
            athleteName={`${capitalize(athleteBlue?.nombres)} ${capitalize(athleteBlue?.apellidos)}`}
            schoolName={mockSchools.find(s => s.value.toString() === schoolBlue)?.label || 'N/A'}
            fouls={state.fouls_blue}
            onScore={handleScore}
            onFoul={handleFoul}
            disabled={state.is_finished || !state.is_running}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// --- Subcomponentes ---

interface PlayerPanelProps {
    color: 'red' | 'blue';
    athleteName: string;
    schoolName: string;
    fouls: number;
    onScore: (player: 'red' | 'blue', points: number) => void;
    onFoul: (player: 'red' | 'blue') => void;
    disabled: boolean;
}

const PlayerPanel = ({ color, athleteName, schoolName, fouls, onScore, onFoul, disabled }: PlayerPanelProps) => {
    const bgColor = color === 'red' ? 'bg-red-600/10' : 'bg-blue-600/10';
    const borderColor = color === 'red' ? 'border-red-600/30' : 'border-blue-600/30';
    const buttonBgColor = color === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600';

    return (
        <div className={cn("p-4 rounded-lg border flex flex-col gap-4", bgColor, borderColor)}>
             <div className="text-center">
                <h3 className="text-xl font-bold truncate">{athleteName}</h3>
                <p className="text-sm text-muted-foreground truncate">{schoolName}</p>
            </div>
            <div className="flex justify-center items-center gap-2">
                <span className="text-sm font-medium">Faltas:</span>
                <div className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={cn(
                            "h-3 w-3 rounded-full border border-muted-foreground",
                            i < fouls ? "bg-yellow-400" : "bg-muted/30"
                        )} />
                    ))}
                </div>
            </div>
             <div className="flex flex-col gap-2">
                <Button onClick={() => onScore(color, 1)} className={buttonBgColor} disabled={disabled}>+1 Punto</Button>
                <Button onClick={() => onScore(color, 2)} className={buttonBgColor} disabled={disabled}>+2 Puntos</Button>
                <Button onClick={() => onScore(color, 3)} className={buttonBgColor} disabled={disabled}>+3 Puntos</Button>
                <Button variant="outline" onClick={() => onFoul(color)} disabled={disabled}>Falta / Advertencia</Button>
            </div>
        </div>
    )
}

interface CentralPanelProps {
    time: number;
    scoreRed: number;
    scoreBlue: number;
    isRunning: boolean;
    isFinished: boolean;
    winner: string | null;
    onToggleTimer: () => void;
    onFinishReset: () => void;
}

const CentralPanel = ({ time, scoreRed, scoreBlue, isRunning, isFinished, winner, onToggleTimer, onFinishReset }: CentralPanelProps) => {
  return (
    <div className="flex flex-col items-center justify-between gap-6 p-4 h-full">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">Tiempo</p>
        <p className="text-5xl font-mono font-bold tracking-tighter tabular-nums">
          {formatTime(time)}
        </p>
      </div>

       <div className="flex items-center justify-center gap-4">
            <div className="text-7xl font-bold text-red-600 tabular-nums">{scoreRed}</div>
            <div className="text-4xl font-light text-muted-foreground">-</div>
            <div className="text-7xl font-bold text-blue-600 tabular-nums">{scoreBlue}</div>
       </div>

      {isFinished && winner && (
        <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 rounded-lg animate-in fade-in-50">
            <p className="font-bold text-lg">Ganador: {winner}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full">
        <Button onClick={onToggleTimer} variant="secondary" disabled={isFinished}>
            {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isRunning ? 'Pausar' : 'Comenzar'}
        </Button>
        <Button onClick={onFinishReset} variant="destructive">
            <RefreshCw className="mr-2 h-4 w-4" />
            {isFinished || !isRunning ? 'Reiniciar' : 'Finalizar'}
        </Button>
      </div>
    </div>
  )
}
