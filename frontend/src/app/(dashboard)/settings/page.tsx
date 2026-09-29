'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/components/theme-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Moon, Sun, LogOut, Shield, Info } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-muted-foreground">{user?.name || 'Not set'}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email || 'Not set'}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Role</p>
              <p className="text-sm text-muted-foreground">Research Analyst</p>
            </div>
            <Badge variant="outline">Standard</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            Appearance
          </CardTitle>
          <CardDescription>Customize the application theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Application Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">1.0.0</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Backend</span>
            <span className="font-mono">FastAPI</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vector Store</span>
            <span className="font-mono">Qdrant</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Embeddings</span>
            <span className="font-mono">text-embedding-3-small</span>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
