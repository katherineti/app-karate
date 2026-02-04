// src/services/auth.ts

// 1. Configuración de la URL Base:
// Apuntamos a la ruta local de reescritura para evitar problemas de CORS en desarrollo.
const API_BASE_URL = '/api';

// --- 2. Tipos de Datos (Interfaces) ---

/** Credenciales mínimas requeridas para Login. */
interface LoginCredentials {
  email: string;
  password: string;
}

/** Datos requeridos para Registro (incluyendo cualquier campo extra como roles_ids). */
interface RegisterData extends LoginCredentials {
  roles_ids: number[];
  // Puedes añadir otros campos de registro aquí si son necesarios
}

/** Estructura de la respuesta exitosa del Login. */
interface LoginSuccessResponse {
  ok: true;
  access_token: string;
}

/** Estructura de la respuesta de error de cualquier servicio. */
interface ErrorResponse {
  ok: false;
  message: string;
  status: number;
}

/** La respuesta de Login puede ser de éxito o de error. */
type LoginResponse = LoginSuccessResponse | ErrorResponse;


// ----------------------------------------------------

/**
 * Función para manejar errores comunes de la API.
 * Lanza un error con el mensaje de error del servidor si está disponible.
 */
async function handleApiError(response: Response): Promise<ErrorResponse> {
  let errorMsg = `Error HTTP ${response.status}: Ha ocurrido un problema en el servidor.`;

  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const errorData = await response.json();
        // Intenta obtener un mensaje de error específico del cuerpo de la respuesta
        if (errorData && errorData.message) {
            errorMsg = Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message;
        } else if (errorData && typeof errorData === 'string') {
            errorMsg = errorData;
        }
    } else {
        const textError = await response.text();
        if (textError && !textError.toLowerCase().includes('<html>')) {
            errorMsg = textError;
        }
    }
  } catch (e) {
    console.error("No se pudo parsear la respuesta del error:", e);
  }
  
  return { ok: false, message: errorMsg, status: response.status };
}


// ----------------------------------------------------

/**
 * 🚀 Servicio de Login: POST /auth/login
 * @param data - Objeto con email y password.
 * @returns Promesa con el access_token o un objeto de error.
 */
export async function loginUser(data: LoginCredentials): Promise<LoginResponse> {
  if (!API_BASE_URL) {
    throw new Error("API Base URL no configurada. Por favor, revisa tu archivo .env.local.");
  }

  const url = `${API_BASE_URL}/auth/login`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
    }),
  });

  if (!response.ok) {
    return handleApiError(response);
  }
  
  const result = await response.json();
  
  const successResponse: LoginSuccessResponse = {
    ok: true,
    access_token: result.access_token,
  };

  // Guardar en localStorage
  if (typeof window !== 'undefined' && successResponse.access_token) {
    localStorage.setItem('accessToken', successResponse.access_token);
  }

  return successResponse;
}


/**
 * 📝 Servicio de Registro: POST /auth/signup
 * @param data - Objeto con email, password y roles_ids.
 * @returns Promesa que indica éxito o falla.
 */
export async function registerUser(data: RegisterData): Promise<string> {
  if (!API_BASE_URL) {
    throw new Error("API Base URL no configurada. Por favor, revisa tu archivo .env.local.");
  }

  const url = `${API_BASE_URL}/auth/signup`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Envía todos los campos requeridos para el registro
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      roles_ids: data.roles_ids,
      // ... otros campos si son necesarios
    }),
  });

  if (!response.ok) {
    const errorResponse = await handleApiError(response);
    throw new Error(errorResponse.message);
  }

  // Si el registro es exitoso (código 201), devolvemos un mensaje de éxito.
  // Podrías devolver response.json() si el backend devuelve datos de usuario.
  return "Registro de usuario exitoso.";
}
