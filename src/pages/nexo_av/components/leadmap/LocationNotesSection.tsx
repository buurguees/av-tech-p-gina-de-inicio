/**
 * LocationNotesSection - Notes section for Canvassing locations
 * Shows activity history including status changes with timestamps
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { MessageSquare, RefreshCw, Send, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface LocationNote {
  id: string;
  content: string;
  note_type: string;
  created_by_name: string;
  created_at: string;
  attachments?: string[];
}

interface LocationNotesSectionProps {
  locationId: string;
  canEdit?: boolean;
}

const LocationNotesSection = ({ locationId, canEdit = true }: LocationNotesSectionProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<LocationNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (locationId) {
      fetchNotes();
    }
  }, [locationId]);

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true);
      const { data, error } = await supabase.rpc('list_location_notes', {
        p_location_id: locationId
      });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching location notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);
      const { error } = await supabase.rpc('add_location_note', {
        p_location_id: locationId,
        p_content: newNote.trim(),
        p_note_type: 'INTERNAL'
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
      case 'STATUS_CHANGE':
        return <RefreshCw size={14} className="text-primary shrink-0" />;
      case 'CREATION':
        return <Clock size={14} className="text-green-500 shrink-0" />;
      default:
        return <MessageSquare size={14} className="text-muted-foreground shrink-0" />;
    }
  };

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return 'Cambio de estado';
      case 'CREATION':
        return 'Creación';
      case 'VISIT':
        return 'Visita';
      case 'CALL':
        return 'Llamada';
      case 'MEETING':
        return 'Reunión';
      default:
        return 'Nota';
    }
  };

  return (
    <div className="space-y-4">
      {/* Add note section */}
      {canEdit && (
        <div className="space-y-2">
          <Label>Nueva nota</Label>
          <Textarea
            placeholder="Escribe una nota sobre esta ubicación..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px]"
          />
          <Button 
            size="sm" 
            className="w-full"
            onClick={handleAddNote}
            disabled={addingNote || !newNote.trim()}
          >
            {addingNote ? (
              <Loader2 size={14} className="mr-2 animate-spin" />
            ) : (
              <Send size={14} className="mr-2" />
            )}
            {addingNote ? "Guardando..." : "Añadir Nota"}
          </Button>
        </div>
      )}

      {/* Notes list */}
      <div className="pt-2 border-t">
        <h4 className="text-sm font-medium mb-3">Historial de Actividad</h4>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 pr-2">
            {loadingNotes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin actividad registrada
              </p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="border-l-2 border-muted pl-3 py-1 hover:border-primary transition-colors">
                  <div className="flex items-center gap-1.5 mb-1">
                    {getNoteIcon(note.note_type)}
                    <span className="text-xs text-muted-foreground">
                      {note.created_by_name}
                    </span>
                    <span className="text-xs text-muted-foreground/60">•</span>
                    <span className="text-xs text-muted-foreground/60">
                      {format(new Date(note.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm">{note.content}</p>
                  {note.note_type !== 'INTERNAL' && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {getNoteTypeLabel(note.note_type)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default LocationNotesSection;
