import { motion } from "framer-motion";
import { Building2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginationControls from "../PaginationControls";

interface Client {
  id: string;
  client_number: string | null;
  company_name: string;
  contact_phone: string;
  contact_email: string;
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[11px] font-semibold text-foreground truncate">
                    {client.company_name}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={`${stageInfo.color} text-[10px] px-1.5 py-0 shrink-0`}
                  >
                    {stageInfo.label}
                  </Badge>
                </div>
                {client.contact_phone && (
                  <a 
                    href={`tel:${client.contact_phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-primary flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {client.contact_phone}
                  </a>
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
