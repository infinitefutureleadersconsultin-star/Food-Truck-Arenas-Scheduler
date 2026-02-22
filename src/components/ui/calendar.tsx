"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  /** The month to display initially. Defaults to current month or selected date's month. */
  defaultMonth?: Date;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ selected, onSelect, disabled, className, defaultMonth }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(
      defaultMonth || selected || new Date()
    );

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    // Build array of day cells
    const days: Date[] = [];
    let day = calendarStart;
    while (isBefore(day, calendarEnd) || isSameDay(day, calendarEnd)) {
      days.push(day);
      day = addDays(day, 1);
    }

    const handlePreviousMonth = () => {
      setCurrentMonth((prev) => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
      setCurrentMonth((prev) => addMonths(prev, 1));
    };

    const handleSelectDate = (date: Date) => {
      if (disabled && disabled(date)) return;
      onSelect?.(date);
    };

    return (
      <div ref={ref} className={cn("p-3", className)}>
        {/* Header with month/year and navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium">
            {format(currentMonth, "MMMM yyyy")}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {DAYS_OF_WEEK.map((dayName) => (
            <div
              key={dayName}
              className="flex h-8 w-8 items-center justify-center text-xs font-medium text-gray-500"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0">
          {days.map((dayDate, idx) => {
            const isCurrentMonth = isSameMonth(dayDate, currentMonth);
            const isSelected = selected ? isSameDay(dayDate, selected) : false;
            const isDisabled = disabled ? disabled(dayDate) : false;
            const isToday = isSameDay(dayDate, new Date());

            return (
              <button
                key={idx}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelectDate(dayDate)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                  !isCurrentMonth && "text-gray-300",
                  isCurrentMonth && !isSelected && "text-gray-900 hover:bg-gray-100",
                  isSelected && "bg-primary text-white hover:bg-primary/90",
                  isToday && !isSelected && "border border-primary/50",
                  isDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
                )}
              >
                {format(dayDate, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);
Calendar.displayName = "Calendar";

export { Calendar };
