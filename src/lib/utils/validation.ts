// =============================================================================
// Zod Validation Schemas
// =============================================================================

import { z } from 'zod';

// ---- Auth Schemas ----

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[^a-zA-Z0-9]/,
        'Password must contain at least one special character',
      ),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
    displayName: z
      .string()
      .min(1, 'Display name is required')
      .max(100, 'Display name must be 100 characters or fewer'),
    businessName: z
      .string()
      .min(1, 'Business name is required')
      .max(200, 'Business name must be 200 characters or fewer'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(
        /^\+?[\d\s\-().]{7,20}$/,
        'Please enter a valid phone number',
      ),
    vehicleSize: z.enum(['small', 'medium', 'large', 'trailer'], {
      message: 'Please select a vehicle size',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

// ---- Booking Schema ----

export const bookingSchema = z.object({
  date: z
    .string()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z
    .string()
    .min(1, 'Start time is required')
    .regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
  endTime: z
    .string()
    .min(1, 'End time is required')
    .regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'),
  resourceRequests: z
    .record(z.string(), z.number().int().min(0))
    .refine(
      (requests) => Object.values(requests).some((v) => v > 0),
      'At least one resource must be requested',
    ),
  notes: z.string().max(500, 'Notes must be 500 characters or fewer').optional().default(''),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

// ---- Profile Schema ----

export const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or fewer'),
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .max(200, 'Business name must be 200 characters or fewer'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(
      /^\+?[\d\s\-().]{7,20}$/,
      'Please enter a valid phone number',
    ),
  vehicleSize: z.enum(['small', 'medium', 'large', 'trailer'], {
    message: 'Please select a vehicle size',
  }),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// ---- Announcement Schema ----

export const announcementSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  body: z
    .string()
    .min(1, 'Body is required')
    .max(2000, 'Body must be 2000 characters or fewer'),
  type: z.enum(['info', 'warning', 'urgent', 'maintenance'], {
    message: 'Please select an announcement type',
  }),
  priority: z.enum(['low', 'normal', 'high'], {
    message: 'Please select a priority level',
  }),
  targetAudience: z.enum(['all', 'vendors', 'admins'], {
    message: 'Please select a target audience',
  }),
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;

// ---- Message Schema ----

export const messageSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be 200 characters or fewer'),
  body: z
    .string()
    .min(1, 'Message body is required')
    .max(5000, 'Message body must be 5000 characters or fewer'),
  type: z.enum(['general', 'support', 'billing', 'complaint', 'feedback'], {
    message: 'Please select a message type',
  }),
});

export type MessageFormData = z.infer<typeof messageSchema>;

// ---- Resource Type Schema ----

export const resourceTypeSchema = z.object({
  name: z
    .string()
    .min(1, 'Resource type name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  color: z
    .string()
    .min(1, 'Color is required')
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g. #3B82F6)'),
  totalQuantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Must have at least 1 resource')
    .max(100, 'Maximum 100 resources per type'),
  trackIndividually: z.boolean(),
});

export type ResourceTypeFormData = z.infer<typeof resourceTypeSchema>;

// ---- Settings Schema (Commissary Settings) ----

const dayHoursSchema = z.object({
  open: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  close: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  closed: z.boolean(),
});

const operatingHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});

const bookingRulesSchema = z.object({
  minDurationMinutes: z
    .number()
    .int()
    .min(15, 'Minimum duration must be at least 15 minutes')
    .max(480, 'Minimum duration cannot exceed 480 minutes'),
  maxDurationMinutes: z
    .number()
    .int()
    .min(60, 'Maximum duration must be at least 60 minutes')
    .max(1440, 'Maximum duration cannot exceed 1440 minutes'),
  bookingCutoffHours: z
    .number()
    .min(0, 'Cutoff hours must be non-negative')
    .max(72, 'Cutoff hours cannot exceed 72'),
  cancellationCutoffHours: z
    .number()
    .min(0, 'Cancellation cutoff must be non-negative')
    .max(72, 'Cancellation cutoff cannot exceed 72'),
  maxAdvanceDays: z
    .number()
    .int()
    .min(1, 'Must allow at least 1 day advance booking')
    .max(365, 'Cannot exceed 365 days advance booking'),
  maxVendorsPerSlot: z
    .number()
    .int()
    .min(1, 'Must allow at least 1 vendor per slot')
    .max(50, 'Cannot exceed 50 vendors per slot'),
  autoConfirm: z.boolean(),
  allowRecurring: z.boolean(),
  maxRecurringWeeks: z
    .number()
    .int()
    .min(1, 'Must allow at least 1 recurring week')
    .max(52, 'Cannot exceed 52 recurring weeks'),
});

const blackoutDateSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(200, 'Reason must be 200 characters or fewer'),
});

export const settingsSchema = z.object({
  operatingHours: operatingHoursSchema,
  bookingRules: bookingRulesSchema,
  blackoutDates: z.array(blackoutDateSchema),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
