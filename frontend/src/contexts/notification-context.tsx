'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  AppNotification,
  subscribeNotifications,
} from '@/lib/notify';

const STORAGE_KEY = 'dd.notifications.v1';
const MAX_NOTIFICATIONS = 50;

// Auth events are toast-only now (NotifyOptions.transient). These titles were
// recorded in the bell before that rule existed — drop them on load so old
// sessions' login/logout activity cleans itself out of the notification center.
const LEGACY_AUTH_TITLES = new Set([
  'Logged in successfully',
  'Login failed',
  'Account created successfully',
  'Registration failed',
  'Session expired',
]);

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

function loadStored(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AppNotification =>
        !!item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        !LEGACY_AUTH_TITLES.has(item.title)
    );
  } catch {
    return [];
  }
}

function persist(items: AppNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable (private mode) — the in-memory list still works.
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadStored()
  );

  // Record every event pushed through the notify() bus.
  useEffect(() => {
    return subscribeNotifications((notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
    });
  }, []);

  // Persist changes.
  useEffect(() => {
    persist(notifications);
  }, [notifications]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.every((n) => n.read) ? prev : prev.map((n) => ({ ...n, read: true }))
    );
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({ notifications, unreadCount, markRead, markAllRead, remove, clearAll }),
    [notifications, unreadCount, markRead, markAllRead, remove, clearAll]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
