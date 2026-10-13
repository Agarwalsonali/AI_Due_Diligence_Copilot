import { toast } from 'sonner';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  title: string;
  description?: string;
  type: NotificationType;
  href?: string;
  read: boolean;
  createdAt: number;
}

export interface NotifyOptions {
  description?: string;
  /** In-app route to open when the notification is clicked in the bell menu. */
  href?: string;
  /** Skip the transient toast and only record it in the notification center. */
  silent?: boolean;
}

type Listener = (notification: AppNotification) => void;

const listeners = new Set<Listener>();
let counter = 0;

function push(
  type: NotificationType,
  title: string,
  options: NotifyOptions = {}
): AppNotification {
  const notification: AppNotification = {
    id: `${Date.now().toString(36)}-${(counter++).toString(36)}`,
    title,
    description: options.description,
    type,
    href: options.href,
    read: false,
    createdAt: Date.now(),
  };

  if (!options.silent) {
    toast[type](
      title,
      options.description ? { description: options.description } : undefined
    );
  }

  listeners.forEach((listener) => listener(notification));
  return notification;
}

/**
 * Event notifications: fires a toast AND records the event in the notification
 * center (header bell). Works outside React too (e.g. axios interceptors).
 */
export const notify = {
  success: (title: string, options?: NotifyOptions) =>
    push('success', title, options),
  error: (title: string, options?: NotifyOptions) =>
    push('error', title, options),
  warning: (title: string, options?: NotifyOptions) =>
    push('warning', title, options),
  info: (title: string, options?: NotifyOptions) =>
    push('info', title, options),
};

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
