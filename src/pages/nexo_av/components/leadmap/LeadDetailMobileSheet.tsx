import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadClient, LEAD_STAGE_COLORS, LEAD_STAGE_LABELS } from "../../LeadMapPage";
import { Phone, Mail, MapPin, User, Clock, MessageSquare, RefreshCw, Send, MoreVertical, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ClientNote {
  id: string;
  content: string;
  note_type: string;
  user_name: string;
  created_at: string;
}

interface LeadDetailMobileSheetProps {
  client: LeadClient;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  currentUserId: string | null;
  onFocusLocation?: () => void;
  userId?: string;
}

const LeadDetailMobileSheet = ({ 
  client, 
  open, 
  onClose, 
  onRefresh, 
  isAdmin, 
  currentUserId,
  onFocusLocation,
  userId
}: LeadDetailMobileSheetProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(client.lead_stage);

  const canEdit = isAdmin || client.assigned_to === currentUserId;

  useEffect(() => {
    if (open) {
      fetchNotes();
      setNewStatus(client.lead_stage);
    }
  }, [client.id, open]);

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
      setChangingStatus(true);
      // Include note if there's one, otherwise use default message
      const noteContent = newNote.trim() || `Estado cambiado a "${LEAD_STAGE_LABELS[newStatus]}"`;
      
      const { error } = await supabase.rpc('update_client_status', {
        p_client_id: client.id,
        p_new_status: newStatus,
        p_note: noteContent
      });

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Cambio a "${LEAD_STAGE_LABELS[newStatus]}"`,
      });

      // Clear note if it was used for status change
      if (newNote.trim()) {
        setNewNote("");
      }
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
      setChangingStatus(false);
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
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="pr-8">{client.company_name}</SheetTitle>
          <p className="text-xs text-muted-foreground">{client.client_number}</p>
          
          {/* Status badge */}
          <Badge
            className="w-fit mt-2"
            style={{
              backgroundColor: LEAD_STAGE_COLORS[client.lead_stage],
              color: 'white'
            }}
          >
            {LEAD_STAGE_LABELS[client.lead_stage]}
          </Badge>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-8rem)]">
          <div className="space-y-4 pr-2">
            {/* Contact info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-muted-foreground" />
                <a href={`tel:${client.contact_phone}`} className="text-sm hover:underline">
                  {client.contact_phone}
                </a>
              </div>
              {client.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-muted-foreground" />
                  <a href={`mailto:${client.contact_email}`} className="text-sm hover:underline truncate">
                    {client.contact_email}
                  </a>
                </div>
              )}
              {client.full_address && (
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-muted-foreground mt-0.5" />
                  <span className="text-sm text-muted-foreground">{client.full_address}</span>
                </div>
              )}
              {client.assigned_to_name && (
                <div className="flex items-center gap-2">
                  <User size={16} className="text-muted-foreground" />
                  <span className="text-sm">{client.assigned_to_name}</span>
                </div>
              )}
            </div>

            {/* Add note */}
            {canEdit && (
              <div className="pt-2 border-t">
                <Textarea
                  placeholder="Añadir nota..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="mt-2 space-y-2">
                  {/* Status change selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Cambiar estado:</span>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    {newNote.trim() && (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={handleAddNote}
                        disabled={addingNote}
                      >
                        <Send size={14} className="mr-1" />
                        {addingNote ? "Guardando..." : "Añadir Nota"}
                      </Button>
                    )}
                    {newStatus !== client.lead_stage && (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="flex-1"
                        onClick={handleChangeStatus}
                        disabled={changingStatus}
                      >
                        <RefreshCw size={14} className="mr-1" />
                        {changingStatus ? "Guardando..." : "Cambiar Estado"}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {client.latitude && client.longitude && onFocusLocation && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onFocusLocation}
                        className="flex-1"
                        title="Ver ubicación en el mapa"
                      >
                        <Eye size={14} className="mr-1" />
                        Ver ubicación
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0"
                          title="Más opciones"
                        >
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {userId && (
                          <DropdownMenuItem
                            onClick={() => navigate(`/nexo-av/${userId}/clients/${client.id}`)}
                          >
                            Ver detalles del cliente
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )}
            {!canEdit && (
              <div className="pt-2 border-t flex gap-2">
                {client.latitude && client.longitude && onFocusLocation && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onFocusLocation}
                    className="flex-1"
                    title="Ver ubicación en el mapa"
                  >
                    <Eye size={14} className="mr-1" />
                    Ver ubicación
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0"
                      title="Más opciones"
                    >
                      <MoreVertical size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {userId && (
                      <DropdownMenuItem
                        onClick={() => navigate(`/nexo-av/${userId}/clients/${client.id}`)}
                      >
                        Ver detalles del cliente
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Notes list */}
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-3">Historial de Actividad</h4>
              <div className="space-y-3">
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
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default LeadDetailMobileSheet;
