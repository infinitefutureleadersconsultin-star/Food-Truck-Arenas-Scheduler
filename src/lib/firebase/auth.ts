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
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
}

/**
 * Sign in with Google via popup.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  try {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Create a new account with email and password.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  try {
    return await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    return await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
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
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims as Record<string, unknown>;
  } catch (error) {
    console.error('Error getting user claims:', error);
    throw error;
  }
}
