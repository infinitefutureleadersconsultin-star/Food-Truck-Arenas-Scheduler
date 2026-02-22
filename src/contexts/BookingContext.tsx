'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { Resource } from '@/lib/types';

interface BookingContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedResource: Resource | null;
  setSelectedResource: (resource: Resource | null) => void;
  bookingStep: number;
  setBookingStep: (step: number) => void;
  resetBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

interface BookingProviderProps {
  children: ReactNode;
}

export function BookingProvider({ children }: BookingProviderProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const [bookingStep, setBookingStep] = useState<number>(1);

  const resetBooking = useCallback(() => {
    setSelectedDate(new Date());
    setSelectedResource(null);
    setBookingStep(1);
  }, []);

  const value: BookingContextType = {
    selectedDate,
    setSelectedDate,
    selectedResource,
    setSelectedResource,
    bookingStep,
    setBookingStep,
    resetBooking,
  };

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBookingContext(): BookingContextType {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error(
      'useBookingContext must be used within a BookingProvider'
    );
  }
  return context;
}
