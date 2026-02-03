import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Users,
  Building2,
  Wallet,
  Receipt,
  CreditCard,
  Loader2,
  TrendingUp,
  TrendingDown,
  UserCog,
  FileText,
  ChevronRight,
  Package,
  Briefcase,
  Wrench,
  Car,
  Home,
  Plug,
  MoreHorizontal,
  UtensilsCrossed,
  Fuel,
  Route,
  CircleParking,
  Bus,
  FileWarning,
} from "lucide-react";

interface BalanceSheetItem {
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
  net_balance: number;
}

interface ClientBalance {
  client_id: string;
  client_number: string;
  client_name: string;
  debit_balance: number;
  credit_balance: number;
  net_balance: number;
}

interface SupplierTechnicianBalance {
  third_party_id: string;
  third_party_type: string;
  third_party_number: string;
  third_party_name: string;
  account_code: string;
  debit_balance: number;
  credit_balance: number;
  net_balance: number;
}

interface ExpenseByCategory {
  category: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  total: number;
  count: number;
  color: string;
}

interface SalesByCategory {
  category_id: string;
  category_name: string;
  category_code: string;
  category_type: string;
  invoice_count: number;
  line_count: number;
  total_subtotal: number;
  total_tax: number;
  total_amount: number;
}

interface ChartOfAccountsTabProps {
  balanceDate: string;
  periodStart?: string;
  periodEnd?: string;
  onNavigateToClient?: (clientId: string) => void;
  onNavigateToSupplier?: (supplierId: string) => void;
  onNavigateToTechnician?: (technicianId: string) => void;
}

// Mapeo de categorías de gasto (facturas de compra + tipos de gasto de tickets)
const EXPENSE_CATEGORY_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  // Facturas de compra
  MATERIAL: { label: "Material", icon: Wrench, color: "text-green-600" },
  SERVICE: { label: "Servicios", icon: Briefcase, color: "text-purple-600" },
  SOFTWARE: { label: "Software", icon: Package, color: "text-blue-600" },
  EXTERNAL_SERVICES: { label: "Servicios Externos", icon: Briefcase, color: "text-purple-500" },
  TRAVEL: { label: "Viajes", icon: Car, color: "text-orange-600" },
  RENT: { label: "Alquiler", icon: Home, color: "text-teal-600" },
  UTILITIES: { label: "Suministros", icon: Plug, color: "text-yellow-600" },
  // Tipos de gasto (tickets)
  DIET: { label: "Dieta", icon: UtensilsCrossed, color: "text-amber-600" },
  FUEL: { label: "Gasolina", icon: Fuel, color: "text-orange-700" },
  TOLL: { label: "Peajes", icon: Route, color: "text-slate-600" },
  PARKING: { label: "Parking", icon: CircleParking, color: "text-indigo-600" },
  TRANSPORT: { label: "Transporte", icon: Bus, color: "text-cyan-600" },
  ACCOMMODATION: { label: "Alojamiento", icon: Building2, color: "text-rose-600" },
  MULTA: { label: "Multa", icon: FileWarning, color: "text-red-600" },
  OTHER: { label: "Otros", icon: MoreHorizontal, color: "text-gray-600" },
};

// Iconos por tipo de categoría de venta
const getSalesCategoryIcon = (categoryType: string, categoryCode: string) => {
  if (categoryType === "service") return Briefcase;
  // Mapear por código de categoría si es necesario
  const codeUpper = categoryCode.toUpperCase();
  if (codeUpper.includes("AUD") || codeUpper.includes("AUDIO")) return Package;
  if (codeUpper.includes("LED") || codeUpper.includes("SCREEN")) return Package;
  if (codeUpper.includes("INST") || codeUpper.includes("INSTALLATION")) return Wrench;
  return Package;
};

const getSalesCategoryColor = (categoryType: string, index: number) => {
  if (categoryType === "service") return "text-purple-600";
  const colors = ["text-blue-600", "text-green-600", "text-orange-600", "text-teal-600", "text-rose-600"];
  return colors[index % colors.length];
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const ChartOfAccountsTab = ({
  balanceDate,
  periodStart,
  periodEnd,
  onNavigateToClient,
  onNavigateToSupplier,
  onNavigateToTechnician,
}: ChartOfAccountsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetItem[]>([]);
  const [clientBalances, setClientBalances] = useState<ClientBalance[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<SupplierTechnicianBalance[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategory[]>([]);

  useEffect(() => {
    fetchAllData();
  }, [balanceDate, periodStart, periodEnd]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [balanceRes, clientsRes, suppliersRes, purchasesRes, salesRes] = await Promise.all([
        supabase.rpc("get_balance_sheet", { p_as_of_date: balanceDate }),
        supabase.rpc("get_client_balances", { p_as_of_date: balanceDate }),
        supabase.rpc("get_supplier_technician_balances", { p_as_of_date: balanceDate }),
        supabase.rpc("list_purchase_invoices", {
          p_search: null,
          p_status: "APPROVED",
          p_supplier_id: null,
          p_technician_id: null,
          p_document_type: null,
          p_project_id: null,
          p_page: 1,
          p_page_size: 10000,
        }),
        supabase.rpc("get_sales_by_product_category", {
          p_period_start: periodStart || null,
          p_period_end: periodEnd || null,
          p_status: "ISSUED",
        }),
      ]);

      if (balanceRes.error) throw balanceRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (purchasesRes.error) throw purchasesRes.error;
      if (salesRes.error) throw salesRes.error;

      setBalanceSheet(balanceRes.data || []);
      setClientBalances(clientsRes.data || []);
      setSupplierBalances(suppliersRes.data || []);
      setSalesByCategory((salesRes.data || []) as SalesByCategory[]);

      // Agrupar facturas de compra por categoría de gasto
      const purchases = purchasesRes.data || [];
      const categoryTotals: Record<string, { total: number; count: number }> = {};

      // Filtrar por período si está definido
      const filteredPurchases = purchases.filter((p: any) => {
        if (!periodStart || !periodEnd) return true;
        const issueDate = new Date(p.issue_date);
        return issueDate >= new Date(periodStart) && issueDate <= new Date(periodEnd);
      });

      filteredPurchases.forEach((purchase: any) => {
        const category = purchase.expense_category || "OTHER";
        if (!categoryTotals[category]) {
          categoryTotals[category] = { total: 0, count: 0 };
        }
        categoryTotals[category].total += purchase.total || 0;
        categoryTotals[category].count += 1;
      });

      // Convertir a array con configuración de categorías
      const expensesArray: ExpenseByCategory[] = Object.entries(categoryTotals)
        .map(([category, data]) => {
          const config = EXPENSE_CATEGORY_CONFIG[category] || EXPENSE_CATEGORY_CONFIG.OTHER;
          return {
            category,
            label: config.label,
            icon: config.icon,
            total: data.total,
            count: data.count,
            color: config.color,
          };
        })
        .sort((a, b) => b.total - a.total);

      setExpensesByCategory(expensesArray);
    } catch (error) {
      console.error("Error fetching chart of accounts data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group balances by account category
  const getAccountsByPrefix = (prefix: string) => {
    return balanceSheet.filter((item) => item.account_code.startsWith(prefix));
  };

  const suppliers = supplierBalances.filter((s) => s.third_party_type === "SUPPLIER");
  const technicians = supplierBalances.filter((s) => s.third_party_type === "TECHNICIAN");

  // Calculate totals
  const totalClients = clientBalances.reduce((sum, c) => sum + c.net_balance, 0);
  const totalSuppliers = suppliers.reduce((sum, s) => sum + s.net_balance, 0);
  const totalTechnicians = technicians.reduce((sum, t) => sum + t.net_balance, 0);
  const totalBanks = getAccountsByPrefix("572").reduce((sum, a) => sum + a.net_balance, 0);
  const totalVATReceived = getAccountsByPrefix("477").reduce((sum, a) => sum + a.net_balance, 0);
  const totalVATPaid = getAccountsByPrefix("472").reduce((sum, a) => sum + a.net_balance, 0);
  const totalRevenue = getAccountsByPrefix("7").reduce((sum, a) => sum + a.net_balance, 0);
  const totalExpenses = getAccountsByPrefix("6").reduce((sum, a) => sum + Math.abs(a.net_balance), 0);
  const totalExpensesByCategory = expensesByCategory.reduce((sum, e) => sum + e.total, 0);
  const totalSalesByCategory = salesByCategory.reduce((sum, s) => sum + s.total_subtotal, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clientes (430)</p>
                <p className={`text-lg font-bold ${totalClients >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totalClients)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Building2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Proveedores (400)</p>
                <p className={`text-lg font-bold ${totalSuppliers >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(Math.abs(totalSuppliers))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <UserCog className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Técnicos (410)</p>
                <p className={`text-lg font-bold ${totalTechnicians >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(Math.abs(totalTechnicians))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tesorería (572)</p>
                <p className={`text-lg font-bold ${totalBanks >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totalBanks)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accordion Sections */}
      <Accordion type="multiple" defaultValue={["clients", "suppliers", "technicians", "banks", "taxes"]} className="space-y-4">
        {/* CLIENTES (430) */}
        <AccordionItem value="clients" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/70 [&[data-state=open]]:bg-muted">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <span className="font-semibold">Clientes - Cuenta 430</span>
              <Badge variant="secondary" className="ml-2">
                {clientBalances.length} registros
              </Badge>
              <span className={`ml-auto mr-4 font-bold ${totalClients >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(totalClients)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[120px]">Subcuenta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientBalances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No hay saldos de clientes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  clientBalances.map((client) => (
                    <TableRow key={client.client_id}>
                      <TableCell className="font-mono text-sm">430-{client.client_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.client_name}</p>
                          <p className="text-xs text-muted-foreground">{client.client_number}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(client.debit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.credit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${client.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(client.net_balance)}
                      </TableCell>
                      <TableCell>
                        {onNavigateToClient && (
                          <Button variant="ghost" size="sm" onClick={() => onNavigateToClient(client.client_id)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        {/* PROVEEDORES (400) */}
        <AccordionItem value="suppliers" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/70 [&[data-state=open]]:bg-muted">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-red-600" />
              <span className="font-semibold">Proveedores - Cuenta 400</span>
              <Badge variant="secondary" className="ml-2">
                {suppliers.length} registros
              </Badge>
              <span className={`ml-auto mr-4 font-bold ${totalSuppliers >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(totalSuppliers))}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[120px]">Subcuenta</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No hay saldos de proveedores registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.third_party_id}>
                      <TableCell className="font-mono text-sm">{supplier.account_code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{supplier.third_party_name}</p>
                          <p className="text-xs text-muted-foreground">{supplier.third_party_number}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(supplier.debit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(supplier.credit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${supplier.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(supplier.net_balance)}
                      </TableCell>
                      <TableCell>
                        {onNavigateToSupplier && (
                          <Button variant="ghost" size="sm" onClick={() => onNavigateToSupplier(supplier.third_party_id)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        {/* TÉCNICOS (410) */}
        <AccordionItem value="technicians" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/70 [&[data-state=open]]:bg-muted">
            <div className="flex items-center gap-3">
              <UserCog className="h-5 w-5 text-orange-600" />
              <span className="font-semibold">Técnicos - Cuenta 410</span>
              <Badge variant="secondary" className="ml-2">
                {technicians.length} registros
              </Badge>
              <span className={`ml-auto mr-4 font-bold ${totalTechnicians >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(totalTechnicians))}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[120px]">Subcuenta</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicians.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No hay saldos de técnicos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  technicians.map((technician) => (
                    <TableRow key={technician.third_party_id}>
                      <TableCell className="font-mono text-sm">{technician.account_code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{technician.third_party_name}</p>
                          <p className="text-xs text-muted-foreground">{technician.third_party_number}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(technician.debit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(technician.credit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${technician.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(technician.net_balance)}
                      </TableCell>
                      <TableCell>
                        {onNavigateToTechnician && (
                          <Button variant="ghost" size="sm" onClick={() => onNavigateToTechnician(technician.third_party_id)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        {/* TESORERÍA (572) */}
        <AccordionItem value="banks" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/70 [&[data-state=open]]:bg-muted">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Tesorería - Cuenta 572</span>
              <Badge variant="secondary" className="ml-2">
                {getAccountsByPrefix("572").length} cuentas
              </Badge>
              <span className={`ml-auto mr-4 font-bold ${totalBanks >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(totalBanks)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[120px]">Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getAccountsByPrefix("572").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No hay cuentas bancarias con movimientos
                    </TableCell>
                  </TableRow>
                ) : (
                  getAccountsByPrefix("572").map((account) => (
                    <TableRow key={account.account_code}>
                      <TableCell className="font-mono text-sm">{account.account_code}</TableCell>
                      <TableCell className="font-medium">{account.account_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.debit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.credit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${account.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(account.net_balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        {/* IMPUESTOS (47x) */}
        <AccordionItem value="taxes" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/70 [&[data-state=open]]:bg-muted">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-purple-600" />
              <span className="font-semibold">Impuestos - Cuentas 47x</span>
              <Badge variant="secondary" className="ml-2">
                {getAccountsByPrefix("47").length} cuentas
              </Badge>
              <span className={`ml-auto mr-4 font-bold ${(totalVATReceived + totalVATPaid) >= 0 ? "text-green-600" : "text-red-600"}`}>
                IVA Neto: {formatCurrency(totalVATReceived + totalVATPaid)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            <div className="p-4 border-b bg-muted/20 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">IVA Repercutido (477):</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalVATReceived)}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm text-muted-foreground">IVA Soportado (472):</span>
                <span className="font-semibold text-red-600">{formatCurrency(Math.abs(totalVATPaid))}</span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[120px]">Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getAccountsByPrefix("47").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No hay cuentas de impuestos con movimientos
                    </TableCell>
                  </TableRow>
                ) : (
                  getAccountsByPrefix("47").map((account) => (
                    <TableRow key={account.account_code}>
                      <TableCell className="font-mono text-sm">{account.account_code}</TableCell>
                      <TableCell className="font-medium">{account.account_name}</TableCell>
                      <TableCell>
                        <Badge variant={account.account_code.startsWith("477") ? "default" : "secondary"}>
                          {account.account_code.startsWith("477") ? "Repercutido" : "Soportado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(account.debit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.credit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${account.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(account.net_balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        {/* INGRESOS (7xx) */}
        <AccordionItem value="revenue" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/70 [&[data-state=open]]:bg-muted">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold">Ingresos - Cuentas 7xx</span>
              <Badge variant="secondary" className="ml-2">
                {getAccountsByPrefix("7").length} cuentas
              </Badge>
              <span className="ml-auto mr-4 font-bold text-green-600">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[120px]">Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getAccountsByPrefix("7").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No hay cuentas de ingresos con movimientos
                    </TableCell>
                  </TableRow>
                ) : (
                  getAccountsByPrefix("7").map((account) => (
                    <TableRow key={account.account_code}>
                      <TableCell className="font-mono text-sm">{account.account_code}</TableCell>
                      <TableCell className="font-medium">{account.account_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.debit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.credit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${account.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(account.net_balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        {/* VENTAS POR CATEGORÍA DE PRODUCTO */}
        <AccordionItem value="sales-by-category" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/70 [&[data-state=open]]:bg-muted">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold">Ventas por Categoría</span>
              <Badge variant="secondary" className="ml-2">
                {salesByCategory.length} categorías
              </Badge>
              <span className="ml-auto mr-4 font-bold text-green-600">
                {formatCurrency(totalSalesByCategory)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            {/* Summary cards for sales categories */}
            <div className="p-4 border-b bg-muted/20 grid grid-cols-2 md:grid-cols-4 gap-3">
              {salesByCategory.slice(0, 4).map((sale, index) => {
                const IconComponent = getSalesCategoryIcon(sale.category_type, sale.category_code);
                const color = getSalesCategoryColor(sale.category_type, index);
                return (
                  <div key={sale.category_id} className="flex items-center gap-2 p-2 rounded-lg bg-background border">
                    <IconComponent className={`h-4 w-4 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{sale.category_name}</p>
                      <p className="text-sm font-semibold">{formatCurrency(sale.total_subtotal)}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{sale.invoice_count}</Badge>
                  </div>
                );
              })}
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[60px]"></TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Facturas</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByCategory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      No hay facturas de venta emitidas en el período
                    </TableCell>
                  </TableRow>
                ) : (
                  salesByCategory.map((sale, index) => {
                    const IconComponent = getSalesCategoryIcon(sale.category_type, sale.category_code);
                    const color = getSalesCategoryColor(sale.category_type, index);
                    return (
                      <TableRow key={sale.category_id}>
                        <TableCell>
                          <div className="p-2 rounded-lg bg-muted inline-flex">
                            <IconComponent className={`h-4 w-4 ${color}`} />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{sale.category_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={sale.category_type === "service" ? "default" : "secondary"}>
                            {sale.category_type === "service" ? "Servicio" : "Producto"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{sale.invoice_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.total_subtotal)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(sale.total_tax)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(sale.total_amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        {/* GASTOS (6xx) */}
        <AccordionItem value="expenses" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/70 [&[data-state=open]]:bg-muted">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-rose-600" />
              <span className="font-semibold">Gastos - Cuentas 6xx</span>
              <Badge variant="secondary" className="ml-2">
                {getAccountsByPrefix("6").length} cuentas
              </Badge>
              <span className="ml-auto mr-4 font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[120px]">Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getAccountsByPrefix("6").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No hay cuentas de gastos con movimientos
                    </TableCell>
                  </TableRow>
                ) : (
                  getAccountsByPrefix("6").map((account) => (
                    <TableRow key={account.account_code}>
                      <TableCell className="font-mono text-sm">{account.account_code}</TableCell>
                      <TableCell className="font-medium">{account.account_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.debit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.credit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${account.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(Math.abs(account.net_balance))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        {/* GASTOS POR CATEGORÍA (Facturas de Compra) */}
        <AccordionItem value="expenses-by-category" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/70 [&[data-state=open]]:bg-muted">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-indigo-600" />
              <span className="font-semibold">Gastos por Categoría</span>
              <Badge variant="secondary" className="ml-2">
                {expensesByCategory.length} categorías
              </Badge>
              <span className="ml-auto mr-4 font-bold text-red-600">
                {formatCurrency(totalExpensesByCategory)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            {/* Summary cards for categories */}
            <div className="p-4 border-b bg-muted/20 grid grid-cols-2 md:grid-cols-4 gap-3">
              {expensesByCategory.slice(0, 4).map((expense) => {
                const IconComponent = expense.icon;
                return (
                  <div key={expense.category} className="flex items-center gap-2 p-2 rounded-lg bg-background border">
                    <IconComponent className={`h-4 w-4 ${expense.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{expense.label}</p>
                      <p className="text-sm font-semibold">{formatCurrency(expense.total)}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{expense.count}</Badge>
                  </div>
                );
              })}
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[60px]"></TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Facturas</TableHead>
                  <TableHead className="text-right">Total Base</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesByCategory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No hay facturas de compra aprobadas en el período
                    </TableCell>
                  </TableRow>
                ) : (
                  expensesByCategory.map((expense) => {
                    const IconComponent = expense.icon;
                    return (
                      <TableRow key={expense.category}>
                        <TableCell>
                          <div className={`p-2 rounded-lg bg-muted inline-flex`}>
                            <IconComponent className={`h-4 w-4 ${expense.color}`} />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{expense.label}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{expense.count}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(expense.total)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ChartOfAccountsTab;
