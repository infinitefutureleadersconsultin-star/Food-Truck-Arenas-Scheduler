import { create } from 'zustand';
import {
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfToday,
} from 'date-fns';

type CalendarView = 'day' | 'week' | 'month';

interface CalendarStoreState {
  currentDate: Date;
  view: CalendarView;
  selectedBookingId: string | null;
}

interface CalendarStoreActions {
  setCurrentDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  goToToday: () => void;
  goForward: () => void;
  goBack: () => void;
  selectBooking: (bookingId: string | null) => void;
}

type CalendarStore = CalendarStoreState & CalendarStoreActions;

function navigateForward(date: Date, view: CalendarView): Date {
  switch (view) {
    case 'day':
      return addDays(date, 1);
    case 'week':
      return addWeeks(date, 1);
    case 'month':
      return addMonths(date, 1);
  }
}

function navigateBack(date: Date, view: CalendarView): Date {
  switch (view) {
    case 'day':
      return subDays(date, 1);
    case 'week':
      return subWeeks(date, 1);
    case 'month':
      return subMonths(date, 1);
  }
}

export const useCalendarStore = create<CalendarStore>()((set) => ({
  currentDate: startOfToday(),
  view: 'week',
  selectedBookingId: null,

  setCurrentDate: (date: Date) => set({ currentDate: date }),

  setView: (view: CalendarView) => set({ view }),

  goToToday: () => set({ currentDate: startOfToday() }),

  goForward: () =>
    set((state) => ({
      currentDate: navigateForward(state.currentDate, state.view),
    })),

  goBack: () =>
    set((state) => ({
      currentDate: navigateBack(state.currentDate, state.view),
    })),

  selectBooking: (bookingId: string | null) =>
    set({ selectedBookingId: bookingId }),
}));
