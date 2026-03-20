import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  Loader2,
  Download,
  Calendar,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  Building2,
  Receipt,
  Percent,
  Wallet,
  CreditCard,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Eye,
  Filter,
  Plus,
  BarChart3,
  UserCog,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import CreatePayrollDialog from "../components/accounting/CreatePayrollDialog";
import CreatePartnerCompensationDialog from "../components/accounting/CreatePartnerCompensationDialog";
import CreatePayrollPaymentDialog from "../components/accounting/CreatePayrollPaymentDialog";
import JournalEntryRow from "../components/accounting/JournalEntryRow";
import CashMovementsTable from "../components/accounting/CashMovementsTable";
import ChartOfAccountsTab from "../components/accounting/ChartOfAccountsTab";
import BankBalanceAdjustmentDialog from "../components/accounting/BankBalanceAdjustmentDialog";
import BankOpeningEntryDialog from "../components/accounting/BankOpeningEntryDialog";
import BankTransferDialog from "../components/accounting/BankTransferDialog";
import TaxPaymentDialog from "../components/accounting/TaxPaymentDialog";
import ManualMovementDialog from "../components/accounting/ManualMovementDialog";
import BankDetailView from "../components/accounting/BankDetailView";
import AccountingPeriodFilter from "../components/accounting/AccountingPeriodFilter";
import { useAccountingData } from "../hooks/useAccountingData";

import type {
  BalanceSheetItem,
  ProfitLossItem,
  ClientBalance,
  SupplierTechnicianBalance,
  VATSummary,
  CorporateTaxSummary,
  PeriodForClosure,
  JournalEntry,
  ChartOfAccount,
  PayrollRun,
  PartnerCompensationRun,
  PayrollPayment,
  IRPFByPeriod,
  IRPFByPerson,
  IRPFModel111Summary,
  CompanyBankAccount,
  PeriodProfitSummary,
  VatDetailRow,
  ProfessionalIrpfRow,
} from "../types/accounting";

const AccountingPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Estado UI — diálogos
  const [createPayrollDialogOpen, setCreatePayrollDialogOpen] = useState(false);
  const [createCompensationDialogOpen, setCreateCompensationDialogOpen] = useState(false);
  const [createPaymentDialogOpen, setCreatePaymentDialogOpen] = useState(false);
  const [bankAdjustmentDialogOpen, setBankAdjustmentDialogOpen] = useState(false);
  const [bankOpeningDialogOpen, setBankOpeningDialogOpen] = useState(false);
  const [bankTransferDialogOpen, setBankTransferDialogOpen] = useState(false);
  const [taxPaymentDialogOpen, setTaxPaymentDialogOpen] = useState(false);
  const [manualExpenseDialogOpen, setManualExpenseDialogOpen] = useState(false);
  const [manualIncomeDialogOpen, setManualIncomeDialogOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [banksSectionOpen, setBanksSectionOpen] = useState(false);

  const { filters, state, computed, actions } = useAccountingData(activeTab, userId);
  const { filterType, setFilterType, selectedYear, setSelectedYear, selectedQuarter, setSelectedQuarter, selectedMonth, setSelectedMonth, balanceDate, setBalanceDate, periodDates } = filters;
  const { loading, balanceSheet, periodProfitSummary, profitLoss, clientBalances, supplierBalances, vatSummary, irpfSummary, corporateTaxSummary, journalEntries, chartOfAccounts, payrollRuns, partnerCompensations, payrollPayments, irpfByPeriod, irpfByPerson, irpfModel111Summary, companyBankAccounts, periodsForClosure, loadingPeriods, periodActionLoading, bankAccountBalances, bankAccountCodes, vatDetail, professionalIrpf, loadingExport, showVatDetail, setShowVatDetail, uploadingVat, uploadingIrpf, vatSharepointUrl, irpfSharepointUrl } = state;
  const { totalRevenue, operatingExpenses, totalExpenses, profitBeforeTax, corporateTax, netProfit, bankBalance, clientsPending, suppliersPending, availableCash } = computed;
  const { loadAllData, fetchBalanceSheet, fetchProfitLoss, fetchJournalEntries, fetchBankAccountBalances, fetchPayrollRuns, fetchPartnerCompensations, fetchPayrollPayments, handleOpenPeriod, handleClosePeriod, exportVatExcel, exportIrpfCsv, uploadVatToSharePoint, uploadIrpfToSharePoint, formatCurrency, getAccountTypeLabel, getEntryTypeLabel, handleViewDocument } = actions;

  return (
    <div className="AccountingPage w-full h-full flex flex-col">
      {/* Contenedor principal con Sidebar y Contenido */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar fijo a la izquierda */}
        <aside className="w-48 border-r bg-card/50 flex-shrink-0 overflow-y-auto">
          <nav className="p-2 space-y-0.5">

            {/* ── Contabilidad ── */}
            <div className="px-2 pt-3 pb-1">
              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Contabilidad</span>
            </div>
            {[
              { id: "dashboard", label: "Resumen", Icon: FileText },
              { id: "journal",   label: "Libro Diario", Icon: BookOpen },
              { id: "cash",      label: "Libro de Caja", Icon: Wallet },
              { id: "chart",     label: "Plan Contable", Icon: FileText },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
              </button>
            ))}

            {/* ── Terceros ── */}
            <div className="px-2 pt-4 pb-1">
              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Terceros</span>
            </div>
            {[
              { id: "clients",   label: "Clientes",    Icon: Users },
              { id: "suppliers", label: "Proveedores",  Icon: Building2 },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
              </button>
            ))}

            {/* ── Fiscal ── */}
            <div className="px-2 pt-4 pb-1">
              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Fiscal</span>
            </div>
            {[
              { id: "taxes",       label: "Impuestos", Icon: Percent },
              { id: "profit-loss", label: "PyG",       Icon: TrendingUp },
              { id: "balance",     label: "Balance",   Icon: Wallet },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
              </button>
            ))}

            {/* ── Bancos (expandible, dinámico) ── */}
            {companyBankAccounts.length > 0 && (
              <>
                <div className="px-2 pt-4 pb-1">
                  <button
                    onClick={() => setBanksSectionOpen(!banksSectionOpen)}
                    className="w-full flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest hover:text-muted-foreground transition-colors"
                  >
                    <ChevronRight className={`h-3 w-3 transition-transform ${banksSectionOpen ? "rotate-90" : ""}`} />
                    Bancos
                  </button>
                </div>
                {banksSectionOpen && companyBankAccounts.map((bank) => {
                  const bankTabId = `bank-${bank.id}`;
                  const isBankActive = activeTab === bankTabId;
                  const bankBal = bankAccountBalances[bank.id] || 0;
                  return (
                    <button
                      key={bank.id}
                      onClick={() => setActiveTab(bankTabId)}
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isBankActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{bank.bank}</span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ${isBankActive ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}>
                        {formatCurrency(bankBal)}
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {/* ── Nóminas ── */}
            <div className="px-2 pt-4 pb-1">
              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Nóminas</span>
            </div>
            {[
              { id: "all-payroll",      label: "Todas",          Icon: Receipt },
              { id: "payroll",          label: "Empleados",       Icon: Briefcase },
              { id: "compensations",    label: "Retribuciones",   Icon: UserCog },
              { id: "payroll-payments", label: "Pagos",           Icon: CreditCard },
              { id: "irpf-reports",     label: "Informes IRPF",   Icon: Receipt },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
              </button>
            ))}

            {/* ── Informes ── */}
            <div className="px-2 pt-4 pb-1">
              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Informes</span>
            </div>
            <button
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "reports"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
              Informes
            </button>

          </nav>
        </aside>

        {/* Contenido central con scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="w-full">
            {/* Header - Estilo Dashboard */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Contabilidad</h1>
                <p className="text-xs text-muted-foreground mt-1">Gestión contable y financiera</p>
              </div>
              
              {/* Controles de filtro */}
              <AccountingPeriodFilter
                filterType={filterType}
                setFilterType={setFilterType}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedQuarter={selectedQuarter}
                setSelectedQuarter={setSelectedQuarter}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                balanceDate={balanceDate}
                setBalanceDate={setBalanceDate}
                loading={loading}
                onRefresh={loadAllData}
              />
            </div>

            {/* Contenido con tabs */}
            <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        {/* 1. DASHBOARD CONTABLE */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* KPIs Compactos - Estilo InvoicesPage */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-emerald-500/10 rounded text-emerald-500">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-muted-foreground text-[9px] font-medium">Facturas Emitidas</span>
                </div>
                <div>
                  <span className="text-base font-bold text-foreground">
                    {journalEntries.filter(e => e.entry_type === 'INVOICE_SALE').length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-blue-500/10 rounded text-blue-500">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-muted-foreground text-[9px] font-medium">Facturas Recibidas</span>
                </div>
                <div>
                  <span className="text-base font-bold text-foreground">
                    {journalEntries.filter(e => e.entry_type === 'INVOICE_PURCHASE').length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-purple-500/10 rounded text-purple-500">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-muted-foreground text-[9px] font-medium">Asientos Contables</span>
                </div>
                <div>
                  <span className="text-base font-bold text-foreground">
                    {journalEntries.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-orange-500/10 rounded text-orange-500">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-muted-foreground text-[9px] font-medium">Clientes Activos</span>
                </div>
                <div>
                  <span className="text-base font-bold text-foreground">
                    {clientBalances.filter(c => Math.abs(c.net_balance) > 0).length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultado del ejercicio */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">Período seleccionado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Gastos Operativos</CardTitle>
                <TrendingDown className="h-3 w-3 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-base font-bold text-red-600">{formatCurrency(operatingExpenses)}</div>
                <p className="text-[10px] text-muted-foreground">Sin provisiones IS</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">BAI</CardTitle>
                <DollarSign className="h-3 w-3 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-base font-bold ${profitBeforeTax >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(profitBeforeTax)}
                </div>
                <p className="text-[10px] text-muted-foreground">Beneficio antes de impuestos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">IS Provisionado</CardTitle>
                <Percent className="h-3 w-3 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-base font-bold text-blue-600">{formatCurrency(corporateTax)}</div>
                <p className="text-[10px] text-muted-foreground">
                  {corporateTaxSummary?.tax_rate || 25}% sobre BAI
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cuentas Bancarias */}
          <Card className="col-span-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Cuentas Bancarias
                </CardTitle>
                <CardDescription>
                  Saldos contables de las cuentas bancarias configuradas
                </CardDescription>
              </div>
              {companyBankAccounts.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      switch (value) {
                        case "opening":
                          setBankOpeningDialogOpen(true);
                          break;
                        case "transfer":
                          setBankTransferDialogOpen(true);
                          break;
                        case "tax":
                          setTaxPaymentDialogOpen(true);
                          break;
                        case "expense":
                          setManualExpenseDialogOpen(true);
                          break;
                        case "income":
                          setManualIncomeDialogOpen(true);
                          break;
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <Plus className="h-4 w-4 mr-1" />
                      <SelectValue placeholder="Nuevo movimiento" />
                    </SelectTrigger>
                    <SelectContent className="z-[99999]">
                      <SelectItem value="opening">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Asiento de apertura</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="transfer">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>Traspaso entre bancos</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tax">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          <span>Pago de impuesto</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="expense">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />
                          <span>Gasto sin factura</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="income">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          <span>Ingreso sin factura</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {companyBankAccounts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay cuentas bancarias configuradas</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate(`/nexo-av/${userId}/settings`)}
                    className="mt-2"
                  >
                    Configurar cuentas →
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {companyBankAccounts.map((account) => {
                    // Usar saldo real del banco si está disponible, sino calcular del balance general
                    const accountBalance = bankAccountBalances[account.id] !== undefined
                      ? bankAccountBalances[account.id]
                      : balanceSheet
                          .filter((bs) => bs.account_code.startsWith("572"))
                          .reduce((sum, bs) => sum + bs.net_balance, 0) / Math.max(1, companyBankAccounts.length);
                    
                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{account.bank}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {account.iban ? `${account.iban.slice(0, 4)} •••• ${account.iban.slice(-4)}` : "Sin IBAN"}
                            </p>
                            {account.holder && (
                              <p className="text-xs text-muted-foreground">{account.holder}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${accountBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatCurrency(accountBalance)}
                          </p>
                          {bankAccountBalances[account.id] === undefined && (
                            <p className="text-xs text-muted-foreground italic">Sin cuenta contable</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Total */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="font-semibold">Saldo Total Bancos:</span>
                    <span className={`font-bold text-xl ${bankBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(bankBalance)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tesorería */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Tesorería
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Saldo bancos:</span>
                  <span className="font-semibold">{formatCurrency(bankBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Clientes pendientes:</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(clientsPending)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Proveedores pendientes:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(suppliersPending)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-semibold">Saldo disponible:</span>
                    <span className={`font-bold text-lg ${availableCash >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(availableCash)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Impuestos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Impuestos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">IVA repercutido:</span>
                  <span className="font-semibold text-green-600">
                    {vatSummary ? formatCurrency(vatSummary.vat_received) : "€0,00"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">IVA soportado:</span>
                  <span className="font-semibold text-red-600">
                    {vatSummary ? formatCurrency(vatSummary.vat_paid) : "€0,00"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">IVA a pagar:</span>
                  <span className="font-semibold text-blue-600">
                    {vatSummary ? formatCurrency(vatSummary.vat_to_pay) : "€0,00"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">IRPF retenido:</span>
                  <span className="font-semibold">{formatCurrency(irpfSummary)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-semibold">IS provisionado:</span>
                    <span className="font-bold text-lg text-blue-600">{formatCurrency(corporateTax)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultado neto y métricas adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resultado Neto Estimado</CardTitle>
                <CardDescription>Después de impuestos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className={`text-4xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(netProfit)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {netProfit >= 0 ? "Beneficio neto" : "Pérdida neta"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Métricas de Rentabilidad */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Rentabilidad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Margen operativo (BAI/Ingresos):</span>
                  <span className="font-semibold">
                    {totalRevenue > 0 ? `${((profitBeforeTax / totalRevenue) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Margen neto (Beneficio/Ingresos):</span>
                  <span className="font-semibold">
                    {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rentab. sobre gastos (Beneficio/Gastos):</span>
                  <span className={`font-semibold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {totalExpenses > 0 ? `${((netProfit / totalExpenses) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ratio Ingresos/Gastos:</span>
                    <span className="font-bold">
                      {totalExpenses > 0 ? (totalRevenue / totalExpenses).toFixed(2) : "—"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {totalExpenses > 0 && totalRevenue >= totalExpenses
                      ? ">1 = ingresos cubren gastos"
                      : totalExpenses > 0
                        ? "<1 = gastos superan ingresos"
                        : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen de Terceros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Clientes (Saldos)
                </CardTitle>
                <CardDescription>Clientes con mayor saldo pendiente</CardDescription>
              </CardHeader>
              <CardContent>
                {clientBalances
                  .filter(c => c.net_balance > 0)
                  .sort((a, b) => b.net_balance - a.net_balance)
                  .slice(0, 5)
                  .length > 0 ? (
                  <div className="space-y-2">
                    {clientBalances
                      .filter(c => c.net_balance > 0)
                      .sort((a, b) => b.net_balance - a.net_balance)
                      .slice(0, 5)
                      .map((client) => (
                        <div key={client.client_id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{client.client_name}</p>
                            <p className="text-xs text-muted-foreground">{client.client_number}</p>
                          </div>
                          <span className="font-semibold text-green-600 ml-2">
                            {formatCurrency(client.net_balance)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay saldos pendientes</p>
                )}
              </CardContent>
            </Card>

            {/* Top Proveedores/Técnicos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Top Proveedores/Técnicos (Saldos)
                </CardTitle>
                <CardDescription>Mayores saldos pendientes de pago</CardDescription>
              </CardHeader>
              <CardContent>
                {supplierBalances
                  .filter(s => s.net_balance < 0)
                  .sort((a, b) => Math.abs(a.net_balance) - Math.abs(b.net_balance))
                  .reverse()
                  .slice(0, 5)
                  .length > 0 ? (
                  <div className="space-y-2">
                    {supplierBalances
                      .filter(s => s.net_balance < 0)
                      .sort((a, b) => Math.abs(a.net_balance) - Math.abs(b.net_balance))
                      .reverse()
                      .slice(0, 5)
                      .map((supplier) => (
                        <div key={`${supplier.third_party_id}-${supplier.third_party_type}`} className="flex justify-between items-center py-1.5 border-b last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{supplier.third_party_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {supplier.third_party_number} • {supplier.third_party_type === 'SUPPLIER' ? 'Proveedor' : 'Técnico'}
                            </p>
                          </div>
                          <span className="font-semibold text-red-600 ml-2">
                            {formatCurrency(Math.abs(supplier.net_balance))}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay saldos pendientes</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Últimos Asientos Contables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Últimos Asientos Contables
              </CardTitle>
              <CardDescription>Movimientos recientes del período</CardDescription>
            </CardHeader>
            <CardContent>
              {journalEntries.length > 0 ? (
                <div className="space-y-2">
                  {journalEntries
                    .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
                    .slice(0, 10)
                    .map((entry) => (
                      <div key={entry.id} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">#{entry.entry_number}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {getEntryTypeLabel(entry.entry_type)}
                            </span>
                          </div>
                          <p className="text-sm font-medium mt-1 truncate">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: es })}
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-xs text-muted-foreground">Estado</p>
                          <Badge variant={entry.is_locked ? "default" : "secondary"} className="mt-1">
                            {entry.is_locked ? "Bloqueado" : "Abierto"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay asientos contables en el período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. LIBRO DIARIO */}
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Libro Diario - Asientos Contables</CardTitle>
                  <CardDescription>
                    Del {format(new Date(periodDates.start), "dd/MM/yyyy")} al {format(new Date(periodDates.end), "dd/MM/yyyy")} · {journalEntries.length} asientos
                  </CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="mr-4">Total DEBE: <span className="font-semibold text-foreground">{formatCurrency(journalEntries.reduce((sum, e) => sum + e.total_debit, 0))}</span></span>
                  <span>Total HABER: <span className="font-semibold text-foreground">{formatCurrency(journalEntries.reduce((sum, e) => sum + e.total_credit, 0))}</span></span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {journalEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No hay asientos contables en el período seleccionado</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead className="w-[90px]">Fecha</TableHead>
                        <TableHead className="w-[120px]">Nº Asiento</TableHead>
                        <TableHead className="w-[130px]">Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right w-[100px]">DEBE</TableHead>
                        <TableHead className="text-right w-[100px]">HABER</TableHead>
                        <TableHead className="w-[80px]">Doc.</TableHead>
                        <TableHead className="w-[100px]">Estado</TableHead>
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
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIBRO DE CAJA - Movimientos de dinero */}
        <TabsContent value="cash" className="space-y-4">
          <CashMovementsTable
            startDate={periodDates.start}
            endDate={periodDates.end}
            onNavigate={(type, id) => {
              if (type === 'invoice') navigate(`/nexo-av/${userId}/invoices/${id}`);
              else if (type === 'purchase_invoice') navigate(`/nexo-av/${userId}/purchase-invoices/${id}`);
            }}
          />
        </TabsContent>

        {/* 3. PLAN CONTABLE */}
        <TabsContent value="chart" className="space-y-4">
          <ChartOfAccountsTab
            balanceDate={balanceDate}
            periodStart={periodDates.start}
            periodEnd={periodDates.end}
            onNavigateToClient={(clientId) => navigate(`/nexo-av/${userId}/clients/${clientId}`)}
            onNavigateToSupplier={(supplierId) => navigate(`/nexo-av/${userId}/suppliers/${supplierId}`)}
            onNavigateToTechnician={(technicianId) => navigate(`/nexo-av/${userId}/technicians/${technicianId}`)}
          />
        </TabsContent>

        {/* 4. CLIENTES (DEUDORES - 430) */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes - Deudores (Cuenta 430000)</CardTitle>
              <CardDescription>Al {format(new Date(balanceDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Interno</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total Facturado</TableHead>
                    <TableHead className="text-right">Total Cobrado</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientBalances.map((client) => (
                    <TableRow key={client.client_id}>
                      <TableCell className="font-mono">{client.client_number || "N/A"}</TableCell>
                      <TableCell>{client.client_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.debit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.credit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${client.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(client.net_balance)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/nexo-av/${userId}/clients/${client.client_id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. PROVEEDORES Y TÉCNICOS (ACREEDORES - 400/410) */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proveedores y Técnicos - Acreedores (Cuentas 400000 y 410000)</CardTitle>
              <CardDescription>Al {format(new Date(balanceDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>ID Interno</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right">Total Recibido</TableHead>
                    <TableHead className="text-right">Total Pagado</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierBalances.map((item) => (
                    <TableRow key={`${item.third_party_id}-${item.account_code}`}>
                      <TableCell>
                        <Badge variant={item.third_party_type === "SUPPLIER" ? "default" : "secondary"}>
                          {item.third_party_type === "SUPPLIER" ? "Proveedor" : "Técnico"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{item.third_party_number || "N/A"}</TableCell>
                      <TableCell>{item.third_party_name}</TableCell>
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.credit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.debit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${Math.abs(item.net_balance) > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(Math.abs(item.net_balance))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. IMPUESTOS */}
        <TabsContent value="taxes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* IVA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  IVA
                </CardTitle>
                <CardDescription>
                  Del {format(new Date(periodDates.start), "dd/MM/yyyy")} al {format(new Date(periodDates.end), "dd/MM/yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {vatSummary ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">IVA Repercutido:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(vatSummary.vat_received)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">IVA Soportado:</span>
                        <span className="font-semibold text-red-600">{formatCurrency(vatSummary.vat_paid)}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="font-semibold">Resultado:</span>
                          <span className={`font-bold ${vatSummary.vat_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(vatSummary.vat_balance)}
                          </span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-sm font-medium">IVA a Pagar:</span>
                          <span className="text-sm font-bold text-blue-600">{formatCurrency(vatSummary.vat_to_pay)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
                )}
                {vatSummary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs"
                    onClick={() => setShowVatDetail((v) => !v)}
                  >
                    {showVatDetail ? "Ocultar detalle" : "Ver detalle por factura"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* IRPF */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  IRPF
                </CardTitle>
                <CardDescription>
                  Del {format(new Date(periodDates.start), "dd/MM/yyyy")} al {format(new Date(periodDates.end), "dd/MM/yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">IRPF Retenido:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(irpfSummary)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Retenciones IRPF aplicadas a profesionales y técnicos
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* IS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Impuesto de Sociedades
                </CardTitle>
                <CardDescription>Provisión calculada automáticamente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {corporateTaxSummary ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Resultado antes de impuestos:</span>
                        <span className="font-semibold">{formatCurrency(corporateTaxSummary.profit_before_tax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Tipo aplicado:</span>
                        <span className="font-semibold">{corporateTaxSummary.tax_rate}%</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="font-semibold">IS Provisionado:</span>
                          <span className="font-bold text-red-600">{formatCurrency(corporateTaxSummary.tax_amount)}</span>
                        </div>
                      </div>
                    </div>
                    {corporateTaxSummary.provision_entry_number && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          Asiento: <span className="font-mono">{corporateTaxSummary.provision_entry_number}</span>
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* E3: Detalle IVA por factura (desplegable) */}
          {showVatDetail && vatDetail.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detalle IVA por Factura — Modelo 303</CardTitle>
                <CardDescription>
                  {format(new Date(periodDates.start), "dd/MM/yyyy")} al {format(new Date(periodDates.end), "dd/MM/yyyy")}
                  {" · "}
                  <button className="underline text-blue-600" onClick={exportVatExcel} disabled={loadingExport}>
                    {loadingExport ? "Generando Excel..." : "Descargar Excel"}
                  </button>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nº Factura</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Contraparte</TableHead>
                      <TableHead>NIF</TableHead>
                      <TableHead className="text-right">Tipo IVA</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Cuota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vatDetail.map((row, i) => (
                      <TableRow key={i} className={row.tipo === "SOPORTADO" ? "bg-red-50/30" : ""}>
                        <TableCell>
                          <Badge variant={row.tipo === "REPERCUTIDO" ? "default" : "secondary"}>
                            {row.tipo === "REPERCUTIDO" ? "Rep." : "Sop."}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.invoice_number}</TableCell>
                        <TableCell>{row.issue_date}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{row.third_party_name ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{row.third_party_tax_id ?? "—"}</TableCell>
                        <TableCell className="text-right">{row.tax_rate}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(row.base_imponible))}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(Number(row.cuota_iva))}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-bold bg-muted/50">
                      <TableCell colSpan={6}>Totales</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(vatDetail.reduce((s, r) => s + Number(r.base_imponible), 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(vatDetail.reduce((s, r) => s + Number(r.cuota_iva), 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 7. CUENTA DE RESULTADOS */}
        <TabsContent value="profit-loss" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cuenta de Resultados</CardTitle>
              <CardDescription>
                Del {format(new Date(periodDates.start), "dd/MM/yyyy")} al {format(new Date(periodDates.end), "dd/MM/yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitLoss.map((item) => (
                    <TableRow key={item.account_code}>
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getAccountTypeLabel(item.account_type)}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Ingresos:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Total Gastos:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold text-lg">Resultado antes de impuestos:</span>
                  <span className={`font-bold text-lg ${profitBeforeTax >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(profitBeforeTax)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Impuesto de Sociedades:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(corporateTax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold text-lg">Resultado Neto:</span>
                  <span className={`font-bold text-lg ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cierres por mes: listado y acciones Reabrir / Cerrar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Cierres por mes
              </CardTitle>
              <CardDescription>
                Meses cerrados o por cerrar. El mes anterior se cierra automáticamente el día 10. Puedes reabrir un mes para subir tickets/facturas y volver a cerrarlo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPeriods ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : periodsForClosure.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay periodos disponibles</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mes</TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodsForClosure.map((p) => {
                        const monthName = format(new Date(p.year, p.month - 1, 1), "MMMM yyyy", { locale: es });
                        const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                        const key = `${p.year}-${p.month}`;
                        const isActionLoading = periodActionLoading === key;
                        return (
                          <TableRow key={key}>
                            <TableCell className="font-medium">
                              <button
                                className="text-left hover:text-primary hover:underline transition-colors cursor-pointer"
                                onClick={() => navigate(`/nexo-av/${userId}/accounting/pyg/${p.year}/${p.month}`)}
                              >
                                {monthNameCapitalized}
                              </button>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(p.period_start), "dd/MM/yyyy", { locale: es })} – {format(new Date(p.period_end), "dd/MM/yyyy", { locale: es })}
                            </TableCell>
                            <TableCell>
                              {p.is_closed ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Lock className="h-3 w-3" />
                                  Cerrado
                                  {p.closed_at && (
                                    <span className="text-xs opacity-80">
                                      {format(new Date(p.closed_at), "dd/MM/yy")}
                                    </span>
                                  )}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1">
                                  <Unlock className="h-3 w-3" />
                                  Abierto
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/nexo-av/${userId}/accounting/pyg/${p.year}/${p.month}`)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Ver detalle
                              </Button>
                              {p.is_closed ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isActionLoading}
                                  onClick={() => handleOpenPeriod(p.year, p.month)}
                                >
                                  {isActionLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Unlock className="h-3.5 w-3.5 mr-1" />
                                      Reabrir
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={isActionLoading}
                                  onClick={() => handleClosePeriod(p.year, p.month)}
                                >
                                  {isActionLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Lock className="h-3.5 w-3.5 mr-1" />
                                      Cerrar
                                    </>
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. BALANCE DE SITUACIÓN */}
        <TabsContent value="balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance de Situación</CardTitle>
              <CardDescription>Al {format(new Date(balanceDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceSheet.map((item) => (
                    <TableRow key={item.account_code}>
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getAccountTypeLabel(item.account_type)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.debit_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.credit_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${item.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(item.net_balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALL PAYROLL - Vista unificada de todas las nóminas */}
        <TabsContent value="all-payroll" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Todas las Nóminas</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreatePayrollDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nómina Empleado
              </Button>
              <Button onClick={() => setCreateCompensationDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Retribución Socio
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listado Unificado de Nóminas</CardTitle>
              <CardDescription>
                Período: {selectedYear} - Todas las nóminas de empleados y retribuciones de socios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nº Documento</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Persona</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">IRPF</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Asiento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Nóminas de empleados */}
                  {payrollRuns.map((payroll) => (
                    <TableRow key={`emp-${payroll.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          <Briefcase className="h-3 w-3 mr-1" />
                          Empleado
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{payroll.payroll_number}</TableCell>
                      <TableCell>{payroll.period_year}/{payroll.period_month}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{payroll.employee_number}</div>
                          <div className="text-sm">{payroll.employee_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(payroll.gross_amount)}</TableCell>
                      <TableCell className="text-right text-orange-500">{formatCurrency(payroll.irpf_amount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(payroll.net_amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            payroll.status === "PAID" ? "default"
                              : payroll.status === "POSTED" ? "secondary"
                              : "outline"
                          }
                        >
                          {payroll.status === "DRAFT" && "Borrador"}
                          {payroll.status === "POSTED" && "Confirmada"}
                          {payroll.status === "PARTIAL" && "Parcial"}
                          {payroll.status === "PAID" && "Pagada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payroll.journal_entry_number ? (
                          <span className="font-mono text-xs">{payroll.journal_entry_number}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {payroll.status === "DRAFT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  const { error } = await supabase.rpc("post_payroll_run", {
                                    p_payroll_run_id: payroll.id,
                                  });
                                  if (error) throw error;
                                  toast({ title: "Nómina confirmada", description: "Asiento generado" });
                                  fetchPayrollRuns();
                                } catch (error: any) {
                                  toast({ title: "Error", description: error.message, variant: "destructive" });
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            >
                              Aprobar
                            </Button>
                          )}
                          {(payroll.status === "POSTED" || payroll.status === "PARTIAL") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                (window as any).__pendingPayrollId = payroll.id;
                                setCreatePaymentDialogOpen(true);
                              }}
                            >
                              Pagar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Retribuciones de socios */}
                  {partnerCompensations.map((comp) => (
                    <TableRow key={`comp-${comp.id}`}>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          <UserCog className="h-3 w-3 mr-1" />
                          Socio
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{comp.compensation_number}</TableCell>
                      <TableCell>{comp.period_year}/{comp.period_month}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{comp.partner_number}</div>
                          <div className="text-sm">{comp.partner_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(comp.gross_amount)}</TableCell>
                      <TableCell className="text-right text-orange-500">{formatCurrency(comp.irpf_amount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(comp.net_amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            comp.status === "PAID" ? "default"
                              : comp.status === "POSTED" ? "secondary"
                              : "outline"
                          }
                        >
                          {comp.status === "DRAFT" && "Borrador"}
                          {comp.status === "POSTED" && "Confirmada"}
                          {comp.status === "PARTIAL" && "Parcial"}
                          {comp.status === "PAID" && "Pagada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {comp.journal_entry_number ? (
                          <span className="font-mono text-xs">{comp.journal_entry_number}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {comp.status === "DRAFT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  const { error } = await supabase.rpc("post_partner_compensation_run", {
                                    p_compensation_run_id: comp.id,
                                  });
                                  if (error) throw error;
                                  toast({ title: "Retribución confirmada", description: "Asiento generado" });
                                  fetchPartnerCompensations();
                                } catch (error: any) {
                                  toast({ title: "Error", description: error.message, variant: "destructive" });
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            >
                              Aprobar
                            </Button>
                          )}
                          {(comp.status === "POSTED" || comp.status === "PARTIAL") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                (window as any).__pendingCompensationId = comp.id;
                                setCreatePaymentDialogOpen(true);
                              }}
                            >
                              Pagar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payrollRuns.length === 0 && partnerCompensations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No hay nóminas registradas en el período seleccionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Nóminas de Empleados</CardTitle>
            <Button onClick={() => setCreatePayrollDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Nómina
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listado de Nóminas</CardTitle>
              <CardDescription>
                Período: {selectedYear} - {filterType === "month" && format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM", { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Nómina</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">IRPF</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Asiento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRuns.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-mono">{payroll.payroll_number}</TableCell>
                      <TableCell>{payroll.period_year}/{payroll.period_month}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{payroll.employee_number}</div>
                          <div>{payroll.employee_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(payroll.gross_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payroll.irpf_amount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(payroll.net_amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            payroll.status === "PAID"
                              ? "default"
                              : payroll.status === "POSTED"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {payroll.status === "DRAFT" && "Borrador"}
                          {payroll.status === "POSTED" && "Posteada"}
                          {payroll.status === "PAID" && "Pagada"}
                          {payroll.status === "CANCELLED" && "Cancelada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payroll.journal_entry_number ? (
                          <span className="font-mono text-sm">{payroll.journal_entry_number}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {payroll.status === "DRAFT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  const { error } = await supabase.rpc("post_payroll_run", {
                                    p_payroll_run_id: payroll.id,
                                  });
                                  if (error) throw error;
                                  toast({
                                    title: "Nómina posteada",
                                    description: "El asiento contable se ha generado automáticamente",
                                  });
                                  fetchPayrollRuns();
                                } catch (error: any) {
                                  toast({
                                    title: "Error",
                                    description: error.message || "Error al postear la nómina",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            >
                              Postear
                            </Button>
                          )}
                          {payroll.status === "POSTED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Guardar el ID temporalmente para pasarlo al diálogo
                                (window as any).__pendingPayrollId = payroll.id;
                                setCreatePaymentDialogOpen(true);
                              }}
                            >
                              Pagar
                            </Button>
                          )}
                          {payroll.journal_entry_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Navegar al asiento en el libro diario
                                setActiveTab("journal");
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 11. RETRIBUCIONES DE SOCIOS/ADMINISTRADORES */}
        <TabsContent value="compensations" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Retribuciones de Socios/Administradores</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const { data, error } = await (supabase.rpc as any)("generate_partner_compensations_for_month", {
                      p_year: selectedYear,
                      p_month: selectedMonth,
                      p_mode: "STRICT_CLOSED_REQUIRED",
                    });
                    if (error) throw error;
                    const result = data || {};
                    const created = result.created_count ?? 0;
                    const skipped = result.skipped_existing_count ?? 0;
                    const skips = result.skips || [];
                    const firstSkip = skips[0];
                    if (created > 0) {
                      toast({
                        title: "Nóminas generadas",
                        description: `Creadas ${created} retribución(es) en DRAFT. ${skipped > 0 ? `Omitidas ${skipped} (ya existían).` : ""}`,
                      });
                      fetchPartnerCompensations();
                    } else if (firstSkip?.reason === "PERIOD_NOT_CLOSED") {
                      toast({
                        title: "Mes de referencia no cerrado",
                        description: firstSkip.message || "Cierre el mes anterior antes de generar nóminas.",
                        variant: "destructive",
                      });
                    } else if (skipped > 0) {
                      toast({
                        title: "Sin nuevas nóminas",
                        description: `Todas las retribuciones de ${selectedMonth}/${selectedYear} ya existen (${skipped} omitidas).`,
                      });
                    } else {
                      toast({
                        title: "Sin socios activos",
                        description: "No hay socios activos para generar retribuciones.",
                        variant: "destructive",
                      });
                    }
                  } catch (error: any) {
                    const code = error?.code || error?.details?.code;
                    const isDuplicate = code === "23505" || (error?.message || "").includes("duplicate key");
                    if (isDuplicate) {
                      toast({
                        title: "Nóminas ya existentes",
                        description: `Las retribuciones de ${selectedMonth}/${selectedYear} ya existen. Revisa el listado.`,
                        variant: "destructive",
                      });
                      fetchPartnerCompensations();
                    } else {
                      toast({
                        title: "Error",
                        description: error.message || "Error al generar nóminas",
                        variant: "destructive",
                      });
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generar DRAFT de socios ({selectedMonth}/{selectedYear})
              </Button>
              <Button onClick={() => setCreateCompensationDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Retribución
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listado de Retribuciones</CardTitle>
              <CardDescription>
                Período: {selectedYear} - {filterType === "month" && format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM", { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Retribución</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Socio/Administrador</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">IRPF</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Asiento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerCompensations.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-mono">{comp.compensation_number}</TableCell>
                      <TableCell>{comp.period_year}/{comp.period_month}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{comp.partner_number}</div>
                          <div>{comp.partner_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(comp.gross_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(comp.irpf_amount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(comp.net_amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            comp.status === "PAID"
                              ? "default"
                              : comp.status === "POSTED"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {comp.status === "DRAFT" && "Borrador"}
                          {comp.status === "POSTED" && "Posteada"}
                          {comp.status === "PAID" && "Pagada"}
                          {comp.status === "CANCELLED" && "Cancelada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {comp.journal_entry_number ? (
                          <span className="font-mono text-sm">{comp.journal_entry_number}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {comp.status === "DRAFT" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setLoading(true);
                                    const { error } = await (supabase.rpc as any)("recalculate_partner_compensation_run", {
                                      p_run_id: comp.id,
                                    });
                                    if (error) throw error;
                                    toast({
                                      title: "Recalculado",
                                      description: "Base y bonus actualizados según configuración actual",
                                    });
                                    fetchPartnerCompensations();
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.message || "Error al recalcular",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                              >
                                Recalcular
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setLoading(true);
                                    const { error } = await supabase.rpc("post_partner_compensation_run", {
                                      p_compensation_run_id: comp.id,
                                    });
                                    if (error) throw error;
                                    toast({
                                      title: "Retribución posteada",
                                      description: "El asiento contable se ha generado automáticamente",
                                    });
                                    fetchPartnerCompensations();
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.message || "Error al postear la retribución",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                              >
                                Postear
                              </Button>
                            </>
                          )}
                          {comp.status === "POSTED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Guardar el ID temporalmente para pasarlo al diálogo
                                (window as any).__pendingCompensationId = comp.id;
                                setCreatePaymentDialogOpen(true);
                              }}
                            >
                              Pagar
                            </Button>
                          )}
                          {comp.journal_entry_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActiveTab("journal");
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 12. PAGOS DE NÓMINAS Y RETRIBUCIONES */}
        <TabsContent value="payroll-payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Pagos de Nóminas y Retribuciones</CardTitle>
            <Button onClick={() => setCreatePaymentDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listado de Pagos</CardTitle>
              <CardDescription>
                Del {format(new Date(periodDates.start), "dd/MM/yyyy")} al {format(new Date(periodDates.end), "dd/MM/yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Pago</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Asiento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">{payment.payment_number}</TableCell>
                      <TableCell>{format(new Date(payment.payment_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={payment.payroll_run_id ? "default" : "secondary"}>
                          {payment.payroll_run_id ? "Nómina" : "Retribución"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {payment.payroll_number || payment.compensation_number}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        {payment.bank_name ? (
                          <span className="text-sm">{payment.bank_name.replace(/^Pago desde /, "")}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>
                        {payment.journal_entry_number ? (
                          <span className="font-mono text-sm">{payment.journal_entry_number}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.journal_entry_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveTab("journal");
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 13. INFORMES IRPF */}
        <TabsContent value="irpf-reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Informes IRPF - Modelo 111</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportIrpfCsv}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={uploadIrpfToSharePoint}
                disabled={uploadingIrpf}
              >
                {uploadingIrpf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {uploadingIrpf ? "Subiendo..." : "Guardar en SharePoint"}
              </Button>
              {irpfSharepointUrl && (
                <a href={irpfSharepointUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Resumen Modelo 111 */}
          {irpfModel111Summary && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen Total IRPF</CardTitle>
                <CardDescription>
                  Del {format(new Date(periodDates.start), "dd/MM/yyyy")} al {format(new Date(periodDates.end), "dd/MM/yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total IRPF Acumulado</p>
                    <p className="text-2xl font-bold">{formatCurrency(irpfModel111Summary.total_irpf_accumulated)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IRPF Nóminas</p>
                    <p className="text-xl font-semibold">{formatCurrency(irpfModel111Summary.total_payroll_irpf)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IRPF Retribuciones</p>
                    <p className="text-xl font-semibold">{formatCurrency(irpfModel111Summary.total_compensation_irpf)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Documentos</p>
                    <p className="text-xl font-semibold">{irpfModel111Summary.total_documents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Empleados</p>
                    <p className="text-xl font-semibold">{irpfModel111Summary.total_employees}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Socios</p>
                    <p className="text-xl font-semibold">{irpfModel111Summary.total_partners}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* IRPF por Período */}
          <Card>
            <CardHeader>
              <CardTitle>IRPF por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Año</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Total IRPF</TableHead>
                    <TableHead className="text-right">Nóminas</TableHead>
                    <TableHead className="text-right">Retribuciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {irpfByPeriod.map((item) => (
                    <TableRow key={`${item.period_year}-${item.period_month}`}>
                      <TableCell>{item.period_year}</TableCell>
                      <TableCell>{item.period_month}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total_irpf)}</TableCell>
                      <TableCell className="text-right">{item.payroll_count}</TableCell>
                      <TableCell className="text-right">{item.compensation_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* IRPF por Persona */}
          <Card>
            <CardHeader>
              <CardTitle>IRPF por Persona</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>ID Interno</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">IRPF</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Documentos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {irpfByPerson.map((person) => (
                    <TableRow key={`${person.person_type}-${person.person_id}`}>
                      <TableCell>
                        <Badge variant={person.person_type === "EMPLOYEE" ? "default" : "secondary"}>
                          {person.person_type === "EMPLOYEE" ? "Empleado" : "Socio"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{person.person_number}</TableCell>
                      <TableCell>{person.person_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(person.total_gross)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(person.total_irpf)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(person.total_net)}</TableCell>
                      <TableCell>{person.document_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* IRPF Profesionales (facturas de compra con retención) */}
          {professionalIrpf.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>IRPF Profesionales (casillas 04-06 Modelo 111)</CardTitle>
                <CardDescription>
                  Retenciones IRPF en facturas de compra a profesionales —{" "}
                  {format(new Date(periodDates.start), "dd/MM/yyyy")} al {format(new Date(periodDates.end), "dd/MM/yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Factura</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>NIF</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Retención IRPF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professionalIrpf.map((row) => (
                      <TableRow key={row.purchase_invoice_id}>
                        <TableCell className="font-mono">{row.invoice_number}</TableCell>
                        <TableCell>{row.issue_date}</TableCell>
                        <TableCell>{row.supplier_name ?? "—"}</TableCell>
                        <TableCell className="font-mono">{row.supplier_tax_id ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(row.subtotal))}</TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">
                          {formatCurrency(Number(row.withholding_amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell colSpan={4}>Total Profesionales</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(professionalIrpf.reduce((s, r) => s + Number(r.subtotal), 0))}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        {formatCurrency(professionalIrpf.reduce((s, r) => s + Number(r.withholding_amount), 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 9. INFORMES Y EXPORTACIONES */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informes y Exportaciones</CardTitle>
              <CardDescription>Genera informes en diferentes formatos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar Balance (PDF)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PyG (PDF)
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={exportVatExcel} disabled={loadingExport}>
                  <FileText className="h-4 w-4 mr-2" />
                  {loadingExport ? "Generando..." : "Exportar IVA (Excel)"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={uploadVatToSharePoint}
                  disabled={uploadingVat}
                >
                  {uploadingVat ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  {uploadingVat ? "Subiendo..." : "Subir IVA a SharePoint"}
                </Button>
                {vatSharepointUrl && (
                  <a href={vatSharepointUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="ghost" className="w-full justify-start text-blue-600">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver en SharePoint
                    </Button>
                  </a>
                )}
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar Saldos Terceros (CSV)
                </Button>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Los informes se generarán para el período seleccionado:{" "}
                  {format(new Date(periodDates.start), "dd/MM/yyyy")} - {format(new Date(periodDates.end), "dd/MM/yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BANCOS - Vista detalle por banco */}
        {companyBankAccounts.map((bank) => {
          const bankTabId = `bank-${bank.id}`;
          const accountCode = bankAccountCodes[bank.id] || bank.accounting_code || "";
          const bankBalance = bankAccountBalances[bank.id] || 0;
          
          return (
            <TabsContent key={bank.id} value={bankTabId} className="space-y-4">
              <BankDetailView
                bankAccount={bank}
                accountCode={accountCode}
                balance={bankBalance}
                periodStart={periodDates.start}
                periodEnd={periodDates.end}
                balanceDate={balanceDate}
                onRefresh={() => {
                  fetchBalanceSheet();
                  fetchJournalEntries();
                  fetchBankAccountBalances();
                }}
                allBankAccounts={companyBankAccounts}
              />
            </TabsContent>
          );
        })}
            </Tabs>
          </div>
        </div>
        </div>
      </div>

      {/* Diálogos */}
      <CreatePayrollDialog
        open={createPayrollDialogOpen}
        onOpenChange={setCreatePayrollDialogOpen}
        onSuccess={() => {
          fetchPayrollRuns();
        }}
      />

      <CreatePartnerCompensationDialog
        open={createCompensationDialogOpen}
        onOpenChange={setCreateCompensationDialogOpen}
        onSuccess={() => {
          fetchPartnerCompensations();
        }}
      />

      <CreatePayrollPaymentDialog
        open={createPaymentDialogOpen}
        onOpenChange={(open) => {
          setCreatePaymentDialogOpen(open);
          if (!open) {
            // Limpiar IDs temporales
            delete (window as any).__pendingPayrollId;
            delete (window as any).__pendingCompensationId;
          }
        }}
        payrollRunId={(window as any).__pendingPayrollId}
        compensationRunId={(window as any).__pendingCompensationId}
        onSuccess={() => {
          fetchPayrollPayments();
          fetchPayrollRuns();
          fetchPartnerCompensations();
          delete (window as any).__pendingPayrollId;
          delete (window as any).__pendingCompensationId;
        }}
      />

      <BankBalanceAdjustmentDialog
        open={bankAdjustmentDialogOpen}
        onOpenChange={setBankAdjustmentDialogOpen}
        bankAccounts={companyBankAccounts}
        currentTotalBalance={bankBalance}
        onSuccess={() => {
          fetchBalanceSheet();
          fetchJournalEntries();
          fetchBankAccountBalances();
        }}
      />

      <BankOpeningEntryDialog
        open={bankOpeningDialogOpen}
        onOpenChange={setBankOpeningDialogOpen}
        bankAccounts={companyBankAccounts}
        onSuccess={() => {
          fetchBalanceSheet();
          fetchJournalEntries();
          fetchBankAccountBalances();
        }}
      />

      <BankTransferDialog
        open={bankTransferDialogOpen}
        onOpenChange={setBankTransferDialogOpen}
        onSuccess={() => {
          fetchBalanceSheet();
          fetchJournalEntries();
          fetchBankAccountBalances();
        }}
      />

      <TaxPaymentDialog
        open={taxPaymentDialogOpen}
        onOpenChange={setTaxPaymentDialogOpen}
        bankAccounts={companyBankAccounts}
        onSuccess={() => {
          fetchBalanceSheet();
          fetchJournalEntries();
          fetchBankAccountBalances();
        }}
      />

      <ManualMovementDialog
        open={manualExpenseDialogOpen}
        onOpenChange={setManualExpenseDialogOpen}
        bankAccounts={companyBankAccounts}
        movementType="EXPENSE"
        onSuccess={() => {
          fetchBalanceSheet();
          fetchJournalEntries();
          fetchBankAccountBalances();
          fetchProfitLoss();
        }}
      />

      <ManualMovementDialog
        open={manualIncomeDialogOpen}
        onOpenChange={setManualIncomeDialogOpen}
        bankAccounts={companyBankAccounts}
        movementType="INCOME"
        onSuccess={() => {
          fetchBalanceSheet();
          fetchJournalEntries();
          fetchBankAccountBalances();
          fetchProfitLoss();
        }}
      />
    </div>
  );
};

export default AccountingPage;
