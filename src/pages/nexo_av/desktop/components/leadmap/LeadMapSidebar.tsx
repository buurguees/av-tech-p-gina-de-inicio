import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STAGE_COLORS, LEAD_STAGE_LABELS } from "../../../constants/leadStages";
import type { CanvassingLocation as LeadClient } from "../../pages/LeadMapPage";
import { MapPin, Users, Mail, Phone } from "lucide-react";

interface LeadStats {
  [key: string]: any;
}

interface LeadMapSidebarProps {
  stats: LeadStats[];
  clients: LeadClient[];
  onClientSelect: (client: LeadClient) => void;
}

const LeadMapSidebar = ({ stats, clients, onClientSelect }: LeadMapSidebarProps) => {
  // Show all clients, sorted by company name
  const allClients = [...clients].sort((a, b) => 
    a.company_name.localeCompare(b.company_name)
  );

  const totalLeads = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="h-full w-full flex flex-col gap-4">
      {/* Stats */}
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Leads por Estado</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {stats.map((stat) => (
              <div key={stat.lead_stage} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: LEAD_STAGE_COLORS[stat.lead_stage] }}
                  />
                  <span className="text-sm">{LEAD_STAGE_LABELS[stat.lead_stage]}</span>
                </div>
                <span className="text-sm font-medium">{stat.count}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between font-medium">
                <span className="text-sm">Total</span>
                <span className="text-sm">{totalLeads}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients list */}
      <Card className="flex-1 flex flex-col min-h-0 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users size={14} />
            Listado de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {allClients.map((client) => (
                <button
                  key={client.id}
                  className="w-full text-left p-3 rounded-md hover:bg-secondary transition-colors border border-border/50 shadow-none"
                  onClick={() => onClientSelect(client)}
                >
                  {/* Nombre Comercial y Estado */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-medium text-sm flex-1 min-w-0 truncate">{client.company_name}</p>
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: LEAD_STAGE_COLORS[client.lead_stage] }}
                      title={LEAD_STAGE_LABELS[client.lead_stage]}
                    />
                  </div>
                  
                  {/* Ubicación */}
                  {client.full_address && (
                    <div className="flex items-start gap-1.5 mb-1.5">
                      <MapPin size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                        {client.full_address}
                      </p>
                    </div>
                  )}
                  
                  {/* Email */}
                  {client.contact_email && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Mail size={12} className="text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">
                        {client.contact_email}
                      </p>
                    </div>
                  )}
                  
                  {/* Teléfono */}
                  {client.contact_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        {client.contact_phone}
                      </p>
                    </div>
                  )}
                </button>
              ))}
              {allClients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay clientes
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadMapSidebar;
