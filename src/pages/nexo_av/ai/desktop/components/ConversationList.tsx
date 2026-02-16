import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MessageCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Conversation } from '../../logic/types';
import NewConversationDialog from './NewConversationDialog';

interface ConversationListProps {
  conversations: Conversation[];
  personalConversation: Conversation | null;
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  onCreateConversation: (title: string, scope: string, department: string) => Promise<any>;
}

const ConversationList = ({
  conversations,
  personalConversation,
  activeId,
  onSelect,
  onCreateConversation,
}: ConversationListProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const personalConvs = conversations.filter((c) => c.scope === 'user');
  const departmentConvs = conversations.filter((c) => c.scope === 'department');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">Conversaciones</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Personal section */}
        <div className="mb-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2">
            Personal
          </span>
          {personalConversation && (
            <button
              onClick={() => onSelect(personalConversation)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors',
                activeId === personalConversation.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">{personalConversation.title}</span>
            </button>
          )}
          {personalConvs
            .filter((c) => c.id !== personalConversation?.id)
            .map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors',
                  activeId === conv.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))}
        </div>

        {/* Department section */}
        {departmentConvs.length > 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2">
              Departamentos
            </span>
            {departmentConvs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors',
                  activeId === conv.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <NewConversationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateConversation={onCreateConversation}
      />
    </div>
  );
};

export default ConversationList;
