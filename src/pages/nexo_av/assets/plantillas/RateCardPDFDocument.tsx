/**
 * RateCardPDFDocument — Condiciones Económicas para Técnicos Externos
 * Mismo sistema visual que QuotePDFDocument / InvoicePDFDocument / PurchaseOrderPDFDocument
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

export interface RateCardLineForPDF {
  id?: string;
  product_name: string;
  product_sku: string;
  product_type: string;
  unit_price: number;
  notes: string | null;
  line_order: number;
}

export interface RateCardForPDF {
  id?: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
}

export interface CompanySettingsForRateCard {
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

export interface RateCardPDFDocumentProps {
  rateCard: RateCardForPDF;
  lines: RateCardLineForPDF[];
  company: CompanySettingsForRateCard | null;
  issueDate?: string;
  /** Nombre del técnico destinatario (opcional). Si se omite, es documento genérico. */
  technicianName?: string | null;
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
    left: "8%",
    transform: "rotate(-45deg)",
    fontSize: 70,
    color: "#f0f0f0",
    opacity: 0.3,
    fontWeight: "bold",
    letterSpacing: 10,
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
  documentSubtitle: {
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
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
  },
  recipientBox: {
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
  rateCardInfoBox: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: "#fafafa",
    borderRadius: 4,
  },
  rateCardInfoTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1,
  },
  rateCardInfoName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  rateCardInfoDetail: {
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
  colOrder: { width: 20 },
  colSku: { width: 68, textAlign: "left" },
  colConcept: { flex: 1 },
  colPrice: { width: 70, textAlign: "right" },
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
  cellSku: {
    fontSize: 8,
    color: "#888",
  },
  cellDescription: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
    lineHeight: 1.4,
  },
  cellPriceValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
  },
  conditionsSection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
  },
  conditionsTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  conditionItem: {
    flexDirection: "row",
    marginBottom: 5,
    gap: 5,
  },
  conditionBullet: {
    fontSize: 8.5,
    color: "#555",
    fontWeight: "bold",
  },
  conditionText: {
    fontSize: 8.5,
    color: "#444",
    flex: 1,
    lineHeight: 1.4,
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
  documentHash: {
    position: "absolute",
    bottom: 18,
    left: 40,
    fontSize: 7,
    color: "#888",
    maxWidth: "75%",
  },
});

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const buildDeterministicHash = (input: string): string => {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
};

const CONDITIONS = [
  "Las jornadas incluyen el tiempo de desplazamiento dentro del cómputo de horas. Si el tiempo total entre desplazamiento y trabajo supera las horas de la jornada contratada, las horas adicionales de desplazamiento se facturan como Hora Desplazamiento.",
  "Las Horas Extra se contabilizan a partir de la primera hora completa adicional que supere la jornada contratada: más de 8 horas en jornada completa, más de 4 horas en media jornada.",
  "El desplazamiento en kilómetros se calcula contabilizando ida y vuelta desde el punto de origen del técnico hasta el lugar de instalación.",
  "La Dieta Completa aplica únicamente en instalaciones fuera de la Península Ibérica: Islas Baleares, Islas Canarias e internacional.",
  "Estas tarifas tienen carácter interno y están sujetas a revisión anual. Cualquier modificación se comunicará con un mínimo de 30 días de antelación.",
];

export const RateCardPDFDocument = ({
  rateCard,
  lines,
  company,
  issueDate,
  technicianName,
  documentHash,
}: RateCardPDFDocumentProps) => {
  const companyName = company?.commercial_name || company?.legal_name || "AV TECH Esdeveniments SL";
  const sortedLines = [...lines].sort((a, b) => a.line_order - b.line_order);
  const dateStr = issueDate || new Date().toISOString().split("T")[0];

  const resolvedHash =
    documentHash ||
    buildDeterministicHash(
      ["RATECARD", rateCard.id || rateCard.name, dateStr, technicianName || "GENERIC"].join("|")
    );

  return (
    <Document
      title={`Condiciones Económicas - ${rateCard.name}`}
      author={companyName}
      subject="Condiciones Económicas para Técnicos Externos"
    >
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>TARIFAS</Text>

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
            <Text style={styles.documentTitle}>Condiciones Económicas</Text>
            <Text style={styles.documentSubtitle}>{rateCard.name}</Text>
            <Text style={styles.documentDate}>Fecha: {formatDate(dateStr)}</Text>
          </View>
        </View>

        {/* Emisor | Destinatario */}
        <View style={styles.infoRow}>
          <View style={styles.companyBox}>
            <Text style={styles.boxTitle}>Emisor</Text>
            <Text style={styles.boxName}>{companyName}</Text>
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

          <View style={styles.recipientBox}>
            <Text style={styles.boxTitle}>Destinatario</Text>
            <Text style={styles.boxName}>
              {technicianName || "Técnicos Externos"}
            </Text>
            {technicianName ? (
              <Text style={styles.boxDetail}>Técnico externo colaborador</Text>
            ) : (
              <Text style={styles.boxDetail}>Autónomos y empresas colaboradoras</Text>
            )}
            <Text style={styles.boxDetail}>{companyName}</Text>
          </View>
        </View>

        {/* Datos de la tarifa */}
        <View style={styles.rateCardInfoBox}>
          <Text style={styles.rateCardInfoTitle}>Datos de la Tarifa</Text>
          <Text style={styles.rateCardInfoName}>
            {rateCard.name}
            {rateCard.is_default ? "  ★ Tarifa estándar por defecto" : ""}
          </Text>
          {Boolean(rateCard.description) && (
            <Text style={styles.rateCardInfoDetail}>{rateCard.description}</Text>
          )}
          <Text style={styles.rateCardInfoDetail}>
            {sortedLines.length} concepto{sortedLines.length !== 1 ? "s" : ""} incluido{sortedLines.length !== 1 ? "s" : ""}
            {"  ·  "}Revisión: anual (enero)
          </Text>
        </View>

        {/* Tabla de líneas */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colOrder]}>#</Text>
            <Text style={[styles.headerText, styles.colSku]}>SKU</Text>
            <Text style={[styles.headerText, styles.colConcept]}>CONCEPTO / DESCRIPCIÓN</Text>
            <Text style={[styles.headerText, styles.colPrice]}>PRECIO</Text>
          </View>

          {sortedLines.map((line, idx) => (
            <View key={`${line.product_sku}-${idx}`} style={styles.tableRow} wrap={false}>
              <View style={styles.colOrder}>
                <Text style={[styles.cellText, { color: "#888", fontSize: 8 }]}>{idx + 1}</Text>
              </View>
              <View style={styles.colSku}>
                <Text style={styles.cellSku}>{line.product_sku}</Text>
              </View>
              <View style={styles.colConcept}>
                <Text style={styles.cellText}>{line.product_name.toUpperCase()}</Text>
                {Boolean(line.notes) && (
                  <Text style={styles.cellDescription}>{line.notes}</Text>
                )}
              </View>
              <View style={styles.colPrice}>
                <Text style={styles.cellPriceValue}>{formatCurrency(line.unit_price)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Condiciones generales */}
        <View style={styles.conditionsSection} wrap={false}>
          <Text style={styles.conditionsTitle}>Condiciones Generales</Text>
          {CONDITIONS.map((c, i) => (
            <View key={i} style={styles.conditionItem}>
              <Text style={styles.conditionBullet}>›</Text>
              <Text style={styles.conditionText}>{c}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerColumns}>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>EMPRESA</Text>
              <Text style={styles.footerText}>{companyName}</Text>
              {Boolean(company?.tax_id) && (
                <Text style={styles.footerText}>NIF: {company!.tax_id}</Text>
              )}
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>CONTACTO</Text>
              {Boolean(company?.billing_email) && (
                <Text style={styles.footerText}>{company!.billing_email}</Text>
              )}
              {Boolean(company?.billing_phone) && (
                <Text style={styles.footerText}>{company!.billing_phone}</Text>
              )}
              {Boolean(company?.website) && (
                <Text style={styles.footerText}>{company!.website}</Text>
              )}
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>DIRECCIÓN FISCAL</Text>
              {Boolean(company?.fiscal_address) && (
                <Text style={styles.footerText}>{company!.fiscal_address}</Text>
              )}
              {Boolean(company?.fiscal_postal_code) && Boolean(company?.fiscal_city) && (
                <Text style={styles.footerText}>
                  {company!.fiscal_postal_code} {company!.fiscal_city}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Paginación */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
        <Text
          style={styles.documentHash}
          render={({ pageNumber, totalPages }) =>
            pageNumber === totalPages ? `Hash único: ${resolvedHash}` : null
          }
          fixed
        />
      </Page>
    </Document>
  );
};

export default RateCardPDFDocument;
