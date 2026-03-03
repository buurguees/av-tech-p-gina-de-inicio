import { useEffect, useState, ReactElement } from "react";
import { PDFDownloadLink, DocumentProps, pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Download, AlertCircle } from "lucide-react";
import "../../styles/components/common/document-pdf-viewer.css";

interface DocumentPDFViewerProps {
  /**
   * El documento PDF generado con @react-pdf/renderer
   * Debe ser un componente Document de react-pdf
   */
  document: ReactElement<DocumentProps>;
  
  /**
   * Nombre del archivo para la descarga (sin extensión .pdf)
   */
  fileName: string;
  
  /**
   * Si se muestra la vista previa por defecto
   * @default true
   */
  defaultShowPreview?: boolean;
  
  /**
   * Clase CSS adicional para el contenedor
   */
  className?: string;
  
  /**
   * Si se muestra la barra de herramientas del PDFViewer
   * @default false
   */
  showToolbar?: boolean;
}

const DocumentPDFViewer = ({
  document,
  fileName,
  defaultShowPreview = true,
  className = "",
}: DocumentPDFViewerProps) => {
  const [showPreview, setShowPreview] = useState(defaultShowPreview);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let urlToRevoke: string | null = null;
    let isMounted = true;

    const generatePreview = async () => {
      try {
        setLoadingPreview(true);
        setPreviewError(null);
        const blob = await pdf(document).toBlob();
        const url = URL.createObjectURL(blob);
        urlToRevoke = url;

        if (!isMounted) {
          URL.revokeObjectURL(url);
          return;
        }

        setPdfUrl(url);
      } catch (error) {
        console.error("Error generating PDF preview:", error);
        if (isMounted) {
          setPreviewError("No se pudo generar la vista previa del PDF.");
          setPdfUrl(null);
        }
      } finally {
        if (isMounted) {
          setLoadingPreview(false);
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [document]);

  return (
    <div className={`document-pdf-viewer ${className}`}>
      {/* Barra de acciones */}
      <div className="document-pdf-viewer__actions">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="document-pdf-viewer__toggle-btn"
        >
          {showPreview ? (
            <>
              <EyeOff className="document-pdf-viewer__icon" />
              Ocultar
            </>
          ) : (
            <>
              <Eye className="document-pdf-viewer__icon" />
              Ver PDF
            </>
          )}
        </Button>

        <PDFDownloadLink
          document={document}
          fileName={`${fileName}.pdf`}
          className="document-pdf-viewer__download-link"
        >
          {({ loading: pdfLoading }) => (
            <Button
              size="sm"
              className="document-pdf-viewer__download-btn"
              disabled={pdfLoading}
            >
              {pdfLoading ? (
                <Loader2 className="document-pdf-viewer__icon document-pdf-viewer__icon--spinning" />
              ) : (
                <Download className="document-pdf-viewer__icon" />
              )}
              Descargar PDF
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      {/* Vista previa del PDF */}
      {showPreview && (
        <div className="document-pdf-viewer__preview">
          {loadingPreview ? (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Generando vista previa...
            </div>
          ) : previewError ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <p className="text-sm">{previewError}</p>
            </div>
          ) : (
            <iframe
              src={pdfUrl ?? undefined}
              className="document-pdf-viewer__viewer"
              title="Vista previa de PDF"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentPDFViewer;
