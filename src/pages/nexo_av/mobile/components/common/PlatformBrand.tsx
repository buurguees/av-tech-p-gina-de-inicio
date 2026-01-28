import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PlatformBrandProps {
  title?: string;
  subtitle?: string;
  userId?: string;
  onClick?: () => void;
  className?: string;
  showSubtitle?: boolean;
  logoOnly?: boolean;
  compact?: boolean; // Versión más compacta para mobile
}

export default function PlatformBrand({
  title = "NEXO AV",
  subtitle = "Plataforma de Gestión",
  userId,
  onClick,
  className,
  showSubtitle = false,
  logoOnly = false,
  compact = false,
}: PlatformBrandProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (userId) {
      navigate(`/nexo-av/${userId}/dashboard`);
    }
  };

  // SVG único que cambia de color según el tema mediante CSS
  const logoSVG = (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-foreground", compact ? "h-6 w-6" : "h-8 w-8")}
    >
      <path d="M500 493.902L256.098 250H340.779L500 409.045V493.902Z" fill="currentColor" />
      <path d="M256.098 250L500 6.09766V90.7789L340.955 250H256.098Z" fill="currentColor" />
      <path d="M250 243.902L6.09753 -7.62939e-05H90.7788L250 159.045V243.902Z" fill="currentColor" />
      <path d="M493.902 -0.000106812L250 243.902V159.221L409.045 -0.000106812H493.902Z" fill="currentColor" />
      <path d="M250 256.098L493.902 500H409.221L250 340.955V256.098Z" fill="currentColor" />
      <path d="M6.09753 500L250 256.098V340.779L90.9553 500H6.09753Z" fill="currentColor" />
      <path d="M3.05176e-05 6.09766L243.902 250H159.221L3.05176e-05 90.9554V6.09766Z" fill="currentColor" />
      <path d="M243.902 250L4.57764e-05 493.902V409.221L159.045 250H243.902Z" fill="currentColor" />
    </svg>
  );

  return (
    <div className={cn("flex items-center", className)}>
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 w-10"
        style={{ touchAction: 'manipulation' }}
        aria-label="Ir al inicio"
      >
        {logoSVG}
        {!logoOnly && (
          <div className="flex flex-col">
            <span className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
              {title}
            </span>
            {showSubtitle && subtitle && (
              <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
