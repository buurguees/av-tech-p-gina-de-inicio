import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadClient, LeadStats, LEAD_STAGE_COLORS, LEAD_STAGE_LABELS } from "../../LeadMapPage";
import { MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface LeadMapSidebarProps {
  stats: LeadStats[];
  clients: LeadClient[];
  onClientSelect: (client: LeadClient) => void;
}

const LeadMapSidebar = ({ stats, clients, onClientSelect }: LeadMapSidebarProps) => {
  // Get recent leads (last 5)
  const recentLeads = [...clients]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const totalLeads = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Stats */}
      <Card>
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

      {/* Recent leads */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock size={14} />
            Leads Recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {recentLeads.map((client) => (
                <button
                  key={client.id}
                  className="w-full text-left p-2 rounded-md hover:bg-secondary transition-colors"
                  onClick={() => onClientSelect(client)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{client.company_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.full_address || "Sin ubicación"}
                      </p>
                    </div>
                    <div 
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: LEAD_STAGE_COLORS[client.lead_stage] }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(client.created_at), "d MMM yyyy", { locale: es })}
                  </p>
                </button>
              ))}
              {recentLeads.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay leads recientes
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
