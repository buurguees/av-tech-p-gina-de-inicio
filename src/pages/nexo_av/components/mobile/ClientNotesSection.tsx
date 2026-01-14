/**
 * ClientNotesSection - Mobile optimized notes/activity section
 * Reusable component for displaying notes in mobile views
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, RefreshCw, Send, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ClientNote {
  id: string;
  content: string;
  note_type: string;
  user_name: string;
  created_at: string;
  previous_status?: string;
  new_status?: string;
}

interface ClientNotesSectionProps {
  clientId: string;
  canEdit: boolean;
  compact?: boolean;
}

const ClientNotesSection = ({ clientId, canEdit, compact = true }: ClientNotesSectionProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [clientId]);

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true);
      const { data, error } = await supabase.rpc('list_client_notes', {
        p_client_id: clientId
      });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);
      const { error } = await supabase.rpc('add_client_note', {
        p_client_id: clientId,
        p_content: newNote.trim(),
        p_note_type: 'manual'
      });

      if (error) throw error;

      toast({
        title: "Nota añadida",
        description: "La nota se ha guardado correctamente",
      });

      setNewNote("");
      fetchNotes();
    } catch (err) {
      console.error('Error adding note:', err);
      toast({
        title: "Error",
        description: "No se pudo añadir la nota",
        variant: "destructive",
      });
    } finally {
      setAddingNote(false);
    }
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <RefreshCw size={14} className="text-primary shrink-0" />;
      case 'creation':
        return <Clock size={14} className="text-green-500 shrink-0" />;
      default:
        return <MessageSquare size={14} className="text-muted-foreground shrink-0" />;
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Notas y Actividad
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Add note section */}
        {canEdit && (
          <div className="space-y-2">
            <Textarea
              placeholder="Añadir nota..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[70px] bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm"
            />
            {newNote.trim() && (
              <Button 
                size="sm" 
                className="w-full h-10"
                onClick={handleAddNote}
                disabled={addingNote}
              >
                <Send size={14} className="mr-2" />
                {addingNote ? "Guardando..." : "Añadir Nota"}
              </Button>
            )}
          </div>
        )}

        {/* Notes list */}
        <div className="pt-2 border-t border-white/10">
          <h4 className="text-xs font-medium text-white/60 mb-2">Historial</h4>
          <ScrollArea className={compact ? "h-[200px]" : "h-[350px]"}>
            <div className="space-y-2 pr-2">
              {loadingNotes ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white/60"></div>
                </div>
              ) : notes.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">
                  Sin actividad registrada
                </p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="border-l-2 border-white/20 pl-2 py-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {getNoteIcon(note.note_type)}
                      <span className="text-[11px] text-white/50 truncate">
                        {note.user_name} • {format(new Date(note.created_at), "d MMM, HH:mm", { locale: es })}
                      </span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientNotesSection;
