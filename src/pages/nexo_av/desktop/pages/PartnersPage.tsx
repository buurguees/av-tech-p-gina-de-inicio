import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Users, Loader2, Receipt, TrendingUp, Search } from "lucide-react";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import PaginationControls from "../components/common/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import CreatePartnerDialog from "../components/rrhh/CreatePartnerDialog";

interface Partner {
  id: string;
  partner_number: string;
  full_name: string;
  tax_id: string | null;
  status: string;
  created_at: string;
}

interface PartnerStats {
  total_partners: number;
  total_gross_ytd: number;
  total_irpf_ytd: number;
  total_net_ytd: number;
}

function PartnersPage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  useNexoAvTheme();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [stats, setStats] = useState<PartnerStats>({
    total_partners: 0,
    total_gross_ytd: 0,
    total_irpf_ytd: 0,
    total_net_ytd: 0,
  });

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_partners", {
        p_status: "ACTIVE",
      });

      if (error) throw error;
      setPartners(data || []);
      setStats(prev => ({ ...prev, total_partners: (data || []).length }));

      // Fetch YTD stats from compensations
      const currentYear = new Date().getFullYear();
      const { data: comps } = await supabase.rpc("list_partner_compensation_runs", {
        p_period_year: currentYear,
      });

      if (comps) {
        const totals = comps.reduce((acc: any, c: any) => ({
          total_gross_ytd: acc.total_gross_ytd + (c.gross_amount || 0),
          total_irpf_ytd: acc.total_irpf_ytd + (c.irpf_amount || 0),
          total_net_ytd: acc.total_net_ytd + (c.net_amount || 0),
        }), { total_gross_ytd: 0, total_irpf_ytd: 0, total_net_ytd: 0 });

        setStats(prev => ({ ...prev, ...totals }));
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const filteredPartners = useMemo(() => {
    if (!searchTerm) return partners;
    const term = searchTerm.toLowerCase();
    return partners.filter(p =>
      p.full_name.toLowerCase().includes(term) ||
      p.partner_number.toLowerCase().includes(term) ||
      (p.tax_id && p.tax_id.toLowerCase().includes(term))
    );
  }, [partners, searchTerm]);

  const pagination = usePagination(filteredPartners, { pageSize: 10 });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Socios</h1>
          <p className="text-muted-foreground text-sm">
            Gestión de socios y retribuciones variables
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Socio
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Socios Activos</p>
                <p className="text-xl font-bold">{stats.total_partners}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bruto YTD</p>
                <p className="text-xl font-bold">{formatCurrency(stats.total_gross_ytd)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Receipt className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IRPF YTD</p>
                <p className="text-xl font-bold">{formatCurrency(stats.total_irpf_ytd)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Neto YTD</p>
                <p className="text-xl font-bold">{formatCurrency(stats.total_net_ytd)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, número o NIF..."
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Listado de Socios ({filteredPartners.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Nº</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Nombre</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">NIF</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedData.map((partner) => (
                  <tr
                    key={partner.id}
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/nexo-av/${userId}/partners/${partner.id}`)}
                  >
                    <td className="py-3 px-4 text-sm font-mono">{partner.partner_number}</td>
                    <td className="py-3 px-4 text-sm font-medium">{partner.full_name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{partner.tax_id || "-"}</td>
                    <td className="py-3 px-4">
                      {partner.status === "ACTIVE" ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {pagination.paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No hay socios registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                totalItems={pagination.totalItems}
                canGoPrev={pagination.canGoPrev}
                canGoNext={pagination.canGoNext}
                onPrevPage={pagination.prevPage}
                onNextPage={pagination.nextPage}
                onGoToPage={pagination.goToPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreatePartnerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchPartners}
      />
    </div>
  );
}

export default PartnersPage;
