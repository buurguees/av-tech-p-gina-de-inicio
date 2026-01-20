import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  UserCog,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfYear, startOfQuarter, startOfMonth, endOfMonth, endOfQuarter, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import CreatePayrollDialog from "./components/CreatePayrollDialog";
import CreatePartnerCompensationDialog from "./components/CreatePartnerCompensationDialog";
import CreatePayrollPaymentDialog from "./components/CreatePayrollPaymentDialog";

interface BalanceSheetItem {
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
  net_balance: number;
}

interface ProfitLossItem {
  account_code: string;
  account_name: string;
  account_type: string;
  amount: number;
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

interface VATSummary {
  vat_received: number;
  vat_paid: number;
  vat_balance: number;
  vat_to_pay: number;
}

interface CorporateTaxSummary {
  profit_before_tax: number;
  tax_rate: number;
  tax_amount: number;
  provision_entry_id: string | null;
  provision_entry_number: string | null;
  provision_date: string | null;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  project_id: string | null;
  project_name: string | null;
  is_locked: boolean;
  created_by_name: string | null;
  created_at: string;
  total_debit: number;
  total_credit: number;
}

interface ChartOfAccount {
  account_code: string;
  account_name: string;
  account_type: string;
  is_active: boolean;
  description: string | null;
}

interface PayrollRun {
  id: string;
  payroll_number: string;
  period_year: number;
  period_month: number;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  gross_amount: number;
  irpf_rate: number;
  irpf_amount: number;
  net_amount: number;
  status: string;
  journal_entry_id: string | null;
  journal_entry_number: string | null;
  created_at: string;
}

interface PartnerCompensationRun {
  id: string;
  compensation_number: string;
  period_year: number;
  period_month: number;
  partner_id: string;
  partner_number: string;
  partner_name: string;
  gross_amount: number;
  irpf_rate: number;
  irpf_amount: number;
  net_amount: number;
  status: string;
  journal_entry_id: string | null;
  journal_entry_number: string | null;
  created_at: string;
}

interface PayrollPayment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  bank_reference: string | null;
  payroll_run_id: string | null;
  payroll_number: string | null;
  partner_compensation_run_id: string | null;
  compensation_number: string | null;
  journal_entry_id: string | null;
  journal_entry_number: string | null;
  created_at: string;
}

interface IRPFByPeriod {
  period_year: number;
  period_month: number;
  total_irpf: number;
  payroll_count: number;
  compensation_count: number;
}

interface IRPFByPerson {
  person_type: string;
  person_id: string;
  person_number: string;
  person_name: string;
  total_irpf: number;
  total_gross: number;
  total_net: number;
  document_count: number;
}

interface IRPFModel111Summary {
  total_irpf_accumulated: number;
  total_payroll_irpf: number;
  total_compensation_irpf: number;
  total_documents: number;
  total_employees: number;
  total_partners: number;
}

const AccountingPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filtros de fecha
  const [filterType, setFilterType] = useState<"year" | "quarter" | "month">("year");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor((new Date().getMonth() + 3) / 3));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [balanceDate, setBalanceDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Calcular fechas según filtro
  const getPeriodDates = () => {
    const year = selectedYear;
    let start: Date, end: Date;

    if (filterType === "year") {
      start = startOfYear(new Date(year, 0, 1));
      end = endOfYear(new Date(year, 0, 1));
    } else if (filterType === "quarter") {
      const quarterStartMonth = (selectedQuarter - 1) * 3;
      start = startOfQuarter(new Date(year, quarterStartMonth, 1));
      end = endOfQuarter(new Date(year, quarterStartMonth, 1));
    } else {
      start = startOfMonth(new Date(year, selectedMonth - 1, 1));
      end = endOfMonth(new Date(year, selectedMonth - 1, 1));
    }

    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    };
  };

  const periodDates = getPeriodDates();

  // Datos
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetItem[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLossItem[]>([]);
  const [clientBalances, setClientBalances] = useState<ClientBalance[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<SupplierTechnicianBalance[]>([]);
  const [vatSummary, setVatSummary] = useState<VATSummary | null>(null);
  const [irpfSummary, setIrpfSummary] = useState<number>(0);
  const [corporateTaxSummary, setCorporateTaxSummary] = useState<CorporateTaxSummary | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [partnerCompensations, setPartnerCompensations] = useState<PartnerCompensationRun[]>([]);
  const [payrollPayments, setPayrollPayments] = useState<PayrollPayment[]>([]);
  const [irpfByPeriod, setIrpfByPeriod] = useState<IRPFByPeriod[]>([]);
  const [irpfByPerson, setIrpfByPerson] = useState<IRPFByPerson[]>([]);
  const [irpfModel111Summary, setIrpfModel111Summary] = useState<IRPFModel111Summary | null>(null);

  // Diálogos
  const [createPayrollDialogOpen, setCreatePayrollDialogOpen] = useState(false);
  const [createCompensationDialogOpen, setCreateCompensationDialogOpen] = useState(false);
  const [createPaymentDialogOpen, setCreatePaymentDialogOpen] = useState(false);

  // Cálculos del dashboard
  const totalRevenue = profitLoss
    .filter((item) => item.account_type === "REVENUE")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = profitLoss
    .filter((item) => item.account_type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount, 0);

  const profitBeforeTax = totalRevenue - totalExpenses;
  const corporateTax = corporateTaxSummary?.tax_amount || 0;
  const netProfit = profitBeforeTax - corporateTax;

  // Tesorería
  const bankBalance = balanceSheet.find((item) => item.account_code === "572000")?.net_balance || 0;
  const clientsPending = clientBalances.reduce((sum, c) => sum + Math.max(0, c.net_balance), 0);
  const suppliersPending = supplierBalances.reduce((sum, s) => sum + Math.max(0, Math.abs(s.net_balance)), 0);
  const availableCash = bankBalance - suppliersPending;

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_balance_sheet", {
        p_as_of_date: balanceDate,
      });
      if (error) throw error;
      setBalanceSheet(data || []);
    } catch (error: any) {
      console.error("Error fetching balance sheet:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar el balance de situación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitLoss = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_profit_loss", {
        p_period_start: periodDates.start,
        p_period_end: periodDates.end,
      });
      if (error) throw error;
      setProfitLoss(data || []);
    } catch (error: any) {
      console.error("Error fetching profit loss:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar la cuenta de resultados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_client_balances", {
        p_as_of_date: balanceDate,
      });
      if (error) throw error;
      setClientBalances(data || []);
    } catch (error: any) {
      console.error("Error fetching client balances:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar saldos de clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_supplier_technician_balances", {
        p_as_of_date: balanceDate,
      });
      if (error) throw error;
      setSupplierBalances(data || []);
    } catch (error: any) {
      console.error("Error fetching supplier balances:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar saldos de proveedores/técnicos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVATSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_vat_summary", {
        p_period_start: periodDates.start,
        p_period_end: periodDates.end,
      });
      if (error) throw error;
      setVatSummary(data?.[0] || null);
    } catch (error: any) {
      console.error("Error fetching VAT summary:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar resumen de IVA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchIRPFSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_irpf_summary", {
        p_period_start: periodDates.start,
        p_period_end: periodDates.end,
      });
      if (error) throw error;
      setIrpfSummary(data?.[0]?.irpf_accumulated || 0);
    } catch (error: any) {
      console.error("Error fetching IRPF summary:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar resumen de IRPF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCorporateTaxSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_corporate_tax_summary", {
        p_period_start: periodDates.start,
        p_period_end: periodDates.end,
      });
      if (error) throw error;
      setCorporateTaxSummary(data?.[0] || null);
    } catch (error: any) {
      console.error("Error fetching corporate tax summary:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar resumen de Impuesto de Sociedades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_journal_entries", {
        p_start_date: periodDates.start,
        p_end_date: periodDates.end,
        p_limit: 1000,
        p_offset: 0,
      });
      if (error) throw error;
      setJournalEntries(data || []);
    } catch (error: any) {
      console.error("Error fetching journal entries:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar asientos contables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChartOfAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_chart_of_accounts", {
        p_only_active: true,
      });
      if (error) throw error;
      setChartOfAccounts((data || []).map((item: any) => ({
        account_code: item.account_code,
        account_name: item.account_name,
        account_type: item.account_type,
        is_active: item.is_active,
        description: item.description,
      })));
    } catch (error: any) {
      console.error("Error fetching chart of accounts:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar plan contable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollRuns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_payroll_runs", {
        p_period_year: selectedYear,
        p_period_month: filterType === "month" ? selectedMonth : null,
        p_limit: 1000,
      });
      if (error) throw error;
      setPayrollRuns(data || []);
    } catch (error: any) {
      console.error("Error fetching payroll runs:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar nóminas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerCompensations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_partner_compensation_runs", {
        p_period_year: selectedYear,
        p_period_month: filterType === "month" ? selectedMonth : null,
        p_limit: 1000,
      });
      if (error) throw error;
      setPartnerCompensations(data || []);
    } catch (error: any) {
      console.error("Error fetching partner compensations:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar retribuciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_payroll_payments", {
        p_start_date: periodDates.start,
        p_end_date: periodDates.end,
        p_limit: 1000,
      });
      if (error) throw error;
      setPayrollPayments(data || []);
    } catch (error: any) {
      console.error("Error fetching payroll payments:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar pagos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchIRPFByPeriod = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_irpf_by_period", {
        p_period_start: periodDates.start,
        p_period_end: periodDates.end,
      });
      if (error) throw error;
      setIrpfByPeriod(data || []);
    } catch (error: any) {
      console.error("Error fetching IRPF by period:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar IRPF por período",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchIRPFByPerson = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_irpf_by_person", {
        p_period_start: periodDates.start,
        p_period_end: periodDates.end,
      });
      if (error) throw error;
      setIrpfByPerson(data || []);
    } catch (error: any) {
      console.error("Error fetching IRPF by person:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar IRPF por persona",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchIRPFModel111Summary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_irpf_model_111_summary", {
        p_period_start: periodDates.start,
        p_period_end: periodDates.end,
      });
      if (error) throw error;
      setIrpfModel111Summary(data?.[0] || null);
    } catch (error: any) {
      console.error("Error fetching IRPF Model 111 summary:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar resumen IRPF Modelo 111",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      fetchBalanceSheet(),
      fetchProfitLoss(),
      fetchClientBalances(),
      fetchSupplierBalances(),
      fetchVATSummary(),
      fetchIRPFSummary(),
      fetchCorporateTaxSummary(),
      fetchJournalEntries(),
      fetchChartOfAccounts(),
    ]);
  };

  useEffect(() => {
    if (activeTab === "dashboard") {
      loadAllData();
    } else if (activeTab === "journal") {
      fetchJournalEntries();
    } else if (activeTab === "chart") {
      fetchChartOfAccounts();
      fetchBalanceSheet();
    } else if (activeTab === "clients") {
      fetchClientBalances();
    } else if (activeTab === "suppliers") {
      fetchSupplierBalances();
    } else if (activeTab === "taxes") {
      fetchVATSummary();
      fetchIRPFSummary();
      fetchCorporateTaxSummary();
    } else if (activeTab === "profit-loss") {
      fetchProfitLoss();
    } else if (activeTab === "balance") {
      fetchBalanceSheet();
    } else if (activeTab === "payroll") {
      fetchPayrollRuns();
    } else if (activeTab === "compensations") {
      fetchPartnerCompensations();
    } else if (activeTab === "payroll-payments") {
      fetchPayrollPayments();
    } else if (activeTab === "irpf-reports") {
      fetchIRPFByPeriod();
      fetchIRPFByPerson();
      fetchIRPFModel111Summary();
    }
  }, [activeTab, filterType, selectedYear, selectedQuarter, selectedMonth, balanceDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleViewDocument = (referenceType: string | null, referenceId: string | null) => {
    if (!referenceId) return;

    if (referenceType === "invoice") {
      navigate(`/nexo-av/${userId}/invoices/${referenceId}`);
    } else if (referenceType === "purchase_invoice") {
      navigate(`/nexo-av/${userId}/purchase-invoices/${referenceId}`);
    }
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ASSET: "Activo",
      LIABILITY: "Pasivo",
      EQUITY: "Patrimonio",
      REVENUE: "Ingreso",
      EXPENSE: "Gasto",
      TAX: "Impuesto",
    };
    return labels[type] || type;
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <BookOpen className="h-6 w-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contabilidad</h1>
            <p className="text-sm text-muted-foreground">Sistema contable interno con gestión de terceros e impuestos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros de período */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Filtro:</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as "year" | "quarter" | "month")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Año</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === "year" && (
              <div className="flex items-center gap-2">
                <Label>Año:</Label>
                <Input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-24"
                />
              </div>
            )}

            {filterType === "quarter" && (
              <>
                <div className="flex items-center gap-2">
                  <Label>Año:</Label>
                  <Input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-24"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Trimestre:</Label>
                  <Select value={selectedQuarter.toString()} onValueChange={(v) => setSelectedQuarter(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1</SelectItem>
                      <SelectItem value="2">Q2</SelectItem>
                      <SelectItem value="3">Q3</SelectItem>
                      <SelectItem value="4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {filterType === "month" && (
              <>
                <div className="flex items-center gap-2">
                  <Label>Año:</Label>
                  <Input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-24"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Mes:</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {format(new Date(selectedYear, month - 1, 1), "MMMM", { locale: es })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Label htmlFor="balance-date">Fecha balance:</Label>
              <Input
                id="balance-date"
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
                className="w-40"
              />
            </div>

            <Button onClick={loadAllData} disabled={loading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4 mr-2" />}
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-9 xl:grid-cols-13 gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="journal">Libro Diario</TabsTrigger>
          <TabsTrigger value="chart">Plan Contable</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="taxes">Impuestos</TabsTrigger>
          <TabsTrigger value="profit-loss">PyG</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="payroll">Nóminas</TabsTrigger>
          <TabsTrigger value="compensations">Retribuciones</TabsTrigger>
          <TabsTrigger value="payroll-payments">Pagos</TabsTrigger>
          <TabsTrigger value="irpf-reports">IRPF</TabsTrigger>
          <TabsTrigger value="reports">Informes</TabsTrigger>
        </TabsList>

        {/* 1. DASHBOARD CONTABLE */}
        <TabsContent value="dashboard" className="space-y-4">
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
                <CardTitle className="text-sm font-medium">Gastos</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">Período seleccionado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">BAI</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${profitBeforeTax >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(profitBeforeTax)}
                </div>
                <p className="text-xs text-muted-foreground">Beneficio antes de impuestos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IS Provisionado</CardTitle>
                <Percent className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(corporateTax)}</div>
                <p className="text-xs text-muted-foreground">
                  {corporateTaxSummary?.tax_rate || 25}% sobre BAI
                </p>
              </CardContent>
            </Card>
          </div>

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
                  <span className="font-semibold text-green-600">{formatCurrency(clientsPending)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Proveedores pendientes:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(suppliersPending)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-semibold">Saldo disponible:</span>
                    <span className={`font-bold text-lg ${availableCash >= 0 ? "text-green-600" : "text-red-600"}`}>
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

          {/* Resultado neto */}
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
        </TabsContent>

        {/* 2. LIBRO DIARIO */}
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Libro Diario - Asientos Contables</CardTitle>
              <CardDescription>
                Del {format(new Date(periodDates.start), "dd/MM/yyyy")} al {format(new Date(periodDates.end), "dd/MM/yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nº Asiento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">DEBE</TableHead>
                    <TableHead className="text-right">HABER</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.entry_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-mono">{entry.entry_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getEntryTypeLabel(entry.entry_type)}</Badge>
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.total_debit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.total_credit)}</TableCell>
                      <TableCell>
                        {entry.reference_type && entry.reference_id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(entry.reference_type, entry.reference_id)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.is_locked ? (
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Bloqueado
                          </Badge>
                        ) : (
                          <Badge variant="outline">Abierto</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. PLAN CONTABLE */}
        <TabsContent value="chart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan Contable</CardTitle>
              <CardDescription>Cuentas contables y sus saldos</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Saldo Actual</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartOfAccounts.map((account) => {
                    const balance = balanceSheet.find((b) => b.account_code === account.account_code);
                    return (
                      <TableRow key={account.account_code}>
                        <TableCell className="font-mono">{account.account_code}</TableCell>
                        <TableCell>{account.account_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getAccountTypeLabel(account.account_type)}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${(balance?.net_balance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(balance?.net_balance || 0)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            Ver movimientos
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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

        {/* 10. NÓMINAS DE EMPLEADOS */}
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
          <div className="flex items-center justify-between">
            <CardTitle>Retribuciones de Socios/Administradores</CardTitle>
            <Button onClick={() => setCreateCompensationDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Retribución
            </Button>
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
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
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
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar IVA (Excel)
                </Button>
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
      </Tabs>

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
    </div>
  );
};

export default AccountingPage;
