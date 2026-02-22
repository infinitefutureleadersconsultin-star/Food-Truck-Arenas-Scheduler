import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  User,
  UserCredential,
  Unsubscribe,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign in with Google via popup.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

/**
 * Create a new account with email and password.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  return signOut(auth);
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Get the currently authenticated user, or null if not signed in.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get custom claims (e.g. role, status) from the current user's ID token.
 * Returns null if no user is signed in.
 */
export async function getUserClaims(): Promise<Record<string, unknown> | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const tokenResult = await user.getIdTokenResult();
  return tokenResult.claims as Record<string, unknown>;
}
