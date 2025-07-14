import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isGuest: boolean;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  getAllRoles: () => string[];
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  isGuest: false,
  loginAsGuest: () => {},
  logout: async () => {},
  hasRole: () => false,
  getAllRoles: () => [],
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user && !isGuest) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const profile = { 
              id: user.uid, 
              ...userData,
              createdAt: userData.createdAt?.toDate() || new Date()
            } as User;
            
            setUserProfile(profile);
            
            // Check if user has no role or guest role - treat as guest
            if (!profile.role || profile.role === 'guest') {
              setIsGuest(true);
            } else {
              setIsGuest(false);
            }
          } else {
            // User exists in Firebase Auth but not in Firestore
            // This shouldn't happen with proper setup, but handle gracefully
            console.warn('User authenticated but no profile found in Firestore');
            setUserProfile(null);
            setIsGuest(true); // Treat as guest if no profile
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
          setIsGuest(true); // Treat as guest on error
        }
      } else if (!user && !isGuest) {
        setUserProfile(null);
        setIsGuest(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [isGuest]);

  const hasRole = (role: string): boolean => {
    if (!userProfile) return false;
    
    // Guest role check
    if (role === 'guest') {
      return isGuest || !userProfile.role || userProfile.role === 'guest';
    }
    
    // If user is treated as guest, they only have guest role
    if (isGuest) {
      return role === 'guest';
    }
    
    // Check primary role
    if (userProfile.role === role) return true;
    
    // Check additional roles
    if (userProfile.roles && userProfile.roles.includes(role as any)) return true;
    
    return false;
  };

  const getAllRoles = (): string[] => {
    if (!userProfile) return [];
    
    // If user is treated as guest, return only guest role
    if (isGuest || !userProfile.role || userProfile.role === 'guest') {
      return ['guest'];
    }
    
    const roles = [userProfile.role];
    if (userProfile.roles) {
      userProfile.roles.forEach(role => {
        if (!roles.includes(role)) {
          roles.push(role);
        }
      });
    }
    
    return roles;
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    setCurrentUser(null);
    setUserProfile({
      id: 'guest',
      email: 'guest@circuitrunners.com',
      displayName: 'Guest User',
      role: 'guest',
      createdAt: new Date()
    } as User & { role: 'guest' });
    setLoading(false);
  };

  const logout = async () => {
    try {
      // If there's a current user, sign them out from Firebase
      if (currentUser) {
        await signOut(auth);
      }
      
      // Clear all state
      setIsGuest(false);
      setCurrentUser(null);
      setUserProfile(null);
      
      // Clear any stored authentication data
      localStorage.clear();
      sessionStorage.clear();
      
      // Force navigation to root and reload to ensure clean state
      window.history.replaceState(null, '', '/');
      window.location.reload();
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Even if there's an error, clear local state
      setIsGuest(false);
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.clear();
      sessionStorage.clear();
      
      // Force navigation to root and reload even on error
      window.history.replaceState(null, '', '/');
      window.location.reload();
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    isGuest,
    loginAsGuest,
    logout,
    hasRole,
    getAllRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};