'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { authAPI } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const response = await authAPI.me();
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
      setUser(null);
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (emailOrData: any, password?: string) => {
    const payload = typeof emailOrData === 'string'
      ? { email: emailOrData, password: password! }
      : emailOrData;
    const response = await authAPI.login(payload);
    localStorage.setItem('access_token', response.data.access_token);
    await fetchUser();
    router.push('/');
  };

  const register = async (nameOrData: any, email?: string, password?: string) => {
    const payload = typeof nameOrData === 'string'
      ? { name: nameOrData, email: email!, password: password! }
      : nameOrData;
    const response = await authAPI.register(payload);
    localStorage.setItem('access_token', response.data.access_token);
    await fetchUser();
    router.push('/');
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
