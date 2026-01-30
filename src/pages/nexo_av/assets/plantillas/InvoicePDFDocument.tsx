/**
 * InvoicePDFDocument - Plantilla de PDF para Facturas
 * Compartido entre versión móvil y desktop
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

// Register font
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf" },
  ],
});

export interface InvoiceLine {
  id: string;
  concept: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_order: number;
}

export interface Invoice {
  id: string;
  invoice_number: string | null;
  preliminary_number: string | null;
  client_name: string;
  project_name: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Project {
  project_number: string;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  local_name: string | null;
  client_order_number: string | null;
}

export interface Client {
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_province: string | null;
  website: string | null;
}

export interface CompanySettings {
  legal_name: string;
  commercial_name: string | null;
  tax_id: string;
  vat_number: string | null;
  fiscal_address: string;
  fiscal_city: string;
  fiscal_postal_code: string;
  fiscal_province: string;
  billing_email: string | null;
  billing_phone: string | null;
  website: string | null;
  logo_url: string | null;
}

export interface BankAccount {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
}

export interface CompanyPreferences {
  bank_accounts: BankAccount[];
}

export interface InvoicePDFDocumentProps {
  invoice: Invoice;
  lines: InvoiceLine[];
  client: Client | null;
  company: CompanySettings | null;
  project: Project | null;
  preferences?: CompanyPreferences | null;
}

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: "40%",
    left: "15%",
    transform: "rotate(-45deg)",
    fontSize: 80,
    color: "#f0f0f0",
    opacity: 0.3,
    fontWeight: "bold",
    letterSpacing: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: "contain",
  },
  logoPlaceholder: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerRight: {
    textAlign: "right",
    alignItems: "flex-end",
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3,
  },
  documentNumber: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 10,
    color: "#888",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  companyBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
  },
  clientBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#e8e8e8",
    borderRadius: 4,
  },
  boxTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1,
  },
  boxName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  boxDetail: {
    fontSize: 9,
    color: "#555",
    marginBottom: 2,
  },
  projectBox: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  projectTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1,
  },
  projectName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  projectDetail: {
    fontSize: 9,
    color: "#555",
    marginBottom: 2,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  colPrice: { flex: 1, textAlign: "right" },
  colDiscount: { flex: 0.8, textAlign: "center" },
  colTax: { flex: 0.8, textAlign: "center" },
  colTotal: { flex: 1.2, textAlign: "right" },
  headerText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
  },
  cellText: {
    fontSize: 9,
    color: "#333",
  },
  cellDescription: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  totalsContainer: {
    marginLeft: "auto",
    width: 220,
    marginTop: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#666",
  },
  totalValue: {
    fontSize: 10,
    color: "#333",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: "#333",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  paymentSection: {
    marginTop: 20,
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  paymentInfoGrid: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 12,
  },
  paymentInfoColumn: {
    flex: 1,
    padding: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
  },
  paymentColumnTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  paymentColumnValue: {
    fontSize: 9,
    color: "#333",
    marginBottom: 2,
  },
  paymentColumnValueBold: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
    fontFamily: "Courier",
  },
  observationsBox: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
  },
  observationsTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  observationsText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.4,
  },
  legalNote: {
    fontSize: 7,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 12,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: "#888",
  },
});

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Group taxes by rate
const groupTaxesByRate = (lines: InvoiceLine[]) => {
  const taxesByRate: Record<number, number> = {};
  lines.forEach((line) => {
    if (line.tax_amount !== 0) {
      if (!taxesByRate[line.tax_rate]) {
        taxesByRate[line.tax_rate] = 0;
      }
      taxesByRate[line.tax_rate] += line.tax_amount;
    }
  });
  return Object.entries(taxesByRate)
    .map(([rate, amount]) => ({ rate: Number(rate), amount }))
    .sort((a, b) => b.rate - a.rate);
};

// Extract SWIFT/BIC from bank account notes
const extractSwiftBic = (notes: string | null | undefined): string | null => {
  if (!notes) return null;
  const swiftMatch = notes.match(/SWIFT\/BIC[:\s]+([A-Z0-9]+)/i);
  if (swiftMatch) {
    return swiftMatch[1];
  }
  if (notes.includes('SWIFT') || notes.includes('BIC')) {
    return notes;
  }
  return null;
};

// PDF Document Component
export const InvoicePDFDocument = ({ invoice, lines, client, company, project, preferences }: InvoicePDFDocumentProps) => {
  const taxes = groupTaxesByRate(lines);
  const subtotal = lines.reduce((acc, line) => acc + line.subtotal, 0);
  const total = lines.reduce((acc, line) => acc + line.total, 0);
  const hasDiscount = lines.some((line) => line.discount_percent && line.discount_percent > 0.1);
  const bankAccount = preferences?.bank_accounts?.[0];
  const swiftBic = extractSwiftBic(bankAccount?.notes);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>FACTURA</Text>

        {/* Header */}
        <View style={styles.header}>
          <View>
            {company?.logo_url ? (
              <Image src={company.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.logoPlaceholder}>
                {company?.commercial_name || company?.legal_name || "EMPRESA"}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.documentTitle}>Factura</Text>
            <Text style={styles.documentNumber}>
              {invoice.invoice_number || invoice.preliminary_number || "Sin número"}
            </Text>
            <Text style={styles.documentDate}>Fecha: {formatDate(invoice.issue_date)}</Text>
            {invoice.status === "DRAFT" && invoice.preliminary_number && (
              <Text style={[styles.documentDate, { color: "#888", fontStyle: "italic" }]}>
                (Borrador)
              </Text>
            )}
          </View>
        </View>

        {/* Company and Client Info Side by Side */}
        <View style={styles.infoRow}>
          {/* Company Info */}
          <View style={styles.companyBox}>
            <Text style={styles.boxTitle}>Emisor</Text>
            <Text style={styles.boxName}>
              {company?.legal_name || "Nombre de la empresa"}
            </Text>
            {company?.tax_id && <Text style={styles.boxDetail}>NIF: {company.tax_id}</Text>}
            {company?.fiscal_address && (
              <Text style={styles.boxDetail}>{company.fiscal_address}</Text>
            )}
            {company?.fiscal_postal_code && company?.fiscal_city && (
              <Text style={styles.boxDetail}>
                {company.fiscal_postal_code} {company.fiscal_city} ({company.fiscal_province})
              </Text>
            )}
            {company?.billing_email && (
              <Text style={styles.boxDetail}>{company.billing_email}</Text>
            )}
            {company?.billing_phone && (
              <Text style={styles.boxDetail}>{company.billing_phone}</Text>
            )}
          </View>

          {/* Client Info */}
          <View style={styles.clientBox}>
            <Text style={styles.boxTitle}>Cliente</Text>
            <Text style={styles.boxName}>
              {client?.legal_name || client?.company_name || invoice.client_name}
            </Text>
            {client?.tax_id && <Text style={styles.boxDetail}>NIF: {client.tax_id}</Text>}
            {client?.billing_address && (
              <Text style={styles.boxDetail}>{client.billing_address}</Text>
            )}
            {client?.billing_postal_code && client?.billing_city && (
              <Text style={styles.boxDetail}>
                {client.billing_postal_code} {client.billing_city} ({client.billing_province})
              </Text>
            )}
            {client?.contact_email && (
              <Text style={styles.boxDetail}>{client.contact_email}</Text>
            )}
            {client?.contact_phone && (
              <Text style={styles.boxDetail}>{client.contact_phone}</Text>
            )}
          </View>
        </View>

        {/* Project Info - Only if project exists */}
        {project && (
          <View style={styles.projectBox}>
            <Text style={styles.projectTitle}>Proyecto</Text>
            <Text style={styles.projectName}>{project.project_name}</Text>
            {project.client_order_number && (
              <Text style={styles.projectDetail}>Nº Pedido Cliente: {project.client_order_number}</Text>
            )}
            {project.local_name && (
              <Text style={styles.projectDetail}>Local: {project.local_name}</Text>
            )}
            {project.project_address && (
              <Text style={styles.projectDetail}>{project.project_address}</Text>
            )}
            {project.project_city && (
              <Text style={styles.projectDetail}>{project.project_city}</Text>
            )}
          </View>
        )}

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: hasDiscount ? 2.5 : 3 }]}>CONCEPTO</Text>
            <Text style={[styles.headerText, { flex: hasDiscount ? 0.8 : 1, textAlign: "center" }]}>CANTIDAD</Text>
            <Text style={[styles.headerText, styles.colPrice]}>PRECIO</Text>
            {hasDiscount && (
              <Text style={[styles.headerText, styles.colDiscount]}>DTO %</Text>
            )}
            <Text style={[styles.headerText, styles.colTax]}>IVA</Text>
            <Text style={[styles.headerText, styles.colTotal]}>SUBTOTAL</Text>
          </View>

          {lines.map((line) => (
            <View key={line.id} style={styles.tableRow}>
              <View style={{ flex: hasDiscount ? 2.5 : 3 }}>
                <Text style={styles.cellText}>{line.concept}</Text>
                {line.description && (
                  <Text style={styles.cellDescription}>{line.description}</Text>
                )}
              </View>
              <Text style={[styles.cellText, { flex: hasDiscount ? 0.8 : 1, textAlign: "center" }]}>
                {line.quantity}
              </Text>
              <Text style={[styles.cellText, styles.colPrice]}>
                {formatCurrency(line.unit_price)}
              </Text>
              {hasDiscount && (
                <Text style={[styles.cellText, styles.colDiscount]}>
                  {line.discount_percent > 0 ? `${line.discount_percent}%` : "-"}
                </Text>
              )}
              <Text style={[styles.cellText, styles.colTax]}>{line.tax_rate}%</Text>
              <Text style={[styles.cellText, styles.colTotal]}>
                {formatCurrency(line.subtotal)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Base imponible</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {taxes.map((tax) => (
            <View key={tax.rate} style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA {tax.rate}%</Text>
              <Text style={styles.totalValue}>{formatCurrency(tax.amount)}</Text>
            </View>
          ))}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Payment Information Section */}
        <View style={styles.paymentSection}>
          {/* Observations */}
          {invoice.notes && (
            <View style={styles.observationsBox}>
              <Text style={styles.observationsTitle}>Observaciones</Text>
              <Text style={styles.observationsText}>{invoice.notes}</Text>
            </View>
          )}

          {/* Payment Details Grid */}
          <View style={styles.paymentInfoGrid}>
            {/* Vencimientos */}
            {invoice.due_date && (
              <View style={styles.paymentInfoColumn}>
                <Text style={styles.paymentColumnTitle}>Vencimientos</Text>
                <Text style={styles.paymentColumnValue}>
                  {formatDate(invoice.due_date)}
                </Text>
                <Text style={styles.paymentColumnValueBold}>
                  {formatCurrency(total)}
                </Text>
              </View>
            )}

            {/* Método de pago */}
            <View style={styles.paymentInfoColumn}>
              <Text style={styles.paymentColumnTitle}>Método de pago</Text>
              <Text style={styles.paymentColumnValue}>
                Transferencia bancaria
              </Text>
            </View>

            {/* Cuenta bancaria */}
            {bankAccount && (
              <View style={styles.paymentInfoColumn}>
                <Text style={styles.paymentColumnTitle}>Cuenta bancaria</Text>
                {bankAccount.iban && (
                  <Text style={styles.paymentColumnValueBold}>
                    IBAN: {bankAccount.iban}
                  </Text>
                )}
                {swiftBic && (
                  <Text style={styles.paymentColumnValue}>
                    SWIFT/BIC: {swiftBic}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Legal Note */}
          <Text style={styles.legalNote}>
            Esta factura se emite conforme a la normativa fiscal vigente.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} />

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};

export default InvoicePDFDocument;
