import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Conversation } from '../types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [personalConversation, setPersonalConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase.rpc('ai_list_conversations', {
        p_limit: 50,
      });
      if (err) throw err;
      setConversations((data as unknown as Conversation[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrCreatePersonal = useCallback(async () => {
    try {
      const { data, error: err } = await supabase.rpc('ai_get_or_create_personal_conversation');
      if (err) throw err;
      const conv = (data as unknown as Conversation[])?.[0];
      if (conv) {
        setPersonalConversation({
          ...conv,
          scope: 'user',
          department: 'general',
          owner_user_id: '',
          updated_at: conv.created_at,
        });
      }
      return conv;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const createConversation = useCallback(async (title: string, scope: string, department: string) => {
    try {
      const { data, error: err } = await supabase.rpc('ai_create_conversation', {
        p_title: title,
        p_scope: scope,
        p_department: department,
      });
      if (err) throw err;
      await fetchConversations();
      return (data as unknown as { id: string; title: string }[])?.[0];
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [fetchConversations]);

  useEffect(() => {
    getOrCreatePersonal().then(() => fetchConversations());
  }, [getOrCreatePersonal, fetchConversations]);

  return {
    conversations,
    personalConversation,
    loading,
    error,
    fetchConversations,
    createConversation,
    getOrCreatePersonal,
  };
}
