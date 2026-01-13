import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadClient, LEAD_STAGE_COLORS, LEAD_STAGE_LABELS } from "../../LeadMapPage";
import { X, Phone, Mail, MapPin, User, Clock, MessageSquare, RefreshCw, Send } from "lucide-react";
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

interface LeadDetailPanelProps {
  client: LeadClient;
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  currentUserId: string | null;
}

const LeadDetailPanel = ({ client, onClose, onRefresh, isAdmin, currentUserId }: LeadDetailPanelProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(client.lead_stage);

  const canEdit = isAdmin || client.assigned_to === currentUserId;

  useEffect(() => {
    fetchNotes();
  }, [client.id]);

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true);
      const { data, error } = await supabase.rpc('list_client_notes', {
        p_client_id: client.id
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
        p_client_id: client.id,
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

  const handleChangeStatus = async () => {
    if (newStatus === client.lead_stage) {
      setChangingStatus(false);
      return;
    }

    try {
      const { error } = await supabase.rpc('update_client_status', {
        p_client_id: client.id,
        p_new_status: newStatus
      });

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Cambio a "${LEAD_STAGE_LABELS[newStatus]}"`,
      });

      setChangingStatus(false);
      onRefresh();
      fetchNotes();
    } catch (err) {
      console.error('Error changing status:', err);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado",
        variant: "destructive",
      });
    }
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <RefreshCw size={14} className="text-primary" />;
      case 'creation':
        return <Clock size={14} className="text-green-500" />;
      default:
        return <MessageSquare size={14} className="text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{client.company_name}</CardTitle>
            <p className="text-xs text-muted-foreground">{client.client_number}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
        
        {/* Status badge */}
        {!changingStatus ? (
          <Badge
            className="w-fit cursor-pointer mt-2"
            style={{
              backgroundColor: LEAD_STAGE_COLORS[client.lead_stage],
              color: 'white'
            }}
            onClick={() => canEdit && setChangingStatus(true)}
          >
            {LEAD_STAGE_LABELS[client.lead_stage]}
          </Badge>
        ) : (
          <div className="flex gap-2 mt-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8" onClick={handleChangeStatus}>
              Guardar
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => {
              setChangingStatus(false);
              setNewStatus(client.lead_stage);
            }}>
              Cancelar
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 pt-2">
        {/* Contact info */}
        <div className="space-y-2 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-muted-foreground" />
            <a href={`tel:${client.contact_phone}`} className="hover:underline">
              {client.contact_phone}
            </a>
          </div>
          {client.contact_email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} className="text-muted-foreground" />
              <a href={`mailto:${client.contact_email}`} className="hover:underline truncate">
                {client.contact_email}
              </a>
            </div>
          )}
          {client.full_address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={14} className="text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{client.full_address}</span>
            </div>
          )}
          {client.assigned_to_name && (
            <div className="flex items-center gap-2 text-sm">
              <User size={14} className="text-muted-foreground" />
              <span>{client.assigned_to_name}</span>
            </div>
          )}
        </div>

        {/* Add note */}
        {canEdit && (
          <div className="mb-4 flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                placeholder="Añadir nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
            {newNote.trim() && (
              <Button 
                size="sm" 
                className="mt-2 w-full"
                onClick={handleAddNote}
                disabled={addingNote}
              >
                <Send size={14} className="mr-1" />
                {addingNote ? "Guardando..." : "Añadir Nota"}
              </Button>
            )}
          </div>
        )}

        {/* Notes list */}
        <div className="flex-1 min-h-0">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Historial de Actividad
          </h4>
          <ScrollArea className="h-[calc(100%-1.5rem)]">
            <div className="space-y-3 pr-2">
              {loadingNotes ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-border border-t-primary"></div>
                </div>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin actividad registrada
                </p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="border-l-2 border-border pl-3 py-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      {getNoteIcon(note.note_type)}
                      <span className="text-xs text-muted-foreground">
                        {note.user_name} • {format(new Date(note.created_at), "d MMM, HH:mm", { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm">{note.content}</p>
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

export default LeadDetailPanel;
