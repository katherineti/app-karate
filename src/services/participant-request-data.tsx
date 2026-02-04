// src/services/participant-request-data.tsx

const API_BASE_URL = '/api';

interface RequestSlotsPayload {
  event_id: number;
  num_participants_requested: number;
}

interface ApiRequestSlotsResponse {
  message: string;
  data: {
    id: number;
    event_id: number;
    master_id: number;
    school_id: number;
    num_participants_requested: number;
    status: string;
    message: string;
    created_at: string;
  };
}

export interface UpdateRequestStatusResponse {
  message: string;
  data?: ApiRequestSlotsResponse['data'];
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

export async function requestSlots(
  payload: RequestSlotsPayload,
  token: string
): Promise<ApiRequestSlotsResponse> {
  if (!token) {
    throw new Error('Token de autorización no proporcionado.');
  }

  const url = `${API_BASE_URL}/participantRequests/request-slots`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<ApiRequestSlotsResponse>;
}

export async function approveParticipantRequest(
  requestId: number,
  token: string
): Promise<UpdateRequestStatusResponse> {
  const url = `${API_BASE_URL}/participantRequests/${requestId}/approve`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<UpdateRequestStatusResponse>;
}

export async function rejectParticipantRequest(
  requestId: number,
  reason: string,
  token: string
): Promise<UpdateRequestStatusResponse> {
  const url = `${API_BASE_URL}/participantRequests/${requestId}/reject`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<UpdateRequestStatusResponse>;
}
