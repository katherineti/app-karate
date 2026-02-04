'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { type KarateEvent } from '@/lib/mock-data';
import { parseISO, startOfDay, format } from 'date-fns';
import { useNotifications } from './NotificationContext';
import { getPaginatedEvents, ApiEvent, mapApiEventToKarateEvent } from '@/services/event-data';
import { UserRole } from './UserContext';

const LOCAL_STORAGE_KEY = 'svram_events';

interface EventContextType {
  events: KarateEvent[];
  addEvent: (newEvent: KarateEvent, notificationOptions?: {
    type: 'all' | 'selected';
    masters?: (string | number)[];
  }) => void;
  updateEvent: (updater: KarateEvent | ((prevEvents: KarateEvent[]) => KarateEvent[])) => void;
  toggleEventStatus: (eventId: string) => void;
  deleteEvent: (eventId: string) => void;
  completeRoundAndActivateNext: (eventId: string, divisionId: string, completedRound: string) => void;
  activateRound: (eventId: string, divisionId: string, roundToActivate: string) => void;
  deactivateRound: (eventId: string, divisionId: string) => void;
  isLoading: boolean;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<KarateEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    async function loadEvents() {
        setIsLoading(true);
        const token = localStorage.getItem('accessToken');
        if (token) {
            try {
                const response = await getPaginatedEvents(token, 1, 50); // Cargar una cantidad grande para el contexto
                setEvents(response.data.map(mapApiEventToKarateEvent));
            } catch (error) {
                console.error("Failed to load events from API:", error);
                // Fallback a localStorage si la API falla
                loadEventsFromLocalStorage();
            } finally {
                setIsLoading(false);
            }
        } else {
             // Fallback a localStorage si no hay token
            loadEventsFromLocalStorage();
            setIsLoading(false);
        }
    }

    const loadEventsFromLocalStorage = () => {
        try {
            const storedEventsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedEventsJson) {
                const parsedEvents = JSON.parse(storedEventsJson).map((e: any) => ({...e, date: parseISO(e.date)}));
                setEvents(parsedEvents);
            }
        } catch (error) {
            console.error("Failed to load events from localStorage:", error);
        }
    };
    
    loadEvents();
  }, []);

  const updateAndPersistEvents = useCallback((getNewEvents: (prevEvents: KarateEvent[]) => KarateEvent[]) => {
    setEvents(prevEvents => {
      const newEvents = getNewEvents(prevEvents);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newEvents));
      return newEvents;
    });
  }, []);
  
  const addEvent = useCallback((newEvent: KarateEvent, notificationOptions: { type: 'all' | 'selected'; masters?: (string | number)[] } = { type: 'all' }) => {
    updateAndPersistEvents(prevEvents => [newEvent, ...prevEvents]);
    // The backend now handles notification creation. No need to call addNotification here for other users.
    // A toast in the form is sufficient feedback for the creator.
  }, [updateAndPersistEvents]);

  const updateEvent = useCallback((updater: KarateEvent | ((prevEvents: KarateEvent[]) => KarateEvent[])) => {
    if (typeof updater === 'function') {
      updateAndPersistEvents(updater);
    } else {
      const updatedEvent = updater;
      updateAndPersistEvents(prevEvents => {
        const eventExists = prevEvents.some(e => e.id === updatedEvent.id);
        if (eventExists) {
            return prevEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e);
        } else {
            return [...prevEvents, updatedEvent];
        }
      });
    }
  }, [updateAndPersistEvents]);
  
  const toggleEventStatus = useCallback((eventId: string) => {
    updateAndPersistEvents(prevEvents => 
      prevEvents.map(e => 
        e.id === eventId ? { ...e, isActive: !e.isActive } : e
      )
    );
  }, [updateAndPersistEvents]);

  const deleteEvent = useCallback((eventId: string) => {
    updateAndPersistEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
  }, [updateAndPersistEvents]);

  const completeRoundAndActivateNext = useCallback((eventId: string, divisionId: string, completedRound: string) => {
    const RONDAS = ["Ronda 1", "Ronda 2", "Ronda 3", "Ronda 4", "Ronda 5", "Ronda 6", "Ronda 7", "Ronda 8", "Ronda 9", "Finales"];
    const currentIndex = RONDAS.indexOf(completedRound);
    if (currentIndex === -1 || currentIndex === RONDAS.length - 1) return;

    const nextRound = RONDAS[currentIndex + 1];

    updateAndPersistEvents(prevEvents => prevEvents.map(event => {
        if (event.id === eventId) {
            const newActiveRounds = { ...(event.activeRounds || {}), [divisionId]: nextRound };
            return { ...event, activeRounds: newActiveRounds };
        }
        return event;
    }));
  }, [updateAndPersistEvents]);
  
  const activateRound = useCallback((eventId: string, divisionId: string, roundToActivate: string) => {
      updateAndPersistEvents(prevEvents => prevEvents.map(event => {
          if (event.id === eventId) {
              const newActiveRounds = { ...(event.activeRounds || {}), [divisionId]: roundToActivate };
              return { ...event, activeRounds: newActiveRounds };
          }
          return event;
      }));
  }, [updateAndPersistEvents]);
  
  const deactivateRound = useCallback((eventId: string, divisionId: string) => {
    updateAndPersistEvents(prevEvents => prevEvents.map(event => {
        if (event.id === eventId) {
            const newActiveRounds = { ...(event.activeRounds || {}) };
            delete newActiveRounds[divisionId];
            return { ...event, activeRounds: newActiveRounds };
        }
        return event;
    }));
  }, [updateAndPersistEvents]);

  return (
    <EventContext.Provider value={{ events, addEvent, updateEvent, toggleEventStatus, deleteEvent, completeRoundAndActivateNext, activateRound, deactivateRound, isLoading }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = (): EventContextType => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};
