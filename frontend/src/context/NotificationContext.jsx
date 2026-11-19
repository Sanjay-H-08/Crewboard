import React, { createContext, useContext, useEffect, useState } from 'react';

// Shape of a notification:
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
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_err) {
      // Ignore localStorage read errors in non-standard environments
    }

    // Default welcome notifications for initial onboarding
    const sample = [
      {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'welcome-1',
        title: 'Welcome to Crewboard',
        description: 'Your academic workspace is ready. Check your team project board to get started.',
        timestamp: Date.now() - 60 * 1000,
        read: false,
      },
      {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'welcome-2',
        title: 'Team Milestone Sync',
        description: 'New deliverable submission and review cycle active for current sprint.',
        timestamp: Date.now() - 15 * 60 * 1000,
        read: false,
      },
    ];

    try {
      localStorage.setItem('crewboard-notifications', JSON.stringify(sample));
    } catch (_err) {
      // Ignore localStorage write errors in private browsing / sandboxes
    }

    return sample;
  });

  // Keep localStorage synchronized
  useEffect(() => {
    try {
      localStorage.setItem('crewboard-notifications', JSON.stringify(notifications));
    } catch (_err) {
      // Ignore storage errors
    }
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
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
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
