'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser);
        setError(null);

        if (firebaseUser) {
          try {
            // Get custom claims from the ID token result
            const tokenResult = await firebaseUser.getIdTokenResult();
            const role = tokenResult.claims.role as string | undefined;
            const status = tokenResult.claims.status as string | undefined;

            // Fetch user document from Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const firestoreData = userDocSnap.data();
              const mergedUserData: User = {
                ...firestoreData,
                id: firebaseUser.uid,
                // Override with custom claims if available
                ...(role && { role }),
                ...(status && { status }),
              } as User;

              setUserData(mergedUserData);
            } else {
              setUserData(null);
              setError('User document not found in Firestore.');
            }
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Failed to fetch user data.';
            setError(message);
            setUserData(null);
          }
        } else {
          setUserData(null);
        }

        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    userData,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
