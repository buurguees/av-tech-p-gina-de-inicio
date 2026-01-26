import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Users, Loader2, Receipt, TrendingUp, Search } from "lucide-react";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import CreatePartnerDialog from "../components/rrhh/CreatePartnerDialog";
import PartnerCard from "../components/rrhh/PartnerCard";

interface Partner {
  id: string;
  partner_number: string;
  full_name: string;
  tax_id: string | null;
  email?: string | null;
  phone?: string | null;
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
    <div className="w-full h-full flex flex-col p-6 gap-6 overflow-y-auto">
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
              <div className="p-2 rounded-lg bg-chart-2/10">
                <TrendingUp className="w-5 h-5 text-chart-2" />
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
              <div className="p-2 rounded-lg bg-chart-3/10">
                <Receipt className="w-5 h-5 text-chart-3" />
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
              <div className="p-2 rounded-lg bg-chart-1/10">
                <TrendingUp className="w-5 h-5 text-chart-1" />
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

      {/* Partners Grid */}
      <div className="flex-1">
        <p className="text-sm text-muted-foreground mb-4">
          {filteredPartners.length} socio{filteredPartners.length !== 1 ? "s" : ""} encontrado{filteredPartners.length !== 1 ? "s" : ""}
        </p>
        
        {filteredPartners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPartners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        ) : (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay socios registrados</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear primer socio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

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
