import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

export function useAccountingData(activeTab: string, userId: string | undefined) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [filterType, setFilterType] = useState<"year" | "quarter" | "month">("year");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor((new Date().getMonth() + 3) / 3));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [balanceDate, setBalanceDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // ── Calcular fechas según filtro ───────────────────────────────────────────
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

  // ── Estado de datos ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetItem[]>([]);
  const [periodProfitSummary, setPeriodProfitSummary] = useState<PeriodProfitSummary | null>(null);
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
  const [periodsForClosure, setPeriodsForClosure] = useState<PeriodForClosure[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [periodActionLoading, setPeriodActionLoading] = useState<string | null>(null);
  const [bankAccountBalances, setBankAccountBalances] = useState<Record<string, number>>({});
  const [bankAccountCodes, setBankAccountCodes] = useState<Record<string, string>>({});

  // Exportación fiscal
  const [vatDetail, setVatDetail] = useState<VatDetailRow[]>([]);
  const [professionalIrpf, setProfessionalIrpf] = useState<ProfessionalIrpfRow[]>([]);
  const [loadingExport, setLoadingExport] = useState(false);
  const [showVatDetail, setShowVatDetail] = useState(false);
  const [uploadingVat, setUploadingVat] = useState(false);
  const [uploadingIrpf, setUploadingIrpf] = useState(false);
  const [vatSharepointUrl, setVatSharepointUrl] = useState<string | null>(null);
  const [irpfSharepointUrl, setIrpfSharepointUrl] = useState<string | null>(null);

  // ── Fetch functions ────────────────────────────────────────────────────────

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
      toast({ title: "Error", description: error.message || "Error al cargar el balance de situación", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar la cuenta de resultados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodProfitSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_period_profit_summary", {
        p_start: periodDates.start,
        p_end: periodDates.end,
      });
      if (error) throw error;
      setPeriodProfitSummary((data?.[0] as PeriodProfitSummary | undefined) || null);
    } catch (error: any) {
      console.error("Error fetching period profit summary:", error);
      toast({ title: "Error", description: error.message || "Error al cargar el resumen canonico de PyG", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodsForClosure = async () => {
    setLoadingPeriods(true);
    try {
      const { data, error } = await supabase.rpc("list_periods_for_closure", {
        p_months_back: 24,
      });
      if (error) throw error;
      setPeriodsForClosure((data || []) as PeriodForClosure[]);
    } catch (error: any) {
      console.error("Error fetching periods for closure:", error);
      toast({ title: "Error", description: error.message || "Error al cargar el listado de periodos", variant: "destructive" });
    } finally {
      setLoadingPeriods(false);
    }
  };

  const handleOpenPeriod = async (year: number, month: number) => {
    const key = `${year}-${month}`;
    setPeriodActionLoading(key);
    try {
      const { error } = await supabase.rpc("open_period", { p_year: year, p_month: month });
      if (error) throw error;
      toast({ title: "Periodo reabierto", description: `Se puede volver a registrar en ${format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es })}.` });
      await fetchPeriodsForClosure();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo reabrir el periodo", variant: "destructive" });
    } finally {
      setPeriodActionLoading(null);
    }
  };

  const handleClosePeriod = async (year: number, month: number) => {
    const key = `${year}-${month}`;
    setPeriodActionLoading(key);
    try {
      const { error } = await supabase.rpc("close_period", { p_year: year, p_month: month });
      if (error) throw error;
      toast({ title: "Periodo cerrado", description: `Contabilidad de ${format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es })} cerrada.` });
      await fetchPeriodsForClosure();
      if (activeTab === "profit-loss") fetchProfitLoss();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo cerrar el periodo", variant: "destructive" });
    } finally {
      setPeriodActionLoading(null);
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
      toast({ title: "Error", description: error.message || "Error al cargar saldos de clientes", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar saldos de proveedores/técnicos", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar resumen de IVA", variant: "destructive" });
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
      setIrpfSummary(typeof data === "number" ? data : 0);
    } catch (error: any) {
      console.error("Error fetching IRPF summary:", error);
      toast({ title: "Error", description: error.message || "Error al cargar resumen de IRPF", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar resumen de Impuesto de Sociedades", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchVatDetail = async () => {
    try {
      const { data, error } = await supabase.rpc("get_vat_detail_for_export", {
        p_start: periodDates.start,
        p_end: periodDates.end,
      });
      if (error) throw error;
      setVatDetail((data || []) as VatDetailRow[]);
    } catch (error: any) {
      console.error("Error fetching VAT detail:", error);
    }
  };

  const fetchProfessionalIrpf = async () => {
    try {
      const { data, error } = await supabase.rpc("get_professional_withholding_irpf", {
        p_start: periodDates.start,
        p_end: periodDates.end,
      });
      if (error) throw error;
      setProfessionalIrpf((data || []) as ProfessionalIrpfRow[]);
    } catch (error: any) {
      console.error("Error fetching professional IRPF:", error);
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
      toast({ title: "Error", description: error.message || "Error al cargar asientos contables", variant: "destructive" });
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
      setChartOfAccounts(
        (data || []).map((item: any) => ({
          account_code: item.account_code,
          account_name: item.account_name,
          account_type: item.account_type,
          is_active: item.is_active,
          description: item.description,
        }))
      );
    } catch (error: any) {
      console.error("Error fetching chart of accounts:", error);
      toast({ title: "Error", description: error.message || "Error al cargar plan contable", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar nóminas", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar retribuciones", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar pagos", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar IRPF por período", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar IRPF por persona", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Error al cargar resumen IRPF Modelo 111", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyBankAccounts = async () => {
    try {
      const { data, error } = await (supabase.rpc as any)("list_company_bank_accounts");
      if (error) throw error;
      if (data && Array.isArray(data)) {
        const accounts: CompanyBankAccount[] = data
          .filter((a: any) => a.is_active !== false)
          .map((a: any) => ({
            id: a.id,
            holder: a.holder_name || "",
            bank: a.bank_name || "",
            iban: a.iban || "",
            notes: a.notes || "",
            accounting_code: a.accounting_code || "",
          }));
        setCompanyBankAccounts(accounts);
        const codes: Record<string, string> = {};
        accounts.forEach((acc) => {
          if (acc.accounting_code) codes[acc.id] = acc.accounting_code;
        });
        setBankAccountCodes(codes);
      }
    } catch (error: any) {
      console.error("Error fetching company bank accounts:", error);
      try {
        const { data: prefs } = await supabase.rpc("get_company_preferences");
        if (prefs?.[0]?.bank_accounts) {
          const fallback = Array.isArray(prefs[0].bank_accounts)
            ? (prefs[0].bank_accounts as unknown as CompanyBankAccount[])
            : [];
          setCompanyBankAccounts(fallback);
        }
      } catch (_) {}
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

  const fetchBankAccountCodes = async () => {
    try {
      const codes: Record<string, string> = {};
      for (const account of companyBankAccounts) {
        const { data, error } = await (supabase.rpc as any)("get_bank_account_code", {
          p_bank_account_id: account.id,
        });
        if (!error && data) {
          codes[account.id] = data;
        }
      }
      setBankAccountCodes(codes);
    } catch (error: any) {
      console.error("Error fetching bank account codes:", error);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      fetchBalanceSheet(),
      fetchPeriodProfitSummary(),
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

  // ── Exportación ────────────────────────────────────────────────────────────

  const getQuarterForPeriod = (): number => {
    if (filterType === "quarter") return selectedQuarter;
    if (filterType === "month") return Math.ceil(selectedMonth / 3);
    return 1;
  };

  const exportVatExcel = async () => {
    setLoadingExport(true);
    try {
      const { data, error } = await supabase.rpc("get_vat_detail_for_export", {
        p_start: periodDates.start,
        p_end: periodDates.end,
      });
      if (error) throw error;
      const rows = (data || []) as VatDetailRow[];
      const repercutido = rows.filter((r) => r.tipo === "REPERCUTIDO");
      const soportado = rows.filter((r) => r.tipo === "SOPORTADO");

      const toSheet = (items: VatDetailRow[]) =>
        items.map((r) => ({
          "Nº Factura": r.invoice_number,
          Fecha: r.issue_date,
          "NIF/CIF": r.third_party_tax_id ?? "",
          Nombre: r.third_party_name ?? "",
          "Tipo IVA (%)": r.tax_rate,
          "Base Imponible": r.base_imponible,
          "Cuota IVA": r.cuota_iva,
        }));

      const totalCuotaRep = repercutido.reduce((s, r) => s + Number(r.cuota_iva), 0);
      const totalBaseRep = repercutido.reduce((s, r) => s + Number(r.base_imponible), 0);
      const totalCuotaSop = soportado.reduce((s, r) => s + Number(r.cuota_iva), 0);
      const totalBaseSop = soportado.reduce((s, r) => s + Number(r.base_imponible), 0);

      const resumen = [
        { Concepto: "IVA Repercutido - Base Imponible", Importe: totalBaseRep },
        { Concepto: "IVA Repercutido - Cuota", Importe: totalCuotaRep },
        { Concepto: "IVA Soportado - Base Imponible", Importe: totalBaseSop },
        { Concepto: "IVA Soportado - Cuota", Importe: totalCuotaSop },
        { Concepto: "Resultado (a pagar/devolver)", Importe: Math.round((totalCuotaRep - totalCuotaSop) * 100) / 100 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(repercutido)), "IVA Repercutido");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(soportado)), "IVA Soportado");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen 303");
      XLSX.writeFile(wb, `IVA_Modelo303_${periodDates.start}_${periodDates.end}.xlsx`);
      toast({ title: "Exportado", description: "Excel IVA (Modelo 303) generado correctamente" });
    } catch (error: any) {
      toast({ title: "Error al exportar IVA", description: error.message, variant: "destructive" });
    } finally {
      setLoadingExport(false);
    }
  };

  const exportIrpfCsv = () => {
    const rows: string[] = ["Tipo,NIF,Nombre,Base Rendimientos,Retención IRPF,Neto"];
    irpfByPerson.forEach((p) => {
      rows.push(
        `${p.person_type === "EMPLOYEE" ? "EMPLEADO" : "SOCIO"},,` +
          `"${p.person_name}",${p.total_gross},${p.total_irpf},${p.total_net}`
      );
    });
    professionalIrpf.forEach((p) => {
      rows.push(
        `PROFESIONAL,${p.supplier_tax_id ?? ""},` +
          `"${p.supplier_name ?? ""}",${p.subtotal},${p.withholding_amount},` +
          `${Math.round((Number(p.subtotal) - Number(p.withholding_amount)) * 100) / 100}`
      );
    });
    const csv = "\ufeff" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IRPF_Modelo111_${periodDates.start}_${periodDates.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado", description: "CSV IRPF (Modelo 111) generado correctamente" });
  };

  const uploadVatToSharePoint = async () => {
    setUploadingVat(true);
    try {
      const { data, error } = await supabase.rpc("get_vat_detail_for_export", {
        p_start: periodDates.start,
        p_end: periodDates.end,
      });
      if (error) throw error;
      const rows = (data || []) as VatDetailRow[];
      const repercutido = rows.filter((r) => r.tipo === "REPERCUTIDO");
      const soportado = rows.filter((r) => r.tipo === "SOPORTADO");

      const toSheet = (items: VatDetailRow[]) =>
        items.map((r) => ({
          "Nº Factura": r.invoice_number,
          Fecha: r.issue_date,
          "NIF/CIF": r.third_party_tax_id ?? "",
          Nombre: r.third_party_name ?? "",
          "Tipo IVA (%)": r.tax_rate,
          "Base Imponible": r.base_imponible,
          "Cuota IVA": r.cuota_iva,
        }));

      const totalCuotaRep = repercutido.reduce((s, r) => s + Number(r.cuota_iva), 0);
      const totalBaseRep = repercutido.reduce((s, r) => s + Number(r.base_imponible), 0);
      const totalCuotaSop = soportado.reduce((s, r) => s + Number(r.cuota_iva), 0);
      const totalBaseSop = soportado.reduce((s, r) => s + Number(r.base_imponible), 0);
      const resumen = [
        { Concepto: "IVA Repercutido - Base Imponible", Importe: totalBaseRep },
        { Concepto: "IVA Repercutido - Cuota", Importe: totalCuotaRep },
        { Concepto: "IVA Soportado - Base Imponible", Importe: totalBaseSop },
        { Concepto: "IVA Soportado - Cuota", Importe: totalCuotaSop },
        { Concepto: "Resultado (a pagar/devolver)", Importe: Math.round((totalCuotaRep - totalCuotaSop) * 100) / 100 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(repercutido)), "IVA Repercutido");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(soportado)), "IVA Soportado");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen 303");
      const fileBase64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" }) as string;

      const fileName = `IVA_Modelo303_${periodDates.start}_${periodDates.end}.xlsx`;
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("No hay sesión activa");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint-storage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "upload-accounting-document",
            fileName,
            fileBase64,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            documentType: "IVA_EXPORT",
            year: selectedYear,
            quarter: getQuarterForPeriod(),
            month: filterType === "month" ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}` : undefined,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al subir a SharePoint");

      setVatSharepointUrl(result.sharepointWebUrl ?? null);
      toast({ title: "Guardado en SharePoint", description: `${fileName} subido a Contabilidad` });
    } catch (err: any) {
      toast({ title: "Error al subir IVA", description: err.message, variant: "destructive" });
    } finally {
      setUploadingVat(false);
    }
  };

  const uploadIrpfToSharePoint = async () => {
    setUploadingIrpf(true);
    try {
      const rows: string[] = ["Tipo,NIF,Nombre,Base Rendimientos,Retención IRPF,Neto"];
      irpfByPerson.forEach((p) => {
        rows.push(
          `${p.person_type === "EMPLOYEE" ? "EMPLEADO" : "SOCIO"},,` +
            `"${p.person_name}",${p.total_gross},${p.total_irpf},${p.total_net}`
        );
      });
      professionalIrpf.forEach((p) => {
        rows.push(
          `PROFESIONAL,${p.supplier_tax_id ?? ""},` +
            `"${p.supplier_name ?? ""}",${p.subtotal},${p.withholding_amount},` +
            `${Math.round((Number(p.subtotal) - Number(p.withholding_amount)) * 100) / 100}`
        );
      });
      const csv = "\ufeff" + rows.join("\n");

      const encoder = new TextEncoder();
      const csvBytes = encoder.encode(csv);
      let binary = "";
      csvBytes.forEach((b) => (binary += String.fromCharCode(b)));
      const fileBase64 = btoa(binary);

      const fileName = `IRPF_Modelo111_${periodDates.start}_${periodDates.end}.csv`;
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("No hay sesión activa");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint-storage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "upload-accounting-document",
            fileName,
            fileBase64,
            contentType: "text/csv",
            documentType: "IRPF_EXPORT",
            year: selectedYear,
            quarter: getQuarterForPeriod(),
            month: filterType === "month" ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}` : undefined,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al subir a SharePoint");

      setIrpfSharepointUrl(result.sharepointWebUrl ?? null);
      toast({ title: "Guardado en SharePoint", description: `${fileName} subido a Contabilidad` });
    } catch (err: any) {
      toast({ title: "Error al subir IRPF", description: err.message, variant: "destructive" });
    } finally {
      setUploadingIrpf(false);
    }
  };

  // ── useEffect principal ────────────────────────────────────────────────────

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
      fetchPeriodProfitSummary();
      fetchCorporateTaxSummary();
      fetchVatDetail();
    } else if (activeTab === "profit-loss") {
      fetchPeriodProfitSummary();
      fetchProfitLoss();
      fetchPeriodsForClosure();
    } else if (activeTab === "balance") {
      fetchBalanceSheet();
    } else if (activeTab === "all-payroll") {
      fetchPayrollRuns();
      fetchPartnerCompensations();
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
      fetchProfessionalIrpf();
    } else if (activeTab.startsWith("bank-")) {
      fetchBankAccountCodes();
    }
  }, [activeTab, filterType, selectedYear, selectedQuarter, selectedMonth, balanceDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar códigos de cuentas solo si faltan (fallback desde preferencias)
  useEffect(() => {
    if (companyBankAccounts.length > 0 && !companyBankAccounts.every((a) => a.accounting_code)) {
      fetchBankAccountCodes();
    }
  }, [companyBankAccounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Valores calculados ─────────────────────────────────────────────────────

  const totalRevenue =
    periodProfitSummary?.total_revenue ??
    profitLoss
      .filter((item) => item.account_type === "REVENUE")
      .reduce((sum, item) => sum + item.amount, 0);

  const operatingExpenses =
    periodProfitSummary?.operating_expenses ??
    profitLoss
      .filter((item) => item.account_type === "EXPENSE" && !item.account_code.startsWith("630"))
      .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = profitLoss
    .filter((item) => item.account_type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount, 0);

  const profitBeforeTax =
    periodProfitSummary?.profit_before_tax ?? totalRevenue - operatingExpenses;

  const corporateTax =
    periodProfitSummary?.corporate_tax_amount ?? corporateTaxSummary?.tax_amount ?? 0;

  const netProfit = periodProfitSummary?.net_profit ?? profitBeforeTax - corporateTax;

  const bankBalance = balanceSheet
    .filter((item) => item.account_code.startsWith("572"))
    .reduce((sum, item) => sum + (item.net_balance || 0), 0);

  const clientsPending = clientBalances.reduce((sum, c) => sum + Math.max(0, c.net_balance), 0);
  const suppliersPending = supplierBalances.reduce((sum, s) => sum + Math.max(0, Math.abs(s.net_balance)), 0);
  const availableCash = bankBalance - suppliersPending;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

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
      ASSET: "Activo", LIABILITY: "Pasivo", EQUITY: "Patrimonio",
      REVENUE: "Ingreso", EXPENSE: "Gasto", TAX: "Impuesto",
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

  // ── API pública del hook ───────────────────────────────────────────────────

  return {
    filters: {
      filterType, setFilterType,
      selectedYear, setSelectedYear,
      selectedQuarter, setSelectedQuarter,
      selectedMonth, setSelectedMonth,
      balanceDate, setBalanceDate,
      periodDates,
    },
    state: {
      loading,
      balanceSheet, periodProfitSummary, profitLoss, clientBalances, supplierBalances,
      vatSummary, irpfSummary, corporateTaxSummary, journalEntries, chartOfAccounts,
      payrollRuns, partnerCompensations, payrollPayments, irpfByPeriod, irpfByPerson,
      irpfModel111Summary, companyBankAccounts, periodsForClosure, loadingPeriods,
      periodActionLoading, bankAccountBalances, bankAccountCodes,
      vatDetail, professionalIrpf, loadingExport,
      showVatDetail, setShowVatDetail,
      uploadingVat, uploadingIrpf, vatSharepointUrl, irpfSharepointUrl,
    },
    computed: {
      totalRevenue, operatingExpenses, totalExpenses,
      profitBeforeTax, corporateTax, netProfit,
      bankBalance, clientsPending, suppliersPending, availableCash,
    },
    actions: {
      loadAllData,
      fetchBalanceSheet, fetchProfitLoss, fetchJournalEntries,
      fetchBankAccountBalances, fetchPayrollRuns, fetchPartnerCompensations,
      fetchPayrollPayments, fetchPeriodsForClosure,
      handleOpenPeriod, handleClosePeriod,
      exportVatExcel, exportIrpfCsv,
      uploadVatToSharePoint, uploadIrpfToSharePoint,
      formatCurrency, getAccountTypeLabel, getEntryTypeLabel, handleViewDocument,
    },
  };
}
