import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '@/lib/firebase/config';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Upload a file to Firebase Storage at the given path.
 * Validates file type and size before uploading.
 * Returns the public download URL of the uploaded file.
 */
export async function uploadFile(path: string, file: File): Promise<string> {
  try {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
      );
    }

    if (ALLOWED_FILE_TYPES.length > 0 && !ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        `File type "${file.type}" is not allowed. Accepted types: ${ALLOWED_FILE_TYPES.join(', ')}`
      );
    }

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Delete a file from Firebase Storage at the given path.
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get the download URL for a file at the given path in Firebase Storage.
 */
export async function getFileUrl(path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
}
