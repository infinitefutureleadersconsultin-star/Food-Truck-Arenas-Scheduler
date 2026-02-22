'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Mail,
  MailOpen,
  Plus,
  Send,
  Paperclip,
  ArrowLeft,
  Inbox,
  Reply,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import type { Message, MessageType } from '@/lib/types';

// ---------------------------------------------------------------------------
// useMessages hook (placeholder wired to local state until Firestore is set up)
// ---------------------------------------------------------------------------

function useMessages() {
  // Placeholder: in production this subscribes to Firestore messages collection.
  return {
    messages: [] as Message[],
    loading: false,
    error: null as string | null,
    refetch: () => {},
  };
}

// ---------------------------------------------------------------------------
// Messages Page
// ---------------------------------------------------------------------------

export default function MessagesPage() {
  const { user, userData } = useAuthContext();
  const { messages, loading, error, refetch } = useMessages();

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);

  // Sort messages newest-first
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  }, [messages]);

  const unreadCount = useMemo(
    () => messages.filter((m) => !m.isRead && m.receiverId === user?.uid).length,
    [messages, user?.uid],
  );

  // Mobile: show detail or list
  const [showDetail, setShowDetail] = useState(false);

  const handleSelectMessage = useCallback((msg: Message) => {
    setSelectedMessage(msg);
    setShowDetail(true);
  }, []);

  const handleBack = useCallback(() => {
    setShowDetail(false);
    setSelectedMessage(null);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      {error && (
        <Card className="mb-4">
          <CardContent className="py-3 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200">
        {/* Message list (left column) */}
        <div
          className={cn(
            'w-full flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white md:w-80 lg:w-96',
            showDetail && 'hidden md:block',
          )}
        >
          {sortedMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={Inbox}
                title="No messages"
                description="Your inbox is empty. Start a conversation."
                action={{
                  label: 'Compose',
                  onClick: () => setComposeOpen(true),
                }}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedMessages.map((msg) => {
                const isActive = selectedMessage?.id === msg.id;
                const isUnread = !msg.isRead && msg.receiverId === user?.uid;

                return (
                  <button
                    key={msg.id}
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                      isActive && 'bg-primary/5',
                    )}
                    onClick={() => handleSelectMessage(msg)}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isUnread ? (
                        <Mail className="h-4 w-4 text-primary" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            'truncate text-sm',
                            isUnread
                              ? 'font-semibold text-gray-900'
                              : 'font-medium text-gray-700',
                          )}
                        >
                          {msg.subject}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {msg.senderName}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">
                        {msg.body}
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        {msg.createdAt?.toDate?.()
                          ? msg.createdAt.toDate().toLocaleDateString()
                          : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Message detail (right column) */}
        <div
          className={cn(
            'flex flex-1 flex-col bg-white',
            !showDetail && 'hidden md:flex',
          )}
        >
          {selectedMessage ? (
            <div className="flex flex-1 flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-gray-900">
                    {selectedMessage.subject}
                  </h2>
                  <p className="text-xs text-gray-500">
                    From: {selectedMessage.senderName} |{' '}
                    {selectedMessage.createdAt?.toDate?.()
                      ? selectedMessage.createdAt.toDate().toLocaleString()
                      : ''}
                  </p>
                </div>
                <Badge variant="secondary">{selectedMessage.type}</Badge>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {selectedMessage.body}
                </p>

                {selectedMessage.attachments?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Attachments:</p>
                    {selectedMessage.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-primary hover:bg-gray-50"
                      >
                        <Paperclip className="h-4 w-4" />
                        {att.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply */}
              <div className="border-t border-gray-200 p-4">
                <Button variant="outline" onClick={() => setReplyOpen(true)}>
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-gray-400">
                <Inbox className="mx-auto mb-2 h-10 w-10" />
                <p className="text-sm">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        senderName={userData?.displayName ?? ''}
        senderId={user?.uid ?? ''}
        onSent={refetch}
      />

      {/* Reply Dialog */}
      {selectedMessage && (
        <ComposeDialog
          open={replyOpen}
          onOpenChange={setReplyOpen}
          senderName={userData?.displayName ?? ''}
          senderId={user?.uid ?? ''}
          replyTo={selectedMessage}
          onSent={refetch}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compose / Reply Dialog
// ---------------------------------------------------------------------------

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderName: string;
  senderId: string;
  replyTo?: Message;
  onSent: () => void;
}

function ComposeDialog({
  open,
  onOpenChange,
  senderName,
  senderId,
  replyTo,
  onSent,
}: ComposeDialogProps) {
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '');
  const [messageType, setMessageType] = useState<MessageType>('general');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      // In production: addDoc to messages collection
      console.log('Sending message:', { subject, messageType, body, senderName, senderId });
      onSent();
      onOpenChange(false);
      setSubject('');
      setBody('');
    } catch {
      // handle error
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{replyTo ? 'Reply' : 'New Message'}</DialogTitle>
          <DialogDescription>
            {replyTo
              ? `Replying to "${replyTo.subject}" from ${replyTo.senderName}`
              : 'Send a message to the commissary administration.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="msg-subject">Subject</Label>
            <Input
              id="msg-subject"
              placeholder="Message subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-type">Type</Label>
            <Select
              value={messageType}
              onValueChange={(v) => setMessageType(v as MessageType)}
            >
              <SelectTrigger id="msg-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="issue_report">Issue Report</SelectItem>
                <SelectItem value="booking_question">Booking Question</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-body">Message</Label>
            <Textarea
              id="msg-body"
              placeholder="Write your message..."
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div>
            <Button variant="outline" size="sm">
              <Paperclip className="mr-1.5 h-3.5 w-3.5" />
              Attach File
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
