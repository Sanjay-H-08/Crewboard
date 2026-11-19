import React, { createContext, useContext, useEffect, useState } from 'react';

// Shape of a notification
// {
//   id: string (uuid)
//   title: string
//   description: string
//   timestamp: number (ms since epoch)
//   read: boolean
// }

const NotificationContext = createContext(null);

/**
 * Provide notification state and actions.
 * Persists notifications to localStorage under "crewboard-notifications".
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('crewboard-notifications');
      if (stored) return JSON.parse(stored);
    } catch {}
    // initial sample notifications if none exist
    const sample = [
      {
        id: crypto.randomUUID(),
        title: 'Welcome to Crewboard',
        description: 'Your account has been created successfully.',
        timestamp: Date.now(),
        read: false,
      },
      {
        id: crypto.randomUUID(),
        title: 'Team Invitation',
        description: 'You have been invited to join "Team Alpha".',
        timestamp: Date.now() - 5 * 60 * 1000,
        read: false,
      },
    ];
    localStorage.setItem('crewboard-notifications', JSON.stringify(sample));
    return sample;
  });

  // Keep localStorage in sync
  useEffect(() => {
    try {
      localStorage.setItem('crewboard-notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const addNotification = (notif) => {
    const newNotif = {
      id: crypto.randomUUID(),
      read: false,
      timestamp: Date.now(),
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return ctx;
}
