'use client';

import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/notification-context';
import { NotificationType } from '@/lib/notify';
import { cn } from '@/lib/utils';

const typeStyles: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-emerald-500 bg-emerald-500/10' },
  error: { icon: XCircle, className: 'text-destructive bg-destructive/10' },
  warning: { icon: AlertTriangle, className: 'text-amber-500 bg-amber-500/10' },
  info: { icon: Info, className: 'text-primary bg-primary/10' },
};

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } =
    useNotifications();


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              disabled={notifications.length === 0}
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={notifications.length === 0}
              aria-label="Clear all notifications"
              onClick={clearAll}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="h-6 w-6 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Updates about your documents, reports and analysis will show up
                here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const { icon: Icon, className } = typeStyles[n.type] || typeStyles.info;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full text-left flex gap-3 px-3 py-2.5 hover:bg-accent transition-colors',
                        !n.read && 'bg-primary/[0.04]'
                      )}
                      onClick={() => {
                        markRead(n.id);
                        if (n.href) router.push(n.href);
                      }}
                    >
                      <span
                        className={cn(
                          'mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center',
                          className
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span
                            className={cn(
                              'text-sm flex-1',
                              n.read ? 'text-foreground/80' : 'font-medium'
                            )}
                          >
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </span>
                        {n.description && (
                          <span className="block text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {n.description}
                          </span>
                        )}
                        <span className="block text-[11px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
