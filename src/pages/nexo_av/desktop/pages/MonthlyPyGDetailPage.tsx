import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Percent,
  Loader2,
  Lock,
  Unlock,
  Receipt,
  Building2,
  Users,
  BookOpen,
  FileText,
  Landmark,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import { MetricCard } from "../components/detail";
import JournalEntryRow from "../components/accounting/JournalEntryRow";
import type {
  ProfitLossItem,
  VATSummary,
  CorporateTaxSummary,
  JournalEntry,
  PayrollRun,
  PartnerCompensationRun,
  PeriodProfitSummary,
  BankAccountWithBalance,
} from "../types/accounting";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const getEntryTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    INVOICE_SALE: "Factura Venta",
    INVOICE_PURCHASE: "Factura Compra",
    PAYMENT_RECEIVED: "Pago Recibido",
    PAYMENT_MADE: "Pago Realizado",
    TAX_SETTLEMENT: "Liquidación Impuestos",
    TAX_PROVISION: "Provisión Impuestos",
    MANUAL: "Manual",
    ADJUSTMENT: "Ajuste",
  };
  return labels[type] || type;
};

const getAccountTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    REVENUE: "Ingreso",
    EXPENSE: "Gasto",
  };
  return labels[type] || type;
};

const MonthlyPyGDetailPage = () => {
  const { userId, year, month } = useParams<{ userId: string; year: string; month: string }>();
  const navigate = useNavigate();

  const numYear = parseInt(year || "0", 10);
  const numMonth = parseInt(month || "0", 10);

  const periodStart = format(startOfMonth(new Date(numYear, numMonth - 1, 1)), "yyyy-MM-dd");
  const periodEnd = format(endOfMonth(new Date(numYear, numMonth - 1, 1)), "yyyy-MM-dd");

  const monthLabel = (() => {
    const label = format(new Date(numYear, numMonth - 1, 1), "MMMM yyyy", { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  })();

  // State
  const [loading, setLoading] = useState(true);
  const [profitSummary, setProfitSummary] = useState<PeriodProfitSummary | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossItem[]>([]);
  const [vatSummary, setVatSummary] = useState<VATSummary | null>(null);
  const [corporateTax, setCorporateTax] = useState<CorporateTaxSummary | null>(null);
  const [irpfSummary, setIrpfSummary] = useState<{ total_irpf: number; total_gross: number } | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountWithBalance[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [compensationRuns, setCompensationRuns] = useState<PartnerCompensationRun[]>([]);
  const [isClosed, setIsClosed] = useState<boolean | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        summaryRes,
        plRes,
        vatRes,
        taxRes,
        irpfRes,
        bankRes,
        journalRes,
        payrollRes,
        compensationRes,
        periodRes,
      ] = await Promise.all([
        supabase.rpc("get_period_profit_summary", { p_start: periodStart, p_end: periodEnd }),
        supabase.rpc("get_profit_loss", { p_period_start: periodStart, p_period_end: periodEnd }),
        supabase.rpc("get_vat_summary", { p_period_start: periodStart, p_period_end: periodEnd }),
        supabase.rpc("get_corporate_tax_summary", { p_period_start: periodStart, p_period_end: periodEnd }),
        supabase.rpc("get_irpf_summary", { p_period_start: periodStart, p_period_end: periodEnd }),
        supabase.rpc("list_bank_accounts_with_balances", { p_as_of_date: periodEnd }),
        supabase.rpc("list_journal_entries", { p_start_date: periodStart, p_end_date: periodEnd, p_limit: 500, p_offset: 0 }),
        supabase.rpc("list_payroll_runs", { p_period_year: numYear, p_period_month: numMonth, p_limit: 100 }),
        supabase.rpc("list_partner_compensation_runs", { p_period_year: numYear, p_period_month: numMonth, p_limit: 100 }),
        supabase.rpc("list_periods_for_closure", { p_months_back: 13 }),
      ]);

      if (summaryRes.data?.[0]) setProfitSummary(summaryRes.data[0] as PeriodProfitSummary);
      if (plRes.data) setProfitLoss(plRes.data as ProfitLossItem[]);
      if (vatRes.data?.[0]) setVatSummary(vatRes.data[0] as VATSummary);
      if (taxRes.data?.[0]) setCorporateTax(taxRes.data[0] as CorporateTaxSummary);
      if (irpfRes.data?.[0]) setIrpfSummary(irpfRes.data[0] as { total_irpf: number; total_gross: number });
      if (bankRes.data) setBankAccounts(bankRes.data as BankAccountWithBalance[]);
      if (journalRes.data) setJournalEntries(journalRes.data as JournalEntry[]);
      if (payrollRes.data) setPayrollRuns(payrollRes.data as PayrollRun[]);
      if (compensationRes.data) setCompensationRuns(compensationRes.data as PartnerCompensationRun[]);

      if (periodRes.data) {
        const found = (periodRes.data as { year: number; month: number; is_closed: boolean }[])
          .find((p) => p.year === numYear && p.month === numMonth);
        setIsClosed(found?.is_closed ?? null);
      }
    } catch (err) {
      console.error("Error loading monthly detail:", err);
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd, numYear, numMonth]);

  useEffect(() => {
    if (numYear > 0 && numMonth > 0) loadData();
  }, [loadData, numYear, numMonth]);

  const revenueItems = profitLoss.filter((i) => i.account_type === "REVENUE");
  const expenseItems = profitLoss.filter((i) => i.account_type === "EXPENSE");
  const totalRevenue = revenueItems.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenseItems.reduce((s, i) => s + i.amount, 0);
  const operatingExpenses = expenseItems
    .filter((i) => !i.account_code.startsWith("630"))
    .reduce((s, i) => s + i.amount, 0);
  const profitBeforeTax = totalRevenue - operatingExpenses;
  const taxAmount = corporateTax?.tax_amount || 0;
  const netProfit = profitBeforeTax - taxAmount;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const handleViewDocument = (referenceType: string | null, referenceId: string | null) => {
    if (!referenceType || !referenceId) return;
    if (referenceType === "INVOICE_SALE") navigate(`/nexo-av/${userId}/invoices/${referenceId}`);
    if (referenceType === "INVOICE_PURCHASE") navigate(`/nexo-av/${userId}/purchase-invoices/${referenceId}`);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col">
        <DetailNavigationBar
          pageTitle={monthLabel}
          backPath={`/nexo-av/${userId}/accounting`}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* A) Navigation Bar */}
      <DetailNavigationBar
        pageTitle={monthLabel}
        backPath={`/nexo-av/${userId}/accounting`}
        contextInfo={
          isClosed !== null ? (
            isClosed ? (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Cerrado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Unlock className="h-3 w-3" /> Abierto
              </Badge>
            )
          ) : undefined
        }
      />

      {/* B) KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard
          title="Ingresos"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          subtitle={`${revenueItems.length} cuentas`}
        />
        <MetricCard
          title="Gastos"
          value={formatCurrency(totalExpenses)}
          icon={TrendingDown}
          subtitle={`${expenseItems.length} cuentas`}
        />
        <MetricCard
          title="BAI"
          value={formatCurrency(profitBeforeTax)}
          icon={DollarSign}
          subtitle="Antes de impuestos"
        />
        <MetricCard
          title="Resultado Neto"
          value={formatCurrency(netProfit)}
          icon={Wallet}
          subtitle={`IS: ${formatCurrency(taxAmount)}`}
        />
        <MetricCard
          title="Margen"
          value={`${margin.toFixed(1)}%`}
          icon={Percent}
          subtitle="Sobre ingresos"
        />
      </div>

      {/* C-G) Tabs */}
      <Tabs defaultValue="pyg" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit">
          <TabsTrigger value="pyg" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> PyG
          </TabsTrigger>
          <TabsTrigger value="taxes" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Impuestos
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-1.5">
            <Landmark className="h-3.5 w-3.5" /> Bancos
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Nóminas
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Asientos
          </TabsTrigger>
        </TabsList>

        {/* C) PyG Tab */}
        <TabsContent value="pyg" className="flex-1 overflow-auto space-y-4">
          {/* Revenue */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" /> Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Cuenta</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right w-36">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueItems.map((item) => (
                    <TableRow key={item.account_code}>
                      <TableCell className="font-mono text-xs">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {revenueItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        Sin ingresos en este periodo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between mt-3 pt-3 border-t">
                <span className="font-semibold">Total Ingresos</span>
                <span className="font-bold text-green-600">{formatCurrency(totalRevenue)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" /> Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Cuenta</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right w-36">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseItems.map((item) => (
                    <TableRow key={item.account_code}>
                      <TableCell className="font-mono text-xs">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenseItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        Sin gastos en este periodo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between mt-3 pt-3 border-t">
                <span className="font-semibold">Total Gastos</span>
                <span className="font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Bottom summary */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between">
                <span className="font-semibold">Resultado antes de impuestos (BAI)</span>
                <span className={`font-bold text-lg ${profitBeforeTax >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(profitBeforeTax)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impuesto de Sociedades ({((corporateTax?.tax_rate || 0) * 100).toFixed(0)}%)</span>
                <span className="font-semibold text-red-600">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-bold text-lg">Resultado Neto</span>
                <span className={`font-bold text-lg ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* D) Taxes Tab */}
        <TabsContent value="taxes" className="flex-1 overflow-auto">
          <div className="grid grid-cols-3 gap-4">
            {/* IVA */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">IVA</CardTitle>
                <CardDescription>Resumen de IVA del periodo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {vatSummary ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA Repercutido</span>
                      <span className="font-semibold">{formatCurrency(vatSummary.vat_received)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA Soportado</span>
                      <span className="font-semibold">{formatCurrency(vatSummary.vat_paid)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-semibold">{formatCurrency(vatSummary.vat_balance)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="font-semibold">A pagar</span>
                      <span className={`font-bold ${vatSummary.vat_to_pay > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(vatSummary.vat_to_pay)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                )}
              </CardContent>
            </Card>

            {/* IS */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Impuesto de Sociedades</CardTitle>
                <CardDescription>Estimación del periodo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {corporateTax ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">BAI</span>
                      <span className="font-semibold">{formatCurrency(corporateTax.profit_before_tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tipo impositivo</span>
                      <span className="font-semibold">{(corporateTax.tax_rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="font-semibold">Cuota</span>
                      <span className="font-bold text-red-600">{formatCurrency(corporateTax.tax_amount)}</span>
                    </div>
                    {corporateTax.provision_entry_number && (
                      <div className="text-xs text-muted-foreground pt-1">
                        Provisión: {corporateTax.provision_entry_number}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                )}
              </CardContent>
            </Card>

            {/* IRPF */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">IRPF</CardTitle>
                <CardDescription>Retenciones del periodo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {irpfSummary ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base imponible</span>
                      <span className="font-semibold">{formatCurrency(irpfSummary.total_gross)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="font-semibold">Total retenido</span>
                      <span className="font-bold text-red-600">{formatCurrency(irpfSummary.total_irpf)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* E) Banks Tab */}
        <TabsContent value="banks" className="flex-1 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-4 w-4" /> Saldos bancarios al {format(new Date(periodEnd), "dd/MM/yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Titular</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.map((bank) => (
                    <TableRow key={bank.id}>
                      <TableCell className="font-medium">{bank.bank}</TableCell>
                      <TableCell className="text-muted-foreground">{bank.holder}</TableCell>
                      <TableCell className="font-mono text-xs">{bank.iban}</TableCell>
                      <TableCell className={`text-right font-bold ${bank.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(bank.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {bankAccounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Sin cuentas bancarias
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {bankAccounts.length > 0 && (
                <div className="flex justify-between mt-3 pt-3 border-t">
                  <span className="font-semibold">Total en bancos</span>
                  <span className={`font-bold ${bankAccounts.reduce((s, b) => s + b.balance, 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(bankAccounts.reduce((s, b) => s + b.balance, 0))}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* F) Payroll Tab */}
        <TabsContent value="payroll" className="flex-1 overflow-auto space-y-4">
          {/* Employee Payroll */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Nóminas de empleados
              </CardTitle>
              <CardDescription>{payrollRuns.length} nóminas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">IRPF</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRuns.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-mono text-xs">{pr.payroll_number}</TableCell>
                      <TableCell className="font-medium">{pr.employee_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(pr.gross_amount)}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(pr.irpf_amount)} ({pr.irpf_rate}%)
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(pr.net_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={pr.status === "posted" ? "secondary" : "outline"}>
                          {pr.status === "posted" ? "Contabilizada" : pr.status === "draft" ? "Borrador" : pr.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payrollRuns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        Sin nóminas este mes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {payrollRuns.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total bruto</span>
                    <span className="font-semibold">{formatCurrency(payrollRuns.reduce((s, p) => s + p.gross_amount, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total IRPF</span>
                    <span className="font-semibold text-red-600">{formatCurrency(payrollRuns.reduce((s, p) => s + p.irpf_amount, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total neto</span>
                    <span className="font-bold">{formatCurrency(payrollRuns.reduce((s, p) => s + p.net_amount, 0))}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Partner Compensations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Retribuciones de socios
              </CardTitle>
              <CardDescription>{compensationRuns.length} retribuciones</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Socio</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">IRPF</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compensationRuns.map((cr) => (
                    <TableRow key={cr.id}>
                      <TableCell className="font-mono text-xs">{cr.compensation_number}</TableCell>
                      <TableCell className="font-medium">{cr.partner_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cr.gross_amount)}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(cr.irpf_amount)} ({cr.irpf_rate}%)
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(cr.net_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={cr.status === "posted" ? "secondary" : "outline"}>
                          {cr.status === "posted" ? "Contabilizada" : cr.status === "draft" ? "Borrador" : cr.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {compensationRuns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        Sin retribuciones este mes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {compensationRuns.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total bruto</span>
                    <span className="font-semibold">{formatCurrency(compensationRuns.reduce((s, c) => s + c.gross_amount, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total IRPF</span>
                    <span className="font-semibold text-red-600">{formatCurrency(compensationRuns.reduce((s, c) => s + c.irpf_amount, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total neto</span>
                    <span className="font-bold">{formatCurrency(compensationRuns.reduce((s, c) => s + c.net_amount, 0))}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* G) Journal Tab */}
        <TabsContent value="journal" className="flex-1 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Libro Diario
              </CardTitle>
              <CardDescription>{journalEntries.length} asientos en {monthLabel.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Nº</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map((entry) => (
                    <JournalEntryRow
                      key={entry.id}
                      entry={entry}
                      formatCurrency={formatCurrency}
                      getEntryTypeLabel={getEntryTypeLabel}
                      onViewDocument={handleViewDocument}
                    />
                  ))}
                  {journalEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        Sin asientos en este periodo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {journalEntries.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Debe</span>
                    <span className="font-semibold">
                      {formatCurrency(journalEntries.reduce((s, e) => s + e.total_debit, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Haber</span>
                    <span className="font-semibold">
                      {formatCurrency(journalEntries.reduce((s, e) => s + e.total_credit, 0))}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonthlyPyGDetailPage;
