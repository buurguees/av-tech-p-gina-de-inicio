import { motion } from "framer-motion";
import { Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginationControls from "../PaginationControls";

interface Client {
  id: string;
  client_number: string | null;
  company_name: string;
  contact_email: string;
  tax_id: string | null;
  lead_stage: string;
  assigned_to_name?: string | null;
}

interface StageInfo {
  label: string;
  color: string;
}

interface ClientsListMobileProps {
  clients: Client[];
  getStageInfo: (stage: string) => StageInfo;
  onClientClick: (clientId: string) => void;
  onCreateClick: () => void;
  // Pagination props
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
}

const ClientsListMobile = ({
  clients,
  getStageInfo,
  onClientClick,
  onCreateClick,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  canGoPrev,
  canGoNext,
  onPrevPage,
  onNextPage,
  onGoToPage,
}: ClientsListMobileProps) => {
  if (clients.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 rounded-xl border border-white/10 bg-white/5"
      >
        <Building2 className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/40 text-sm mb-2">No hay clientes</p>
        <Button
          variant="link"
          onClick={onCreateClick}
          className="text-white/60 hover:text-white text-sm touch-target"
        >
          Crear el primero
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {clients.map((client, index) => {
        const stageInfo = getStageInfo(client.lead_stage);
        return (
          <motion.button
            key={client.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => onClientClick(client.id)}
            className="w-full p-2.5 bg-card border border-border rounded-lg active:bg-secondary transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[11px] font-semibold text-foreground truncate">
                  {client.company_name}
                </p>
                <Badge 
                  variant="outline" 
                  className={`${stageInfo.color} text-[9px] px-1.5 py-0.5 shrink-0 border`}
                >
                  {stageInfo.label}
                </Badge>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {client.client_number && (
                    <span className="font-mono">#{client.client_number}</span>
                  )}
                  {client.tax_id && (
                    <>
                      {client.client_number && <span>•</span>}
                      <span className="font-mono">CIF: {client.tax_id}</span>
                    </>
                  )}
                </div>
                {client.assigned_to_name && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{client.assigned_to_name}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.button>
        );
      })}
      
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={totalItems}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onGoToPage={onGoToPage}
      />
    </div>
  );
};

export default ClientsListMobile;
