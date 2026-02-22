import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getDocument,
  updateDocument,
} from '@/lib/firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * useUser - Hook to get and manage the current authenticated user's data.
 *
 * Provides the user profile fetched from Firestore, along with helpers to
 * update the profile and force-refresh the cached user data.
 */
export function useUser() {
  const { user: firebaseUser, userData, loading: authLoading } = useAuthContext();
  const [user, setUser] = useState<User | null>(userData);
  const [loading, setLoading] = useState<boolean>(authLoading);
  const [error, setError] = useState<string | null>(null);

  // Sync with auth context changes
  useEffect(() => {
    setUser(userData);
    setLoading(authLoading);
  }, [userData, authLoading]);

  /**
   * Update the current user's profile with the given partial data.
   * Automatically sets the `updatedAt` timestamp.
   */
  const updateProfile = useCallback(
    async (data: Partial<Omit<User, 'id' | 'createdAt'>>) => {
      if (!firebaseUser) {
        setError('No authenticated user.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await updateDocument('users', firebaseUser.uid, {
          ...data,
          updatedAt: serverTimestamp(),
        });

        // Optimistically update local state
        setUser((prev) =>
          prev ? { ...prev, ...data } as User : null
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update profile.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [firebaseUser]
  );

  /**
   * Force-refresh the user data from Firestore.
   */
  const refreshUser = useCallback(async () => {
    if (!firebaseUser) {
      setError('No authenticated user.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const freshUser = await getDocument<User>('users', firebaseUser.uid);
      if (freshUser) {
        setUser(freshUser);
      } else {
        setError('User document not found.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to refresh user data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  return {
    user,
    loading,
    error,
    updateProfile,
    refreshUser,
  };
}
