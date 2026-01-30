import { useState } from "react";
import {
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Eye, EyeOff } from "lucide-react";

// Importar componente de documento desde ubicación compartida
import { 
  InvoicePDFDocument, 
  type Invoice, 
  type InvoiceLine, 
  type Client, 
  type CompanySettings, 
  type Project,
  type CompanyPreferences 
} from "@/pages/nexo_av/assets/plantillas";

// Re-exportar para compatibilidad con importaciones existentes
export { InvoicePDFDocument };

interface InvoicePDFViewerProps {
  invoice: Invoice;
  lines: InvoiceLine[];
  client: Client | null;
  company: CompanySettings | null;
  project: Project | null;
  preferences?: CompanyPreferences | null;
  fileName: string;
}

const InvoicePDFViewer = ({ invoice, lines, client, company, project, preferences, fileName }: InvoicePDFViewerProps) => {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="text-white/60 hover:text-white hover:bg-white/10 gap-2"
        >
          {showPreview ? (
            <>
              <EyeOff className="h-4 w-4" />
              <span className="hidden md:inline">Ocultar</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span className="hidden md:inline">Ver</span>
            </>
          )}
        </Button>

        <PDFDownloadLink
          document={
            <InvoicePDFDocument
              invoice={invoice}
              lines={lines}
              client={client}
              company={company}
              project={project}
              preferences={preferences}
            />
          }
          fileName={fileName}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
        >
          {({ loading }) =>
            loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden md:inline">Generando...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">Descargar PDF</span>
              </>
            )
          }
        </PDFDownloadLink>
      </div>

      {/* PDF Preview */}
      {showPreview && (
        <div className="flex-1 overflow-hidden bg-zinc-800" style={{ height: 'calc(100% - 48px)' }}>
          <PDFViewer
            width="100%"
            height="100%"
            showToolbar={true}
            className="border-0 w-full h-full"
          >
            <InvoicePDFDocument
              invoice={invoice}
              lines={lines}
              client={client}
              company={company}
              project={project}
              preferences={preferences}
            />
          </PDFViewer>
        </div>
      )}
    </div>
  );
};

export default InvoicePDFViewer;
