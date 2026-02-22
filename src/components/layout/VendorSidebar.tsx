'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarCheck,
  Calendar,
  QrCode,
  MessageSquare,
  Megaphone,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const vendorNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
  { label: 'Book a Table', href: '/vendor/book', icon: CalendarPlus },
  { label: 'My Bookings', href: '/vendor/bookings', icon: CalendarCheck },
  { label: 'Calendar', href: '/vendor/calendar', icon: Calendar },
  { label: 'Check In', href: '/vendor/checkin', icon: QrCode },
  { label: 'Messages', href: '/vendor/messages', icon: MessageSquare },
  { label: 'Announcements', href: '/vendor/announcements', icon: Megaphone },
  { label: 'Profile', href: '/vendor/profile', icon: User },
];

interface VendorSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function VendorSidebar({
  collapsed = false,
  onToggle,
  className,
}: VendorSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 lg:flex',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo / App name */}
      <div className="flex h-16 items-center border-b border-gray-200 px-4">
        <Link
          href="/vendor/dashboard"
          className="flex items-center gap-2 overflow-hidden"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            FC
          </div>
          {!collapsed && (
            <span className="truncate text-lg font-bold text-gray-900">
              Food Commissary
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {vendorNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
