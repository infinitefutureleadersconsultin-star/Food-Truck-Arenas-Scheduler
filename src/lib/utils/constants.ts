// =============================================================================
// Application Constants & Configuration Defaults
// =============================================================================

// ---- Core App Info ----
export const ADMIN_EMAILS = [
  'Foodtruckarenas@gmail.com',
  'issiahmclean1999@gmail.com',
];
export const APP_NAME = 'Food Truck Arena Commissary';

// ---- Day-of-week type for operating hours ----
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DayHours {
  open: string;   // "HH:MM" 24-hour format
  close: string;  // "HH:MM" 24-hour format
  closed: boolean;
}

export type OperatingHoursMap = Record<DayOfWeek, DayHours>;

// ---- Default Operating Hours (Mon-Sat 06:00-22:00, Sunday closed) ----
export const DEFAULT_OPERATING_HOURS: OperatingHoursMap = {
  monday:    { open: '06:00', close: '22:00', closed: false },
  tuesday:   { open: '06:00', close: '22:00', closed: false },
  wednesday: { open: '06:00', close: '22:00', closed: false },
  thursday:  { open: '06:00', close: '22:00', closed: false },
  friday:    { open: '06:00', close: '22:00', closed: false },
  saturday:  { open: '06:00', close: '22:00', closed: false },
  sunday:    { open: '06:00', close: '22:00', closed: true },
};

// ---- Default Booking Rules ----
export interface BookingRules {
  minDurationMinutes: number;
  maxDurationMinutes: number;
  bookingCutoffHours: number;
  cancellationCutoffHours: number;
  maxAdvanceDays: number;
  maxVendorsPerSlot: number;
  autoConfirm: boolean;
  allowRecurring: boolean;
  maxRecurringWeeks: number;
}

export const DEFAULT_BOOKING_RULES: BookingRules = {
  minDurationMinutes: 60,
  maxDurationMinutes: 480,
  bookingCutoffHours: 2,
  cancellationCutoffHours: 4,
  maxAdvanceDays: 30,
  maxVendorsPerSlot: 8,
  autoConfirm: true,
  allowRecurring: true,
  maxRecurringWeeks: 12,
};

// ---- Commissary Settings (aggregate) ----
export interface BlackoutDate {
  date: string;       // "YYYY-MM-DD"
  reason: string;
}

export interface CommissarySettings {
  operatingHours: OperatingHoursMap;
  bookingRules: BookingRules;
  blackoutDates: BlackoutDate[];
}

export const DEFAULT_COMMISSARY_SETTINGS: CommissarySettings = {
  operatingHours: DEFAULT_OPERATING_HOURS,
  bookingRules: DEFAULT_BOOKING_RULES,
  blackoutDates: [],
};

// ---- Status Color Mappings ----
export const STATUS_COLORS = {
  booking: {
    pending:    { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', dot: 'bg-yellow-500' },
    confirmed:  { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  dot: 'bg-green-500' },
    checked_in: { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300',   dot: 'bg-blue-500' },
    completed:  { bg: 'bg-gray-100',   text: 'text-gray-800',   border: 'border-gray-300',   dot: 'bg-gray-500' },
    cancelled:  { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300',     dot: 'bg-red-500' },
    no_show:    { bg: 'bg-orange-100',  text: 'text-orange-800', border: 'border-orange-300',  dot: 'bg-orange-500' },
  },
  resource: {
    available:   { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  dot: 'bg-green-500' },
    in_use:      { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300',   dot: 'bg-blue-500' },
    maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', dot: 'bg-yellow-500' },
    broken:      { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300',    dot: 'bg-red-500' },
    locked:      { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' },
  },
  user: {
    active:    { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  dot: 'bg-green-500' },
    suspended: { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300',    dot: 'bg-red-500' },
    pending:   { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  },
} as const;

// ---- Resource Type Icons (Lucide icon names) ----
export const RESOURCE_TYPE_ICONS: Record<string, string> = {
  tables:   'Table2',
  fridges:  'Refrigerator',
  freezers: 'Snowflake',
  parking:  'Car',
  storage:  'Package',
  sinks:    'Droplets',
};

// ---- Default Resource Types ----
export interface DefaultResourceType {
  name: string;
  slug: string;
  icon: string;
  color: string;
  totalQuantity: number;
  trackIndividually: boolean;
  sortOrder: number;
}

export const DEFAULT_RESOURCE_TYPES: DefaultResourceType[] = [
  {
    name: 'Tables',
    slug: 'tables',
    icon: 'Table2',
    color: '#3B82F6',
    totalQuantity: 8,
    trackIndividually: true,
    sortOrder: 1,
  },
  {
    name: 'Fridges',
    slug: 'fridges',
    icon: 'Refrigerator',
    color: '#10B981',
    totalQuantity: 5,
    trackIndividually: true,
    sortOrder: 2,
  },
  {
    name: 'Freezers',
    slug: 'freezers',
    icon: 'Snowflake',
    color: '#6366F1',
    totalQuantity: 2,
    trackIndividually: true,
    sortOrder: 3,
  },
  {
    name: 'Parking Spots',
    slug: 'parking',
    icon: 'Car',
    color: '#F59E0B',
    totalQuantity: 4,
    trackIndividually: true,
    sortOrder: 4,
  },
  {
    name: 'Storage Units',
    slug: 'storage',
    icon: 'Package',
    color: '#8B5CF6',
    totalQuantity: 6,
    trackIndividually: true,
    sortOrder: 5,
  },
  {
    name: 'Sinks',
    slug: 'sinks',
    icon: 'Droplets',
    color: '#06B6D4',
    totalQuantity: 3,
    trackIndividually: true,
    sortOrder: 6,
  },
];
