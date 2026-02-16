import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const rpc = (name: string, params?: Record<string, unknown>) =>
  (supabase.rpc as any)(name, params);

export interface GroupAgentSettings {
  exists: boolean;
  conversation_id?: string;
  department?: string;
  agent_name: string;
  model: string;
  auto_mode: boolean;
  intervention_level: 'low' | 'medium' | 'high';
  cooldown_minutes: number;
  last_intervention_at: string | null;
  created_at?: string;
  updated_at?: string;
}

const DEFAULTS: GroupAgentSettings = {
  exists: false,
  agent_name: 'NEXO AI',
  model: 'qwen2.5:3b',
  auto_mode: false,
  intervention_level: 'medium',
  cooldown_minutes: 10,
  last_intervention_at: null,
};

export function useGroupAgentSettings() {
  const [settings, setSettings] = useState<GroupAgentSettings>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await rpc('ai_get_group_settings', {
        p_conversation_id: conversationId,
      });
      if (err) throw err;
      if (data?.error) {
        setError(data.error);
        setSettings(DEFAULTS);
      } else {
        setSettings(data as GroupAgentSettings);
      }
    } catch (e: any) {
      setError(e.message);
      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (
    conversationId: string,
    updates: {
      agent_name?: string;
      model?: string;
      auto_mode?: boolean;
      intervention_level?: string;
      cooldown_minutes?: number;
    }
  ) => {
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await rpc('ai_set_group_settings', {
        p_conversation_id: conversationId,
        p_agent_name: updates.agent_name ?? null,
        p_model: updates.model ?? null,
        p_auto_mode: updates.auto_mode ?? null,
        p_intervention_level: updates.intervention_level ?? null,
        p_cooldown_minutes: updates.cooldown_minutes ?? null,
      });
      if (err) throw err;
      await fetchSettings(conversationId);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    fetchSettings,
    updateSettings,
  };
}
