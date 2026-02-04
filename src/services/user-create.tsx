// src/services/users.tsx (Nuevo Archivo)

// 1. Configuración de la URL Base (Asegúrate de que esta variable de entorno esté definida)
const API_BASE_URL = '/api';

// --- 2. Tipos de Datos (Interfaces) ---

/** Credenciales mínimas requeridas para la creación de usuario por Admin.
 * Se basa en tu SignupDto de Nest.js.
 */
interface CreateUserProtectedData {
  email: string;
  password: string;
  roles_ids: number[];
  school_id?: number;
}

/** Estructura de la respuesta de éxito de tu servicio (basada en tu AuthService.signUp). */
export interface CreateUserResponse {
  ok: boolean;
  status: number;
  description: string;
  id: number;
}

/**
 * Función para manejar errores comunes de la API (Puedes reutilizar la de auth.tsx)
 * Lanza un error con el mensaje de error del servidor si está disponible.
 */
async function handleApiError(response: Response): Promise<never> {
  let errorMsg = `Error HTTP ${response.status} al comunicarse con la API.`;
  
  try {
    const errorData = await response.json();
    if (errorData.message) {
      // Nest.js a menudo devuelve un array de mensajes o un string
      errorMsg = Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message;
    }
  } catch (e) {
    // No se pudo parsear el JSON de error
  }
  
  throw new Error(errorMsg);
}

// ----------------------------------------------------

/**
 * 🔒 Servicio Protegido de Creación de Usuarios: POST /auth/create-user-protected
 * * Esta ruta requiere un token JWT válido con rol 'Admin' en el header 'Authorization'.
 * * @param data - Objeto con email, password y roles_id del nuevo usuario a crear.
 * @param token - El token JWT del usuario Admin que realiza la operación.
 * @returns Promesa que resuelve a un objeto de respuesta de creación.
 */
export async function createProtectedUser(
    data: CreateUserProtectedData, 
    token: string
): Promise<CreateUserResponse> {
    
  if (!token) {
    throw new Error('Token de autorización no proporcionado. Se requiere un Admin.');
  }

  const url = `${API_BASE_URL}/auth/create-user-protected`;

  // 💡 CLAVE DE SEGURIDAD: Incluir el token en el header Authorization como Bearer
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // Envío del token
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    // Esto capturará errores de AuthGuard (401 Unauthorized) 
    // y RolesGuard (403 Forbidden)
    await handleApiError(response);
  }

  // Devolver el cuerpo JSON (que debe contener ok, status, description)
  return response.json() as Promise<CreateUserResponse>;
}
