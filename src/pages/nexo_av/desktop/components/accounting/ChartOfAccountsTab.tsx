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

interface ChartOfAccountsTabProps {
  balanceDate: string;
  onNavigateToClient?: (clientId: string) => void;
  onNavigateToSupplier?: (supplierId: string) => void;
  onNavigateToTechnician?: (technicianId: string) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const ChartOfAccountsTab = ({
  balanceDate,
  onNavigateToClient,
  onNavigateToSupplier,
  onNavigateToTechnician,
}: ChartOfAccountsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetItem[]>([]);
  const [clientBalances, setClientBalances] = useState<ClientBalance[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<SupplierTechnicianBalance[]>([]);

  useEffect(() => {
    fetchAllData();
  }, [balanceDate]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [balanceRes, clientsRes, suppliersRes] = await Promise.all([
        supabase.rpc("get_balance_sheet", { p_as_of_date: balanceDate }),
        supabase.rpc("get_client_balances", { p_as_of_date: balanceDate }),
        supabase.rpc("get_supplier_technician_balances", { p_as_of_date: balanceDate }),
      ]);

      if (balanceRes.error) throw balanceRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      setBalanceSheet(balanceRes.data || []);
      setClientBalances(clientsRes.data || []);
      setSupplierBalances(suppliersRes.data || []);
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
      </Accordion>
    </div>
  );
};

export default ChartOfAccountsTab;
