// src/services/modalities-data.tsx

const API_BASE_URL = '/api';

export interface ApiModality {
    id: number;
    name: string;
    type: 'kata' | 'combate';
    style?: string | null;
    description?: string | null;
}

export interface ModalityPayload {
    name: string;
    type: 'kata' | 'combate';
    style?: string | null;
    description?: string | null;
}

export interface ModalitiesMeta {
    total: number;
    page: number;
    last_page: number;
}

export interface ApiPaginatedModalitiesResponse {
    data: ApiModality[];
    meta: ModalitiesMeta;
}

export interface ModalitiesListPayload {
    page: number;
    limit: number;
    search?: string;
    type?: 'kata' | 'combate' | 'all';
}

export interface UpdateModalityResponse {
    message: string;
    data: ApiModality;
}


async function handleApiError(response: Response): Promise<never> {
    let errorMsg = `Error HTTP ${response.status} al comunicarse con la API.`;
    try {
        const errorData = await response.json();
        if (errorData.message) {
            errorMsg = Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message;
        }
    } catch (e) {
        // Could not parse error JSON
    }
    throw new Error(errorMsg);
}

const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('accessToken');
    }
    return null;
};

export async function getPaginatedModalities(payload: ModalitiesListPayload): Promise<ApiPaginatedModalitiesResponse> {
    const authToken = getToken();
    if (!authToken) {
        throw new Error('Token de autorización no proporcionado.');
    }
    const url = `${API_BASE_URL}/modalities/list`;

    const body: any = {
        page: payload.page,
        limit: payload.limit,
    };
    if (payload.search) {
        body.search = payload.search;
    }
    if (payload.type && payload.type !== 'all') {
        body.type = payload.type;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        await handleApiError(response);
    }
    
    const apiResponse = await response.json();

    const meta = {
        total: Number(apiResponse.meta.total),
        page: Number(apiResponse.meta.page),
        last_page: Number(apiResponse.meta.last_page)
    }

    return {
        data: apiResponse.data,
        meta: meta
    };
}


export async function getAllModalities(): Promise<ApiModality[]> {
    const authToken = getToken();
    if (!authToken) {
        throw new Error('Token de autorización no proporcionado.');
    }

    const url = `${API_BASE_URL}/modalities`;

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
    
    // Handle both cases
    if (apiResponse && Array.isArray(apiResponse.data)) {
        return apiResponse.data as ApiModality[];
    }
    if (Array.isArray(apiResponse)) {
        return apiResponse as ApiModality[];
    }
    
    console.warn("Unexpected API response structure from GET /modalities. Expected an array or { data: [...] }.", apiResponse);
    return [];
}

export async function createModality(payload: ModalityPayload, token: string): Promise<ApiModality> {
    const url = `${API_BASE_URL}/modalities`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await handleApiError(response);
    return response.json();
}
  
export async function updateModality(id: number, payload: Partial<ModalityPayload>, token: string): Promise<UpdateModalityResponse> {
    const url = `${API_BASE_URL}/modalities/${id}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await handleApiError(response);
    return response.json();
}
  
export async function deleteModality(id: number, token: string): Promise<{ message: string; data: ApiModality }> {
    const url = `${API_BASE_URL}/modalities/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) await handleApiError(response);
    return response.json();
}
