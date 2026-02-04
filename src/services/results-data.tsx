// src/services/results-data.tsx

// NOTE: This is a mock service. In a real application, this would fetch data from the backend API.

import { officialResults as mockResultsData } from '@/lib/mock-data';

export interface FinalResult {
    eventId: string;
    divisionId: string;
    category: string;
    modality: string;
    standings: {
        athleteId: string;
        athleteName: string;
        schoolName: string;
        final_score: number;
        judges_scores: number[];
    }[];
}

export interface NationalRankingItem {
    position: number;
    athleteId: string;
    athleteName: string;
    schoolName: string;
    totalPoints: number;
}


export async function getEventResults(eventId: string, divisionId: string): Promise<FinalResult | null> {
    console.log(`Fetching results for event ${eventId}, division ${divisionId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const resultKey = `${eventId}-${divisionId}`;
    const result = mockResultsData.results[resultKey];

    if (result) {
        return result;
    } else {
        console.warn(`No results found for key: ${resultKey}`);
        return null;
    }
}


export async function getNationalRanking(): Promise<NationalRankingItem[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app, this would be a separate API call. Here we derive it from mock data.
    const allAthletes = mockResultsData.athletes;

    const sortedAthletes = [...allAthletes].sort((a, b) => b.ranking - a.ranking);
    
    const ranking: NationalRankingItem[] = sortedAthletes.map((athlete, index) => ({
        position: index + 1,
        athleteId: athlete.id,
        athleteName: `${athlete.firstName} ${athlete.lastName}`,
        schoolName: athlete.school,
        totalPoints: athlete.ranking,
    }));

    return ranking;
}
