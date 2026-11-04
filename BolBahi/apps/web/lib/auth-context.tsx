'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from './api';

export interface User {
  id: string;
  identifier: string;
  shopId: string;
}

export interface Shop {
  id: string;
  name: string;
  ownerName: string;
  language: 'hi-IN' | 'en-IN';
}

interface AuthContextType {
  user: User | null;
  shop: Shop | null;
  loading: boolean;
  language: 'hi-IN' | 'en-IN';
  setLanguage: (lang: 'hi-IN' | 'en-IN') => void;
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: {
    shopName: string;
    ownerName: string;
    identifier: string;
    password: string;
    language?: 'hi-IN' | 'en-IN';
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [language, setLanguageState] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('bb_lang') : null;
    if (saved === 'en-IN' || saved === 'hi-IN') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (newLang: 'hi-IN' | 'en-IN') => {
    setLanguageState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bb_lang', newLang);
    }
    if (shop) {
      setShop((prev) => (prev ? { ...prev, language: newLang } : null));
    }
    apiFetch('/api/auth/language', {
      method: 'PATCH',
      body: JSON.stringify({ language: newLang }),
    }).catch(() => {});
  };

  const refreshAuth = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: User; shop: Shop }>('/api/auth/me');
      if (res.ok) {
        setUser(res.data.user);
        setShop(res.data.shop);
        const saved = typeof window !== 'undefined' ? (localStorage.getItem('bb_lang') as 'hi-IN' | 'en-IN' | null) : null;
        if (saved) {
          setLanguageState(saved);
        } else if (res.data.shop?.language) {
          setLanguageState(res.data.shop.language);
        }
      } else {
        setUser(null);
        setShop(null);
        if (pathname && !pathname.startsWith('/login') && !pathname.startsWith('/register') && !pathname.startsWith('/s/')) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    } catch {
      setUser(null);
      setShop(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (identifier: string, password: string) => {
    const res = await apiFetch<{ user: User; shop: Shop }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });

    if (res.ok) {
      setUser(res.data.user);
      setShop(res.data.shop);
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/home';
      router.replace(redirect);
      return { ok: true };
    } else {
      return { ok: false, error: res.error.spokenMessage || res.error.message };
    }
  };

  const register = async (data: {
    shopName: string;
    ownerName: string;
    identifier: string;
    password: string;
    language?: 'hi-IN' | 'en-IN';
  }) => {
    const res = await apiFetch<{ user: User; shop: Shop }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setUser(res.data.user);
      setShop(res.data.shop);
      router.replace('/home');
      return { ok: true };
    } else {
      return { ok: false, error: res.error.spokenMessage || res.error.message };
    }
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setShop(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        shop,
        language,
        setLanguage,
        loading,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

