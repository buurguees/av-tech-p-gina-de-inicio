import { useState, useEffect } from 'react';
import { useConversations } from '../logic/hooks/useConversations';
import type { DepartmentConversation } from '../logic/hooks/useConversations';
import { useMessages } from '../logic/hooks/useMessages';
import { useSendMessage } from '../logic/hooks/useSendMessage';
import { useRequestStatus } from '../logic/hooks/useRequestStatus';
import ConversationList from './components/ConversationList';
import ChatPanel from './components/ChatPanel';
import type { Conversation } from '../logic/types';

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

  const handleSendMessage = async (conversationId: string, content: string, mode: any) => {
    await sendMessage(conversationId, content, mode);
    startPolling();
  };

  return (
    <div className="flex h-full bg-background">
      <div className="w-72 border-r border-border flex-shrink-0">
        <ConversationList
          conversations={conversations}
          departmentConversations={departmentConversations}
          personalConversation={personalConversation}
          activeId={activeConversation?.id || null}
          onSelect={handleSelectConversation}
          onSelectDepartment={handleSelectDepartment}
          onCreateConversation={createConversation}
          onDeleteConversation={handleDeleteConversation}
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
      />
    </div>
  );
};

export default AIChatPage;
