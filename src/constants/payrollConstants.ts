/**
 * Payroll Constants — Spanish Social Security 2026
 *
 * These are default rates. Employees may have custom rates stored in
 * internal.employees (custom_ss_employee_rate, custom_ss_employer_rate).
 */

export const SS_EMPLOYEE_RATE = 6.47;
export const SS_EMPLOYER_RATE = 30.40;

export const SS_BREAKDOWN = {
  employee: {
    contingencias_comunes: 4.70,
    desempleo_general: 1.55,
    formacion_profesional: 0.10,
    mec: 0.12,
    total: 6.47,
  },
  employer: {
    contingencias_comunes: 23.60,
    desempleo_general: 5.50,
    formacion_profesional: 0.60,
    fogasa: 0.20,
    accidentes_trabajo: 0.50,
    total: 30.40,
  },
} as const;

export const DEFAULT_IRPF_RATE = 15.0;

export const CONTRACT_TYPES = [
  { value: "indefinido", label: "Indefinido" },
  { value: "temporal", label: "Temporal" },
] as const;

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
