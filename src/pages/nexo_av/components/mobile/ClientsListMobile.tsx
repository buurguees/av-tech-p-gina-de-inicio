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
            className="w-full p-3 bg-white border-b border-gray-200 active:bg-gray-50 transition-colors text-left min-h-[70px] max-h-[80px]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {client.company_name}
                </h3>
                {client.assigned_to_name && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {client.assigned_to_name}
                  </p>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={`${stageInfo.color} border text-xs px-2 py-0.5 shrink-0 ml-2`}
              >
                {stageInfo.label}
              </Badge>
            </div>
            {client.contact_phone && (
              <div className="flex items-center mt-2">
                <a 
                  href={`tel:${client.contact_phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 flex items-center"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  {client.contact_phone}
                </a>
              </div>
            )}
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
