// src/services/event-data.tsx

import { KarateEvent } from "@/lib/mock-data";
import { parseISO, startOfDay, format } from "date-fns";

// 1. Configuración de la URL Base:
const API_BASE_URL = '/api';

export interface ApiEvent {
    id: number;
    name: string;
    description: string;
    date: string; // ISO String
    location: string;
    type: string;
    type_id: number;
    subtype: string;
    subtype_id: number;
    status: string;
    status_id: number;
    suma_ranking?: boolean;
    max_participants?: number;
    is_active?: boolean;
    max_evaluation_score?: number;
}

export interface CalendarEvent {
    id: number;
    name: string;
    description: string;
    date: string; // "YYYY-MM-DD"
    location: string;
    status_id: number;
    status_name: string;
    type_id?: number;
}

export type CalendarEventsResponse = Record<string, CalendarEvent[]>;

export interface CreateEventPayload {
  name: string;
  description: string;
  date: string; // YYYY-MM-DD
  location: string;
  subtype_id: number;
  max_evaluation_score?: number;
  max_participants?: number | null;
  send_to_all_masters?: boolean;
  selected_master_ids?: number[];
}

export interface PaginatedEventsResponse {
  data: ApiEvent[];
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface ApiEventSummaryItem {
    event_id: number;
    category_id: number;
    category_name: string;
    category_is_active?: boolean;
    is_active?: boolean;
    age_range: string;
    kata_count: number;
    combate_count: number;
    total_modalities: number;
    allowed_belts: {
        id: number;
        name: string;
    }[];
}

export interface UpdateCategoryStatusPayload {
    is_active: boolean;
}

export interface ApiAssignedJudge {
    id: number;
    name: string | null;
    lastname: string | null;
    email: string;
    role: string | null;
    is_active: boolean;
}

export interface ApiDivisionModality {
    division_id: number;
    modality_id: number;
    modality_name: string;
    modality_type: 'kata' | 'combate';
    is_active: boolean;
    assigned_judges: ApiAssignedJudge[];
}

export interface ToggleModalityPayload {
    event_id: number;
    category_id: number;
    modality_id: number;
    is_active: boolean;
    judges?: {
        judge_id: number;
        is_active: boolean;
    }[];
}

export interface ToggleCategoryPayload {
    event_id: number;
    category_id: number;
    is_active: string;
}

export interface ToggleCategoryResponse {
    id: number;
    event_id: number;
    category_id: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface BulkRegisterPayload {
  division_id: number;
  athlete_ids: number[];
}

export interface BulkRegisterResponse {
  success: boolean;
  message: string;
  remainingSlots?: number;
}


const typeMap: Record<number, KarateEvent['type']> = {
    1: 'competencia',
    3: 'seminario',
    4: 'exhibicion',
    2: 'examen-de-grado',
};

const statusIdMap: Record<number, KarateEvent['status']> = {
    4: 'programado',
    5: 'en-curso',
    6: 'finalizado',
    7: 'cancelado',
};


export const mapApiEventToKarateEvent = (apiEvent: ApiEvent): KarateEvent => {
    const eventDate = parseISO(apiEvent.date);
    const isActive = new Date() < eventDate;
    
    // Prioritize status_id for determining the state
    const eventStatus = statusIdMap[apiEvent.status_id] || 'programado';

    return {
        id: apiEvent.id.toString(),
        name: apiEvent.name,
        description: apiEvent.description,
        date: eventDate,
        location: apiEvent.location,
        type: typeMap[apiEvent.type_id] || 'competencia',
        type_id: apiEvent.type_id,
        subtype: apiEvent.subtype,
        subtype_id: apiEvent.subtype_id,
        status_id: apiEvent.status_id,
        suma_ranking: apiEvent.suma_ranking ?? false,
        status: eventStatus,
        maxParticipants: apiEvent.max_participants,
        maxScore: apiEvent.max_evaluation_score,
        isActive: apiEvent.is_active ?? isActive,
    };
};


async function handleApiError(response: Response): Promise<never> {
  let errorMsg = `Error HTTP ${response.status} al comunicarse con la API.`;
  
  try {
    const errorData = await response.json();
    if (errorData.message) {
      errorMsg = Array.isArray(errorData.message) 
        ? errorData.message.join(', ')
        : errorData.message;
    }
  } catch (e) {
    // No se pudo parsear el JSON de error
  }
  
  throw new Error(errorMsg);
}

const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('accessToken');
    }
    return null;
}

export async function createEvent(data: CreateEventPayload): Promise<ApiEvent> {
  const authToken = getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/events`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const apiResponse = await response.json();
  return apiResponse.data as ApiEvent;
}

export async function getPaginatedEvents(
  token: string,
  page: number = 1,
  limit: number = 10,
  filters?: {
    search?: string;
    typeFilter?: string;
    statusFilter?: string;
    startDateFilter?: string;
    endDateFilter?: string;
  }
): Promise<PaginatedEventsResponse> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
  });

  if (filters?.search) params.append('search', filters.search);
  if (filters?.typeFilter) params.append('typeFilter', filters.typeFilter.toString());
  if (filters?.statusFilter) params.append('statusFilter', filters.statusFilter);
  if (filters?.startDateFilter) params.append('startDateFilter', filters.startDateFilter);
  if (filters?.endDateFilter) params.append('endDateFilter', filters.endDateFilter);
  
  const url = `${API_BASE_URL}/events?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`, 
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const apiResponse = await response.json();
  const meta = apiResponse.meta;
  
  const totalRecords = parseInt(meta.total, 10);
  
  return {
      data: apiResponse.data,
      totalRecords: totalRecords,
      currentPage: meta.page,
      totalPages: Math.ceil(totalRecords / meta.limit),
      pageSize: meta.limit,
  };
}


export async function deleteEvent(eventId: string, token: string): Promise<void> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }
  
  const url = `${API_BASE_URL}/events/${eventId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }
}

export async function getEventById(eventId: string | number, token: string): Promise<KarateEvent> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/events/${eventId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const apiResponse = await response.json();
  const eventData = apiResponse.data || apiResponse;
  return mapApiEventToKarateEvent(eventData);
}

export async function getEventSummary(eventId: string | number, token: string): Promise<ApiEventSummaryItem[]> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Token de autorización no proporcionado.');
    }
  
    const url = `${API_BASE_URL}/event-config/event/${eventId}/summary`;
  
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });
  
    if (!response.ok) {
      await handleApiError(response);
    }
  
    return response.json();
}

export async function updateEvent(eventId: string | number, data: any, token: string): Promise<KarateEvent> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Token de autorización no proporcionado.');
    }
  
    const url = `${API_BASE_URL}/events/${eventId}`;
  
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
  
    if (!response.ok) {
      await handleApiError(response);
    }
  
    const apiResponse = await response.json();
    return mapApiEventToKarateEvent(apiResponse.data);
}

export async function updateEventStatus(eventId: string | number, statusId: number, token: string): Promise<void> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Token de autorización no proporcionado.');
    }
  
    const url = `${API_BASE_URL}/events/${eventId}/status`;
  
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status_id: statusId }),
    });
  
    if (!response.ok) {
      await handleApiError(response);
    }
}

export async function updateCategoryStatus(
    eventId: string | number,
    categoryId: string | number,
    data: UpdateCategoryStatusPayload,
    token: string
  ): Promise<void> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Token de autorización no proporcionado.');
    }
  
    const url = `${API_BASE_URL}/event-config/event/${eventId}/category/${categoryId}/change-status`;
  
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
  
    if (!response.ok) {
      await handleApiError(response);
    }
}

export async function getModalitiesForDivision(
    eventId: string | number,
    categoryId: string | number,
    token: string
  ): Promise<ApiDivisionModality[]> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Token de autorización no proporcionado.');
    }
  
    const url = `${API_BASE_URL}/event-config/event/${eventId}/category/${categoryId}/modalities`;
  
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
    });
  
    if (!response.ok) {
      await handleApiError(response);
    }
  
    return response.json();
}

export async function toggleModalityStatus(data: ToggleModalityPayload, token: string): Promise<any> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Token de autorización no proporcionado.');
    }
  
    const url = `${API_BASE_URL}/event-config/toggle-modality`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
  
    if (!response.ok) {
      await handleApiError(response);
    }
  
    return response.json();
}

export async function toggleCategoryForEvent(data: ToggleCategoryPayload, token: string): Promise<ToggleCategoryResponse> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Token de autorización no proporcionado.');
    }
  
    const url = `${API_BASE_URL}/event-config/toggle-category`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
  
    if (!response.ok) {
      await handleApiError(response);
    }
  
    return response.json();
}

export async function registerAthletesForDivision(
  data: BulkRegisterPayload,
  token: string
): Promise<BulkRegisterResponse> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/tournament-registrations/bulk`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<BulkRegisterResponse>;
}

export async function getCalendarEvents(
  token: string,
  year: number,
  month?: number
): Promise<CalendarEventsResponse> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const params = new URLSearchParams({
      year: year.toString(),
  });

  if (month) {
    params.append('month', month.toString());
  }
  
  const url = `${API_BASE_URL}/events/calendar/view?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`, 
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}
