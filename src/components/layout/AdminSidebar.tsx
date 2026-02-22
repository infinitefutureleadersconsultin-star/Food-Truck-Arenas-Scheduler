'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  Package,
  Map,
  Users,
  ClipboardCheck,
  BarChart3,
  Clock,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
  { label: 'Calendar', href: '/admin/calendar', icon: Calendar },
  { label: 'Resources', href: '/admin/resources', icon: Package },
  { label: 'Floor Plan', href: '/admin/floor-plan', icon: Map },
  { label: 'Vendors', href: '/admin/vendors', icon: Users },
  { label: 'Attendance', href: '/admin/attendance', icon: ClipboardCheck },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Scheduling', href: '/admin/scheduling', icon: Clock },
  { label: 'Communications', href: '/admin/communications', icon: MessageSquare },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function AdminSidebar({
  collapsed = false,
  onToggle,
  className,
}: AdminSidebarProps) {
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
          href="/admin/dashboard"
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
        {adminNavItems.map((item) => {
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
