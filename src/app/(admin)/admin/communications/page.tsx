'use client';

import { useState } from 'react';
import { Megaphone, Trash2, AlertTriangle, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AnnouncementComposer } from '@/components/admin/AnnouncementComposer';
import { useAnnouncements } from '@/lib/hooks/useAnnouncements';
import { createAnnouncement, deleteAnnouncement } from '@/lib/services/announcementService';
import { cn } from '@/lib/utils/cn';
import type { AnnouncementType, AnnouncementPriority } from '@/lib/types';

const priorityStyles: Record<AnnouncementPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const typeLabels: Record<AnnouncementType, string> = {
  general: 'General',
  maintenance: 'Maintenance',
  emergency: 'Emergency',
  policy: 'Policy Update',
};

export default function CommunicationsPage() {
  const { announcements, loading, error } = useAnnouncements(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSendAnnouncement = async (data: {
    title: string;
    body: string;
    type: AnnouncementType;
    priority: AnnouncementPriority;
    targetAudience: 'all' | 'active_vendors';
  }) => {
    // Creating the announcement in Firestore will automatically trigger
    // the onAnnouncementCreated Cloud Function which sends push notifications
    // to all vendors who have enabled them. No extra call needed.
    await createAnnouncement({
      title: data.title,
      body: data.body,
      type: data.type,
      priority: data.priority,
      targetAudience: data.targetAudience,
      createdBy: 'Admin',
      expiresAt: null,
    });
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteAnnouncement(id);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-red-600">Error loading communications: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-gray-700" />
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 py-1">
            <Bell className="h-3 w-3" />
            Push notifications auto-send with announcements
          </Badge>
        </div>
      </div>

      <AnnouncementComposer onSubmit={handleSendAnnouncement} />

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Past Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No announcements yet.
            </p>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{a.title}</span>
                      <Badge className={cn('capitalize text-xs', priorityStyles[a.priority])}>
                        {a.priority}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-xs">
                        {typeLabels[a.type] ?? a.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {a.body}
                    </p>
                    <p className="text-xs text-gray-400">
                      By {a.createdBy} &middot; Read by {a.readBy?.length ?? 0} vendor(s)
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleting === a.id}
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
