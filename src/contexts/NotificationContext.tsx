'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { UserRole, useUser } from './UserContext';
import { getMyNotifications, ApiNotification, markNotificationAsRead, markAllNotificationsAsRead } from '@/services/notification-data';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  title: string;
  description: string;
  date: Date;
  read: boolean;
  targetRoles: UserRole[];
  targetUserIds?: (string | number)[];
  href?: string;
  event_id?: number;
  participant_request_id?: number;
  participant_request_status?: string;
  num_participants_requested?: number;
}

interface NotificationInput extends Omit<Notification, 'id' | 'date' | 'read'> {}

interface NotificationContextType {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  addNotification: (notification: NotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useUser();
  const { toast } = useToast();

  const mapApiNotificationToLocal = (apiNotif: ApiNotification): Notification => ({
    id: apiNotif.id.toString(),
    title: apiNotif.title,
    description: apiNotif.message,
    date: new Date(apiNotif.created_at),
    read: apiNotif.is_read,
    targetRoles: [],
    href: apiNotif.event_id ? `/dashboard/events/${apiNotif.event_id}` : '#',
    event_id: apiNotif.event_id,
    participant_request_id: apiNotif.participant_request_id,
    participant_request_status: apiNotif.participant_request_status,
    num_participants_requested: apiNotif.num_participants_requested,
  });

  useEffect(() => {
    async function loadNotifications() {
      if (user) {
        try {
          const response = await getMyNotifications();
          const apiNotifications = response.data.map(mapApiNotificationToLocal);
          setNotifications(apiNotifications.sort((a, b) => b.date.getTime() - a.date.getTime()));
        } catch (error) {
          console.error("Failed to load notifications from API:", error);
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    }
    
    loadNotifications();
    
    // Set up an interval to poll for new notifications every minute
    const intervalId = setInterval(loadNotifications, 60000);

    return () => clearInterval(intervalId);
  }, [user]);

  // This function is for ephemeral, client-side only notifications.
  const addNotification = useCallback((notificationInput: NotificationInput) => {
    const newNotification: Notification = {
      ...notificationInput,
      id: `client-notif-${Date.now()}`,
      date: new Date(),
      read: false,
      targetRoles: [],
      targetUserIds: [],
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification || notification.read) {
        return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
        console.error("No auth token found for marking notification as read.");
        return;
    }

    try {
        await markNotificationAsRead(parseInt(id, 10), token);
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
        console.error("No auth token found for marking all as read.");
        return;
    }
    
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) {
        toast({
            title: "Todo al día",
            description: "No tienes notificaciones sin leer.",
        });
        return;
    }

    try {
        const response = await markAllNotificationsAsRead(token);

        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );

        toast({
            title: "¡Listo!",
            description: response.message || "Todas las notificaciones han sido marcadas como leídas.",
        });

    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron marcar todas las notificaciones como leídas.",
        });
    }
  }, [notifications, toast]);
  
  const unreadCount = React.useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications, addNotification, markAsRead, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
