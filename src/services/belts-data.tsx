// src/services/belts-data.tsx

const API_BASE_URL = '/api';

// --- Interfaces ---

export interface ApiBelt {
  id: number;
  belt: string;
  grade?: string | null;
  rank_order: number;
}

export interface PaginatedBeltsMeta {
  total: number;
  page: number;
  lastPage: number;
}

export interface PaginatedBeltsResponse {
  data: ApiBelt[];
  meta: PaginatedBeltsMeta;
}

export interface BeltListPayload {
    page: number;
    limit: number;
    search?: string;
}

export interface CreateBeltPayload {
    belt: string;
    rank_order: number;
    grade?: string;
}

export interface UpdateBeltPayload {
    belt?: string;
    rank_order?: number;
    grade?: string;
}


// --- Funciones de Servicio ---

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

export async function getKarateBelts(
  token: string,
  payload: BeltListPayload
): Promise<PaginatedBeltsResponse> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/karate-belts/list`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`, 
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<PaginatedBeltsResponse>;
}

export async function createKarateBelt(
  payload: CreateBeltPayload,
  token: string
): Promise<ApiBelt> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/karate-belts`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<ApiBelt>;
}

export async function updateKarateBelt(
  beltId: number,
  payload: UpdateBeltPayload,
  token: string
): Promise<ApiBelt> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/karate-belts/${beltId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<ApiBelt>;
}

export async function deleteKarateBelt(beltId: number, token: string): Promise<{ message: string; data: ApiBelt }> {
    const authToken = token || getToken();
    if (!authToken) {
        throw new Error('Token de autorización no proporcionado.');
    }

    const url = `${API_BASE_URL}/karate-belts/${beltId}`;

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

    return response.json();
}

export async function getAllKarateBelts(token: string): Promise<ApiBelt[]> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/karate-belts`;

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
  
  // Handle { data: [...] } structure
  if (apiResponse && Array.isArray(apiResponse.data)) {
      return apiResponse.data as ApiBelt[];
  }
  
  // Handle direct array [...] structure
  if (Array.isArray(apiResponse)) {
      return apiResponse as ApiBelt[];
  }

  // Handle unexpected structure by returning an empty array to prevent crashes
  console.warn("Unexpected API response structure from GET /karate-belts. Expected an array or { data: [...] }.", apiResponse);
  return [];
}
