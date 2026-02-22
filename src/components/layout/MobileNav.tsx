'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { vendorNavItems } from '@/components/layout/VendorSidebar';
import { adminNavItems } from '@/components/layout/AdminSidebar';
import { cn } from '@/lib/utils/cn';

interface MobileNavProps {
  variant: 'vendor' | 'admin';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ variant, open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const navItems = variant === 'vendor' ? vendorNavItems : adminNavItems;

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-gray-200 px-4 py-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                FC
              </div>
              <span className="text-lg font-bold text-gray-900">
                Food Commissary
              </span>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
