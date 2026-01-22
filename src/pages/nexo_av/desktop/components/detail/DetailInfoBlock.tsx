import { ReactNode } from "react";
import "../../styles/components/detail/detail-info-block.css";

interface DetailInfoBlockProps {
  header?: ReactNode;
  summary?: ReactNode;
  content?: ReactNode;
  className?: string;
}

const DetailInfoBlock = ({
  header,
  summary,
  content,
  className,
}: DetailInfoBlockProps) => {
  return (
    <div className={`detail-info-block ${className || ""}`}>
      {/* Cabecera con datos importantes */}
      {header && (
        <div className="detail-info-block__header">
          {header}
        </div>
      )}

      {/* Bloque de resumen */}
      {summary && (
        <div className="detail-info-block__summary">
          {summary}
        </div>
      )}

      {/* Bloque dinámico de contenido */}
      {content && (
        <div className="detail-info-block__content">
          {content}
        </div>
      )}
    </div>
  );
};

export default DetailInfoBlock;
