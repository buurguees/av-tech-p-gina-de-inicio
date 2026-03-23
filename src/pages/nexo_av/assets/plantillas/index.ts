/**
 * Plantillas de documentos PDF
 * Compartidas entre versión móvil y desktop
 */

export { QuotePDFDocument } from './QuotePDFDocument';
export type { 
  QuotePDFDocumentProps, 
  Quote, 
  QuoteLine, 
  Client, 
  CompanySettings, 
  Project 
} from './QuotePDFDocument';

export { InvoicePDFDocument } from './InvoicePDFDocument';
export type {
  InvoicePDFDocumentProps,
  Invoice,
  InvoiceLine,
  BankAccount,
  CompanyPreferences
} from './InvoicePDFDocument';

export { PurchaseOrderPDFDocument } from './PurchaseOrderPDFDocument';
export type {
  PurchaseOrderPDFDocumentProps,
  PurchaseOrderForPDF,
  PurchaseOrderLine as PurchaseOrderPDFLine,
  CompanySettingsForPO,
} from './PurchaseOrderPDFDocument';

export { RateCardPDFDocument } from './RateCardPDFDocument';
export type {
  RateCardPDFDocumentProps,
  RateCardForPDF,
  RateCardLineForPDF,
  CompanySettingsForRateCard,
} from './RateCardPDFDocument';
