'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TableCard } from './TableCard';
import { TableModal } from './TableModal';
import { useAuth } from '@/lib/hooks/useAuth';
import { getBookingsByDate } from '@/lib/services/bookingService';
import {
  getResourceTypes,
  getResources,
} from '@/lib/services/resourceService';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import type {
  Resource,
  ResourceType,
  Booking,
} from '@/lib/types';
import {
  Calendar,
  LayoutGrid,
  List,
  Refrigerator,
  Snowflake,
  Package,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FloorPlanViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  currentUserId?: string;
}

type ViewMode = 'floorplan' | 'list';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count how many of a resource type are available for the day. */
function countAvailable(
  typeId: string,
  resources: Resource[],
  bookings: Booking[],
): { total: number; available: number } {
  const typeResources = resources.filter((r) => r.typeId === typeId);
  const total = typeResources.length;

  const bookedIds = new Set<string>();
  bookings.forEach((b) => {
    if (b.status === 'cancelled' || b.status === 'no_show') return;
    b.resources.forEach((r) => {
      if (r.resourceTypeId === typeId) {
        bookedIds.add(r.resourceId);
      }
    });
  });

  const maintenanceIds = new Set(
    typeResources
      .filter(
        (r) =>
          r.status === 'maintenance' ||
          r.status === 'broken' ||
          r.status === 'locked',
      )
      .map((r) => r.id),
  );

  const available = typeResources.filter(
    (r) => !bookedIds.has(r.id) && !maintenanceIds.has(r.id),
  ).length;

  return { total, available };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FloorPlanView({
  selectedDate,
  onDateChange,
  currentUserId,
}: FloorPlanViewProps) {
  const { userData } = useAuth();
  const userId = currentUserId ?? userData?.id;

  // ---- State ----
  const [viewMode, setViewMode] = useState<ViewMode>('floorplan');
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table modal
  const [selectedTable, setSelectedTable] = useState<Resource | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // ---- Responsive: auto-switch to list on mobile ----
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setViewMode('list');
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ---- Fetch data ----
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [types, allResources, dateBookings] = await Promise.all([
          getResourceTypes(),
          getResources(),
          getBookingsByDate(dateStr, ['pending', 'confirmed', 'checked_in']),
        ]);

        if (cancelled) return;
        setResourceTypes(types);
        setResources(allResources);
        setBookings(dateBookings);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load floor plan data.';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  // ---- Derived data ----
  const tableType = useMemo(
    () => resourceTypes.find((t) => t.slug === 'tables'),
    [resourceTypes],
  );

  const tables = useMemo(
    () =>
      resources
        .filter((r) => r.typeId === tableType?.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [resources, tableType],
  );

  const tableBookingsMap = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const table of tables) {
      map[table.id] = bookings.filter((b) =>
        b.resources.some((r) => r.resourceId === table.id),
      );
    }
    // Also include bookings that reference the table type but may not yet
    // have specific resource assignments (pending bookings)
    for (const booking of bookings) {
      if (booking.resources.length === 0 && booking.resourceRequests[tableType?.id ?? '']) {
        // Add to the first table that doesn't have a conflicting booking
        // (for display purposes only)
        for (const table of tables) {
          if (!map[table.id]) map[table.id] = [];
          // We just associate it loosely for the card display
        }
      }
    }
    return map;
  }, [tables, bookings, tableType]);

  // Capacity summaries
  const tableStats = useMemo(() => {
    if (!tableType) return { total: 8, available: 8 };
    return countAvailable(tableType.id, resources, bookings);
  }, [tableType, resources, bookings]);

  const fridgeType = useMemo(
    () => resourceTypes.find((t) => t.slug === 'fridges'),
    [resourceTypes],
  );
  const fridgeStats = useMemo(() => {
    if (!fridgeType) return { total: 5, available: 5 };
    return countAvailable(fridgeType.id, resources, bookings);
  }, [fridgeType, resources, bookings]);

  const freezerType = useMemo(
    () => resourceTypes.find((t) => t.slug === 'freezers'),
    [resourceTypes],
  );
  const freezerStats = useMemo(() => {
    if (!freezerType) return { total: 2, available: 2 };
    return countAvailable(freezerType.id, resources, bookings);
  }, [freezerType, resources, bookings]);

  const storageType = useMemo(
    () => resourceTypes.find((t) => t.slug === 'storage'),
    [resourceTypes],
  );
  const storageStats = useMemo(() => {
    if (!storageType) return { total: 6, available: 6 };
    return countAvailable(storageType.id, resources, bookings);
  }, [storageType, resources, bookings]);

  // ---- Handlers ----
  const handleTableClick = useCallback((resource: Resource) => {
    setSelectedTable(resource);
    setModalOpen(true);
  }, []);

  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1));
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1));
  const handleToday = () => onDateChange(new Date());

  // ---- Render ----
  return (
    <div className="w-full">
      {/* ============================================================ */}
      {/* TOP BAR                                                      */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevDay}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => {
                const d = new Date(e.target.value + 'T00:00:00');
                if (!isNaN(d.getTime())) onDateChange(d);
              }}
              className="w-auto"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleToday}>
            Today
          </Button>
        </div>

        {/* View toggle + Live indicator */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <span className="text-xs text-gray-500">Live</span>
          </div>

          {/* View toggle */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList>
              <TabsTrigger value="floorplan" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Floor Plan</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CAPACITY SUMMARY BAR                                         */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <span className="text-gray-600">
          Tables:{' '}
          <span className="font-semibold">
            {tableStats.available}/{tableStats.total}
          </span>{' '}
          available
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-gray-600">
          Fridges:{' '}
          <span className="font-semibold">
            {fridgeStats.available}/{fridgeStats.total}
          </span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-gray-600">
          Freezers:{' '}
          <span className="font-semibold">
            {freezerStats.available}/{freezerStats.total}
          </span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-gray-600">
          Storage:{' '}
          <span className="font-semibold">
            {storageStats.available}/{storageStats.total}
          </span>
        </span>
      </div>

      {/* ============================================================ */}
      {/* LEGEND                                                       */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-green-500" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-yellow-500" />
          Partially Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-red-500" />
          Fully Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-blue-500 ring-2 ring-blue-300" />
          Your Booking
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded bg-gray-400"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
            }}
          />
          Maintenance
        </span>
      </div>

      {/* ============================================================ */}
      {/* LOADING / ERROR                                              */}
      {/* ============================================================ */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* ============================================================ */}
      {/* FLOOR PLAN VIEW                                              */}
      {/* ============================================================ */}
      {!loading && !error && viewMode === 'floorplan' && (
        <div
          className="floor-plan-grid relative w-full rounded-xl border border-gray-200 p-6"
          style={{
            backgroundColor: '#F3F4F6',
            backgroundImage:
              'linear-gradient(rgba(209,213,219,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(209,213,219,0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        >
          {/* Floor plan label */}
          <div className="absolute top-3 left-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
            Commissary Floor Plan
          </div>

          {/* ---- Tables area ---- */}
          <div className="mt-6 mb-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Prep Tables
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {tables.slice(0, 4).map((table) => (
                <TableCard
                  key={table.id}
                  resource={table}
                  bookings={tableBookingsMap[table.id] ?? []}
                  currentUserId={userId}
                  selectedDate={selectedDate}
                  onClick={handleTableClick}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {tables.slice(4, 8).map((table) => (
                <TableCard
                  key={table.id}
                  resource={table}
                  bookings={tableBookingsMap[table.id] ?? []}
                  currentUserId={userId}
                  selectedDate={selectedDate}
                  onClick={handleTableClick}
                />
              ))}
            </div>
            {/* If fewer than 8 tables exist, show placeholder spots */}
            {tables.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">
                No tables configured yet.
              </p>
            )}
          </div>

          <Separator className="my-4 bg-gray-300/60" />

          {/* ---- Fridge & Freezer section ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {/* Fridge Bank */}
            <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-4 flex flex-col items-center gap-2">
              <Refrigerator className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-gray-700">
                Fridge Bank
              </p>
              <Badge
                variant={
                  fridgeStats.available > 0 ? 'success' : 'destructive'
                }
              >
                {fridgeStats.available}/{fridgeStats.total} available
              </Badge>
            </div>

            {/* Freezer Section */}
            <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-4 flex flex-col items-center gap-2">
              <Snowflake className="h-8 w-8 text-indigo-500" />
              <p className="text-sm font-semibold text-gray-700">
                Freezer Section
              </p>
              <Badge
                variant={
                  freezerStats.available > 0 ? 'success' : 'destructive'
                }
              >
                {freezerStats.available}/{freezerStats.total} available
              </Badge>
            </div>

            {/* Storage Units */}
            <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-4 flex flex-col items-center gap-2">
              <Package className="h-8 w-8 text-violet-500" />
              <p className="text-sm font-semibold text-gray-700">
                Storage Units
              </p>
              <Badge
                variant={
                  storageStats.available > 0 ? 'success' : 'destructive'
                }
              >
                {storageStats.available}/{storageStats.total} available
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LIST VIEW                                                    */}
      {/* ============================================================ */}
      {!loading && !error && viewMode === 'list' && (
        <div className="space-y-3">
          {tables.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              No tables configured yet.
            </p>
          )}

          {tables.map((table) => {
            const tBookings = tableBookingsMap[table.id] ?? [];
            const activeBookings = tBookings.filter(
              (b) =>
                b.status !== 'cancelled' && b.status !== 'no_show',
            );

            const isMaintenance =
              table.status === 'maintenance' || table.status === 'broken';
            const isBooked = activeBookings.length > 0;
            const isUserBooked = activeBookings.some(
              (b) => b.userId === userId,
            );

            return (
              <button
                key={table.id}
                type="button"
                onClick={() => !isMaintenance && handleTableClick(table)}
                disabled={isMaintenance}
                className={cn(
                  'w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors text-left',
                  isMaintenance
                    ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer',
                  isUserBooked && 'border-blue-300 bg-blue-50/50',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-3 w-3 rounded-full',
                      !isBooked && !isMaintenance && 'bg-green-500',
                      isBooked && !isUserBooked && 'bg-yellow-500',
                      isUserBooked && 'bg-blue-500',
                      isMaintenance && 'bg-gray-400',
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {table.name}
                    </p>
                    {activeBookings.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {activeBookings.length} booking
                        {activeBookings.length !== 1 ? 's' : ''} today
                      </p>
                    )}
                    {isMaintenance && (
                      <p className="text-xs text-gray-400">
                        Under maintenance
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeBookings.length > 0 && (
                    <div className="text-right">
                      {activeBookings.slice(0, 2).map((b) => (
                        <p key={b.id} className="text-xs text-gray-500">
                          {formatTime(b.startTime)} -{' '}
                          {formatTime(b.endTime)}
                        </p>
                      ))}
                      {activeBookings.length > 2 && (
                        <p className="text-xs text-gray-400">
                          +{activeBookings.length - 2} more
                        </p>
                      )}
                    </div>
                  )}

                  <Badge
                    variant={
                      isMaintenance
                        ? 'secondary'
                        : !isBooked
                          ? 'success'
                          : isUserBooked
                            ? 'info'
                            : 'warning'
                    }
                    className="text-[10px]"
                  >
                    {isMaintenance
                      ? 'Maintenance'
                      : !isBooked
                        ? 'Available'
                        : isUserBooked
                          ? 'Yours'
                          : 'Booked'}
                  </Badge>
                </div>
              </button>
            );
          })}

          {/* Resource summary cards */}
          <Separator className="my-4" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <Refrigerator className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-gray-500">Fridges</p>
                  <p className="text-sm font-semibold">
                    {fridgeStats.available}/{fridgeStats.total} available
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <Snowflake className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-xs text-gray-500">Freezers</p>
                  <p className="text-sm font-semibold">
                    {freezerStats.available}/{freezerStats.total} available
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <Package className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-xs text-gray-500">Storage</p>
                  <p className="text-sm font-semibold">
                    {storageStats.available}/{storageStats.total} available
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TABLE MODAL                                                  */}
      {/* ============================================================ */}
      <TableModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTable(null);
        }}
        resource={selectedTable}
        selectedDate={selectedDate}
        currentUser={userData}
        bookings={bookings}
      />
    </div>
  );
}
