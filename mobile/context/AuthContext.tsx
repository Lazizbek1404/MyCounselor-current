import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'counselor' | 'teacher' | 'parent';
  schoolId: string;
  schoolName?: string;
  gradeLevel?: string;
  title?: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Prevents duplicate concurrent profile fetches from getSession + onAuthStateChange racing
  const fetchingRef = useRef(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      }).catch(() => setIsLoading(false));

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          fetchingRef.current = false;
          setUser(null);
          setIsLoading(false);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      setIsLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  async function fetchProfile(userId: string) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Failed to load profile:', error.message);
      } else if (data) {
        setUser({
          id: data.id,
          firstName: data.first_name ?? '',
          lastName: data.last_name ?? '',
          email: data.email ?? '',
          role: data.role,
          schoolId: data.school_id ?? '',
          schoolName: data.school_name ?? undefined,
          gradeLevel: data.grade_level ?? undefined,
          title: data.title ?? undefined,
          profileImage: data.profile_image ?? undefined,
        });
      }
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }
      return { error: null };
    } catch {
      setIsLoading(false);
      return { error: 'Supabase is not configured. Add mobile/.env with your credentials.' };
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
