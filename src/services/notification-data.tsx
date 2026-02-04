// src/services/notification-data.tsx

const API_BASE_URL = '/api';

export interface ApiNotification {
    id: number;
    sender_id?: number;
    recipient_id: number;
    event_id: number;
    participant_request_id?: number;
    participant_request_status?: string;
    num_participants_requested?: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string; // ISO Date string
}

export interface ApiNotificationResponse {
    count: number;
    data: ApiNotification[];
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
}

export async function getMyNotifications(): Promise<ApiNotificationResponse> {
    const token = getToken();
    if (!token) {
        // Return a default empty response if not authenticated
        return { count: 0, data: [] };
    }

    const url = `${API_BASE_URL}/notifications/my-notifications`;

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

    return response.json() as Promise<ApiNotificationResponse>;
}

export async function markNotificationAsRead(
  notificationId: number,
  token: string
): Promise<{ message: string }> {
  const url = `${API_BASE_URL}/notifications/${notificationId}/read`;

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

  return response.json();
}

export async function markAllNotificationsAsRead(
  token: string
): Promise<{ message: string; updatedCount: number }> {
  const url = `${API_BASE_URL}/notifications/read-all`;

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

  return response.json();
}
