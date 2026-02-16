import { useState, useEffect } from 'react';
import { useConversations } from '../logic/hooks/useConversations';
import { useMessages } from '../logic/hooks/useMessages';
import { useSendMessage } from '../logic/hooks/useSendMessage';
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

  // Auto-select personal conversation on load
  useEffect(() => {
    if (!activeConversation && personalConversation) {
      setActiveConversation(personalConversation);
    }
  }, [personalConversation, activeConversation]);

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Conversation list */}
      <div className="w-72 border-r border-border flex-shrink-0">
        <ConversationList
          conversations={conversations}
          personalConversation={personalConversation}
          activeId={activeConversation?.id || null}
          onSelect={handleSelectConversation}
          onCreateConversation={createConversation}
        />
      </div>

      {/* Main chat panel */}
      <ChatPanel
        conversation={activeConversation}
        messages={messages}
        messagesLoading={msgsLoading}
        sending={sending}
        onSendMessage={sendMessage}
      />
    </div>
  );
};

export default AIChatPage;
