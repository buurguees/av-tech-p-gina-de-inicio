import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const rpc = (name: string, params?: Record<string, unknown>) =>
  (supabase.rpc as any)(name, params);

export type RequestStatusValue = 'idle' | 'queued' | 'processing' | 'done' | 'error';

interface RequestStatusState {
  requestStatus: RequestStatusValue;
  requestError: string | null;
  requestId: string | null;
}

export function useRequestStatus(conversationId: string | null, messages: { sender: string }[]) {
  const [state, setState] = useState<RequestStatusState>({
    requestStatus: 'idle',
    requestError: null,
    requestId: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    tickCountRef.current = 0;
  }, []);

  // Poll for request status
  const poll = useCallback(async () => {
    if (!conversationId) return;
    try {
      const { data, error } = await rpc('ai_get_latest_request_status', {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
      const row = (data as any[])?.[0];
      if (!row) {
        setState({ requestStatus: 'idle', requestError: null, requestId: null });
        stopPolling();
        return;
      }

      const status = row.status as string;
      if (status === 'done') {
        setState({ requestStatus: 'done', requestError: null, requestId: row.id });
        stopPolling();
      } else if (status === 'error') {
        setState({ requestStatus: 'error', requestError: row.error, requestId: row.id });
        stopPolling();
      } else {
        setState({
          requestStatus: status as RequestStatusValue,
          requestError: null,
          requestId: row.id,
        });
      }
    } catch (e) {
      console.error('Poll request status error:', e);
    }
  }, [conversationId, stopPolling]);

  // Start polling when sending is detected (status transitions to queued/processing)
  const startPolling = useCallback(() => {
    stopPolling();
    tickCountRef.current = 0;
    setState(prev => ({ ...prev, requestStatus: 'queued' }));
    // Initial poll immediately
    poll();
    intervalRef.current = setInterval(() => {
      tickCountRef.current += 1;
      if (tickCountRef.current > 20) { // 20 * 3s = 60s max
        stopPolling();
        return;
      }
      poll();
    }, 3000);
  }, [poll, stopPolling]);

  // When assistant message arrives via Realtime, stop polling and set idle
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.sender === 'assistant' && (state.requestStatus === 'queued' || state.requestStatus === 'processing')) {
        stopPolling();
        setState({ requestStatus: 'idle', requestError: null, requestId: null });
      }
    }
  }, [messages, state.requestStatus, stopPolling]);

  // Cleanup on unmount or conversation change
  useEffect(() => {
    return () => stopPolling();
  }, [conversationId, stopPolling]);

  // Retry: re-queue a failed request
  const retryRequest = useCallback(async () => {
    if (!state.requestId) return;
    try {
      const { error } = await rpc('ai_retry_chat_request', {
        p_request_id: state.requestId,
      });
      if (error) throw error;
      startPolling();
    } catch (e: any) {
      console.error('Retry failed:', e);
    }
  }, [state.requestId, startPolling]);

  return {
    ...state,
    startPolling,
    retryRequest,
  };
}
