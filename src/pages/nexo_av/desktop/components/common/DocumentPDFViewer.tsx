import { useState, ReactElement } from "react";
import { PDFDownloadLink, PDFViewer, Document } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Download } from "lucide-react";
import "../../styles/components/common/document-pdf-viewer.css";

interface DocumentPDFViewerProps {
  /**
   * El documento PDF generado con @react-pdf/renderer
   * Debe ser un componente Document de react-pdf
   */
  document: ReactElement<typeof Document>;
  
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
  showToolbar = false,
}: DocumentPDFViewerProps) => {
  const [showPreview, setShowPreview] = useState(defaultShowPreview);

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
          <PDFViewer
            width="100%"
            height="100%"
            className="document-pdf-viewer__viewer"
            showToolbar={showToolbar}
          >
            {document}
          </PDFViewer>
        </div>
      )}
    </div>
  );
};

export default DocumentPDFViewer;
