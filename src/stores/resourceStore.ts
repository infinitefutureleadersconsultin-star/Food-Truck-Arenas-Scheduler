import { create } from 'zustand';
import type { ResourceType, Resource, ResourceStatus } from '@/lib/types';

interface ResourceStoreState {
  resourceTypes: ResourceType[];
  resources: Resource[];
  loading: boolean;
}

interface ResourceStoreActions {
  setResourceTypes: (resourceTypes: ResourceType[]) => void;
  setResources: (resources: Resource[]) => void;
  updateResourceStatus: (resourceId: string, status: ResourceStatus) => void;
  addResource: (resource: Resource) => void;
  removeResource: (resourceId: string) => void;
}

type ResourceStore = ResourceStoreState & ResourceStoreActions;

export const useResourceStore = create<ResourceStore>()((set) => ({
  resourceTypes: [],
  resources: [],
  loading: false,

  setResourceTypes: (resourceTypes: ResourceType[]) => set({ resourceTypes }),

  setResources: (resources: Resource[]) => set({ resources }),

  updateResourceStatus: (resourceId: string, status: ResourceStatus) =>
    set((state) => ({
      resources: state.resources.map((resource) =>
        resource.id === resourceId ? { ...resource, status } : resource
      ),
    })),

  addResource: (resource: Resource) =>
    set((state) => ({
      resources: [...state.resources, resource],
    })),

  removeResource: (resourceId: string) =>
    set((state) => ({
      resources: state.resources.filter(
        (resource) => resource.id !== resourceId
      ),
    })),
}));
