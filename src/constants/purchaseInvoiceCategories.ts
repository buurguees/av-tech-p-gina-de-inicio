/**
 * Purchase Invoice Categories
 * Categorías contables para facturas de compra.
 * Cada categoría mapea a una cuenta contable específica.
 * La categoría es OBLIGATORIA en facturas de compra.
 */

export const PURCHASE_INVOICE_CATEGORIES = [
  { value: "EXTERNAL_SERVICES", label: "Servicios Externos", accountCode: "623000", description: "Gestoría, abogados, notaría, etc." },
  { value: "LABOR", label: "Mano de Obra", accountCode: "600", description: "Solo técnicos / subcontratación" },
  { value: "MATERIAL", label: "Material", accountCode: "629.3", description: "Material de instalación o consumo" },
  { value: "SOFTWARE", label: "Software", accountCode: "629", description: "Licencias y herramientas digitales" },
  { value: "UTILITIES", label: "Suministros", accountCode: "628", description: "Luz, agua, gas, internet" },
  { value: "RENT", label: "Alquiler", accountCode: "621", description: "Alquiler de local, vehículo, etc." },
] as const;

export type PurchaseInvoiceCategory = typeof PURCHASE_INVOICE_CATEGORIES[number]["value"];

/**
 * Get category info for a purchase invoice
 */
export const getPurchaseInvoiceCategoryInfo = (category: string) => {
  return PURCHASE_INVOICE_CATEGORIES.find(c => c.value === category) || null;
};

/**
 * Default account code when no category mapping exists
 */
export const PURCHASE_DEFAULT_ACCOUNT = "623000";
