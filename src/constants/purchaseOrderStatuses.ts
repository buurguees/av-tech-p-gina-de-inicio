/**
 * Purchase Order Status Constants
 * 
 * IMPORTANTE: Estos estados deben coincidir exactamente con el enum 
 * sales.purchase_order_status en la base de datos.
 * Cualquier cambio aquí debe reflejarse también en la base de datos y viceversa.
 * 
 * Enum en DB: sales.purchase_order_status 
 *   ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'INVOICED', 'CANCELLED')
 * 
 * NOTA: Los Pedidos de Compra son documentos NO fiscales.
 * NO generan asientos contables. Solo sirven para estimación y control.
 * 
 * Traffic Light System (uses global.css status classes):
 * - status-neutral: DRAFT
 * - status-warning: PENDING_APPROVAL
 * - status-success: APPROVED
 * - status-special: COMPLETED
 * - status-invoiced: INVOICED
 * - status-error: CANCELLED
 */

export const PURCHASE_ORDER_STATUSES = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    color: "status-neutral",
    className: "status-neutral",
    description: "Pedido en edición, no enviado",
    priority: 0
  },
  { 
    value: "PENDING_APPROVAL", 
    label: "Pendiente", 
    color: "status-warning",
    className: "status-warning",
    description: "Pendiente de aprobación interna",
    priority: 1
  },
  { 
    value: "APPROVED", 
    label: "Aprobado", 
    color: "status-success",
    className: "status-success",
    description: "Aprobado, trabajo puede comenzar",
    priority: 2
  },
  { 
    value: "COMPLETED", 
    label: "Finalizado", 
    color: "status-special",
    className: "status-special",
    description: "Trabajo completado, pendiente de factura",
    priority: 3
  },
  { 
    value: "INVOICED", 
    label: "Facturado", 
    color: "status-invoiced",
    className: "status-invoiced",
    description: "Vinculado a factura de compra real",
    priority: 4
  },
  { 
    value: "CANCELLED", 
    label: "Cancelado", 
    color: "status-error",
    className: "status-error",
    description: "Pedido cancelado",
    priority: 5
  },
] as const;

/**
 * Obtiene la información de estado para un Pedido de Compra
 */
export const getPurchaseOrderStatusInfo = (status: string) => {
  return PURCHASE_ORDER_STATUSES.find(s => s.value === status) || PURCHASE_ORDER_STATUSES[0];
};

// Alias para mantener consistencia con otros módulos
export const getStatusInfo = getPurchaseOrderStatusInfo;

export type PurchaseOrderStatus = typeof PURCHASE_ORDER_STATUSES[number]["value"];

/**
 * Estados que permiten edición del PO
 */
export const EDITABLE_STATUSES: PurchaseOrderStatus[] = ["DRAFT", "PENDING_APPROVAL"];

/**
 * Estados que permiten eliminación del PO
 */
export const DELETABLE_STATUSES: PurchaseOrderStatus[] = ["DRAFT", "CANCELLED"];

/**
 * Verifica si un PO puede ser editado según su estado
 */
export const canEditPurchaseOrder = (status: string): boolean => {
  return EDITABLE_STATUSES.includes(status as PurchaseOrderStatus);
};

/**
 * Verifica si un PO puede ser eliminado según su estado
 */
export const canDeletePurchaseOrder = (status: string): boolean => {
  return DELETABLE_STATUSES.includes(status as PurchaseOrderStatus);
};

/**
 * Verifica si un PO puede ser aprobado
 */
export const canApprovePurchaseOrder = (status: string): boolean => {
  return status === "DRAFT" || status === "PENDING_APPROVAL";
};

/**
 * Verifica si un PO puede ser vinculado a una factura de compra
 */
export const canLinkToPurchaseInvoice = (status: string): boolean => {
  return status === "APPROVED" || status === "COMPLETED";
};
