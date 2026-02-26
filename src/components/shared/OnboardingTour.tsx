'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  CalendarCheck,
  LayoutDashboard,
  ArrowRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';

interface TourStep {
  icon: React.ElementType;
  title: string;
  description: string;
  highlight?: string; // nav path to highlight
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: LayoutDashboard,
    title: 'Welcome to Food Truck Arena!',
    description:
      'This is your vendor dashboard. From here you can manage bookings, check in for appointments, communicate with admin, and more. Let us give you a quick tour.',
  },
  {
    icon: CalendarCheck,
    title: 'Check In for Your Appointments',
    description:
      'This is the most important step! When you have an appointment, you must check in by 10:00 AM on the morning of your visit. Go to the Appointments tab, find your upcoming appointment, and tap the "Check In" button. If you miss the 10:00 AM deadline, your appointment will be automatically cancelled.',
    highlight: '/appointments',
  },
  {
    icon: CheckCircle2,
    title: "You're All Set!",
    description:
      'You now know the basics. Explore your dashboard to book spaces, manage your schedule, and stay connected. Remember: always check in by 10:00 AM on appointment day!',
  },
];

export function OnboardingTour() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Check if user has completed the tour
    const tourKey = `onboardingTourCompleted_${user.uid}`;
    const completed = localStorage.getItem(tourKey);
    if (!completed) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const completeTour = () => {
    if (!user) return;
    const tourKey = `onboardingTourCompleted_${user.uid}`;
    localStorage.setItem(tourKey, 'true');
    setShowTour(false);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTour();
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const handleGoToCheckIn = () => {
    completeTour();
    router.push('/appointments');
  };

  if (!showTour) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Tour Card */}
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        {/* Close / Skip */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Skip tour"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Step indicators */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-8 bg-primary'
                  : idx < currentStep
                    ? 'w-2 bg-primary/40'
                    : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <StepIcon className={`h-8 w-8 ${
            currentStep === 1 ? 'text-orange-600' : 'text-primary'
          }`} />
        </div>

        {/* Content */}
        <h3 className="mb-2 text-center text-lg font-bold text-gray-900">
          {step.title}
        </h3>
        <p className="mb-6 text-center text-sm leading-relaxed text-gray-600">
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {isLastStep ? (
            <>
              <Button onClick={handleGoToCheckIn} className="w-full">
                Go to Appointments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={completeTour} className="w-full">
                Close Tour
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleNext} className="w-full">
                {currentStep === 0 ? "Let's Go" : 'Next'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                onClick={handleSkip}
                className="text-center text-xs text-gray-400 transition-colors hover:text-gray-600"
              >
                Skip tour
              </button>
            </>
          )}
        </div>

        {/* Step count */}
        <p className="mt-4 text-center text-xs text-gray-400">
          Step {currentStep + 1} of {TOUR_STEPS.length}
        </p>
      </div>
    </div>
  );
}
