import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  ResourceType,
  Resource,
  ResourceStatus,
  BookingResource,
} from '@/lib/types';

const RESOURCE_TYPES_COLLECTION = 'resourceTypes';
const RESOURCES_COLLECTION = 'resources';
const BOOKINGS_COLLECTION = 'bookings';

/**
 * Get all active resource types, sorted by sortOrder.
 */
export async function getResourceTypes(): Promise<ResourceType[]> {
  try {
    // Only use where() — sort client-side to avoid composite index requirement
    const q = query(
      collection(db, RESOURCE_TYPES_COLLECTION),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as ResourceType)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  } catch (error) {
    console.error('Error getting resource types:', error);
    throw error;
  }
}

/**
 * Get a single resource type by ID.
 */
export async function getResourceType(
  id: string
): Promise<ResourceType | null> {
  try {
    const docRef = doc(db, RESOURCE_TYPES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() } as ResourceType;
  } catch (error) {
    console.error('Error getting resource type:', error);
    throw error;
  }
}

/**
 * Create a new resource type. If trackIndividually is true,
 * also creates individual Resource documents.
 */
export async function createResourceType(
  data: Omit<ResourceType, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const now = Timestamp.now();

    const docRef = await addDoc(collection(db, RESOURCE_TYPES_COLLECTION), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    // If tracking individually, create individual resource documents
    if (data.trackIndividually && data.totalQuantity > 0) {
      const batch = writeBatch(db);

      for (let i = 1; i <= data.totalQuantity; i++) {
        const resourceRef = doc(collection(db, RESOURCES_COLLECTION));
        batch.set(resourceRef, {
          typeId: docRef.id,
          typeName: data.name,
          name: `${data.name} #${i}`,
          label: `${data.slug}-${i}`,
          status: 'available' as ResourceStatus,
          locationDescription: '',
          notes: '',
          position: { x: 0, y: 0, width: 50, height: 50, rotation: 0 },
          maintenanceSchedule: {
            lastMaintenance: now,
            nextMaintenance: now,
            notes: '',
          },
          createdAt: now,
          updatedAt: now,
        });
      }

      await batch.commit();
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating resource type:', error);
    throw error;
  }
}

/**
 * Update an existing resource type.
 */
export async function updateResourceType(
  id: string,
  updates: Partial<ResourceType>
): Promise<void> {
  try {
    const docRef = doc(db, RESOURCE_TYPES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating resource type:', error);
    throw error;
  }
}

/**
 * Get individual resources, optionally filtered by type ID.
 */
export async function getResources(typeId?: string): Promise<Resource[]> {
  try {
    // Only use where() — sort client-side to avoid composite index requirement
    const constraints = typeId
      ? [where('typeId', '==', typeId)]
      : [];

    const q = query(collection(db, RESOURCES_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Resource)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  } catch (error) {
    console.error('Error getting resources:', error);
    throw error;
  }
}

/**
 * Get a single resource by ID.
 */
export async function getResource(id: string): Promise<Resource | null> {
  try {
    const docRef = doc(db, RESOURCES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() } as Resource;
  } catch (error) {
    console.error('Error getting resource:', error);
    throw error;
  }
}

/**
 * Update an individual resource.
 */
export async function updateResource(
  id: string,
  updates: Partial<Resource>
): Promise<void> {
  try {
    const docRef = doc(db, RESOURCES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    throw error;
  }
}

/**
 * Update the status of an individual resource.
 */
export async function updateResourceStatus(
  id: string,
  status: ResourceStatus
): Promise<void> {
  try {
    const docRef = doc(db, RESOURCES_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating resource status:', error);
    throw error;
  }
}

/**
 * Get resources of a specific type that are not booked during the given time window.
 */
export async function getAvailableResources(
  typeId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<Resource[]> {
  try {
    // Get all resources of this type — filter status client-side to avoid composite index
    const resourcesQuery = query(
      collection(db, RESOURCES_COLLECTION),
      where('typeId', '==', typeId)
    );
    const resourcesSnap = await getDocs(resourcesQuery);

    const allResources = resourcesSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Resource)
      .filter((r) => r.status === 'available');

    // Get bookings for the given date — filter status client-side to avoid composite index
    const bookingsQuery = query(
      collection(db, BOOKINGS_COLLECTION),
      where('date', '==', date)
    );
    const bookingsSnap = await getDocs(bookingsQuery);
    const activeStatuses = new Set(['pending', 'confirmed', 'checked_in']);

    // Collect IDs of resources that are booked during the time window
    const bookedResourceIds = new Set<string>();
    bookingsSnap.forEach((docSnap) => {
      const booking = docSnap.data();
      if (!activeStatuses.has(booking.status)) return;
      // Check for time overlap
      if (booking.startTime < endTime && booking.endTime > startTime) {
        (booking.resources || []).forEach((r: BookingResource) => {
          if (r.resourceTypeId === typeId) {
            bookedResourceIds.add(r.resourceId);
          }
        });
      }
    });

    // Return resources that are not booked
    return allResources.filter((r) => !bookedResourceIds.has(r.id));
  } catch (error) {
    console.error('Error getting available resources:', error);
    throw error;
  }
}

/**
 * Add new individual resources to an existing resource type.
 */
export async function addResourcesToType(
  typeId: string,
  count: number
): Promise<void> {
  try {
    const typeRef = doc(db, RESOURCE_TYPES_COLLECTION, typeId);
    const typeSnap = await getDoc(typeRef);

    if (!typeSnap.exists()) {
      throw new Error(`Resource type ${typeId} not found`);
    }

    const resourceType = typeSnap.data() as ResourceType;
    const now = Timestamp.now();

    // Get existing resources to determine numbering
    const existingQuery = query(
      collection(db, RESOURCES_COLLECTION),
      where('typeId', '==', typeId)
    );
    const existingSnap = await getDocs(existingQuery);
    const existingCount = existingSnap.size;

    const batch = writeBatch(db);

    for (let i = 1; i <= count; i++) {
      const num = existingCount + i;
      const resourceRef = doc(collection(db, RESOURCES_COLLECTION));
      batch.set(resourceRef, {
        typeId,
        typeName: resourceType.name,
        name: `${resourceType.name} #${num}`,
        label: `${resourceType.slug}-${num}`,
        status: 'available' as ResourceStatus,
        locationDescription: '',
        notes: '',
        position: { x: 0, y: 0, width: 50, height: 50, rotation: 0 },
        maintenanceSchedule: {
          lastMaintenance: now,
          nextMaintenance: now,
          notes: '',
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update the total quantity on the resource type
    batch.update(typeRef, {
      totalQuantity: resourceType.totalQuantity + count,
      updatedAt: now,
    });

    await batch.commit();
  } catch (error) {
    console.error('Error adding resources to type:', error);
    throw error;
  }
}

/**
 * Remove unbooked resources from a resource type.
 * Only removes resources that have 'available' status.
 */
export async function removeResourcesFromType(
  typeId: string,
  count: number
): Promise<void> {
  try {
    const typeRef = doc(db, RESOURCE_TYPES_COLLECTION, typeId);
    const typeSnap = await getDoc(typeRef);

    if (!typeSnap.exists()) {
      throw new Error(`Resource type ${typeId} not found`);
    }

    const resourceType = typeSnap.data() as ResourceType;

    // Get resources for this type — filter status client-side to avoid composite index
    const availableQuery = query(
      collection(db, RESOURCES_COLLECTION),
      where('typeId', '==', typeId)
    );
    const allSnap = await getDocs(availableQuery);
    const availableDocs = allSnap.docs.filter(
      (d) => d.data().status === 'available'
    );
    const availableSnap = { size: availableDocs.length, docs: availableDocs };

    if (availableSnap.size < count) {
      throw new Error(
        `Cannot remove ${count} resources. Only ${availableSnap.size} unbooked resources available for removal.`
      );
    }

    const batch = writeBatch(db);

    // Remove the last N available resources
    const toRemove = availableSnap.docs.slice(-count);
    for (const docSnap of toRemove) {
      batch.delete(doc(db, RESOURCES_COLLECTION, docSnap.id));
    }

    // Update the total quantity on the resource type
    batch.update(typeRef, {
      totalQuantity: Math.max(0, resourceType.totalQuantity - count),
      updatedAt: Timestamp.now(),
    });

    await batch.commit();
  } catch (error) {
    console.error('Error removing resources from type:', error);
    throw error;
  }
}
