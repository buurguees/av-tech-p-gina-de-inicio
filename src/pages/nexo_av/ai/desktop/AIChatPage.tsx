import { useState, useEffect } from 'react';
import { useConversations } from '../logic/hooks/useConversations';
import { useMessages } from '../logic/hooks/useMessages';
import { useSendMessage } from '../logic/hooks/useSendMessage';
import { useRequestStatus } from '../logic/hooks/useRequestStatus';
import ConversationList from './components/ConversationList';
import ChatPanel from './components/ChatPanel';
import type { Conversation } from '../logic/types';

const AIChatPage = () => {
  const {
    conversations,
    personalConversation,
    loading: convsLoading,
    createConversation,
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

  const handleSendMessage = async (conversationId: string, content: string, mode: any) => {
    await sendMessage(conversationId, content, mode);
    startPolling();
  };

  return (
    <div className="flex h-full bg-background">
      <div className="w-72 border-r border-border flex-shrink-0">
        <ConversationList
          conversations={conversations}
          personalConversation={personalConversation}
          activeId={activeConversation?.id || null}
          onSelect={handleSelectConversation}
          onCreateConversation={createConversation}
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
