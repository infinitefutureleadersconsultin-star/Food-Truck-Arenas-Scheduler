import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  LayoutGrid,
  QrCode,
  ChefHat,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

const features = [
  {
    icon: LayoutGrid,
    title: 'Visual Booking',
    description:
      'See the commissary floor plan and pick your preferred station with an intuitive drag-and-drop interface.',
  },
  {
    icon: Clock,
    title: 'Real-time Availability',
    description:
      'Check live availability across all kitchen stations and time slots so you never double-book.',
  },
  {
    icon: CalendarDays,
    title: 'Smart Scheduling',
    description:
      'Set recurring bookings, manage your schedule weeks in advance, and receive automated reminders.',
  },
  {
    icon: QrCode,
    title: 'Easy Check-in',
    description:
      'Scan a QR code when you arrive to check in instantly. No paperwork, no waiting.',
  },
];

const benefits = [
  'No more scheduling conflicts',
  'Automated booking confirmations',
  'Mobile-friendly for on-the-go vendors',
  'Admin dashboard for facility managers',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-gray-900">
                Food Truck Arena
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="floor-plan-grid h-full w-full" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-primary-100 backdrop-blur-sm">
              <ChefHat className="h-4 w-4" />
              Commissary Kitchen Management
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Food Truck Arena{' '}
              <span className="text-secondary-400">Commissary</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-primary-100 sm:text-xl">
              Book your commissary space in seconds. Our visual scheduling
              platform makes it easy to find, reserve, and manage kitchen
              stations for your food truck operation.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-secondary px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-secondary-600 hover:shadow-xl"
              >
                Create Account
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            <path
              d="M0 80V40C240 0 480 0 720 40C960 80 1200 80 1440 40V80H0Z"
              fill="#F9FAFB"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to manage your kitchen time
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From booking to check-in, our platform streamlines the entire
              commissary experience.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary-50 p-3 text-primary transition-colors group-hover:bg-primary-100">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-y bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Built for food truck vendors and commissary managers
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Whether you run a food truck or manage a commissary kitchen, our
                platform saves you time and eliminates scheduling headaches.
              </p>
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                  Start Booking Today
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="floor-plan-grid rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    'Station A',
                    'Station B',
                    'Station C',
                    'Station D',
                    'Station E',
                    'Station F',
                  ].map((station, index) => (
                    <div
                      key={station}
                      className={`rounded-lg border-2 p-4 text-center text-xs font-medium ${
                        index < 2
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : index < 4
                          ? 'border-secondary-300 bg-secondary-50 text-secondary-700'
                          : 'border-gray-200 bg-white text-gray-500'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wide opacity-70">
                        {index < 2
                          ? 'Available'
                          : index < 4
                          ? 'Booked'
                          : 'Open'}
                      </div>
                      <div className="mt-1 font-semibold">{station}</div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-gray-500">
                Interactive floor plan preview
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold text-gray-900">
                  Food Truck Arena
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                The premier commissary kitchen scheduling platform for food
                truck vendors and facility managers.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
                Quick Links
              </h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-gray-600 transition-colors hover:text-primary"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="text-sm text-gray-600 transition-colors hover:text-primary"
                  >
                    Create Account
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
                Contact
              </h3>
              <ul className="mt-4 space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  123 Arena Blvd, Food City, TX 75001
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  (555) 123-4567
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  info@foodtuckarena.com
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Food Truck Arena Commissary. All
            rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
