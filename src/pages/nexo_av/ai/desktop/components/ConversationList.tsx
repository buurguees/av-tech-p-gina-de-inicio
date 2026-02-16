import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MessageCircle, Users, Hash, LogIn, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Conversation } from '../../logic/types';
import type { DepartmentConversation } from '../../logic/hooks/useConversations';
import NewConversationDialog from './NewConversationDialog';

export interface GroupAutoModeMap {
  [conversationId: string]: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  departmentConversations: DepartmentConversation[];
  personalConversation: Conversation | null;
  activeId: string | null;
  isAdmin?: boolean;
  groupAutoModes?: GroupAutoModeMap;
  onSelect: (conv: Conversation) => void;
  onSelectDepartment: (dept: DepartmentConversation) => void;
  onCreateConversation: (title: string, scope: string, department: string) => Promise<any>;
  onDeleteConversation: (conversationId: string) => Promise<boolean>;
  onOpenGroupSettings?: (dept: DepartmentConversation) => void;
}

const ConversationList = ({
  conversations,
  departmentConversations,
  personalConversation,
  activeId,
  isAdmin = false,
  groupAutoModes = {},
  onSelect,
  onSelectDepartment,
  onCreateConversation,
  onDeleteConversation,
  onOpenGroupSettings,
}: ConversationListProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const personalConvs = conversations.filter((c) => c.scope === 'user');

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await onDeleteConversation(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };

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
        {/* GRUPOS — fijados arriba */}
        {departmentConversations.length > 0 && (
          <div className="mb-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2">
              Bandejas
            </span>
            {departmentConversations.map((dept) => {
              const isAuto = groupAutoModes[dept.id] === true;

              return (
                <div
                  key={dept.id}
                  className={cn(
                    'flex items-center rounded-lg transition-colors group/dept',
                    activeId === dept.id
                      ? 'bg-primary/10'
                      : 'hover:bg-muted'
                  )}
                >
                  <button
                    onClick={() => onSelectDepartment(dept)}
                    className={cn(
                      'flex-1 flex items-center gap-2 px-2 py-2 text-sm text-left min-w-0',
                      activeId === dept.id
                        ? 'text-primary font-medium'
                        : 'text-foreground'
                    )}
                  >
                    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{dept.title}</span>
                    {/* Badge auto/manual */}
                    {isAuto ? (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-green-500" title="Modo automático" />
                    ) : (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-muted-foreground/30" title="Manual" />
                    )}
                  </button>
                  {/* Acciones del grupo */}
                  <div className="flex items-center shrink-0 mr-1">
                    {!dept.is_member && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 opacity-0 group-hover/dept:opacity-100 transition-opacity">
                        <LogIn className="h-2.5 w-2.5 mr-0.5" />
                        Unirse
                      </Badge>
                    )}
                    {isAdmin && onOpenGroupSettings && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenGroupSettings(dept);
                        }}
                        className="p-1 rounded-md text-muted-foreground/0 group-hover/dept:text-muted-foreground hover:!text-primary hover:bg-primary/10 transition-colors"
                        title="Configuración del agente"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Separador visual */}
        {departmentConversations.length > 0 && personalConvs.length > 0 && (
          <div className="border-t border-border/50 my-1" />
        )}

        {/* CHATS PERSONALES — debajo de los grupos */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2">
            Mis chats
          </span>
          {personalConversation && (
            <div
              className={cn(
                'flex items-center rounded-lg transition-colors group',
                activeId === personalConversation.id
                  ? 'bg-primary/10'
                  : 'hover:bg-muted'
              )}
            >
              <button
                onClick={() => onSelect(personalConversation)}
                className={cn(
                  'flex-1 flex items-center gap-2 px-2 py-2 text-sm text-left',
                  activeId === personalConversation.id
                    ? 'text-primary font-medium'
                    : 'text-foreground'
                )}
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{personalConversation.title}</span>
              </button>
            </div>
          )}
          {personalConvs
            .filter((c) => c.id !== personalConversation?.id)
            .map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'flex items-center rounded-lg transition-colors group',
                  activeId === conv.id
                    ? 'bg-primary/10'
                    : 'hover:bg-muted'
                )}
              >
                <button
                  onClick={() => onSelect(conv)}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-2 py-2 text-sm text-left min-w-0',
                    activeId === conv.id
                      ? 'text-primary font-medium'
                      : 'text-foreground'
                  )}
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(conv);
                  }}
                  className="shrink-0 p-1.5 mr-1 rounded-md text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive hover:bg-destructive/10 transition-colors"
                  title="Eliminar conversación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Dialog nueva conversación */}
      <NewConversationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateConversation={onCreateConversation}
      />

      {/* Dialog confirmar eliminación */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar conversación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar <strong>"{deleteTarget?.title}"</strong>?
              Se borrarán todos los mensajes y no se podrá recuperar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConversationList;
