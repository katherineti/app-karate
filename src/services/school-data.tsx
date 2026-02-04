// src/services/school-data.tsx

import { KarateEvent } from "@/lib/mock-data";
import { parseISO, startOfDay, format } from "date-fns";

// 1. Configuración de la URL Base:
const API_BASE_URL = '/api';
const API_DOMAIN = 'https://api-karate.onrender.com';

export interface ApiSchool {
    id: number;
    name: string;
    address: string | null;
    slug?: string;
    base_score: number;
    is_active: boolean;
    masters?: {
        id: number;
        fullname: string;
        email: string;
    }[];
    logo_url?: string | null;
    // For compatibility, I will keep these even if not in the list response, as they might be in the detail response.
    master_id?: number; 
    master_name?: string;
    max_evaluation_score?: number; 
}

export interface School {
  id: string;
  name: string;
  address: string;
  logoUrl?: string;
  maxScore?: number;
  is_active: boolean;
}


export const mapApiSchoolToLocal = (apiSchool: ApiSchool): School => ({
    id: apiSchool.id.toString(),
    name: apiSchool.name,
    address: apiSchool.address || 'No especificada',
    logoUrl: apiSchool.logo_url || undefined,
    maxScore: apiSchool.base_score,
    is_active: apiSchool.is_active,
});


export interface PaginatedSchoolsResponse {
  data: ApiSchool[];
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface CreateSchoolPayload {
    name: string;
    address?: string;
    base_score?: number;
    logo?: File;
}

export interface UpdateSchoolDataPayload {
  name: string;
  address?: string;
  base_score?: number;
  is_active: boolean;
  logo?: File;
}


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

export async function getSchoolById(schoolId: string, token: string): Promise<ApiSchool> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Token de autorización no proporcionado.');
    }
    
    const url = `${API_BASE_URL}/shools/${schoolId}`;
  
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
    return (apiResponse.data || apiResponse) as ApiSchool;
}

export async function getPaginatedSchools(
  token: string,
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<PaginatedSchoolsResponse> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }
  
  const url = `${API_BASE_URL}/shools/list`;

  const body: { page: number; limit: number; search?: string } = {
    page,
    limit,
  };
  if (search && search.trim() !== '') {
    body.search = search;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
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
      totalPages: Math.ceil(totalRecords / limit),
      pageSize: limit,
  };
}


export async function createSchool(data: CreateSchoolPayload, token: string): Promise<ApiSchool> {
    const authToken = token || getToken();
    if (!authToken) {
        throw new Error('Token de autorización no proporcionado.');
    }

    const url = `${API_BASE_URL}/shools`;

    const formData = new FormData();
    formData.append('name', data.name);
    if (data.address) {
        formData.append('address', data.address);
    }
    if (data.base_score !== undefined) {
        formData.append('base_score', data.base_score.toString());
    }
    if (data.logo) {
        formData.append('image', data.logo);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
    });

    if (!response.ok) {
        await handleApiError(response);
    }

    const apiResponse = await response.json();
    return apiResponse as ApiSchool;
}

export async function updateSchool(schoolId: string, data: UpdateSchoolDataPayload, token: string): Promise<ApiSchool> {
    const authToken = token || getToken();
    if (!authToken) {
        throw new Error('Token de autorización no proporcionado.');
    }

    const url = `${API_BASE_URL}/shools/${schoolId}`;

    const formData = new FormData();
    formData.append('name', data.name);
    if (data.address) {
        formData.append('address', data.address);
    }
    if (data.base_score !== undefined) {
        formData.append('base_score', data.base_score.toString());
    }
    formData.append('is_active', String(data.is_active));
    if (data.logo) {
        formData.append('image', data.logo);
    }

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
    });

    if (!response.ok) {
        await handleApiError(response);
    }

    const apiResponse = await response.json();
    return (apiResponse.data || apiResponse) as ApiSchool;
}

export async function deleteSchool(schoolId: string, token: string): Promise<void> {
    const authToken = token || getToken();
    if (!authToken) {
        throw new Error('Token de autorización no proporcionado.');
    }
    
    const url = `${API_BASE_URL}/shools/${schoolId}`;

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
