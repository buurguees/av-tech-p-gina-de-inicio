/**
 * Ticket Categories
 * Categorías contables para tickets de gastos rápidos.
 * Cada categoría mapea a una cuenta contable del grupo 629.
 * La categoría es OBLIGATORIA en tickets.
 * 
 * IMPORTANTE: La categoría "MATERIAL" comparte cuenta contable (629.3)
 * con la categoría "MATERIAL" de facturas de compra para unificar analítica.
 */

export const TICKET_CATEGORIES = [
  { value: "DIET", label: "Dietas", icon: "🍽️", accountCode: "629.1" },
  { value: "FUEL", label: "Gasolina", icon: "⛽", accountCode: "629.2" },
  { value: "MATERIAL", label: "Material", icon: "🔧", accountCode: "629.3" },
  { value: "PARKING", label: "Parking", icon: "🅿️", accountCode: "629.5" },
  { value: "TRANSPORT", label: "Transporte", icon: "🚌", accountCode: "629.6" },
  { value: "ACCOMMODATION", label: "Alojamiento", icon: "🏨", accountCode: "629.7" },
  { value: "FINE", label: "Multa", icon: "📄", accountCode: "629.8" },
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
 */
export const TICKET_DEFAULT_ACCOUNT = "629";
