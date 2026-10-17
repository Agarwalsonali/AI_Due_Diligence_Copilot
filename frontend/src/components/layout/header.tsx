'use client';

import { Sun, Moon, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import { NotificationBell } from '@/components/layout/notification-bell';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  companies: 'Companies',
  documents: 'Documents',
  chat: 'AI Research',
  compare: 'Company Comparison',
  reports: 'Reports',
  settings: 'Settings',
};

interface HeaderProps {
  /** Opens the mobile navigation drawer (below the md breakpoint). */
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';

    if (segments[0] === 'companies' && segments.length > 2) return 'Company Details';
    if (segments[0] === 'companies' && segments[1] === 'financials') return 'Financial Analysis';
    if (segments[0] === 'companies' && segments[1] === 'risks') return 'Risk Analysis';
    if (segments[0] === 'companies' && segments[1] === 'opportunities') return 'Growth Opportunities';

    return pageTitles[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
  };

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold tracking-tight truncate">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
