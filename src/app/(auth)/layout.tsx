import { ChefHat } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="floor-plan-grid h-full w-full" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-8 flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md">
            <ChefHat className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">
            Food Truck Arena
          </span>
        </Link>
        <p className="mt-2 text-sm text-gray-500">Commissary Scheduling Platform</p>
      </div>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          {children}
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Food Truck Arena Commissary. All rights reserved.
      </p>
    </div>
  );
}
