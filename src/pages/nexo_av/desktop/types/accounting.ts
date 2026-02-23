export interface BalanceSheetItem {
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
  net_balance: number;
}

export interface ProfitLossItem {
  account_code: string;
  account_name: string;
  account_type: string;
  amount: number;
}

export interface ClientBalance {
  client_id: string;
  client_number: string;
  client_name: string;
  debit_balance: number;
  credit_balance: number;
  net_balance: number;
}

export interface SupplierTechnicianBalance {
  third_party_id: string;
  third_party_type: string;
  third_party_number: string;
  third_party_name: string;
  account_code: string;
  debit_balance: number;
  credit_balance: number;
  net_balance: number;
}

export interface VATSummary {
  vat_received: number;
  vat_paid: number;
  vat_balance: number;
  vat_to_pay: number;
}

export interface CorporateTaxSummary {
  profit_before_tax: number;
  tax_rate: number;
  tax_amount: number;
  provision_entry_id: string | null;
  provision_entry_number: string | null;
  provision_date: string | null;
}

export interface PeriodForClosure {
  year: number;
  month: number;
  period_start: string;
  period_end: string;
  is_closed: boolean;
  closed_at: string | null;
}

export interface JournalEntry {
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

export interface ChartOfAccount {
  account_code: string;
  account_name: string;
  account_type: string;
  is_active: boolean;
  description: string | null;
}

export interface PayrollRun {
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

export interface PartnerCompensationRun {
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

export interface PayrollPayment {
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
  bank_name: string | null;
}

export interface IRPFByPeriod {
  period_year: number;
  period_month: number;
  total_irpf: number;
  payroll_count: number;
  compensation_count: number;
}

export interface IRPFByPerson {
  person_type: string;
  person_id: string;
  person_number: string;
  person_name: string;
  total_irpf: number;
  total_gross: number;
  total_net: number;
  document_count: number;
}

export interface IRPFModel111Summary {
  total_irpf_accumulated: number;
  total_payroll_irpf: number;
  total_compensation_irpf: number;
  total_documents: number;
  total_employees: number;
  total_partners: number;
}

export interface CompanyBankAccount {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
  accounting_code?: string;
}

export interface PeriodProfitSummary {
  total_revenue: number;
  operating_expenses: number;
  profit_before_tax: number;
  net_profit: number;
  corporate_tax_amount: number;
  data_completeness?: number;
}

export interface BankAccountWithBalance {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
  balance: number;
  accounting_code?: string;
}
