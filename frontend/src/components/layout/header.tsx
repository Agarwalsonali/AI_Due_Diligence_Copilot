"use client";

import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    const title = segments[0];
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden md:flex w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Global search..." 
            className="pl-9 h-9 bg-muted/50 border-transparent focus:bg-background transition-colors"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full animate-pulse" />
        </Button>
      </div>
    </header>
  );
}
