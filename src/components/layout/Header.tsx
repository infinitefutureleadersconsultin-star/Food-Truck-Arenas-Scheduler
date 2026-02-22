'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Menu, LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const { userData } = useAuthContext();

  const displayName = userData?.displayName ?? 'User';
  const profileImageUrl = userData?.profileImageUrl;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6',
        className
      )}
    >
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-gray-900"
        >
          <span className="hidden sm:inline">Food Commissary</span>
          <span className="sm:hidden">FC</span>
        </Link>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                {profileImageUrl && (
                  <AvatarImage src={profileImageUrl} alt={displayName} />
                )}
                <AvatarFallback className="text-xs">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-gray-700 md:inline">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/auth/login"
                className="flex items-center gap-2 text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
