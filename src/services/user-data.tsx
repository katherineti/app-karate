// src/services/users.tsx (Nuevo Archivo)

// 1. Configuración de la URL Base:
const API_BASE_URL = '/api';

// --- 2. Tipos de Datos (Interfaces) ---

/** Estructura de un rol individual devuelto por la API. */
interface ApiRole {
  id: number;
  name: string;
}

/** Estructura de un representante individual devuelto por la API. */
interface ApiRepresentative {
  id: number;
  name: string | null;
  lastname: string | null;
  email: string;
}

/** Estructura de un usuario individual devuelto por el detalle o la lista. */
export interface UserData {
  id: number;
  name: string | null;
  lastname: string | null;
  email: string;
  roles: ApiRole[];
  representatives?: ApiRepresentative[];
  birthdate?: string | null;
  profile_picture?: string | null;
  created_at?: string;
  updated_at?: string;
  document_type?: string | null;
  document_number?: string | null;
  school_id?: number | null;
  school_name?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  belt_id?: number | null;
  belt_name?: string | null;
  status: number;
  status_name?: string;
  is_active: boolean;
  certificate_front_url?: string;
  certificate_back_url?: string;
  master_photo_url?: string;
}

/** Estructura de la respuesta paginada DIRECTA de la API. */
export interface ApiPaginatedResponse {
  data: UserData[];
  total: string; // La API devuelve un string
  page: number;
  limit: number;
}

/** Estructura de la respuesta paginada que USA el Frontend. */
export interface PaginatedUsersResponse {
  data: UserData[];
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface AthleteData {
    id: number;
    name: string | null;
    lastname: string | null;
    email: string;
    
    //resuelve el error :  Type 'AthleteData' is missing the following properties from type 'UserData': roles, status, is_active:
    roles: ApiRole[];   status: number;  is_active: boolean;

}

export interface SchoolStudent {
    id: number;
    name: string | null;
    lastname: string | null;
    email: string;
    school_id: number;
    status: number;
}


/**
 * Función genérica para manejar errores comunes de la API.
 */
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


/**
 * 🔒 Servicio Protegido de Lista Paginada: GET /users
 * @param token - El token JWT requerido en el header 'Authorization'.
 * @param page - Número de página.
 * @param limit - Elementos por página.
 * @returns Promesa que resuelve a PaginatedUsersResponse.
 */
export async function getPaginatedUsers(
  token: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  roleFilter?: string,
): Promise<PaginatedUsersResponse> {
  const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
  });

  if (search) {
      params.append('search', search);
  }
  if (roleFilter) {
      params.append('roleFilter', roleFilter);
  }
  
  const url = `${API_BASE_URL}/users?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`, 
    },
    // cache: 'no-store', // Recomendado si los datos cambian con frecuencia
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const apiResponse = await response.json() as ApiPaginatedResponse;

  const totalRecords = parseInt(apiResponse.total, 10);
  
  return {
      data: apiResponse.data,
      totalRecords: totalRecords,
      currentPage: apiResponse.page,
      totalPages: Math.ceil(totalRecords / apiResponse.limit),
      pageSize: apiResponse.limit,
  };
}

/**
 * 🔒 Servicio Protegido de Detalle de Usuario: GET /users/:id
 * @param token - El token JWT requerido en el header 'Authorization'.
 * @param userId - El ID del usuario a consultar.
 * @returns Promesa que resuelve a UserData.
 */
export async function getUserDetail(
  token: string,
  userId: number
): Promise<UserData> {
   const authToken = token || getToken();
  if (!authToken) {
    throw new Error('Token de autorización no proporcionado.');
  }
  
  const url = `${API_BASE_URL}/users/${userId}`;

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
  // This handles both { data: ... } and direct { ... } responses
  return (apiResponse.data || apiResponse) as UserData;
}

/**
 * 🔒 Obtiene usuarios por rol: GET /users/by-role/:roleId
 * @param token El token JWT para autorización.
 * @param roleId El ID del rol para filtrar los usuarios.
 * @returns Una promesa que resuelve a un array de UserData.
 */
export async function getUsersByRole(
    token: string,
    roleId: number
): Promise<UserData[]> {
    const authToken = token || getToken();
    if (!authToken) {
        throw new Error('Token de autorización no proporcionado.');
    }

    const url = `${API_BASE_URL}/users/by-role/${roleId}`;

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

    const data = await response.json();

    if (Array.isArray(data)) {
        return data as UserData[];
    }
    
    if (data && Array.isArray(data.data)) {
        return data.data as UserData[];
    }
    
    console.warn("Unexpected API response from getUsersByRole. Expected an array or { data: [...] }.", data);
    return [];
}

export async function getSchoolAlumnos(
    token: string,
    schoolId: number,
    divisionId?: number
): Promise<SchoolStudent[]> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error("Token de autorización no proporcionado.");
    }
  
    let url = `${API_BASE_URL}/users/alumnos/escuela/${schoolId}`;
    if (divisionId) {
        url += `?divisionId=${divisionId}`;
    }
  
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });
  
    if (!response.ok) {
      await handleApiError(response);
    }
    
    const data = await response.json();
    
    if (data && Array.isArray(data.data)) {
        return data.data as SchoolStudent[];
    }

    if (Array.isArray(data)) {
        return data as SchoolStudent[];
    }
    
    console.warn("Unexpected API response from getSchoolAlumnos. Expected an array or { data: [...] }.", data);
    return [];
}


/**
 * 🔒 Servicio Protegido para Actualizar Usuario: POST /users/update
 * @param token - El token JWT requerido.
 * @param data - Los datos del usuario a enviar en el cuerpo (será convertido a FormData).
 * @returns Promesa que resuelve a la respuesta de la API.
 */
export async function updateUser(
  token: string,
  data: Record<string, any>
): Promise<any> {
    const authToken = token || getToken();
    if (!authToken) {
        throw new Error('Token de autorización no proporcionado.');
    }

    const url = `${API_BASE_URL}/users/update`;
    
    const formData = new FormData();

    Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== null && value !== undefined && value !== '') {
            if ((key === 'roles_ids' || key === 'representative_ids') && Array.isArray(value)) {
                value.forEach(id => formData.append(key, String(id)));
            } else if (value instanceof File) {
                formData.append(key, value);
            } else {
                formData.append(key, String(value));
            }
        }
    });

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

    return response.json();
}

/**
 * 🔒 Servicio Protegido para Cambiar Estado de Usuario: POST /users/change-status
 * @param token - El token JWT requerido.
 * @param data - El cuerpo de la solicitud con id, email, roles_ids y status.
 * @returns Promesa que resuelve a la respuesta de la API.
 */
export async function changeUserStatus(
  token: string,
  data: { id: number; email: string; roles_ids: number[]; status: number }
): Promise<any> {
    const authToken = token || getToken();
    if (!authToken) {
        throw new Error('Token de autorización no proporcionado.');
    }

    const url = `${API_BASE_URL}/users/change-status`;

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

    return response.json();
}

/**
 * 🔒 Obtiene los atletas por ID de escuela para puntuación.
 * @param token El token JWT para autorización.
 * @param schoolId El ID de la escuela.
 * @returns Una promesa que resuelve a un array de AthleteData.
 */
export async function getAthletesBySchool(
    token: string,
    schoolId: number
  ): Promise<AthleteData[]> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error("Token de autorización no proporcionado.");
    }
  
    const url = `${API_BASE_URL}/puntuation/athletes-by-school/${schoolId}`;
  
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });
  
    if (!response.ok) {
      await handleApiError(response);
    }
  
    return response.json() as Promise<AthleteData[]>;
  }



