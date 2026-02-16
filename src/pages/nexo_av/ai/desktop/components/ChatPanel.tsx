import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Conversation, Message, DepartmentScope } from '../../logic/types';
import type { RequestStatusValue } from '../../logic/hooks/useRequestStatus';
import ModeSelector from './ModeSelector';
import MessageBubble from './MessageBubble';

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: Message[];
  messagesLoading: boolean;
  sending: boolean;
  onSendMessage: (conversationId: string, content: string, mode: DepartmentScope) => Promise<void>;
  requestStatus?: RequestStatusValue;
  requestError?: string | null;
  onRetry?: () => void;
}

const ChatPanel = ({
  conversation,
  messages,
  messagesLoading,
  sending,
  onSendMessage,
  requestStatus = 'idle',
  requestError,
  onRetry,
}: ChatPanelProps) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<DepartmentScope>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!conversation || !input.trim() || sending) return;
    const content = input;
    setInput('');
    await onSendMessage(conversation.id, content, mode);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">NEXO AI</p>
          <p className="text-sm mt-1">Selecciona una conversación para comenzar</p>
        </div>
      </div>
    );
  }

  const showStatusBanner = requestStatus === 'queued' || requestStatus === 'processing' || requestStatus === 'error';

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-sm text-foreground truncate">
          {conversation.title}
        </h2>
        <ModeSelector value={mode} onChange={setMode} />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Envía un mensaje para comenzar
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Status banner */}
      {showStatusBanner && (
        <div className="px-4 py-2 border-t border-border">
          {requestStatus === 'queued' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Esperando agente...</span>
            </div>
          )}
          {requestStatus === 'processing' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analizando...</span>
            </div>
          )}
          {requestStatus === 'error' && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="flex-1 truncate">{requestError || 'Error al procesar'}</span>
              {onRetry && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reintentar
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 h-10 w-10"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {sending && (
          <p className="text-[10px] text-muted-foreground mt-1">Procesando...</p>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
