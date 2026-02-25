'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Megaphone,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Wrench,
  Shield,
  Info,
  Circle,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import { useAnnouncements } from '@/lib/hooks/useAnnouncements';
import type { Announcement, AnnouncementType, AnnouncementPriority } from '@/lib/types';

// ---------------------------------------------------------------------------
// Type/priority visual config
// ---------------------------------------------------------------------------

const typeConfig: Record<
  AnnouncementType,
  { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'secondary' | 'warning' | 'destructive' | 'info' }
> = {
  general: { label: 'General', icon: Info, variant: 'secondary' },
  maintenance: { label: 'Maintenance', icon: Wrench, variant: 'warning' },
  emergency: { label: 'Emergency', icon: AlertTriangle, variant: 'destructive' },
  policy: { label: 'Policy', icon: Shield, variant: 'info' },
};

const priorityConfig: Record<AnnouncementPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-400' },
  normal: { label: 'Normal', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
};

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'policy', label: 'Policy' },
];

// ---------------------------------------------------------------------------
// Announcements Page
// ---------------------------------------------------------------------------

export default function AnnouncementsPage() {
  const { user } = useAuthContext();
  const { announcements, loading, error, markRead } = useAnnouncements();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filtered and sorted
  const filteredAnnouncements = useMemo(() => {
    let list = [...announcements];

    if (typeFilter !== 'all') {
      list = list.filter((a) => a.type === typeFilter);
    }

    // Sort by date descending (newest first)
    list.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });

    return list;
  }, [announcements, typeFilter]);

  const toggleExpand = useCallback((id: string, isUnread: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Mark as read when expanding an unread announcement
        if (isUnread) markRead(id);
      }
      return next;
    });
  }, [markRead]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Stay up to date with commissary news and updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter:</span>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {filteredAnnouncements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description={
            typeFilter !== 'all'
              ? `No ${typeFilter} announcements found. Try a different filter.`
              : 'There are no announcements at this time.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((announcement) => {
            const isExpanded = expandedIds.has(announcement.id);
            const config = typeConfig[announcement.type] ?? typeConfig.general;
            const priority = priorityConfig[announcement.priority] ?? priorityConfig.normal;
            const TypeIcon = config.icon;
            const isUnread = user?.uid
              ? !(announcement.readBy ?? []).includes(user.uid)
              : false;

            return (
              <Card
                key={announcement.id}
                className={cn(
                  'transition-shadow hover:shadow-md',
                  isUnread && 'border-l-4 border-l-primary',
                )}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => toggleExpand(announcement.id, isUnread)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          config.variant === 'secondary' && 'bg-gray-100 text-gray-600',
                          config.variant === 'warning' && 'bg-yellow-100 text-yellow-700',
                          config.variant === 'destructive' && 'bg-red-100 text-red-600',
                          config.variant === 'info' && 'bg-blue-100 text-blue-600',
                        )}
                      >
                        <TypeIcon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={cn(
                              'text-sm',
                              isUnread
                                ? 'font-bold text-gray-900'
                                : 'font-semibold text-gray-800',
                            )}
                          >
                            {announcement.title}
                          </h3>
                          <Badge variant={config.variant}>{config.label}</Badge>
                          {/* Priority indicator */}
                          <div className="flex items-center gap-1">
                            <Circle
                              className={cn('h-2 w-2 fill-current', priority.color)}
                            />
                            <span className={cn('text-[10px] font-medium', priority.color)}>
                              {priority.label}
                            </span>
                          </div>
                          {isUnread && (
                            <span className="text-[10px] font-medium text-primary">
                              NEW
                            </span>
                          )}
                        </div>

                        {/* Preview or full body */}
                        <p
                          className={cn(
                            'mt-1 text-sm text-gray-600',
                            !isExpanded && 'line-clamp-2',
                          )}
                        >
                          {announcement.body}
                        </p>

                        {/* Date */}
                        <p className="mt-2 text-xs text-gray-400">
                          {announcement.createdAt?.toDate?.()
                            ? announcement.createdAt.toDate().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </p>
                      </div>

                      {/* Expand/collapse */}
                      <div className="shrink-0 pt-1">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
