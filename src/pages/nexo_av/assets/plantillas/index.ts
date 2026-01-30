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
