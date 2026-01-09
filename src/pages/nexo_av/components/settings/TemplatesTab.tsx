import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileText, Receipt, Eye, Download, Loader2 } from "lucide-react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
  Font,
  Image,
} from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";

// Register font
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf" },
  ],
});

// Company Settings Interface
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
  logo: {
    width: 120,
    height: 40,
    objectFit: "contain",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
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
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 15,
  },
  footerNote: {
    fontSize: 9,
    color: "#666",
    textAlign: "center",
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: "#888",
  },
});

// Quote Template Preview
const QuoteTemplatePreview = ({ company, showProject }: { company: CompanySettings | null; showProject: boolean }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Watermark with two lines */}
      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>PRESUPUESTO</Text>
        <Text style={styles.watermarkNumber}>P-26-000001</Text>
      </View>
      
      <View style={styles.header}>
        <View>
          {company?.logo_url ? (
            <Image src={company.logo_url} style={styles.logo} />
          ) : (
            <Text style={styles.logoPlaceholder}>
              {company?.commercial_name || company?.legal_name || "LOGO EMPRESA"}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.documentTitle}>Presupuesto</Text>
          <Text style={styles.documentNumber}>P-26-000001</Text>
          <Text style={styles.documentDate}>Fecha: 09/01/2026</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.companyBox}>
          <Text style={styles.boxTitle}>Emisor</Text>
          <Text style={styles.boxName}>
            {company?.commercial_name || company?.legal_name || "TU EMPRESA S.L."}
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
            <Text style={styles.boxDetail}>📧 {company.billing_email}</Text>
          )}
          {company?.billing_phone && (
            <Text style={styles.boxDetail}>📞 {company.billing_phone}</Text>
          )}
        </View>
        <View style={styles.clientBox}>
          <Text style={styles.boxTitle}>Cliente</Text>
          <Text style={styles.boxName}>Nombre del Cliente S.L.</Text>
          <Text style={styles.boxDetail}>NIF: B12345678</Text>
          <Text style={styles.boxDetail}>Calle Ejemplo, 123</Text>
          <Text style={styles.boxDetail}>28001 Madrid</Text>
          <Text style={styles.boxDetail}>Madrid</Text>
          <Text style={styles.boxDetail}>📧 cliente@ejemplo.com</Text>
          <Text style={styles.boxDetail}>📞 +34 600 111 222</Text>
        </View>
      </View>

      {/* Project Info - Toggle with showProject */}
      {showProject && (
        <View style={styles.projectBox}>
          <Text style={styles.boxTitle}>Datos del Proyecto</Text>
          <Text style={styles.boxName}>Nombre del Proyecto</Text>
          <Text style={styles.boxDetail}>Nº Proyecto: PR-26-000001</Text>
          <Text style={styles.boxDetail}>Local: Planta Baja</Text>
          <Text style={styles.boxDetail}>📍 Av. Proyecto, 456, Barcelona</Text>
        </View>
      )}

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colConcept]}>CONCEPTO</Text>
          <Text style={[styles.headerText, styles.colQuantity]}>CANTIDAD</Text>
          <Text style={[styles.headerText, styles.colPrice]}>PRECIO</Text>
          <Text style={[styles.headerText, styles.colTax]}>IVA</Text>
          <Text style={[styles.headerText, styles.colTotal]}>SUBTOTAL</Text>
        </View>
        
        <View style={styles.tableRow}>
          <View style={styles.colConcept}>
            <Text style={styles.cellText}>Producto de ejemplo 1</Text>
            <Text style={styles.cellDescription}>Descripción del producto</Text>
          </View>
          <Text style={[styles.cellText, styles.colQuantity]}>2</Text>
          <Text style={[styles.cellText, styles.colPrice]}>500,00 €</Text>
          <Text style={[styles.cellText, styles.colTax]}>21%</Text>
          <Text style={[styles.cellText, styles.colTotal]}>1.000,00 €</Text>
        </View>
        
        <View style={styles.tableRow}>
          <View style={styles.colConcept}>
            <Text style={styles.cellText}>Servicio de instalación</Text>
          </View>
          <Text style={[styles.cellText, styles.colQuantity]}>1</Text>
          <Text style={[styles.cellText, styles.colPrice]}>300,00 €</Text>
          <Text style={[styles.cellText, styles.colTax]}>21%</Text>
          <Text style={[styles.cellText, styles.colTotal]}>300,00 €</Text>
        </View>
      </View>

      <View style={styles.totalsContainer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Base imponible</Text>
          <Text style={styles.totalValue}>1.300,00 €</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>IVA 21%</Text>
          <Text style={styles.totalValue}>273,00 €</Text>
        </View>
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>1.573,00 €</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          Este presupuesto es válido hasta el 31/01/2026.
        </Text>
        <View style={{flexDirection: "row", justifyContent: "space-between", marginTop: 8}}>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 7, fontWeight: "bold", color: "#888", textTransform: "uppercase", marginBottom: 4}}>EMPRESA</Text>
            <Text style={{fontSize: 8, color: "#666", marginBottom: 2}}>
              {company?.legal_name || company?.commercial_name || "Tu Empresa S.L."}
            </Text>
            <Text style={{fontSize: 8, color: "#666"}}>NIF: {company?.tax_id || "B87654321"}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 7, fontWeight: "bold", color: "#888", textTransform: "uppercase", marginBottom: 4}}>CONTACTO</Text>
            <Text style={{fontSize: 8, color: "#666", marginBottom: 2}}>
              {company?.billing_email || "info@tuempresa.com"}
            </Text>
            <Text style={{fontSize: 8, color: "#666"}}>
              {company?.billing_phone || "+34 600 000 000"}
            </Text>
            {company?.website && (
              <Text style={{fontSize: 8, color: "#666"}}>{company.website}</Text>
            )}
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 7, fontWeight: "bold", color: "#888", textTransform: "uppercase", marginBottom: 4}}>DIRECCIÓN FISCAL</Text>
            <Text style={{fontSize: 8, color: "#666", marginBottom: 2}}>
              {company?.fiscal_address || "C/ Tu Dirección, 123"}
            </Text>
            <Text style={{fontSize: 8, color: "#666"}}>
              {company?.fiscal_postal_code && company?.fiscal_city 
                ? `${company.fiscal_postal_code} ${company.fiscal_city}`
                : "28002 Madrid"}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.pageNumber}>Página 1 de 1</Text>
    </Page>
  </Document>
);

// Invoice Template Preview
const InvoiceTemplatePreview = ({ company, showProject }: { company: CompanySettings | null; showProject: boolean }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Watermark with two lines */}
      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>FACTURA</Text>
        <Text style={styles.watermarkNumber}>F-26-000001</Text>
      </View>
      
      <View style={styles.header}>
        <View>
          {company?.logo_url ? (
            <Image src={company.logo_url} style={styles.logo} />
          ) : (
            <Text style={styles.logoPlaceholder}>
              {company?.commercial_name || company?.legal_name || "LOGO EMPRESA"}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.documentTitle}>Factura</Text>
          <Text style={styles.documentNumber}>F-26-000001</Text>
          <Text style={styles.documentDate}>Fecha: 09/01/2026</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.companyBox}>
          <Text style={styles.boxTitle}>Emisor</Text>
          <Text style={styles.boxName}>
            {company?.commercial_name || company?.legal_name || "TU EMPRESA S.L."}
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
            <Text style={styles.boxDetail}>📧 {company.billing_email}</Text>
          )}
          {company?.billing_phone && (
            <Text style={styles.boxDetail}>📞 {company.billing_phone}</Text>
          )}
        </View>
        <View style={styles.clientBox}>
          <Text style={styles.boxTitle}>Cliente</Text>
          <Text style={styles.boxName}>Cliente Ejemplo S.L.</Text>
          <Text style={styles.boxDetail}>NIF: B12345678</Text>
          <Text style={styles.boxDetail}>Calle Ejemplo, 123</Text>
          <Text style={styles.boxDetail}>28001 Madrid</Text>
          <Text style={styles.boxDetail}>Madrid</Text>
          <Text style={styles.boxDetail}>📧 cliente@ejemplo.com</Text>
          <Text style={styles.boxDetail}>📞 +34 600 111 222</Text>
        </View>
      </View>

      {/* Project Info - Toggle with showProject */}
      {showProject && (
        <View style={styles.projectBox}>
          <Text style={styles.boxTitle}>Datos del Proyecto</Text>
          <Text style={styles.boxName}>Nombre del Proyecto</Text>
          <Text style={styles.boxDetail}>Nº Proyecto: PR-26-000001</Text>
          <Text style={styles.boxDetail}>Local: Oficina Central</Text>
          <Text style={styles.boxDetail}>📍 Av. Proyecto, 456, Barcelona</Text>
        </View>
      )}

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colConcept]}>CONCEPTO</Text>
          <Text style={[styles.headerText, styles.colQuantity]}>CANTIDAD</Text>
          <Text style={[styles.headerText, styles.colPrice]}>PRECIO</Text>
          <Text style={[styles.headerText, styles.colTax]}>IVA</Text>
          <Text style={[styles.headerText, styles.colTotal]}>SUBTOTAL</Text>
        </View>
        
        <View style={styles.tableRow}>
          <View style={styles.colConcept}>
            <Text style={styles.cellText}>Producto facturado</Text>
            <Text style={styles.cellDescription}>Descripción detallada</Text>
          </View>
          <Text style={[styles.cellText, styles.colQuantity]}>2</Text>
          <Text style={[styles.cellText, styles.colPrice]}>500,00 €</Text>
          <Text style={[styles.cellText, styles.colTax]}>21%</Text>
          <Text style={[styles.cellText, styles.colTotal]}>1.000,00 €</Text>
        </View>
      </View>

      <View style={styles.totalsContainer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Base imponible</Text>
          <Text style={styles.totalValue}>1.000,00 €</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>IVA 21%</Text>
          <Text style={styles.totalValue}>210,00 €</Text>
        </View>
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>1.210,00 €</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          Fecha de vencimiento: 31/01/2026
        </Text>
        <View style={{flexDirection: "row", justifyContent: "space-between", marginTop: 8}}>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 7, fontWeight: "bold", color: "#888", textTransform: "uppercase", marginBottom: 4}}>EMPRESA</Text>
            <Text style={{fontSize: 8, color: "#666", marginBottom: 2}}>
              {company?.legal_name || company?.commercial_name || "Tu Empresa S.L."}
            </Text>
            <Text style={{fontSize: 8, color: "#666"}}>NIF: {company?.tax_id || "B87654321"}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 7, fontWeight: "bold", color: "#888", textTransform: "uppercase", marginBottom: 4}}>CONTACTO</Text>
            <Text style={{fontSize: 8, color: "#666", marginBottom: 2}}>
              {company?.billing_email || "facturacion@tuempresa.com"}
            </Text>
            <Text style={{fontSize: 8, color: "#666"}}>
              {company?.billing_phone || "+34 600 000 000"}
            </Text>
            {company?.website && (
              <Text style={{fontSize: 8, color: "#666"}}>{company.website}</Text>
            )}
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 7, fontWeight: "bold", color: "#888", textTransform: "uppercase", marginBottom: 4}}>DIRECCIÓN FISCAL</Text>
            <Text style={{fontSize: 8, color: "#666", marginBottom: 2}}>
              {company?.fiscal_address || "C/ Tu Dirección, 123"}
            </Text>
            <Text style={{fontSize: 8, color: "#666"}}>
              {company?.fiscal_postal_code && company?.fiscal_city 
                ? `${company.fiscal_postal_code} ${company.fiscal_city}`
                : "28002 Madrid"}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.pageNumber}>Página 1 de 1</Text>
    </Page>
  </Document>
);

export function TemplatesTab() {
  const [selectedTemplate, setSelectedTemplate] = useState<"quote" | "invoice">("quote");
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProject, setShowProject] = useState(true);

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_settings' as any);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCompany({
          legal_name: data[0].legal_name || '',
          commercial_name: data[0].commercial_name || null,
          tax_id: data[0].tax_id || '',
          vat_number: data[0].vat_number || null,
          fiscal_address: data[0].fiscal_address || '',
          fiscal_city: data[0].fiscal_city || '',
          fiscal_postal_code: data[0].fiscal_postal_code || '',
          fiscal_province: data[0].fiscal_province || '',
          billing_email: data[0].billing_email || null,
          billing_phone: data[0].billing_phone || null,
          website: data[0].website || null,
          logo_url: data[0].logo_url || null,
        });
      }
    } catch (err) {
      console.error('Error fetching company settings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-white/60 text-sm">Cargando plantillas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-500" />
          Plantillas de Documentos
        </CardTitle>
        <CardDescription className="text-white/60">
          Previsualiza las plantillas de presupuestos y facturas. La personalización avanzada estará disponible próximamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as "quote" | "invoice")}>
          <TabsList className="bg-white/5 border border-white/10 mb-4">
            <TabsTrigger 
              value="quote" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 gap-2"
            >
              <FileText className="h-4 w-4" />
              Presupuesto
            </TabsTrigger>
            <TabsTrigger 
              value="invoice" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 gap-2"
            >
              <Receipt className="h-4 w-4" />
              Factura
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quote" className="mt-0">
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-white/60" />
                  <span className="text-white/60 text-sm">Vista previa - Plantilla de Presupuesto</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-project"
                    checked={showProject}
                    onCheckedChange={setShowProject}
                    className="data-[state=checked]:bg-orange-500"
                  />
                  <Label htmlFor="show-project" className="text-white/70 text-sm cursor-pointer">
                    Mostrar Proyecto
                  </Label>
                </div>
              </div>
              <div className="h-[600px] bg-zinc-800">
                <PDFViewer width="100%" height="100%" showToolbar={false}>
                  <QuoteTemplatePreview company={company} showProject={showProject} />
                </PDFViewer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invoice" className="mt-0">
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-white/60" />
                  <span className="text-white/60 text-sm">Vista previa - Plantilla de Factura</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-project-invoice"
                    checked={showProject}
                    onCheckedChange={setShowProject}
                    className="data-[state=checked]:bg-orange-500"
                  />
                  <Label htmlFor="show-project-invoice" className="text-white/70 text-sm cursor-pointer">
                    Mostrar Proyecto
                  </Label>
                </div>
              </div>
              <div className="h-[600px] bg-zinc-800">
                <PDFViewer width="100%" height="100%" showToolbar={false}>
                  <InvoiceTemplatePreview company={company} showProject={showProject} />
                </PDFViewer>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-orange-300 text-sm">
            <strong>Próximamente:</strong> Podrás personalizar los colores, fuentes, logo, textos legales y layout de las plantillas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
