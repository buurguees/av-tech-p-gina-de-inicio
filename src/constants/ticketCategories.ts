/**
 * Ticket Categories
 * Categorías específicas para tickets de gastos
 */

export const TICKET_CATEGORIES = [
  { value: "DIET", label: "Dieta", icon: "🍽️", accountCode: "629.1" },
  { value: "FUEL", label: "Gasolina", icon: "⛽", accountCode: "629.2" },
  { value: "MATERIAL", label: "Material", icon: "🔧", accountCode: "629.3" },
  { value: "TOLL", label: "Peajes", icon: "🛣️", accountCode: "629.4" },
  { value: "PARKING", label: "Parkings", icon: "🅿️", accountCode: "629.5" },
  { value: "TRANSPORT", label: "Transporte", icon: "🚌", accountCode: "629.6" },
  { value: "ACCOMMODATION", label: "Alojamiento", icon: "🏨", accountCode: "629.7" },
  { value: "MULTA", label: "Multa", icon: "📄", accountCode: "629.8" },
  { value: "OTHER", label: "Otros", icon: "📋", accountCode: "629.9" },
] as const;

export type TicketCategory = typeof TICKET_CATEGORIES[number]["value"];

/**
 * Obtener información de una categoría de ticket
 */
export const getTicketCategoryInfo = (category: string) => {
  return TICKET_CATEGORIES.find(c => c.value === category) || null;
};

/**
 * Cuenta contable por defecto para tickets
 * Los tickets usan cuentas del grupo 629 (Otros servicios)
 */
export const TICKET_DEFAULT_ACCOUNT = "629";
