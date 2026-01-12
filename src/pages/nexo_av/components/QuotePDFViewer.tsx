import { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  PDFViewer,
  Font,
  Image,
} from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Eye, EyeOff } from "lucide-react";

// Register font (using default)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf" },
  ],
});

interface QuoteLine {
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

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  project_name: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  created_at: string;
}

interface Project {
  project_number: string;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  local_name: string | null;
}

interface Client {
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

interface CompanySettings {
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

interface QuotePDFViewerProps {
  quote: Quote;
  lines: QuoteLine[];
  client: Client | null;
  company: CompanySettings | null;
  project: Project | null;
  fileName: string;
}

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 130, // Espacio reservado para el footer
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: "40%",
    left: "10%",
    transform: "rotate(-45deg)",
    opacity: 0.3,
  },
  watermarkText: {
    fontSize: 70,
    color: "#f0f0f0",
    fontWeight: "bold",
    letterSpacing: 15,
    marginBottom: 5,
  },
  watermarkNumber: {
    fontSize: 32,
    color: "#f0f0f0",
    fontWeight: "bold",
    letterSpacing: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
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
    marginBottom: 15,
    gap: 12,
  },
  companyBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f5f5f5",
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
    marginBottom: 15,
    padding: 12,
    backgroundColor: "#fafafa",
    borderRadius: 4,
  },
  referenceBox: {
    marginBottom: 25,
  },
  referenceText: {
    fontSize: 10,
    color: "#333",
  },
  table: {
    marginBottom: 25,
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
  colConcept: { flex: 3 },
  colQuantity: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1, textAlign: "right" },
  colTax: { flex: 1, textAlign: "center" },
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
    marginBottom: 30,
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
  validityNote: {
    fontSize: 9,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  footer: {
    position: "absolute",
    bottom: 35,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 12,
  },
  footerColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  footerColumn: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  footerText: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  pageNumber: {
    position: "absolute",
    bottom: 18,
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
const groupTaxesByRate = (lines: QuoteLine[]) => {
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

// PDF Document Component
const QuotePDFDocument = ({ quote, lines, client, company, project }: Omit<QuotePDFViewerProps, 'fileName'>) => {
  const taxes = groupTaxesByRate(lines);
  const subtotal = lines.reduce((acc, line) => acc + line.subtotal, 0);
  const total = lines.reduce((acc, line) => acc + line.total, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark with two lines */}
        <View style={styles.watermark}>
          <Text style={styles.watermarkText}>PRESUPUESTO</Text>
          <Text style={styles.watermarkNumber}>{quote.quote_number}</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            {company?.logo_url ? (
              <Image src={company.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.logoPlaceholder}>
                {company?.legal_name || company?.commercial_name || "EMPRESA"}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.documentTitle}>Presupuesto</Text>
            <Text style={styles.documentNumber}>{quote.quote_number}</Text>
            <Text style={styles.documentDate}>Fecha: {formatDate(quote.created_at)}</Text>
          </View>
        </View>

        {/* Company and Client Info Row */}
        <View style={styles.infoRow}>
          {/* Company Info - Emisor */}
          <View style={styles.companyBox}>
            <Text style={styles.boxTitle}>Emisor</Text>
            <Text style={styles.boxName}>
              {company?.legal_name || company?.commercial_name || "TU EMPRESA"}
            </Text>
            {company?.tax_id && (
              <Text style={styles.boxDetail}>NIF: {company.tax_id}</Text>
            )}
            {company?.fiscal_address && (
              <Text style={styles.boxDetail}>{company.fiscal_address}</Text>
            )}
            {company?.fiscal_postal_code && company?.fiscal_city && (
              <Text style={styles.boxDetail}>
                {company.fiscal_postal_code} {company.fiscal_city}
              </Text>
            )}
            {company?.fiscal_province && (
              <Text style={styles.boxDetail}>{company.fiscal_province}</Text>
            )}
            {company?.billing_email && (
              <Text style={styles.boxDetail}>Email: {company.billing_email}</Text>
            )}
            {company?.billing_phone && (
              <Text style={styles.boxDetail}>Teléfono: {company.billing_phone}</Text>
            )}
          </View>

          {/* Client Info */}
          <View style={styles.clientBox}>
            <Text style={styles.boxTitle}>Cliente</Text>
            <Text style={styles.boxName}>
              {client?.legal_name || client?.company_name || quote.client_name}
            </Text>
            {client?.tax_id && (
              <Text style={styles.boxDetail}>NIF: {client.tax_id}</Text>
            )}
            {client?.billing_address && (
              <Text style={styles.boxDetail}>{client.billing_address}</Text>
            )}
            {client?.billing_postal_code && client?.billing_city && (
              <Text style={styles.boxDetail}>
                {client.billing_postal_code} {client.billing_city}
              </Text>
            )}
            {client?.billing_province && (
              <Text style={styles.boxDetail}>{client.billing_province}</Text>
            )}
            {client?.contact_email && (
              <Text style={styles.boxDetail}>Email: {client.contact_email}</Text>
            )}
            {client?.contact_phone && (
              <Text style={styles.boxDetail}>Teléfono: {client.contact_phone}</Text>
            )}
          </View>
        </View>

        {/* Project Info - Only if project exists */}
        {project && (
          <View style={styles.projectBox}>
            <Text style={styles.boxTitle}>Datos del Proyecto</Text>
            <Text style={styles.boxName}>{project.project_name}</Text>
            <Text style={styles.boxDetail}>Nº Proyecto: {project.project_number}</Text>
            {project.local_name && (
              <Text style={styles.boxDetail}>Local: {project.local_name}</Text>
            )}
            {project.project_address && (
              <Text style={styles.boxDetail}>Dirección: {project.project_address}</Text>
            )}
            {project.project_city && (
              <Text style={styles.boxDetail}>{project.project_city}</Text>
            )}
          </View>
        )}

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colConcept]}>CONCEPTO</Text>
            <Text style={[styles.headerText, styles.colQuantity]}>CANTIDAD</Text>
            <Text style={[styles.headerText, styles.colPrice]}>PRECIO</Text>
            <Text style={[styles.headerText, styles.colTax]}>IVA</Text>
            <Text style={[styles.headerText, styles.colTotal]}>SUBTOTAL</Text>
          </View>

          {lines.map((line) => (
            <View key={line.id} style={styles.tableRow}>
              <View style={styles.colConcept}>
                <Text style={styles.cellText}>{line.concept}</Text>
                {line.description && (
                  <Text style={styles.cellDescription}>{line.description}</Text>
                )}
              </View>
              <Text style={[styles.cellText, styles.colQuantity]}>
                {line.quantity}
              </Text>
              <Text style={[styles.cellText, styles.colPrice]}>
                {formatCurrency(line.unit_price)}
              </Text>
              <Text style={[styles.cellText, styles.colTax]}>{line.tax_rate}%</Text>
              <Text style={[styles.cellText, styles.colTotal]}>
                {formatCurrency(line.subtotal)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer} wrap={false}>
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

        {/* Footer with validity note and company info */}
        <View style={styles.footer} fixed>
          {quote.valid_until && (
            <Text style={styles.validityNote}>
              Este presupuesto es válido hasta el {formatDate(quote.valid_until)}.
            </Text>
          )}
          <View style={styles.footerColumns}>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>EMPRESA</Text>
              <Text style={styles.footerText}>
                {company?.legal_name || company?.commercial_name}
              </Text>
              <Text style={styles.footerText}>NIF: {company?.tax_id}</Text>
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>CONTACTO</Text>
              {company?.billing_email && (
                <Text style={styles.footerText}>{company.billing_email}</Text>
              )}
              {company?.billing_phone && (
                <Text style={styles.footerText}>{company.billing_phone}</Text>
              )}
              {company?.website && (
                <Text style={styles.footerText}>{company.website}</Text>
              )}
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>DIRECCIÓN FISCAL</Text>
              {company?.fiscal_address && (
                <Text style={styles.footerText}>{company.fiscal_address}</Text>
              )}
              {company?.fiscal_postal_code && company?.fiscal_city && (
                <Text style={styles.footerText}>
                  {company.fiscal_postal_code} {company.fiscal_city}
                </Text>
              )}
            </View>
          </View>
        </View>

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

const QuotePDFViewer = ({ quote, lines, client, company, project, fileName }: QuotePDFViewerProps) => {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="flex flex-col h-full">
      {/* Actions */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="border-white/20 text-white hover:bg-white/10 h-8 text-xs"
        >
          {showPreview ? (
            <>
              <EyeOff className="h-3 w-3 mr-1.5" />
              Ocultar
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 mr-1.5" />
              Ver PDF
            </>
          )}
        </Button>

        <PDFDownloadLink
          document={
            <QuotePDFDocument
              quote={quote}
              lines={lines}
              client={client}
              company={company}
              project={project}
            />
          }
          fileName={fileName}
          className="ml-auto"
        >
          {({ loading: pdfLoading }) => (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs"
              disabled={pdfLoading}
            >
              {pdfLoading ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1.5" />
              )}
              Descargar PDF
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-gray-800 p-4 flex-1 min-h-0">
          <PDFViewer
            width="100%"
            height="100%"
            className="rounded-lg"
            showToolbar={false}
          >
            <QuotePDFDocument
              quote={quote}
              lines={lines}
              client={client}
              company={company}
              project={project}
            />
          </PDFViewer>
        </div>
      )}
    </div>
  );
};

export default QuotePDFViewer;
