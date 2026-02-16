import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DepartmentScope } from '../types';

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
      const { data: msgData, error: msgErr } = await supabase.rpc('ai_add_user_message', {
        p_conversation_id: conversationId,
        p_content: content.trim(),
        p_mode: mode,
      });
      if (msgErr) throw msgErr;
      const messageId = (msgData as unknown as { id: string }[])?.[0]?.id;

      // 2. Create chat request
      const { data: reqData, error: reqErr } = await supabase.rpc('ai_create_chat_request', {
        p_conversation_id: conversationId,
        p_mode: mode,
        p_latest_user_message_id: messageId || null,
      });
      if (reqErr) throw reqErr;
      const requestId = (reqData as unknown as { id: string }[])?.[0]?.id;

      // 3. Invoke edge function (fire-and-forget style, response comes via Realtime)
      if (requestId) {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        fetch(
          `https://takvthfatlcjsqgssnta.supabase.co/functions/v1/ai-chat-processor`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ request_id: requestId }),
          }
        ).catch((e) => console.error('Edge function call failed:', e));
      }
    } catch (e: any) {
      setError(e.message);
      console.error('Send message error:', e);
    } finally {
      setSending(false);
    }
  }, []);

  return { sendMessage, sending, error };
}
