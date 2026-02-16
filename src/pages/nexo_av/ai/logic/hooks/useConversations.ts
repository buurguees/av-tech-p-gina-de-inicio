import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Conversation } from '../types';

// Helper to call RPCs not yet in generated types
const rpc = (name: string, params?: Record<string, unknown>) =>
  (supabase.rpc as any)(name, params);

export interface DepartmentConversation {
  id: string;
  title: string;
  department: string;
  member_count: number;
  is_member: boolean;
  last_message_at: string | null;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [departmentConversations, setDepartmentConversations] = useState<DepartmentConversation[]>([]);
  const [personalConversation, setPersonalConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await rpc('ai_list_conversations', { p_limit: 50 });
      if (err) throw err;
      setConversations((data as Conversation[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartmentConversations = useCallback(async () => {
    try {
      const { data, error: err } = await rpc('ai_list_department_conversations');
      if (err) throw err;
      setDepartmentConversations((data as DepartmentConversation[]) || []);
    } catch (e: any) {
      console.error('Error fetching department conversations:', e);
    }
  }, []);

  const joinDepartmentConversation = useCallback(async (conversationId: string) => {
    try {
      const { error: err } = await rpc('ai_join_department_conversation', {
        p_conversation_id: conversationId,
      });
      if (err) throw err;
      await fetchDepartmentConversations();
      await fetchConversations();
    } catch (e: any) {
      console.error('Error joining department conversation:', e);
    }
  }, [fetchDepartmentConversations, fetchConversations]);

  const getOrCreatePersonal = useCallback(async () => {
    try {
      const { data, error: err } = await rpc('ai_get_or_create_personal_conversation');
      if (err) throw err;
      const conv = (data as any[])?.[0];
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
      const { data, error: err } = await rpc('ai_create_conversation', {
        p_title: title,
        p_scope: scope,
        p_department: department,
      });
      if (err) throw err;
      await fetchConversations();
      return (data as any[])?.[0];
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [fetchConversations]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error: err } = await rpc('ai_delete_conversation', {
        p_conversation_id: conversationId,
      });
      if (err) throw err;
      await fetchConversations();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [fetchConversations]);

  useEffect(() => {
    getOrCreatePersonal().then(() => {
      fetchConversations();
      fetchDepartmentConversations();
    });
  }, [getOrCreatePersonal, fetchConversations, fetchDepartmentConversations]);

  return {
    conversations,
    departmentConversations,
    personalConversation,
    loading,
    error,
    fetchConversations,
    fetchDepartmentConversations,
    joinDepartmentConversation,
    createConversation,
    deleteConversation,
    getOrCreatePersonal,
  };
}
