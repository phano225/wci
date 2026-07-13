import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../supabase-config';
import { getUsers, saveUser, IS_OFFLINE_MODE, clearCache } from '../services/api';

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
    if (IS_OFFLINE_MODE) {
        setIsLoading(false);
        return;
    }

    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      
      if (session?.user) {
        try {
          
          let users = await getUsers();
          
          // Retry logic for unstable connection
          if (users.length === 0) {
              
              await new Promise(resolve => setTimeout(resolve, 2000));
              users = await getUsers();
          }

          const profile = users.find(u => u.email === session.user.email);
          
          if (profile) {
            setUser(profile);
          } else if (users.length === 0 && session.user.email) {
            // Fallback: If we have a session but couldn't fetch the profile (likely network error),
            // keep the user logged in with basic info from session to avoid kicking them out.
            
            setUser({
                id: session.user.id,
                email: session.user.email,
                name: session.user.email.split('@')[0], // Fallback name
                role: 'CONTRIBUTOR', // Safe default
                active: true,
                createdAt: new Date().toISOString()
            } as User);
          } else {
            
            setUser(null);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du profil:', error);
          setUser(null);
        }
      } else {
        
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (IS_OFFLINE_MODE) {
        return false;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Erreur de connexion Supabase:', error);
        return false;
      }
      
      try { clearCache(); } catch {}
      return true;
    } catch (e) {
      console.error("Erreur lors de la connexion:", e);
      return false;
    }
  };

  const logout = async () => {
    if (IS_OFFLINE_MODE) {
        setUser(null);
        try { clearCache(); } catch {}
        return;
    }
    await supabase.auth.signOut();
    try { clearCache(); } catch {}
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
