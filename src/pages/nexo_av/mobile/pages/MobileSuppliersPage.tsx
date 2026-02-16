import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Truck,
  Loader2,
  Search,
  ChevronRight,
  Users,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { getCategoryInfo, getSupplierStatusInfo } from "@/constants/supplierConstants";

interface Supplier {
  id: string;
  company_name: string;
  supplier_number: string;
  category: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  total_count: number;
}

const MobileSuppliersPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [stats, setStats] = useState({ total: 0, active: 0 });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_suppliers", {
        p_search: debouncedSearch || null,
        p_status: null,
        p_category: null,
        p_page: 1,
        p_page_size: 200,
      });
      if (error) throw error;
      const list = ((data || []) as unknown) as Supplier[];
      setSuppliers(list);

      const active = list.filter((s) => s.status === "ACTIVE").length;
      setStats({ total: list.length, active });
    } catch (e) {
      console.error("Error fetching suppliers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [debouncedSearch]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header: KPIs + Search */}
      <div
        className="flex-shrink-0 py-3 px-3 w-full"
        style={{ background: "linear-gradient(0deg, rgba(0,0,0,1) 100%, rgba(255,255,255,0) 0%)", height: "fit-content" }}
      >
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg text-foreground font-semibold">{stats.total}</span>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg text-foreground font-semibold">{stats.active}</span>
              <p className="text-[10px] text-muted-foreground">Activos</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar proveedores..."
              className="pl-9 h-8 bg-card border-border text-sm"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-3 pb-[80px] w-full h-full px-[15px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Truck className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay proveedores</p>
            <p className="text-muted-foreground text-sm">
              {searchInput ? "Prueba con otra búsqueda" : "Aún no se han registrado proveedores"}
            </p>
          </div>
        ) : (
          suppliers.map((sup) => {
            const catInfo = getCategoryInfo(sup.category);
            const statusInfo = getSupplierStatusInfo(sup.status);

            return (
              <button
                key={sup.id}
                onClick={() => navigate(`/nexo-av/${userId}/suppliers/${sup.id}`)}
                className={cn(
                  "w-full text-left p-4 rounded-xl",
                  "bg-card border border-border",
                  "active:scale-[0.98] transition-all duration-200",
                  "hover:border-primary/30"
                )}
                style={{ touchAction: "manipulation" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-muted-foreground">
                        {sup.supplier_number}
                      </span>
                      {catInfo && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", catInfo.bgColor, catInfo.color)}>
                          {catInfo.label}
                        </Badge>
                      )}
                      <span className={cn("h-2 w-2 rounded-full", statusInfo.dotColor)} />
                    </div>

                    <h3 className="font-medium text-foreground truncate mb-1">
                      {sup.company_name}
                    </h3>

                    <div className="flex items-center gap-3 mt-1">
                      {sup.city && (
                        <span className="text-xs text-muted-foreground/70">
                          📍 {sup.city}
                        </span>
                      )}
                      {sup.phone && (
                        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {sup.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-2" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MobileSuppliersPage;
