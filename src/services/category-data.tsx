
// src/services/category-data.tsx

const API_BASE_URL = '/api';

export interface CreateCategoryPayload {
  category: string;
  age_range: string;
  allowed_belts: number[];
}

export interface UpdateCategoryPayload {
  category: string;
  age_range: string;
  allowed_belts: number[];
}

export interface CategoryMutationResponse {
    id: number;
    category: string;
    age_range: string;
    allowed_belts: number[];
}

export interface ApiCategory {
    id: number;
    category: string;
    age_range: string;
    allowed_belts: number[] | null;
}

export interface PaginatedCategoriesMeta {
  total: number;
  page: number;
  last_page: number;
}

export interface PaginatedCategoriesResponse {
  data: ApiCategory[];
  meta: PaginatedCategoriesMeta;
}

export interface CategoryListPayload {
    page: number;
    limit: number;
    search?: string;
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

export async function createCategory(data: CreateCategoryPayload): Promise<CategoryMutationResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/categories`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function updateCategory(categoryId: number, data: UpdateCategoryPayload): Promise<CategoryMutationResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/categories/${categoryId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function deleteCategory(categoryId: number): Promise<{ message: string; data: ApiCategory }> {
    const token = getToken();
    if (!token) {
        throw new Error('Token de autorización no proporcionado.');
    }

    const url = `${API_BASE_URL}/categories/${categoryId}`;

    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        await handleApiError(response);
    }

    return response.json();
}

export async function getAllCategories(): Promise<ApiCategory[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/categories`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }
  
  const apiResponse = await response.json();

  // Handle { data: [...] } structure
  if (apiResponse && Array.isArray(apiResponse.data)) {
    return apiResponse.data as ApiCategory[];
  }
  
  // Handle direct array [...] structure
  if (Array.isArray(apiResponse)) {
    return apiResponse as ApiCategory[];
  }

  // Handle unexpected structure by returning an empty array to prevent crashes
  console.warn("Unexpected API response structure from GET /categories. Expected an array or { data: [...] }.", apiResponse);
  return [];
}


export async function getPaginatedCategories(
  payload: CategoryListPayload
): Promise<PaginatedCategoriesResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/categories/list`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, 
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await handleApiError(response);
  }
  
  const apiResponse = await response.json();

  // Ensure meta values are numbers to prevent NaN issues
  const meta = {
      total: Number(apiResponse.meta.total),
      page: Number(apiResponse.meta.page),
      last_page: Number(apiResponse.meta.last_page)
  }
  
  return {
      data: apiResponse.data,
      meta: meta,
  };
}
