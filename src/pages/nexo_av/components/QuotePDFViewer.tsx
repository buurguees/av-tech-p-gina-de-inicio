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
  fileName: string;
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
    left: "10%",
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
    marginBottom: 30,
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
    marginBottom: 4,
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
  partiesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    gap: 20,
  },
  partyBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
  },
  partyTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1,
  },
  partyName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 9,
    color: "#555",
    marginBottom: 2,
  },
  referenceBox: {
    marginBottom: 25,
  },
  referenceText: {
    fontSize: 10,
    color: "#333",
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
    marginTop: 30,
    fontSize: 8,
    color: "#888",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 15,
  },
  footerColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
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
const QuotePDFDocument = ({ quote, lines, client, company }: Omit<QuotePDFViewerProps, 'fileName'>) => {
  const taxes = groupTaxesByRate(lines);
  const subtotal = lines.reduce((acc, line) => acc + line.subtotal, 0);
  const total = lines.reduce((acc, line) => acc + line.total, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>PRESUPUESTO</Text>

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
            <Text style={styles.documentTitle}>Presupuesto</Text>
            <Text style={styles.documentNumber}>{quote.quote_number}</Text>
            <Text style={styles.documentDate}>{formatDate(quote.created_at)}</Text>
          </View>
        </View>

        {/* Company and Client Info */}
        <View style={styles.partiesContainer}>
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>De</Text>
            <Text style={styles.partyName}>{company?.legal_name || "Empresa"}</Text>
            <Text style={styles.partyDetail}>{company?.tax_id}</Text>
            {company?.fiscal_address && (
              <Text style={styles.partyDetail}>{company.fiscal_address}</Text>
            )}
            {company?.fiscal_postal_code && company?.fiscal_city && (
              <Text style={styles.partyDetail}>
                {company.fiscal_postal_code} {company.fiscal_city} ({company.fiscal_province})
              </Text>
            )}
            {company?.billing_email && (
              <Text style={styles.partyDetail}>{company.billing_email}</Text>
            )}
            {company?.billing_phone && (
              <Text style={styles.partyDetail}>{company.billing_phone}</Text>
            )}
            {company?.website && (
              <Text style={styles.partyDetail}>{company.website}</Text>
            )}
          </View>

          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>Para</Text>
            <Text style={styles.partyName}>
              {client?.legal_name || client?.company_name || quote.client_name}
            </Text>
            {client?.tax_id && <Text style={styles.partyDetail}>{client.tax_id}</Text>}
            {client?.billing_address && (
              <Text style={styles.partyDetail}>{client.billing_address}</Text>
            )}
            {client?.billing_postal_code && client?.billing_city && (
              <Text style={styles.partyDetail}>
                {client.billing_postal_code} {client.billing_city} ({client.billing_province})
              </Text>
            )}
            {client?.contact_email && (
              <Text style={styles.partyDetail}>{client.contact_email}</Text>
            )}
            {client?.contact_phone && (
              <Text style={styles.partyDetail}>{client.contact_phone}</Text>
            )}
            {client?.website && (
              <Text style={styles.partyDetail}>{client.website}</Text>
            )}
          </View>
        </View>

        {/* Project Reference */}
        {quote.project_name && (
          <View style={styles.referenceBox}>
            <Text style={styles.referenceText}>
              Proyecto: {quote.project_name}
            </Text>
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
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Base imponible</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {taxes.map((tax) => (
            <View key={tax.rate} style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                IVA {tax.rate}% ({formatCurrency(subtotal * (tax.rate / 100) / (tax.amount / (subtotal * (tax.rate / 100))) || subtotal)})
              </Text>
              <Text style={styles.totalValue}>{formatCurrency(tax.amount)}</Text>
            </View>
          ))}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Validity Note */}
        {quote.valid_until && (
          <Text style={styles.validityNote}>
            Este presupuesto es válido hasta el {formatDate(quote.valid_until)}.
          </Text>
        )}

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

const QuotePDFViewer = ({ quote, lines, client, company, fileName }: QuotePDFViewerProps) => {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="flex flex-col">
      {/* Actions */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
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
        <div className="bg-gray-800 p-4 min-h-[600px] md:min-h-[800px]">
          <PDFViewer
            width="100%"
            height={600}
            className="rounded-lg"
            showToolbar={false}
          >
            <QuotePDFDocument
              quote={quote}
              lines={lines}
              client={client}
              company={company}
            />
          </PDFViewer>
        </div>
      )}
    </div>
  );
};

export default QuotePDFViewer;
