import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";
import "../../styles/components/navigation/detail-navigation-bar.css";

interface DetailNavigationBarProps {
  pageTitle: string;
  contextInfo?: string | ReactNode;
  tools?: ReactNode;
  onBack?: () => void;
  backPath?: string;
}

const DetailNavigationBar = ({
  pageTitle,
  contextInfo,
  tools,
  onBack,
  backPath,
}: DetailNavigationBarProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    } else {
      window.history.back();
    }
  };

  return (
    <nav className="detail-navigation-bar">
      <div className="detail-navigation-bar__container">
        {/* Left Section - Nombre de la página */}
        <div className="detail-navigation-bar__left">
          {(backPath || onBack) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="detail-navigation-bar__back-button"
              aria-label="Volver atrás"
            >
              <ArrowLeft className="detail-navigation-bar__back-icon" />
            </Button>
          )}
          <h1 className="detail-navigation-bar__page-title">{pageTitle}</h1>
        </div>

        {/* Center Section - Buscador */}
        <div className="detail-navigation-bar__center">
          {contextInfo && (
            <div className="detail-navigation-bar__context-info">
              {typeof contextInfo === "string" ? (
                <span className="detail-navigation-bar__context-text">
                  {contextInfo}
                </span>
              ) : (
                contextInfo
              )}
            </div>
          )}
        </div>

        {/* Right Section - Herramientas (siempre visible para mantener centrado) */}
        <div className="detail-navigation-bar__right">
          <div className="detail-navigation-bar__tools">{tools}</div>
        </div>
      </div>
    </nav>
  );
};

export default DetailNavigationBar;
