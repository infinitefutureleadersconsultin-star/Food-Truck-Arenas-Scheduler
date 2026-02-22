'use client';

import { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { signUpWithEmail } from '@/lib/firebase/auth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils/cn';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { uploadFile } from '@/lib/firebase/storage';
import type { VehicleSize } from '@/lib/types';

// Step 1 validation
const step1Schema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Step 2 validation
const step2Schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[\d\s\-+()]+$/, 'Invalid phone number format'),
  vehicleSize: z.enum(['small', 'medium', 'large', 'trailer'], {
    message: 'Please select a vehicle size',
  }),
});

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  businessName: string;
  phone: string;
  vehicleSize: VehicleSize | '';
}

const TOTAL_STEPS = 3;

export function SignupForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    businessName: '',
    phone: '',
    vehicleSize: '',
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validateStep = (step: number): boolean => {
    setFieldErrors({});
    setError(null);

    if (step === 1) {
      const result = step1Schema.safeParse({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      if (!result.success) {
        const errors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string;
          if (!errors[field]) {
            errors[field] = issue.message;
          }
        }
        setFieldErrors(errors);
        return false;
      }
      return true;
    }

    if (step === 2) {
      const result = step2Schema.safeParse({
        fullName: formData.fullName,
        businessName: formData.businessName,
        phone: formData.phone,
        vehicleSize: formData.vehicleSize || undefined,
      });
      if (!result.success) {
        const errors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string;
          if (!errors[field]) {
            errors[field] = issue.message;
          }
        }
        setFieldErrors(errors);
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handlePrevious = () => {
    setError(null);
    setFieldErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create Firebase Auth user
      const credential = await signUpWithEmail(formData.email, formData.password);
      const uid = credential.user.uid;

      // 2. Upload documents if any
      const uploadedDocs: Array<{
        type: string;
        fileName: string;
        fileUrl: string;
        uploadedAt: Timestamp;
        expiresAt: Timestamp;
        status: string;
      }> = [];

      for (const file of documents) {
        const path = `users/${uid}/documents/${file.name}`;
        const url = await uploadFile(path, file);
        uploadedDocs.push({
          type: 'permit',
          fileName: file.name,
          fileUrl: url,
          uploadedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          ),
          status: 'valid',
        });
      }

      // 3. Create Firestore user document
      const now = Timestamp.now();
      await setDoc(doc(db, 'users', uid), {
        email: formData.email,
        displayName: formData.fullName,
        businessName: formData.businessName,
        phone: formData.phone,
        role: 'vendor',
        status: 'active',
        vehicleSize: formData.vehicleSize,
        defaultResources: {
          tables: 0,
          fridges: 0,
          freezers: 0,
          storage: 0,
        },
        teamMembers: [],
        documents: uploadedDocs,
        adminNotes: '',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        profileImageUrl: '',
      });

      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create account.';
      if (message.includes('auth/email-already-in-use')) {
        setError(
          'An account with this email already exists. Please sign in instead.'
        );
      } else if (message.includes('auth/weak-password')) {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Account Created!
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Your account has been created successfully. You can now sign in and
            start booking commissary resources.
          </p>
        </div>
        <Link href="/login">
          <Button className="w-full">Go to Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          Create Account
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Join Food Truck Arena Commissary
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center space-x-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step === currentStep
                  ? 'bg-primary text-white'
                  : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              )}
            >
              {step < currentStep ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                step
              )}
            </div>
            {step < TOTAL_STEPS && (
              <div
                className={cn(
                  'mx-1 h-0.5 w-8',
                  step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Account Credentials */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={loading}
              className={cn(fieldErrors.email && 'border-red-500')}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={loading}
              className={cn(fieldErrors.password && 'border-red-500')}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange('confirmPassword', e.target.value)
              }
              disabled={loading}
              className={cn(fieldErrors.confirmPassword && 'border-red-500')}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-600">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Business Information */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Your full name"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              disabled={loading}
              className={cn(fieldErrors.fullName && 'border-red-500')}
            />
            {fieldErrors.fullName && (
              <p className="text-xs text-red-600">{fieldErrors.fullName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              type="text"
              placeholder="Your food truck business name"
              value={formData.businessName}
              onChange={(e) =>
                handleInputChange('businessName', e.target.value)
              }
              disabled={loading}
              className={cn(fieldErrors.businessName && 'border-red-500')}
            />
            {fieldErrors.businessName && (
              <p className="text-xs text-red-600">
                {fieldErrors.businessName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={loading}
              className={cn(fieldErrors.phone && 'border-red-500')}
            />
            {fieldErrors.phone && (
              <p className="text-xs text-red-600">{fieldErrors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleSize">Vehicle Size</Label>
            <Select
              value={formData.vehicleSize}
              onValueChange={(value) =>
                handleInputChange('vehicleSize', value)
              }
              disabled={loading}
            >
              <SelectTrigger
                id="vehicleSize"
                className={cn(fieldErrors.vehicleSize && 'border-red-500')}
              >
                <SelectValue placeholder="Select vehicle size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (Cart / Pop-up)</SelectItem>
                <SelectItem value="medium">Medium (Van / Small Truck)</SelectItem>
                <SelectItem value="large">Large (Full-size Truck)</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.vehicleSize && (
              <p className="text-xs text-red-600">
                {fieldErrors.vehicleSize}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Document Uploads */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-1 text-sm font-medium text-gray-900">
              Upload Documents (Optional)
            </h4>
            <p className="mb-3 text-xs text-gray-500">
              You can upload permits, insurance certificates, licenses, or
              health certificates. You may also skip this step and upload
              documents later.
            </p>
            <Input
              id="documents"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
              disabled={loading}
              className="cursor-pointer text-sm"
            />
          </div>

          {documents.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Selected files:
              </p>
              <ul className="space-y-1">
                {documents.map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center text-sm text-gray-600"
                  >
                    <svg
                      className="mr-2 h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={loading}
          >
            Previous
          </Button>
        ) : (
          <div />
        )}

        {currentStep < TOTAL_STEPS ? (
          <Button type="button" onClick={handleNext} disabled={loading}>
            Next
          </Button>
        ) : (
          <div className="flex space-x-2">
            {documents.length === 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSubmit}
                disabled={loading}
              >
                Skip & Submit
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating account...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
