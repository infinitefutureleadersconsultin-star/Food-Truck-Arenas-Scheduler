import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '@/lib/firebase/config';

/**
 * Upload a file to Firebase Storage at the given path.
 * Returns the public download URL of the uploaded file.
 */
export async function uploadFile(path: string, file: File): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

/**
 * Delete a file from Firebase Storage at the given path.
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Get the download URL for a file at the given path in Firebase Storage.
 */
export async function getFileUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}
