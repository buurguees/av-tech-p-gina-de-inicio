/**
 * Purchase Invoice Categories
 * Categorías disponibles para facturas de compra
 */

export const PURCHASE_INVOICE_CATEGORIES = [
  { value: "MATERIAL", label: "Material" },
  { value: "SERVICE", label: "Servicio" },
  { value: "SOFTWARE", label: "Software" },
  { value: "EXTERNAL_SERVICES", label: "Servicios Externos" },
  { value: "TRAVEL", label: "Viaje" },
  { value: "RENT", label: "Alquiler" },
  { value: "UTILITIES", label: "Suministros" },
  { value: "OTHER", label: "Otros" },
] as const;

export type PurchaseInvoiceCategory = typeof PURCHASE_INVOICE_CATEGORIES[number]["value"];
