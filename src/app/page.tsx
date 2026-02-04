'use client';

import AboutUs from '@/app/components/landing/AboutUs';
import SearchSection from '@/app/components/landing/SearchSection';
import EventsAndCompetitions from '@/app/components/landing/EventsAndCompetitions';
import TopWinners from './components/landing/TopWinners';
import AppLayout from './components/AppLayout';
import { useState } from 'react';

export default function Home() {
// 1. Crear el estado para el término de búsqueda
    const [searchTerm, setSearchTerm] = useState('');

    // 2. Función para actualizar el estado (handler de búsqueda)
    const handleSearchChange = (term: string) => {
        setSearchTerm(term);
        // Opcional: Aquí podrías añadir lógica de debounce o fetching si fuera necesario
    };
  return (
    <AppLayout>
      <EventsAndCompetitions />
      <AboutUs />
      <TopWinners />
      <SearchSection 
      searchTerm={searchTerm} 
      onSearchChange={handleSearchChange}
      />
    </AppLayout>
  );
}
