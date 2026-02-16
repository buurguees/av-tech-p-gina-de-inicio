import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DepartmentScope } from '../types';

// Helper to call RPCs not yet in generated types
const rpc = (name: string, params?: Record<string, unknown>) =>
  (supabase.rpc as any)(name, params);

export function useSendMessage() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    mode: DepartmentScope = 'general'
  ) => {
    if (!content.trim()) return;

    try {
      setSending(true);
      setError(null);

      // 1. Add user message
      const { data: msgData, error: msgErr } = await rpc('ai_add_user_message', {
        p_conversation_id: conversationId,
        p_content: content.trim(),
        p_mode: mode,
      });
      if (msgErr) throw msgErr;
      const messageId = (msgData as any[])?.[0]?.id;

      // 2. Create chat request — V2: processor='alb357', no Edge Function call
      const { error: reqErr } = await rpc('ai_create_chat_request', {
        p_conversation_id: conversationId,
        p_mode: mode,
        p_latest_user_message_id: messageId || null,
        p_processor: 'alb357',
      });
      if (reqErr) throw reqErr;

      // Request stays queued — ALB357 worker picks it up via polling
    } catch (e: any) {
      setError(e.message);
      console.error('Send message error:', e);
    } finally {
      setSending(false);
    }
  }, []);

  return { sendMessage, sending, error };
}
