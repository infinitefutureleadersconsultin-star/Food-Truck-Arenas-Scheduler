'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  Lightbulb,
  AlertCircle,
  Sparkles,
  Clock,
  CheckCircle,
  Eye,
  Send,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  getAllFeedback,
  updateFeedbackStatus,
} from '@/lib/services/feedbackService';
import { cn } from '@/lib/utils/cn';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '@/lib/types';

const CATEGORY_CONFIG: Record<
  FeedbackCategory,
  { label: string; icon: typeof Lightbulb; color: string }
> = {
  feature_suggestion: {
    label: 'Feature Suggestion',
    icon: Lightbulb,
    color: 'bg-yellow-100 text-yellow-700',
  },
  issue_report: {
    label: 'Issue Report',
    icon: AlertCircle,
    color: 'bg-red-100 text-red-700',
  },
  improvement_idea: {
    label: 'Improvement Idea',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-700',
  },
};

const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; color: string }
> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  reviewed: { label: 'Reviewed', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  dismissed: { label: 'Dismissed', color: 'bg-red-100 text-red-600' },
};

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [responding, setResponding] = useState(false);
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllFeedback(
        filter === 'all' ? undefined : filter
      );
      setFeedback(data);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleStatusUpdate = async (
    feedbackId: string,
    status: FeedbackStatus,
    response?: string
  ) => {
    setResponding(true);
    try {
      await updateFeedbackStatus(feedbackId, status, response);
      await fetchFeedback();
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(null);
        setAdminResponse('');
      }
    } catch (err) {
      console.error('Error updating feedback:', err);
    } finally {
      setResponding(false);
    }
  };

  const formatDate = (timestamp: { toDate?: () => Date }) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const stats = {
    total: feedback.length,
    new: feedback.filter((f) => f.status === 'new').length,
    inProgress: feedback.filter((f) => f.status === 'in_progress').length,
    resolved: feedback.filter((f) => f.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-7 w-7 text-gray-700" />
          <h1 className="text-3xl font-bold tracking-tight">Customer Feedback</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
            <p className="text-xs text-gray-500">New</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-gray-500">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'new', 'reviewed', 'in_progress', 'resolved', 'dismissed'] as const).map(
          (f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
            </Button>
          )
        )}
      </div>

      {/* Feedback list */}
      {feedback.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No feedback yet"
          description="Customer feedback will appear here once submitted."
        />
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => {
            const catConfig = CATEGORY_CONFIG[item.category];
            const statusConfig = STATUS_CONFIG[item.status];
            const isSelected = selectedFeedback?.id === item.id;
            const CatIcon = catConfig.icon;

            return (
              <Card
                key={item.id}
                className={cn(
                  'transition-all',
                  isSelected && 'ring-2 ring-primary'
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={catConfig.color} variant="secondary">
                          <CatIcon className="mr-1 h-3 w-3" />
                          {catConfig.label}
                        </Badge>
                        <Badge className={statusConfig.color} variant="secondary">
                          {statusConfig.label}
                        </Badge>
                      </div>

                      <h3 className="text-sm font-semibold text-gray-900">
                        {item.subject}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{item.userName} ({item.userEmail})</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      {item.adminResponse && (
                        <div className="mt-3 rounded-lg bg-blue-50 p-3">
                          <p className="text-xs font-medium text-blue-700">Admin Response:</p>
                          <p className="mt-1 text-sm text-blue-800">{item.adminResponse}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {item.status === 'new' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(item.id, 'reviewed')}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Mark Reviewed
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFeedback(isSelected ? null : item);
                          setAdminResponse(item.adminResponse || '');
                        }}
                      >
                        <Send className="mr-1 h-3 w-3" />
                        Respond
                      </Button>
                    </div>
                  </div>

                  {/* Inline response form */}
                  {isSelected && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <Textarea
                        placeholder="Write a response to this feedback..."
                        value={adminResponse}
                        onChange={(e) => setAdminResponse(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleStatusUpdate(item.id, 'in_progress', adminResponse)
                          }
                          disabled={responding}
                        >
                          Mark In Progress
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() =>
                            handleStatusUpdate(item.id, 'resolved', adminResponse)
                          }
                          disabled={responding}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() =>
                            handleStatusUpdate(item.id, 'dismissed', adminResponse)
                          }
                          disabled={responding}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
