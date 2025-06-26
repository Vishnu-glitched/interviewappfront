import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getUserProfile, createUserProfile } from '../lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading profile for user:', userId);
      const profile = await getUserProfile(userId);
      console.log('Profile loaded:', profile);
      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const clearAuthState = () => {
    console.log('Clearing auth state...');
    setUser(null);
    setUserProfile(null);
    setSession(null);
  };

  const clearAllStorageData = () => {
    try {
      // Clear all Supabase-related data from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Also clear sessionStorage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      console.log('Cleared storage data:', keysToRemove, sessionKeysToRemove);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Set a maximum loading time to prevent infinite loading
    const maxLoadingTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Max loading time reached, setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 seconds max

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Clear any existing timeout
        if (timeoutId) clearTimeout(timeoutId);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            clearAuthState();
            setLoading(false);
          }
          return;
        }

        console.log('Session retrieved:', session?.user?.email || 'No session');

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('User found, loading profile...');
            await loadUserProfile(session.user.id);
          } else {
            console.log('No user, clearing profile');
            setUserProfile(null);
          }
          
          console.log('Setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          clearAuthState();
          setLoading(false);
        }
      }
    };

    // Initialize with a small delay to ensure DOM is ready
    timeoutId = setTimeout(initializeAuth, 100);

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session?.user?.email || 'No user');
      
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // Handle sign out event specifically
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing all state');
        clearAuthState();
        clearAllStorageData();
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('Loading profile for auth change...');
        await loadUserProfile(session.user.id);
      } else {
        console.log('Clearing profile for auth change');
        setUserProfile(null);
      }
      
      console.log('Auth change complete, setting loading to false');
      setLoading(false);
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (maxLoadingTimeout) clearTimeout(maxLoadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }
      console.log('Sign in successful');
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    console.log('Attempting sign up for:', email, 'with username:', username);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        
        // Check for user already exists error and provide user-friendly message
        if (error.message === 'User already registered' || 
            (error as any).code === 'user_already_exists') {
          throw new Error('This email is already registered. Please sign in or use a different email.');
        }
        
        throw error;
      }
      
      console.log('Sign up successful:', data.user?.email);
      
      // Create profile manually if user is created
      if (data.user) {
        try {
          console.log('Creating user profile...');
          await createUserProfile(data.user.id, username, email);
          console.log('Profile created successfully');
        } catch (profileError) {
          console.log('Profile creation handled by trigger or already exists:', profileError);
        }
      }
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('Signing out...');
    try {
      // Clear local state immediately
      clearAuthState();
      
      // Clear all storage data immediately
      clearAllStorageData();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({
        scope: 'global' // This ensures sign out from all sessions
      });
      
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // Additional cleanup - remove any remaining auth tokens
      try {
        await supabase.auth.admin.signOut(session?.access_token || '');
      } catch (adminError) {
        console.log('Admin sign out not available:', adminError);
      }
      
      console.log('Sign out successful, redirecting...');
      
      // Force a complete page reload to clear any cached state
      setTimeout(() => {
        window.location.replace('/auth');
      }, 100);
      
    } catch (error) {
      console.error('Sign out failed:', error);
      // Even if sign out fails, clear local state and redirect
      clearAuthState();
      clearAllStorageData();
      window.location.replace('/auth');
    }
  };

  const value = {
    user,
    userProfile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};