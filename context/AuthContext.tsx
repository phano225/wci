import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
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
            // S'assurer que l'ID correspond toujours à l'ID de session Auth pour les droits RLS
            setUser({
              ...profile,
              id: session.user.id
            });
          } else if (session.user.email) {
            // Créer le profil s'il n'existe pas encore dans public.users
            const metaRole = session.user.user_metadata?.role;
            const userRole = (session.user.email.includes('admin') || session.user.email.includes('koffi')) 
              ? UserRole.ADMIN 
              : (metaRole === 'EDITOR' ? UserRole.EDITOR : UserRole.CONTRIBUTOR);

            const fallbackUser: User = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                role: userRole,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email.split('@')[0])}&background=random`,
                active: true,
                createdAt: new Date().toISOString()
            };

            setUser(fallbackUser);
            // Sauvegarder automatiquement en base pour synchroniser
            saveUser(fallbackUser).catch(e => console.warn('Could not auto-create public user profile:', e));
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du profil:', error);
          if (session.user?.email) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              name: session.user.email.split('@')[0],
              role: UserRole.CONTRIBUTOR,
              active: true,
              createdAt: new Date().toISOString()
            });
          } else {
            setUser(null);
          }
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
      // Add a timeout to prevent hanging forever
      const timeout = new Promise<{error: any}>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de connexion')), 15000)
      );
      
      const { error } = await Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          timeout
      ]);
      
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
