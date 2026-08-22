"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { LayoutDashboard, Building2, FileText, MessageSquare, GitCompare, FileBarChart, LogOut, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/compare', label: 'Compare', icon: GitCompare },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn(
      "flex flex-col h-screen border-r border-border bg-card transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="p-4 flex items-center justify-between border-b border-border/50 h-16">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="p-1 bg-primary/10 rounded border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-lg tracking-tight">DD Copilot</span>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="p-1 bg-primary/10 rounded border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="hidden md:flex h-8 w-8 ml-auto">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group",
                active 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", active && "animate-pulse-glow rounded-full")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="text-muted-foreground hover:text-destructive shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
