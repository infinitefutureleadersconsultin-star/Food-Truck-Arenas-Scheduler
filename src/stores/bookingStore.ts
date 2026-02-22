import { create } from 'zustand';
import type { RecurringPattern } from '@/lib/types';

interface BookingStoreState {
  date: string;
  startTime: string;
  endTime: string;
  selectedTableId: string | null;
  resourceRequests: Record<string, number>;
  notes: string;
  isRecurring: boolean;
  recurringPattern: RecurringPattern | null;
  step: number;
}

interface BookingStoreActions {
  setDate: (date: string) => void;
  setTimeRange: (startTime: string, endTime: string) => void;
  setSelectedTable: (tableId: string | null) => void;
  setResourceRequest: (resourceTypeId: string, quantity: number) => void;
  setNotes: (notes: string) => void;
  setRecurring: (isRecurring: boolean, pattern: RecurringPattern | null) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

type BookingStore = BookingStoreState & BookingStoreActions;

const initialState: BookingStoreState = {
  date: '',
  startTime: '',
  endTime: '',
  selectedTableId: null,
  resourceRequests: {},
  notes: '',
  isRecurring: false,
  recurringPattern: null,
  step: 1,
};

const MIN_STEP = 1;
const MAX_STEP = 4;

export const useBookingStore = create<BookingStore>()((set) => ({
  ...initialState,

  setDate: (date: string) => set({ date }),

  setTimeRange: (startTime: string, endTime: string) =>
    set({ startTime, endTime }),

  setSelectedTable: (tableId: string | null) =>
    set({ selectedTableId: tableId }),

  setResourceRequest: (resourceTypeId: string, quantity: number) =>
    set((state) => {
      const updated = { ...state.resourceRequests };
      if (quantity <= 0) {
        delete updated[resourceTypeId];
      } else {
        updated[resourceTypeId] = quantity;
      }
      return { resourceRequests: updated };
    }),

  setNotes: (notes: string) => set({ notes }),

  setRecurring: (isRecurring: boolean, pattern: RecurringPattern | null) =>
    set({ isRecurring, recurringPattern: pattern }),

  nextStep: () =>
    set((state) => ({
      step: Math.min(state.step + 1, MAX_STEP),
    })),

  prevStep: () =>
    set((state) => ({
      step: Math.max(state.step - 1, MIN_STEP),
    })),

  reset: () => set(initialState),
}));
