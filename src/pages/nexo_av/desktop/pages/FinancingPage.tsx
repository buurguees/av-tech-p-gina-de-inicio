import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreditCard, ChevronDown, FileText, AlertCircle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../components/common/PaginationControls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DataList from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activo" },
  { value: "COMPLETED", label: "Completado" },
  { value: "DEFAULT", label: "Impago" },
];

interface CreditOperation {
  id: string;
  provider_name: string | null;
  contract_reference: string | null;
  gross_amount: number;
  num_installments: number;
  total_paid: number;
  total_pending: number;
  next_due_date: string | null;
  status: string;
  accounting_code: string | null;
}

const FinancingPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<CreditOperation[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchOperations();
  }, [statusFilter]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("credit_list_operations", {
        p_status: statusFilter === "all" ? null : statusFilter,
      });
      if (error) throw error;
      setOperations((data as CreditOperation[]) || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar las operaciones de crédito";
      console.error("Error fetching credit operations:", error);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setOperations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date: string | null) =>
    date
      ? new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "-";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredBySearch = operations.filter((op) => {
    if (!searchInput.trim()) return true;
    const q = searchInput.toLowerCase();
    const provider = (op.provider_name ?? "").toLowerCase();
    const ref = (op.contract_reference ?? "").toLowerCase();
    const code = (op.accounting_code ?? "").toLowerCase();
    return provider.includes(q) || ref.includes(q) || code.includes(q);
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedOperations,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredBySearch, { pageSize: 50 });

  const totalPending = operations.reduce((sum, op) => sum + (op.total_pending ?? 0), 0);
  const overdueCount = operations.filter(
    (op) =>
      op.status !== "COMPLETED" &&
      op.next_due_date &&
      new Date(op.next_due_date) < today
  ).length;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "COMPLETED":
        return "bg-zinc-500/20 text-zinc-300 border-zinc-500/40";
      case "DEFAULT":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/40";
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6">
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 flex-shrink-0">
            <div className="border rounded-lg p-2 flex flex-col justify-between bg-zinc-900/50 border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-emerald-500/10 rounded text-emerald-500">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="text-white/60 text-[9px] px-1.5 py-0.5 font-medium">Operaciones</span>
              </div>
              <span className="text-base font-bold text-white">{operations.length}</span>
            </div>
            <div className="border rounded-lg p-2 flex flex-col justify-between bg-zinc-900/50 border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-amber-500/10 rounded text-amber-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-white/60 text-[9px] px-1.5 py-0.5 font-medium">Pendiente</span>
              </div>
              <span className="text-base font-bold text-white">{formatCurrency(totalPending)}</span>
            </div>
            <div className="border rounded-lg p-2 flex flex-col justify-between bg-zinc-900/50 border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-500/10 rounded text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-white/60 text-[9px] px-1.5 py-0.5 font-medium">Vencidas</span>
              </div>
              <span className="text-base font-bold text-red-500">{overdueCount}</span>
            </div>
          </div>

          <div className="mb-4 flex-shrink-0">
            <DetailNavigationBar
              pageTitle="Financiación / Crédito"
              contextInfo={
                <SearchBar
                  value={searchInput}
                  onChange={setSearchInput}
                  items={operations}
                  getSearchText={(op) =>
                    `${op.provider_name ?? ""} ${op.contract_reference ?? ""} ${op.accounting_code ?? ""}`.trim()
                  }
                  renderResult={(op) => ({
                    id: op.id,
                    label: op.contract_reference || op.provider_name || "Sin referencia",
                    subtitle: `${op.provider_name ?? "—"} · ${formatCurrency(op.gross_amount)}`,
                    icon: <CreditCard className="h-4 w-4" />,
                    data: op,
                  })}
                  onSelectResult={(result) =>
                    navigate(`/nexo-av/${userId}/financing/${result.data.id}`)
                  }
                  placeholder="Buscar operaciones..."
                  maxResults={8}
                  debounceMs={300}
                />
              }
            />
          </div>

          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-8 px-3 text-xs", statusFilter !== "all" && "bg-accent")}
                >
                  {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label ?? "Estado"}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={cn(statusFilter === opt.value && "bg-accent")}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-muted-foreground ml-2">
              {filteredBySearch.length} operación{filteredBySearch.length !== 1 ? "es" : ""}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <DataList
              data={paginatedOperations}
              columns={[
                {
                  key: "provider_name",
                  label: "Proveedor",
                  align: "left",
                  priority: 1,
                  render: (op) => (
                    <span className="text-foreground font-medium truncate block max-w-[180px]">
                      {op.provider_name ?? "-"}
                    </span>
                  ),
                },
                {
                  key: "contract_reference",
                  label: "Referencia",
                  align: "left",
                  priority: 2,
                  render: (op) => (
                    <span className="text-foreground/80 font-mono text-sm">
                      {op.contract_reference ?? "-"}
                    </span>
                  ),
                },
                {
                  key: "gross_amount",
                  label: "Importe Total",
                  align: "right",
                  priority: 3,
                  render: (op) => <span className="text-foreground">{formatCurrency(op.gross_amount)}</span>,
                },
                {
                  key: "num_installments",
                  label: "Cuotas",
                  align: "center",
                  priority: 4,
                  render: (op) => <span className="text-muted-foreground">{op.num_installments ?? "-"}</span>,
                },
                {
                  key: "total_paid",
                  label: "Pagado",
                  align: "right",
                  priority: 5,
                  render: (op) => (
                    <span className="text-muted-foreground">{formatCurrency(op.total_paid ?? 0)}</span>
                  ),
                },
                {
                  key: "total_pending",
                  label: "Pendiente",
                  align: "right",
                  priority: 5,
                  render: (op) => (
                    <span className="text-foreground">{formatCurrency(op.total_pending ?? 0)}</span>
                  ),
                },
                {
                  key: "next_due_date",
                  label: "Próx. vencimiento",
                  align: "left",
                  priority: 6,
                  render: (op) => (
                    <span className="text-muted-foreground">{formatDate(op.next_due_date)}</span>
                  ),
                },
                {
                  key: "status",
                  label: "Estado",
                  align: "center",
                  priority: 2,
                  render: (op) => (
                    <div className="flex justify-center">
                      <Badge
                        variant="outline"
                        className={cn("border", getStatusBadgeClass(op.status))}
                      >
                        {op.status === "ACTIVE"
                          ? "Activo"
                          : op.status === "COMPLETED"
                            ? "Completado"
                            : op.status === "DEFAULT"
                              ? "Impago"
                              : op.status}
                      </Badge>
                    </div>
                  ),
                },
                {
                  key: "accounting_code",
                  label: "Código contable",
                  align: "left",
                  priority: 7,
                  render: (op) => (
                    <span className="text-muted-foreground font-mono text-xs">
                      {op.accounting_code ?? "-"}
                    </span>
                  ),
                },
              ]}
              onItemClick={(op) => navigate(`/nexo-av/${userId}/financing/${op.id}`)}
              loading={loading}
              emptyMessage="No hay operaciones de crédito"
              emptyIcon={<CreditCard className="h-16 w-16 text-muted-foreground" />}
              getItemId={(op) => op.id}
            />
          </div>

          {!loading && filteredBySearch.length > 0 && totalPages > 1 && (
            <div className="flex-shrink-0 mt-4">
              <PaginationControls
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancingPageDesktop;
