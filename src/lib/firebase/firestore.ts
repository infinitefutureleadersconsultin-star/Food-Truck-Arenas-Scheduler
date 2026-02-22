import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  UpdateData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Get a single document by collection name and document ID.
 * Returns the document data with its ID, or null if not found.
 */
export async function getDocument<T extends DocumentData>(
  collectionName: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
}

/**
 * Get multiple documents from a collection with optional query constraints.
 * Returns an array of documents, each including its ID.
 */
export async function getDocuments<T extends DocumentData>(
  collectionName: string,
  ...queryConstraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  const collectionRef = collection(db, collectionName);
  const q =
    queryConstraints.length > 0
      ? query(collectionRef, ...queryConstraints)
      : query(collectionRef);

  const querySnap = await getDocs(q);

  return querySnap.docs.map(
    (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T & { id: string }
  );
}

/**
 * Add a new document to a collection.
 * Returns the auto-generated document ID.
 */
export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: WithFieldValue<T>
): Promise<string> {
  const collectionRef = collection(db, collectionName);
  const docRef = await addDoc(collectionRef, data);
  return docRef.id;
}

/**
 * Update an existing document by collection name and document ID.
 */
export async function updateDocument<T extends DocumentData>(
  collectionName: string,
  id: string,
  data: UpdateData<T>
): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, data);
}

/**
 * Delete a document by collection name and document ID.
 */
export async function deleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}

/**
 * Subscribe to real-time updates on a single document.
 * The callback receives the document data (with ID) or null if the document does not exist.
 * Returns an unsubscribe function.
 */
export function subscribeToDocument<T extends DocumentData>(
  collectionName: string,
  id: string,
  callback: (data: (T & { id: string }) | null) => void
): Unsubscribe {
  const docRef = doc(db, collectionName, id);

  return onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }
    callback({ id: docSnap.id, ...docSnap.data() } as T & { id: string });
  });
}

/**
 * Subscribe to real-time updates on a collection with optional query constraints.
 * The callback receives an array of documents, each including its ID.
 * Returns an unsubscribe function.
 */
export function subscribeToCollection<T extends DocumentData>(
  collectionName: string,
  callback: (data: (T & { id: string })[]) => void,
  ...queryConstraints: QueryConstraint[]
): Unsubscribe {
  const collectionRef = collection(db, collectionName);
  const q =
    queryConstraints.length > 0
      ? query(collectionRef, ...queryConstraints)
      : query(collectionRef);

  return onSnapshot(q, (querySnap) => {
    const results = querySnap.docs.map(
      (docSnap) =>
        ({ id: docSnap.id, ...docSnap.data() }) as T & { id: string }
    );
    callback(results);
  });
}
