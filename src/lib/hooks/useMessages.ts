'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import * as messageService from '@/lib/services/messageService';
import { Message } from '@/lib/types';

export function useMessages(type: 'sent' | 'received' = 'received') {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await messageService.getMessages(user.uid, type);
      setMessages(data);
      const count = await messageService.getUnreadCount(user.uid);
      setUnreadCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [user, type]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async (data: Omit<Message, 'id' | 'createdAt' | 'isRead'>) => {
    await messageService.sendMessage(data);
    await fetchMessages();
  }, [fetchMessages]);

  const markRead = useCallback(async (id: string) => {
    await messageService.markMessageRead(id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  return { messages, unreadCount, loading, error, sendMessage, markRead, refetch: fetchMessages };
}
