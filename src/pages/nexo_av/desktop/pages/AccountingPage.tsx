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

interface CompanyBankAccount {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
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
  const [companyBankAccounts, setCompanyBankAccounts] = useState<CompanyBankAccount[]>([]);

  // Diálogos
  const [createPayrollDialogOpen, setCreatePayrollDialogOpen] = useState(false);
  const [createCompensationDialogOpen, setCreateCompensationDialogOpen] = useState(false);
  const [createPaymentDialogOpen, setCreatePaymentDialogOpen] = useState(false);
  const [bankAdjustmentDialogOpen, setBankAdjustmentDialogOpen] = useState(false);
  const [bankOpeningDialogOpen, setBankOpeningDialogOpen] = useState(false);
  const [bankTransferDialogOpen, setBankTransferDialogOpen] = useState(false);
  const [taxPaymentDialogOpen, setTaxPaymentDialogOpen] = useState(false);
  const [manualExpenseDialogOpen, setManualExpenseDialogOpen] = useState(false);
  const [manualIncomeDialogOpen, setManualIncomeDialogOpen] = useState(false);
  
  // Estado para saldos de bancos por cuenta
  const [bankAccountBalances, setBankAccountBalances] = useState<Record<string, number>>({});

  // Cálculos del dashboard - usando datos reales
  const totalRevenue = profitLoss
    .filter((item) => item.account_type === "REVENUE")
    .reduce((sum, item) => sum + item.amount, 0);

  // Gastos operativos (excluyendo provisiones de IS - cuenta 630xxx)
  const operatingExpenses = profitLoss
    .filter((item) => item.account_type === "EXPENSE" && !item.account_code.startsWith("630"))
    .reduce((sum, item) => sum + item.amount, 0);

  // Total gastos incluyendo provisiones
  const totalExpenses = profitLoss
    .filter((item) => item.account_type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount, 0);

  // BAI = Ingresos - Gastos Operativos (antes de IS)
  const profitBeforeTax = totalRevenue - operatingExpenses;
  const corporateTax = corporateTaxSummary?.tax_amount || 0;
  const netProfit = profitBeforeTax - corporateTax;

  // Tesorería - datos reales del balance
  const bankBalance = balanceSheet.find((item) => item.account_code.startsWith("572"))?.net_balance || 0;
  const clientsPending = clientBalances.reduce((sum, c) => sum + Math.max(0, c.net_balance), 0);
  const suppliersPending = supplierBalances.reduce((sum, s) => sum + Math.max(0, Math.abs(s.net_balance)), 0);
  const techniciansPending = supplierBalances
    .filter(s => s.third_party_type === "TECHNICIAN")
    .reduce((sum, t) => sum + Math.max(0, Math.abs(t.net_balance)), 0);
  const availableCash = bankBalance - suppliersPending - techniciansPending;

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
      // get_irpf_summary devuelve un número directamente, no un objeto
      setIrpfSummary(typeof data === 'number' ? data : 0);
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

  const fetchCompanyBankAccounts = async () => {
    try {
      const { data, error } = await supabase.rpc("get_company_preferences");
      if (error) throw error;
      if (data && data.length > 0 && data[0].bank_accounts) {
        const accounts = Array.isArray(data[0].bank_accounts) 
          ? (data[0].bank_accounts as unknown as CompanyBankAccount[])
          : [];
        setCompanyBankAccounts(accounts);
      }
    } catch (error: any) {
      console.error("Error fetching company bank accounts:", error);
    }
  };

  const fetchBankAccountBalances = async () => {
    try {
      const { data, error } = await (supabase.rpc as any)("list_bank_accounts_with_balances", {
        p_as_of_date: balanceDate,
      });
      if (error) throw error;
      
      if (data && Array.isArray(data)) {
        const balances: Record<string, number> = {};
        data.forEach((item: any) => {
          if (item.bank_account_id) {
            balances[item.bank_account_id] = item.balance || 0;
          }
        });
        setBankAccountBalances(balances);
      }
    } catch (error: any) {
      console.error("Error fetching bank account balances:", error);
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
      fetchCompanyBankAccounts(),
      fetchBankAccountBalances(),
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
    <div className="AccountingPage w-full h-full flex flex-col">
      {/* Contenedor principal con Sidebar y Contenido */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar fijo a la izquierda */}
        <aside className="w-48 border-r bg-card/50 flex-shrink-0 overflow-y-auto">
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Resumen
            </button>
            <button
              onClick={() => setActiveTab("journal")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "journal"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Libro Diario
            </button>
            <button
              onClick={() => setActiveTab("cash")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "cash"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              Libro de Caja
            </button>
            <button
              onClick={() => setActiveTab("chart")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "chart"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Plan Contable
            </button>
            <button
              onClick={() => setActiveTab("clients")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "clients"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Clientes
            </button>
            <button
              onClick={() => setActiveTab("suppliers")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "suppliers"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" />
              Proveedores
            </button>
            <button
              onClick={() => setActiveTab("taxes")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "taxes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Percent className="h-4 w-4" />
              Impuestos
            </button>
            <button
              onClick={() => setActiveTab("profit-loss")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "profit-loss"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              PyG
            </button>
            <button
              onClick={() => setActiveTab("balance")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "balance"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              Balance
            </button>
            <div className="pt-4 pb-2">
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nóminas
              </div>
            </div>
            <button
              onClick={() => setActiveTab("payroll")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "payroll"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Empleados
            </button>
            <button
              onClick={() => setActiveTab("compensations")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "compensations"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <UserCog className="h-3.5 w-3.5" />
              Retribuciones
            </button>
            <button
              onClick={() => setActiveTab("payroll-payments")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "payroll-payments"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Pagos
            </button>
            <button
              onClick={() => setActiveTab("irpf-reports")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "irpf-reports"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Receipt className="h-4 w-4" />
              Informes IRPF
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "reports"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
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
              
              {/* Controles de filtro - Estilo Dashboard */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 bg-secondary/50 rounded-lg p-1 border border-border/50">
                  <button
                    onClick={() => setFilterType("year")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      filterType === "year" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Año
                  </button>
                  <button
                    onClick={() => setFilterType("quarter")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      filterType === "quarter" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Trimestre
                  </button>
                  <button
                    onClick={() => setFilterType("month")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      filterType === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Mes
                  </button>
                </div>

                {filterType === "year" && (
                  <Input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-20 h-8 text-xs"
                    placeholder="Año"
                  />
                )}

                {filterType === "quarter" && (
                  <>
                    <Input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-20 h-8 text-xs"
                      placeholder="Año"
                    />
                    <Select value={selectedQuarter.toString()} onValueChange={(v) => setSelectedQuarter(parseInt(v))}>
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}

                {filterType === "month" && (
                  <>
                    <Input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-20 h-8 text-xs"
                      placeholder="Año"
                    />
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger className="w-32 h-8 text-xs">
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
                  </>
                )}

                <Input
                  id="balance-date"
                  type="date"
                  value={balanceDate}
                  onChange={(e) => setBalanceDate(e.target.value)}
                  className="w-36 h-8 text-xs"
                />

                <Button onClick={loadAllData} disabled={loading} size="sm" variant="outline" className="h-8 text-xs">
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Filter className="h-3 w-3 mr-1" />}
                  Actualizar
                </Button>

                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Exportar
                </Button>
              </div>
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
                  <span className="text-sm text-muted-foreground">Margen bruto:</span>
                  <span className="font-semibold">
                    {totalRevenue > 0 ? `${((profitBeforeTax / totalRevenue) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Margen neto:</span>
                  <span className="font-semibold">
                    {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ROI estimado:</span>
                  <span className={`font-semibold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {totalExpenses > 0 ? `${((netProfit / totalExpenses) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ratio Ingresos/Gastos:</span>
                    <span className="font-bold">
                      {totalExpenses > 0 ? (totalRevenue / totalExpenses).toFixed(2) : "0.00"}
                    </span>
                  </div>
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
        bankAccounts={companyBankAccounts}
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
