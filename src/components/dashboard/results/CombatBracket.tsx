'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Award, User } from 'lucide-react';

interface Match {
  id: string;
  athlete1Id: string;
  athlete2Id: string;
  score1: number;
  score2: number;
  winnerId: string;
}

interface Round {
  name: string;
  matches: Match[];
}

interface CombatBracketProps {
  bracketData: {
    rounds: Round[];
    getAthlete: (id: string) => string;
  };
  onMatchClick: (match: Match) => void;
}

const MatchCard = ({ match, getAthleteName, onAuditClick }: { match: Match; getAthleteName: (id: string) => string; onAuditClick: () => void; }) => {
  const athlete1Name = getAthleteName(match.athlete1Id);
  const athlete2Name = getAthleteName(match.athlete2Id);

  const isWinner1 = match.winnerId === match.athlete1Id;
  const isWinner2 = match.winnerId === match.athlete2Id;

  return (
    <div 
        className="bg-card border rounded-lg p-3 w-56 text-sm hover:shadow-lg transition-shadow cursor-pointer"
        onClick={onAuditClick}
    >
      <div
        className={cn(
          "flex justify-between items-center p-2 rounded-t-md",
          isWinner1 ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground"
        )}
      >
        <span className="truncate">{athlete1Name}</span>
        <span className={cn("font-mono", isWinner1 && "text-primary")}>{match.score1}</span>
      </div>
      <div
        className={cn(
          "flex justify-between items-center p-2 rounded-b-md",
          isWinner2 ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground"
        )}
      >
        <span className="truncate">{athlete2Name}</span>
        <span className={cn("font-mono", isWinner2 && "text-primary")}>{match.score2}</span>
      </div>
    </div>
  );
};

export default function CombatBracket({ bracketData, onMatchClick }: CombatBracketProps) {
  if (!bracketData || !bracketData.rounds || bracketData.rounds.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Award className="mx-auto h-10 w-10 mb-4" />
        <h4 className="font-semibold">Resultados de Combate</h4>
        <p className="text-sm">No hay datos de la llave disponibles para esta división.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-8 overflow-x-auto p-4 bg-muted/40 rounded-lg">
      {bracketData.rounds.map((round) => (
        <div key={round.name} className="flex flex-col gap-8 items-center flex-shrink-0">
          <h3 className="font-bold text-lg text-foreground sticky top-0 bg-muted/40 px-4 py-2 rounded-md z-10">{round.name}</h3>
          <div className="flex flex-col gap-12 justify-around h-full">
            {round.matches.map((match, matchIndex) => (
              <MatchCard 
                key={match.id} 
                match={match} 
                getAthleteName={bracketData.getAthlete} 
                onAuditClick={() => onMatchClick(match)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
