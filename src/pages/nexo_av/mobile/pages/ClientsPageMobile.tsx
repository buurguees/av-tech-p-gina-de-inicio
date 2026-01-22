/**
 * ClientsPageMobile
 * 
 * Versión optimizada para móviles de la página de clientes.
 * Diseñada para comerciales con acceso rápido y UI simplificada.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import ClientsListMobile from "../components/mobile/ClientsListMobile";
import MobileBottomNav from "../components/MobileBottomNav";
import { cn } from "@/lib/utils";
import { LEAD_STAGE_COLORS, LEAD_STAGE_LABELS } from "../../constants/leadStages";
import CreateClientDialog from "../components/CreateClientDialog";

interface Client {
  id: string;
  client_number: string | null;
  company_name: string;
  contact_phone: string;
  contact_email: string;
  lead_stage: string;
  assigned_to_name?: string | null;
}

const getStageInfo = (stage: string) => {
  const label = LEAD_STAGE_LABELS[stage] || stage;
  const color = LEAD_STAGE_COLORS[stage] || 'bg-gray-100 text-gray-700 border-gray-300';
  return { label, color };
};

const ClientsPageMobile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchClients();
    }
  }, [stageFilter, debouncedSearchQuery, showOnlyMine, currentUserId]);

  const fetchUserInfo = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_user_info');
      if (!error && data && data.length > 0) {
        setCurrentUserId(data[0].user_id);
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params: { p_lead_stages?: string[]; p_assigned_to?: string; p_search?: string } = {};
      
      if (stageFilter !== "all") {
        params.p_lead_stages = [stageFilter];
      }
      
      if (showOnlyMine && currentUserId) {
        params.p_assigned_to = currentUserId;
      }
      
      if (debouncedSearchQuery) {
        params.p_search = debouncedSearchQuery;
      }

      const { data, error } = await supabase.rpc('list_clients_for_map', params);
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/nexo-av/${userId}/clients/${clientId}`);
  };

  const handleNewClient = () => {
    setShowCreateDialog(true);
  };

  // Pagination (25 records per page en móvil)
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedClients,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(clients, { pageSize: 25 });

  const LEAD_STAGES = [
    { value: 'all', label: 'Todos' },
    { value: 'NEW', label: 'Nuevo' },
    { value: 'CONTACTED', label: 'Contactado' },
    { value: 'MEETING', label: 'Reunión' },
    { value: 'PROPOSAL', label: 'Propuesta' },
    { value: 'NEGOTIATION', label: 'Negociación' },
    { value: 'WON', label: 'Ganado' },
    { value: 'RECURRING', label: 'Recurrente' },
    { value: 'LOST', label: 'Perdido' },
  ];

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <main className="px-3 py-3 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Botón Nuevo */}
          <Button
            onClick={handleNewClient}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-xs font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-11 bg-card border-border text-foreground placeholder:text-muted-foreground h-10 text-xs"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide flex-1">
              {LEAD_STAGES.map((stage) => (
                <Button
                  key={stage.value}
                  variant={stageFilter === stage.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStageFilter(stage.value)}
                  className={cn(
                    "h-8 px-3 text-[10px] shrink-0",
                    stageFilter === stage.value 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "border-border text-muted-foreground"
                  )}
                >
                  {stage.label}
                </Button>
              ))}
            </div>
            <Button
              variant={showOnlyMine ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowOnlyMine(!showOnlyMine)}
              className={cn(
                "h-8 px-2 shrink-0",
                showOnlyMine ? "bg-primary text-primary-foreground" : "border-border"
              )}
              title="Solo mis clientes"
            >
              <Users className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Clients List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
            </div>
          ) : clients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center px-4"
            >
              <Building2 className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-sm font-medium text-foreground mb-2">No hay clientes</h3>
              <p className="text-muted-foreground text-xs mb-6">
                {searchInput || stageFilter !== "all"
                  ? "No se encontraron clientes con los filtros aplicados"
                  : "Crea tu primer cliente para comenzar"}
              </p>
              {!searchInput && stageFilter === "all" && (
                <Button
                  onClick={handleNewClient}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              )}
            </motion.div>
          ) : (
            <ClientsListMobile
              clients={paginatedClients}
              getStageInfo={getStageInfo}
              onClientClick={handleClientClick}
              onCreateClick={handleNewClient}
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalItems}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              onPrevPage={prevPage}
              onNextPage={nextPage}
              onGoToPage={goToPage}
            />
          )}
        </motion.div>
      </main>

      {/* Create Client Dialog */}
      {showCreateDialog && (
        <CreateClientDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            setShowCreateDialog(false);
            fetchClients();
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default ClientsPageMobile;
