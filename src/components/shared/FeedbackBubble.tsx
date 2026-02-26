'use client';

import { useState } from 'react';
import {
  MessageCirclePlus,
  X,
  Lightbulb,
  AlertCircle,
  Sparkles,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/contexts/AuthContext';
import { submitFeedback } from '@/lib/services/feedbackService';
import { cn } from '@/lib/utils/cn';
import type { FeedbackCategory } from '@/lib/types';

const CATEGORIES: {
  value: FeedbackCategory;
  label: string;
  description: string;
  icon: typeof Lightbulb;
  color: string;
}[] = [
  {
    value: 'feature_suggestion',
    label: 'Suggest a Feature',
    description: 'Share ideas for new features you\'d like to see',
    icon: Lightbulb,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  },
  {
    value: 'issue_report',
    label: 'Report an Issue',
    description: 'Let us know about any confusion or problems',
    icon: AlertCircle,
    color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100',
  },
  {
    value: 'improvement_idea',
    label: 'Improvement Idea',
    description: 'Share suggestions to make things better',
    icon: Sparkles,
    color: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
];

type Step = 'closed' | 'category' | 'form' | 'success';

export function FeedbackBubble() {
  const { user, userData } = useAuthContext();
  const [step, setStep] = useState<Step>('closed');
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !userData) return null;

  const reset = () => {
    setStep('closed');
    setCategory(null);
    setSubject('');
    setDescription('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !description.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitFeedback(
        user.uid,
        userData.displayName || 'Anonymous',
        userData.email,
        category,
        subject.trim(),
        description.trim()
      );
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = CATEGORIES.find((c) => c.value === category);

  return (
    <>
      {/* Floating bubble button */}
      {step === 'closed' && (
        <button
          onClick={() => setStep('category')}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
          aria-label="Send Feedback"
        >
          <MessageCirclePlus className="h-6 w-6" />
        </button>
      )}

      {/* Feedback panel */}
      {step !== 'closed' && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-900">
              {step === 'success' ? 'Thank You!' : 'Send Us Feedback'}
            </h3>
            <button
              onClick={reset}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5">
            {/* Step 1: Choose category */}
            {step === 'category' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  What kind of feedback do you have?
                </p>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setCategory(cat.value);
                      setStep('form');
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all',
                      cat.color
                    )}
                  >
                    <cat.icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{cat.label}</p>
                      <p className="mt-0.5 text-xs opacity-75">{cat.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Fill form */}
            {step === 'form' && selectedCategory && (
              <div className="space-y-4">
                {/* Category badge */}
                <button
                  onClick={() => setStep('category')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    selectedCategory.color
                  )}
                >
                  <selectedCategory.icon className="h-3.5 w-3.5" />
                  {selectedCategory.label}
                </button>

                <div className="space-y-2">
                  <Label htmlFor="feedback-subject" className="text-xs">
                    Subject
                  </Label>
                  <Input
                    id="feedback-subject"
                    placeholder="Brief summary..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback-description" className="text-xs">
                    Description
                  </Label>
                  <Textarea
                    id="feedback-description"
                    placeholder="Tell us more details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[100px] resize-none text-sm"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full"
                  size="sm"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Feedback Submitted!
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  We appreciate your input. Your feedback helps us improve the
                  platform for everyone.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={reset}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
