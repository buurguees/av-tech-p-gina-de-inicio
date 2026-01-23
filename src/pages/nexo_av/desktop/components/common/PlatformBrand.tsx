import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import "../../styles/components/common/platform-brand.css";

interface PlatformBrandProps {
  title?: string;
  subtitle?: string;
  userId?: string;
  onClick?: () => void;
  className?: string;
  showSubtitle?: boolean;
  logoOnly?: boolean; // Solo mostrar el logo sin texto
}

export default function PlatformBrand({
  title = "NEXO AV",
  subtitle = "Plataforma de Gestión",
  userId,
  onClick,
  className,
  showSubtitle = true,
  logoOnly = false,
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
      className="platform-brand__logo"
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
    <div className={cn("platform-brand", className)}>
      <button
        onClick={handleClick}
        className="platform-brand__button"
        aria-label="Ir al inicio"
      >
        <div className="platform-brand__logo-wrapper">
          {logoSVG}
        </div>
        {!logoOnly && (
          <div className="platform-brand__text">
            <h1 className="platform-brand__title">{title}</h1>
            {showSubtitle && subtitle && (
              <p className="platform-brand__subtitle">{subtitle}</p>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
