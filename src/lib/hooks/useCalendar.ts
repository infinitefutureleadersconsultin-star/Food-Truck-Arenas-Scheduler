import { useState, useMemo, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isToday,
} from 'date-fns';

type CalendarView = 'day' | 'week' | 'month';

/**
 * useCalendar - Calendar navigation and computed date helpers.
 *
 * Manages the currently selected date and view mode, and exposes computed
 * values such as the list of dates in the current week/month, a formatted
 * date string, and navigation actions (next, previous, today).
 */
export function useCalendar(initialDate?: Date, initialView?: CalendarView) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDate ?? new Date()
  );
  const [view, setView] = useState<CalendarView>(initialView ?? 'week');

  // ---- Computed: dates in the current week (Sun-Sat) ----
  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // ---- Computed: dates in the current month ----
  const monthDates = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // ---- Computed: human-readable formatted date ----
  const formattedDate = useMemo(() => {
    switch (view) {
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      case 'week': {
        const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      }
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
      default:
        return format(selectedDate, 'MMMM d, yyyy');
    }
  }, [selectedDate, view]);

  // ---- Navigation actions ----
  const goToNext = useCallback(() => {
    setSelectedDate((prev) => {
      switch (view) {
        case 'day':
          return addDays(prev, 1);
        case 'week':
          return addWeeks(prev, 1);
        case 'month':
          return addMonths(prev, 1);
        default:
          return prev;
      }
    });
  }, [view]);

  const goToPrevious = useCallback(() => {
    setSelectedDate((prev) => {
      switch (view) {
        case 'day':
          return subDays(prev, 1);
        case 'week':
          return subWeeks(prev, 1);
        case 'month':
          return subMonths(prev, 1);
        default:
          return prev;
      }
    });
  }, [view]);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  return {
    // State
    selectedDate,
    setSelectedDate,
    view,
    setView,

    // Computed values
    weekDates,
    monthDates,
    formattedDate,

    // Navigation
    goToNext,
    goToPrevious,
    goToToday,
    goToDate,

    // Date-fns re-exports for convenience
    isSameDay,
    isToday,
  };
}
