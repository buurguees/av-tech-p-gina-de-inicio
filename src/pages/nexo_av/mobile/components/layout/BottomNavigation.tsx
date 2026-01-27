import { useNavigate, useLocation } from "react-router-dom";
import { FolderKanban, FileText, ScanLine, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import "../../styles/components/layout/bottom-navigation.css";

interface BottomNavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  isAction?: boolean; // Para el botón "Más" que puede abrir un drawer
}

interface BottomNavigationProps {
  userId: string;
  onMoreClick?: () => void;
}

export const BottomNavigation = ({ userId, onMoreClick }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const items: BottomNavItem[] = [
    {
      id: 'projects',
      label: 'Proyectos',
      icon: FolderKanban,
      path: `/nexo-av/${userId}/projects`
    },
    {
      id: 'quotes',
      label: 'Presupuestos',
      icon: FileText,
      path: `/nexo-av/${userId}/quotes`
    },
    {
      id: 'scanner',
      label: 'Escáner',
      icon: ScanLine,
      path: `/nexo-av/${userId}/scanner`
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      path: `/nexo-av/${userId}/clients`
    },
    {
      id: 'more',
      label: 'Más',
      icon: Plus,
      path: '#',
      isAction: true
    }
  ];
  
  const isActive = (itemId: string) => {
    if (itemId === 'more') return false;
    return location.pathname.includes(itemId);
  };
  
  // Encontrar el item activo y su índice
  const activeItemIndex = items.findIndex(item => isActive(item.id));
  const hasActiveItem = activeItemIndex !== -1;
  
  const handleClick = (item: BottomNavItem) => {
    if (item.isAction && item.id === 'more') {
      if (onMoreClick) {
        onMoreClick();
      }
      return;
    }
    navigate(item.path);
  };
  
  return (
    <nav 
      className="mobile-bottom-nav"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div 
        className={cn(
          "mobile-bottom-nav-container",
          hasActiveItem && "has-active"
        )}
        data-active-index={hasActiveItem ? activeItemIndex : -1}
      >
        {/* SVG de fondo con deformación cuando hay item activo */}
        {hasActiveItem ? (
          <svg 
            className="bottom-nav-deformation-bg"
            width="390" 
            height="84" 
            viewBox="0 0 390 84" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{
              // El SVG tiene 390px de ancho, igual que el contenedor
              // La deformación está centrada en el SVG (50% = 195px)
              // Necesitamos desplazar el SVG para que su centro se alinee con el elemento activo
              // Centro del elemento activo: (activeItemIndex + 0.5) * (100 / items.length)%
              // Desplazamiento necesario: centroElemento - 50%
              transform: `translateX(calc(${(activeItemIndex + 0.5) * (100 / items.length)}% - 50%))`,
            }}
          >
            <g filter="url(#filter0_f_13_363)">
              <path d="M5 45.5C5 31.6929 16.1929 20.5 30 20.5H63.727C74.6097 20.5 84.8667 25.5877 91.4516 34.2521C105.333 52.5175 132.915 52.4227 146.909 34.243C153.546 25.6202 163.863 20.5 174.744 20.5H360C373.807 20.5 385 31.6929 385 45.5C385 59.3071 373.807 70.5 360 70.5H30C16.1929 70.5 5 59.3071 5 45.5Z" fill="white" fillOpacity="0.1"/>
              <path d="M30 21H63.7266C74.453 21 84.5633 26.0147 91.0537 34.5547C105.138 53.086 133.113 52.9848 147.305 34.5479C153.848 26.0471 164.019 21.0001 174.744 21H360C373.531 21 384.5 31.969 384.5 45.5C384.5 59.031 373.531 70 360 70H30C16.469 70 5.5 59.031 5.5 45.5C5.5 31.969 16.469 21 30 21Z" stroke="white" strokeOpacity="0.19"/>
            </g>
            <defs>
              <filter id="filter0_f_13_363" x="3.5" y="19" width="383" height="53" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                <feGaussianBlur stdDeviation="0.75" result="effect1_foregroundBlur_13_363"/>
              </filter>
            </defs>
          </svg>
        ) : null}
        <div className="bottom-nav-items-wrapper">
          {items.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={cn(
                "bottom-nav-item",
                active && "active"
              )}
              aria-label={item.label}
              style={{ touchAction: 'manipulation' }}
              data-item-index={index}
            >
              <div className={cn(
                "bottom-nav-icon-wrapper",
                active && "active"
              )}>
                <Icon className={cn(
                  "bottom-nav-icon",
                  active && "active"
                )} />
              </div>
              <span className={cn(
                "bottom-nav-label",
                active && "active"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
};
