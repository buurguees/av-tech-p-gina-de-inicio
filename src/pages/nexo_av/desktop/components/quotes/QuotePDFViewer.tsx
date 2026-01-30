import { useState } from "react";
import {
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Eye, EyeOff } from "lucide-react";

// Importar componente de documento desde ubicación compartida
import { 
  QuotePDFDocument, 
  type Quote, 
  type QuoteLine, 
  type Client, 
  type CompanySettings, 
  type Project 
} from "@/pages/nexo_av/assets/plantillas";

// Re-exportar para compatibilidad con importaciones existentes
export { QuotePDFDocument };

interface QuotePDFViewerProps {
  quote: Quote;
  lines: QuoteLine[];
  client: Client | null;
  company: CompanySettings | null;
  project: Project | null;
  fileName: string;
}

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
