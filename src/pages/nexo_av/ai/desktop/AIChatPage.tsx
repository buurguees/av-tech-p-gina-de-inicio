import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversations } from '../logic/hooks/useConversations';
import type { DepartmentConversation } from '../logic/hooks/useConversations';
import { useMessages } from '../logic/hooks/useMessages';
import { useSendMessage } from '../logic/hooks/useSendMessage';
import { useRequestStatus } from '../logic/hooks/useRequestStatus';
import { useGroupAgentSettings } from '../logic/hooks/useGroupAgentSettings';
import ConversationList from './components/ConversationList';
import type { GroupAutoModeMap } from './components/ConversationList';
import GroupAgentSettingsDialog from './components/GroupAgentSettingsDialog';
import ChatPanel from './components/ChatPanel';
import type { Conversation } from '../logic/types';

const rpc = (name: string, params?: Record<string, unknown>) =>
  (supabase.rpc as any)(name, params);

const AIChatPage = () => {
  const {
    conversations,
    departmentConversations,
    personalConversation,
    loading: convsLoading,
    createConversation,
    deleteConversation,
    joinDepartmentConversation,
  } = useConversations();

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const { messages, loading: msgsLoading } = useMessages(activeConversation?.id || null);
  const { sendMessage, sending } = useSendMessage();
  const { requestStatus, requestError, startPolling, retryRequest } = useRequestStatus(
    activeConversation?.id || null,
    messages
  );

  // V3: Group agent settings
  const {
    settings: groupSettings,
    loading: settingsLoading,
    saving: settingsSaving,
    fetchSettings,
    updateSettings,
  } = useGroupAgentSettings();

  const [settingsTarget, setSettingsTarget] = useState<DepartmentConversation | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupAutoModes, setGroupAutoModes] = useState<GroupAutoModeMap>({});
  const modesLoadedRef = useRef(false);

  // Stable key derived from department conversation IDs to avoid infinite loops
  const deptIdsKey = useMemo(
    () => departmentConversations.map((d) => d.id).sort().join(','),
    [departmentConversations]
  );

  // Check if user is admin on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data } = await rpc('get_current_user_info');
        if (data?.[0]?.roles?.includes('admin')) {
          setIsAdmin(true);
        }
      } catch {}
    };
    checkAdmin();
  }, []);

  // Load auto_mode status for all department conversations (once)
  useEffect(() => {
    if (!isAdmin || !deptIdsKey || modesLoadedRef.current) return;
    modesLoadedRef.current = true;

    const loadModes = async () => {
      const modes: GroupAutoModeMap = {};
      for (const dept of departmentConversations) {
        try {
          const { data, error } = await rpc('ai_get_group_settings', {
            p_conversation_id: dept.id,
          });
          if (error) {
            modes[dept.id] = false;
          } else {
            modes[dept.id] = data?.auto_mode === true;
          }
        } catch {
          modes[dept.id] = false;
        }
      }
      setGroupAutoModes(modes);
    };
    loadModes();
  }, [isAdmin, deptIdsKey]);

  // Auto-select personal conversation on load
  useEffect(() => {
    if (!activeConversation && personalConversation) {
      setActiveConversation(personalConversation);
    }
  }, [personalConversation, activeConversation]);

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
  };

  const handleSelectDepartment = async (dept: DepartmentConversation) => {
    if (!dept.is_member) {
      await joinDepartmentConversation(dept.id);
    }
    setActiveConversation({
      id: dept.id,
      title: dept.title,
      scope: 'department',
      department: dept.department as any,
      owner_user_id: '',
      created_at: '',
      updated_at: '',
      last_message_at: dept.last_message_at || undefined,
    });
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const wasActive = activeConversation?.id === conversationId;
    const success = await deleteConversation(conversationId);
    if (success && wasActive) {
      setActiveConversation(personalConversation);
    }
    return success;
  };

  const handleOpenGroupSettings = (dept: DepartmentConversation) => {
    setSettingsTarget(dept);
    fetchSettings(dept.id);
  };

  const handleSaveGroupSettings = async (
    conversationId: string,
    updates: {
      agent_name?: string;
      model?: string;
      auto_mode?: boolean;
      intervention_level?: string;
      cooldown_minutes?: number;
    }
  ) => {
    const success = await updateSettings(conversationId, updates);
    if (success && updates.auto_mode !== undefined) {
      setGroupAutoModes((prev) => ({ ...prev, [conversationId]: updates.auto_mode! }));
    }
    return success;
  };

  const handleSendMessage = async (conversationId: string, content: string, mode: any) => {
    await sendMessage(conversationId, content, mode);
    startPolling();
  };

  // Check if active conversation is a group with auto_mode
  const activeIsAutoGroup = activeConversation?.scope === 'department'
    && groupAutoModes[activeConversation.id] === true;

  return (
    <div className="flex h-full bg-background">
      <div className="w-72 border-r border-border flex-shrink-0">
        <ConversationList
          conversations={conversations}
          departmentConversations={departmentConversations}
          personalConversation={personalConversation}
          activeId={activeConversation?.id || null}
          isAdmin={isAdmin}
          groupAutoModes={groupAutoModes}
          onSelect={handleSelectConversation}
          onSelectDepartment={handleSelectDepartment}
          onCreateConversation={createConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenGroupSettings={handleOpenGroupSettings}
        />
      </div>

      <ChatPanel
        conversation={activeConversation}
        messages={messages}
        messagesLoading={msgsLoading}
        sending={sending}
        onSendMessage={handleSendMessage}
        requestStatus={requestStatus}
        requestError={requestError}
        onRetry={retryRequest}
        isAutoGroup={activeIsAutoGroup}
      />

      {/* V3: Modal de configuración del agente */}
      {settingsTarget && (
        <GroupAgentSettingsDialog
          open={!!settingsTarget}
          onOpenChange={(open) => !open && setSettingsTarget(null)}
          groupTitle={settingsTarget.title}
          conversationId={settingsTarget.id}
          settings={groupSettings}
          loading={settingsLoading}
          saving={settingsSaving}
          onSave={handleSaveGroupSettings}
        />
      )}
    </div>
  );
};

export default AIChatPage;
