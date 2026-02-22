'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  Building2,
  Bell,
  MessageSquare,
  ChefHat,
  Menu,
  X,
  Shield,
} from 'lucide-react';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/admin/vendors', label: 'Vendors', icon: Users },
  { href: '/admin/resources', label: 'Resources', icon: Building2 },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/announcements', label: 'Announcements', icon: Bell },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && userData && userData.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [userData, loading, router]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading) {
    return <FullPageLoading />;
  }

  if (!user || !userData || userData.role !== 'admin') {
    return <FullPageLoading />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-40">
        <div className="flex flex-1 flex-col border-r border-gray-200 bg-gray-900">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-gray-700 px-6">
            <ChefHat className="h-7 w-7 text-secondary" />
            <div>
              <span className="text-lg font-bold text-white">FT Arena</span>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-secondary-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-secondary-400">
                  Admin
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User info */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/20 text-sm font-semibold text-secondary">
                {userData?.displayName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {userData?.displayName || 'Admin'}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {userData?.email || ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-900 shadow-xl transition-transform duration-200 ease-in-out lg:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-700 px-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-secondary" />
            <span className="text-lg font-bold text-white">FT Arena</span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {adminNavItems.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <h1 className="text-lg font-semibold text-gray-900">
                Admin Panel
              </h1>
            </div>
            <div className="hidden items-center gap-1 text-sm text-gray-500 lg:flex">
              <Shield className="h-4 w-4 text-secondary" />
              <span>Administration</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/admin/announcements"
                className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <Bell className="h-5 w-5" />
              </Link>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold text-secondary">
                {userData?.displayName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
