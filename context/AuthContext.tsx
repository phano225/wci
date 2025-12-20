import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../supabase-config';
import { getUsers, saveUser } from '../services/mockDatabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const users = await getUsers();
        const profile = users.find(u => u.email === session.user.email);
        if (profile) setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return !error;
    } catch (e) {
      console.error("Login Error:", e);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
=======
        const users = await getUsers();
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        
        if (foundUser) {
          setUser(foundUser);
          localStorage.setItem('wci_current_session', JSON.stringify(foundUser));
          return true;
        }
        return false;
    } catch (e) {
        console.error("Login Error:", e);
        return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateUser = async (userData: User) => {
    setUser(userData);
    await saveUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};