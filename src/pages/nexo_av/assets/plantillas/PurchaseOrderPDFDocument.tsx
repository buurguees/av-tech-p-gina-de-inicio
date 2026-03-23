/**
 * PurchaseOrderPDFDocument - Plantilla de PDF para Pedidos de Compra
 * Documento de estimación operativa — NO tiene validez fiscal
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf" },
  ],
});

export interface PurchaseOrderLine {
  id: string;
  concept: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  withholding_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  withholding_amount: number;
  total: number;
  line_order: number;
}

export interface PurchaseOrderForPDF {
  id: string;
  po_number: string;
  supplier_name: string | null;
  supplier_tax_id: string | null;
  technician_name: string | null;
  status: string;
  issue_date: string | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  withholding_rate: number;
  withholding_amount: number;
  total: number;
  notes: string | null;
  project_number: string | null;
  project_name: string | null;
  site_name?: string | null;
}

export interface CompanySettingsForPO {
  legal_name: string;
  commercial_name: string | null;
  tax_id: string;
  fiscal_address: string;
  fiscal_city: string;
  fiscal_postal_code: string;
  fiscal_province: string;
  billing_email: string | null;
  billing_phone: string | null;
  website: string | null;
  logo_url: string | null;
}

export interface PurchaseOrderPDFDocumentProps {
  order: PurchaseOrderForPDF;
  lines: PurchaseOrderLine[];
  company: CompanySettingsForPO | null;
  documentHash?: string | null;
}

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
    top: "42%",
    left: "10%",
    transform: "rotate(-45deg)",
    fontSize: 60,
    color: "#f0f0f0",
    opacity: 0.3,
    fontWeight: "bold",
    letterSpacing: 10,
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
  supplierBox: {
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
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    flexDirection: "row",
    gap: 30,
  },
  projectGroup: {
    flex: 1,
  },
  projectLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  projectValue: {
    fontSize: 9,
    color: "#333",
    fontWeight: "bold",
  },
  datesBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    flexDirection: "row",
    gap: 30,
  },
  dateGroup: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#92400e",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 10,
    color: "#78350f",
    fontWeight: "bold",
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
  colQty: { flex: 0.8, textAlign: "center" },
  colPrice: { flex: 1, textAlign: "right" },
  colDiscount: { flex: 0.8, textAlign: "center" },
  colTax: { flex: 0.7, textAlign: "center" },
  colIrpf: { flex: 0.7, textAlign: "center" },
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
    width: 230,
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
  withholdingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  withholdingLabel: {
    fontSize: 10,
    color: "#dc2626",
  },
  withholdingValue: {
    fontSize: 10,
    color: "#dc2626",
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
  notesBox: {
    marginTop: 20,
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.4,
  },
  disclaimerBox: {
    marginTop: 16,
    padding: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#d97706",
  },
  disclaimerText: {
    fontSize: 8,
    color: "#78350f",
    lineHeight: 1.4,
    fontStyle: "italic",
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
  documentHash: {
    position: "absolute",
    bottom: 20,
    left: 40,
    fontSize: 7,
    color: "#888",
    maxWidth: "75%",
  },
});

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (date: string | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const buildDeterministicHash = (input: string): string => {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
};

const groupTaxesByRate = (lines: PurchaseOrderLine[]) => {
  const byRate: Record<number, number> = {};
  lines.forEach((line) => {
    if (line.tax_amount !== 0) {
      byRate[line.tax_rate] = (byRate[line.tax_rate] || 0) + line.tax_amount;
    }
  });
  return Object.entries(byRate)
    .map(([rate, amount]) => ({ rate: Number(rate), amount }))
    .sort((a, b) => b.rate - a.rate);
};

const formatProjectNumber = (num: string | null | undefined) => {
  if (!num) return "";
  const match = num.match(/(\d{6})$/);
  return match?.[1] || num;
};

const cleanProjectName = (name: string | null | undefined) =>
  (name || "").replace(/^\d{6}\s*-\s*/, "").trim();

export const PurchaseOrderPDFDocument = ({
  order,
  lines,
  company,
  documentHash,
}: PurchaseOrderPDFDocumentProps) => {
  const hasDiscount = lines.some((l) => l.discount_percent > 0.1);
  const hasWithholding = order.withholding_amount > 0;
  const hasIrpfColumn = lines.some((l) => l.withholding_rate > 0);
  const taxes = groupTaxesByRate(lines);
  const supplierLabel = order.supplier_name ? "Proveedor" : "Técnico";
  const supplierName = order.supplier_name || order.technician_name || "—";
  const hasDates = Boolean(order.expected_start_date || order.expected_end_date);
  const hasProject = Boolean(order.project_name);

  const resolvedHash =
    documentHash ||
    buildDeterministicHash(
      ["PO", order.id, order.po_number, order.issue_date || "", supplierName].join("|"),
    );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>PEDIDO</Text>

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
            <Text style={styles.documentTitle}>Pedido de Compra</Text>
            <Text style={styles.documentNumber}>{order.po_number}</Text>
            <Text style={styles.documentDate}>
              Fecha: {formatDate(order.issue_date)}
            </Text>
            {order.status === "DRAFT" && (
              <Text style={[styles.documentDate, { color: "#888", fontStyle: "italic" }]}>
                (Borrador)
              </Text>
            )}
          </View>
        </View>

        {/* Empresa | Proveedor/Técnico */}
        <View style={styles.infoRow}>
          <View style={styles.companyBox}>
            <Text style={styles.boxTitle}>Emisor</Text>
            <Text style={styles.boxName}>
              {company?.legal_name || "Nombre de la empresa"}
            </Text>
            {Boolean(company?.tax_id) && (
              <Text style={styles.boxDetail}>NIF: {company!.tax_id}</Text>
            )}
            {Boolean(company?.fiscal_address) && (
              <Text style={styles.boxDetail}>{company!.fiscal_address}</Text>
            )}
            {Boolean(company?.fiscal_postal_code) && Boolean(company?.fiscal_city) && (
              <Text style={styles.boxDetail}>
                {company!.fiscal_postal_code} {company!.fiscal_city} ({company!.fiscal_province})
              </Text>
            )}
            {Boolean(company?.billing_email) && (
              <Text style={styles.boxDetail}>{company!.billing_email}</Text>
            )}
            {Boolean(company?.billing_phone) && (
              <Text style={styles.boxDetail}>{company!.billing_phone}</Text>
            )}
          </View>

          <View style={styles.supplierBox}>
            <Text style={styles.boxTitle}>{supplierLabel}</Text>
            <Text style={styles.boxName}>{supplierName}</Text>
            {Boolean(order.supplier_tax_id) && (
              <Text style={styles.boxDetail}>NIF/CIF: {order.supplier_tax_id}</Text>
            )}
          </View>
        </View>

        {/* Proyecto (si existe) */}
        {hasProject && (
          <View style={styles.projectBox}>
            <View style={styles.projectGroup}>
              <Text style={styles.projectLabel}>Proyecto</Text>
              <Text style={styles.projectValue}>
                {formatProjectNumber(order.project_number)
                  ? `${formatProjectNumber(order.project_number)} — `
                  : ""}
                {cleanProjectName(order.project_name)}
              </Text>
            </View>
            {Boolean(order.site_name) && (
              <View style={styles.projectGroup}>
                <Text style={styles.projectLabel}>Sitio / Ubicación</Text>
                <Text style={styles.projectValue}>{order.site_name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Fechas previstas */}
        {hasDates && (
          <View style={styles.datesBox}>
            {Boolean(order.expected_start_date) && (
              <View style={styles.dateGroup}>
                <Text style={styles.dateLabel}>Inicio previsto</Text>
                <Text style={styles.dateValue}>{formatDate(order.expected_start_date)}</Text>
              </View>
            )}
            {Boolean(order.expected_end_date) && (
              <View style={styles.dateGroup}>
                <Text style={styles.dateLabel}>Fin previsto</Text>
                <Text style={styles.dateValue}>{formatDate(order.expected_end_date)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Tabla de líneas */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colConcept]}>CONCEPTO</Text>
            <Text style={[styles.headerText, styles.colQty]}>CANT.</Text>
            <Text style={[styles.headerText, styles.colPrice]}>PRECIO</Text>
            {hasDiscount && (
              <Text style={[styles.headerText, styles.colDiscount]}>DTO %</Text>
            )}
            <Text style={[styles.headerText, styles.colTax]}>IVA</Text>
            {hasIrpfColumn && (
              <Text style={[styles.headerText, styles.colIrpf]}>IRPF</Text>
            )}
            <Text style={[styles.headerText, styles.colTotal]}>SUBTOTAL</Text>
          </View>

          {lines.map((line) => (
            <View key={line.id} style={styles.tableRow}>
              <View style={styles.colConcept}>
                <Text style={styles.cellText}>{(line.concept || "").toUpperCase()}</Text>
                {Boolean(line.description) && (
                  <Text style={styles.cellDescription}>{line.description}</Text>
                )}
              </View>
              <Text style={[styles.cellText, styles.colQty]}>{line.quantity}</Text>
              <Text style={[styles.cellText, styles.colPrice]}>
                {formatCurrency(line.unit_price)}
              </Text>
              {hasDiscount && (
                <Text style={[styles.cellText, styles.colDiscount]}>
                  {line.discount_percent > 0 ? `${line.discount_percent}%` : "—"}
                </Text>
              )}
              <Text style={[styles.cellText, styles.colTax]}>{line.tax_rate}%</Text>
              {hasIrpfColumn && (
                <Text style={[styles.cellText, styles.colIrpf]}>
                  {line.withholding_rate > 0 ? `${line.withholding_rate}%` : "—"}
                </Text>
              )}
              <Text style={[styles.cellText, styles.colTotal]}>
                {formatCurrency(line.subtotal)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totales + notas — sin corte de página */}
        <View wrap={false}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Base imponible</Text>
              <Text style={styles.totalValue}>{formatCurrency(order.subtotal)}</Text>
            </View>
            {taxes.map((tax) => (
              <View key={tax.rate} style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA {tax.rate}%</Text>
                <Text style={styles.totalValue}>{formatCurrency(tax.amount)}</Text>
              </View>
            ))}
            {hasWithholding && (
              <View style={styles.withholdingRow}>
                <Text style={styles.withholdingLabel}>
                  Retención IRPF {order.withholding_rate > 0 ? `${order.withholding_rate}%` : ""}
                </Text>
                <Text style={styles.withholdingValue}>
                  -{formatCurrency(order.withholding_amount)}
                </Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(order.total)}</Text>
            </View>
          </View>

          {/* Notas */}
          {Boolean(order.notes) && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Observaciones / Condiciones</Text>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          )}

          {/* Disclaimer fiscal */}
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>
              Este documento es una estimación operativa de compra y no tiene validez como documento
              fiscal. No genera asientos contables. La factura oficial del proveedor es el único
              documento con efecto fiscal y contable.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} />

        {/* Paginación */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          fixed
        />
        <Text
          style={styles.documentHash}
          render={({ pageNumber, totalPages }) =>
            pageNumber === totalPages ? `Ref. documento: ${resolvedHash}` : null
          }
          fixed
        />
      </Page>
    </Document>
  );
};

export default PurchaseOrderPDFDocument;
