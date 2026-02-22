import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Booking, AttendanceLog, ResourceType } from '@/lib/types';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface UtilizationData {
  name: string;
  utilization: number;
  color: string;
}

export interface PeakHourData {
  day: string;
  hour: number;
  value: number;
}

export interface TrendData {
  date: string;
  bookings: number;
  utilization: number;
}

export interface VendorFrequencyData {
  name: string;
  bookings: number;
}

export interface TableUsageData {
  name: string;
  bookings: number;
}

async function getBookingsInRange(range: DateRange): Promise<Booking[]> {
  const q = query(
    collection(db, 'bookings'),
    where('date', '>=', range.startDate),
    where('date', '<=', range.endDate),
    where('status', 'in', ['confirmed', 'checked_in', 'completed']),
    orderBy('date', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

export async function getResourceUtilization(range: DateRange): Promise<UtilizationData[]> {
  const bookings = await getBookingsInRange(range);
  const typesSnap = await getDocs(collection(db, 'resourceTypes'));
  const types = typesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ResourceType));

  return types.map((type) => {
    const totalSlots = type.totalQuantity * getDayCount(range) * 16;
    const usedSlots = bookings.reduce((acc, b) => {
      const requested = b.resourceRequests?.[type.id] || 0;
      const duration = getBookingDurationHours(b);
      return acc + requested * duration;
    }, 0);
    return {
      name: type.name,
      utilization: totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0,
      color: type.color,
    };
  });
}

export async function getPeakHours(range: DateRange): Promise<PeakHourData[]> {
  const bookings = await getBookingsInRange(range);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const data: PeakHourData[] = [];

  for (const day of days) {
    for (let hour = 6; hour <= 22; hour++) {
      data.push({ day, hour, value: 0 });
    }
  }

  bookings.forEach((b) => {
    const dayOfWeek = new Date(b.date + 'T00:00:00').getDay();
    const startHour = parseInt(b.startTime.split(':')[0], 10);
    const endHour = parseInt(b.endTime.split(':')[0], 10);
    for (let h = startHour; h < endHour; h++) {
      const entry = data.find((d) => d.day === days[dayOfWeek] && d.hour === h);
      if (entry) entry.value++;
    }
  });

  return data;
}

export async function getWeeklyTrends(range: DateRange): Promise<TrendData[]> {
  const bookings = await getBookingsInRange(range);
  const dateMap = new Map<string, number>();

  bookings.forEach((b) => {
    dateMap.set(b.date, (dateMap.get(b.date) || 0) + 1);
  });

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      bookings: count,
      utilization: Math.min(100, Math.round((count / 8) * 100)),
    }));
}

export async function getVendorFrequency(range: DateRange, limit = 10): Promise<VendorFrequencyData[]> {
  const bookings = await getBookingsInRange(range);
  const vendorMap = new Map<string, number>();

  bookings.forEach((b) => {
    const name = b.businessName || b.userName;
    vendorMap.set(name, (vendorMap.get(name) || 0) + 1);
  });

  return Array.from(vendorMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, bookings]) => ({ name, bookings }));
}

export async function getTableUsage(range: DateRange): Promise<TableUsageData[]> {
  const bookings = await getBookingsInRange(range);
  const tableMap = new Map<string, number>();

  bookings.forEach((b) => {
    b.resources?.forEach((r) => {
      if (r.resourceTypeName === 'Table') {
        tableMap.set(r.resourceName, (tableMap.get(r.resourceName) || 0) + 1);
      }
    });
  });

  return Array.from(tableMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, bookings]) => ({ name, bookings }));
}

export async function getAttendanceSummary(range: DateRange) {
  const q = query(
    collection(db, 'attendance'),
    where('date', '>=', range.startDate),
    where('date', '<=', range.endDate)
  );
  const snapshot = await getDocs(q);
  const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceLog));

  const total = logs.length;
  const onTime = logs.filter((l) => l.status === 'on_time' || l.status === 'completed').length;
  const late = logs.filter((l) => l.status === 'late').length;
  const noShow = logs.filter((l) => l.status === 'no_show').length;
  const avgLateMinutes =
    logs.filter((l) => l.lateMinutes > 0).reduce((sum, l) => sum + l.lateMinutes, 0) / (late || 1);

  return {
    total,
    onTimeRate: total > 0 ? Math.round((onTime / total) * 100) : 0,
    lateRate: total > 0 ? Math.round((late / total) * 100) : 0,
    noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
    avgLateMinutes: Math.round(avgLateMinutes),
  };
}

function getDayCount(range: DateRange): number {
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function getBookingDurationHours(booking: Booking): number {
  const [sh, sm] = booking.startTime.split(':').map(Number);
  const [eh, em] = booking.endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}
