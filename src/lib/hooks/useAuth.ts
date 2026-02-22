import { useAuthContext } from '@/contexts/AuthContext';

/**
 * useAuth - Primary authentication hook.
 *
 * Re-exports the auth context and provides additional role/status helpers
 * derived from the current user's data.
 */
export function useAuth() {
  const authContext = useAuthContext();

  const isAdmin = (): boolean => {
    return authContext.userData?.role === 'admin';
  };

  const isVendor = (): boolean => {
    return authContext.userData?.role === 'vendor';
  };

  const isActive = (): boolean => {
    return authContext.userData?.status === 'active';
  };

  return {
    ...authContext,
    isAdmin,
    isVendor,
    isActive,
  };
}

export { useAuthContext } from '@/contexts/AuthContext';
