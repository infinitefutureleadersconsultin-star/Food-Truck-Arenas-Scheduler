'use client';

import React, { useState } from 'react';
import { Send, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';
import type { AnnouncementType, AnnouncementPriority } from '@/lib/types';

interface AnnouncementComposerProps {
  onSubmit: (data: {
    title: string;
    body: string;
    type: AnnouncementType;
    priority: AnnouncementPriority;
    targetAudience: 'all' | 'active_vendors';
  }) => void;
}

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

export function AnnouncementComposer({
  onSubmit,
}: AnnouncementComposerProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AnnouncementType>('general');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [targetAudience, setTargetAudience] = useState<'all' | 'active_vendors'>('all');
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ title, body, type, priority, targetAudience });
      setTitle('');
      setBody('');
      setType('general');
      setPriority('normal');
      setTargetAudience('all');
      setShowPreview(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compose Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                placeholder="Announcement title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcement-body">Message</Label>
              <Textarea
                id="announcement-body"
                placeholder="Write your announcement..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as AnnouncementType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="policy">Policy Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) =>
                    setPriority(v as AnnouncementPriority)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={targetAudience}
                  onValueChange={(v) =>
                    setTargetAudience(v as 'all' | 'active_vendors')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    <SelectItem value="active_vendors">
                      Active Vendors Only
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || !body.trim() || isSubmitting}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Announcement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('capitalize', priorityStyles[priority])}>
                  {priority}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {typeLabels[type]}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {targetAudience === 'all'
                    ? 'All Vendors'
                    : 'Active Vendors'}
                </Badge>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold">
                  {title || 'Announcement Title'}
                </h3>
                <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                  {body || 'Announcement body will appear here...'}
                </p>
              </div>

              <Separator />

              <p className="text-xs text-gray-400">
                Sent just now
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
