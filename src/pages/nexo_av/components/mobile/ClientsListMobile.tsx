import { motion } from "framer-motion";
import { Building2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginationControls from "../PaginationControls";

interface Client {
  id: string;
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
    <div className="space-y-3">
      {clients.map((client, index) => {
        const stageInfo = getStageInfo(client.lead_stage);
        return (
          <motion.button
            key={client.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => onClientClick(client.id)}
            className="w-full p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 text-left backdrop-blur-sm active:scale-[0.98] shadow-sm nexo-card-mobile"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm mb-1 truncate">
                  {client.company_name}
                </h3>
                {client.assigned_to_name && (
                  <p className="text-white/40 text-xs truncate">
                    {client.assigned_to_name}
                  </p>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={`${stageInfo.color} border text-xs px-2.5 py-1 shrink-0`}
              >
                {stageInfo.label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
              {client.contact_phone && (
                <div className="flex items-center gap-1.5 text-white/50 text-xs">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="truncate">{client.contact_phone}</span>
                </div>
              )}
              {client.contact_email && (
                <div className="flex items-center gap-1.5 text-white/50 text-xs">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[120px]">{client.contact_email}</span>
                </div>
              )}
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
