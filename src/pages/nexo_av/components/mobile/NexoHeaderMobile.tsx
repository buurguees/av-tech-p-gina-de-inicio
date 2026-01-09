import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexoLogo } from "../NexoHeader";

interface NexoHeaderMobileProps {
  title: string;
  subtitle?: string;
  userId: string;
  showBack?: boolean;
  showHome?: boolean;
  backTo?: string;
  customTitle?: React.ReactNode;
}

const NexoHeaderMobile = ({ 
  title, 
  subtitle = "NEXO AV", 
  userId, 
  showBack = true, 
  showHome = false,
  backTo,
  customTitle,
}: NexoHeaderMobileProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(`/nexo-av/${userId}/dashboard`);
    }
  };

  const handleHome = () => {
    navigate(`/nexo-av/${userId}/dashboard`);
  };

  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-50 shadow-lg safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="text-white hover:bg-white/10 rounded-xl touch-target shrink-0"
                aria-label="Volver"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {showHome && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleHome}
                className="text-white hover:bg-white/10 rounded-xl touch-target shrink-0"
                aria-label="Inicio"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
            <div className="shrink-0">
              <NexoLogo />
            </div>
            <div className="min-w-0 flex-1">
              {customTitle ? (
                <h1 className="text-white font-semibold tracking-wide truncate text-sm sm:text-base">
                  {customTitle}
                </h1>
              ) : (
                <h1 className="text-white font-semibold tracking-wide truncate text-sm sm:text-base">
                  {title}
                </h1>
              )}
              <p className="text-white/40 text-xs truncate">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NexoHeaderMobile;
