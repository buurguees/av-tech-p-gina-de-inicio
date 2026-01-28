import { useNavigate, useLocation } from "react-router-dom";
import { FolderKanban, FileText, ScanLine, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import "../../styles/components/layout/bottom-navigation.css";

interface BottomNavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  isAction?: boolean;
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
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      path: `/nexo-av/${userId}/clients`
    },
    {
      id: 'scanner',
      label: 'Escáner',
      icon: ScanLine,
      path: `/nexo-av/${userId}/scanner`
    },
    {
      id: 'quotes',
      label: 'Presupuestos',
      icon: FileText,
      path: `/nexo-av/${userId}/quotes`
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
      <div className="mobile-bottom-nav-container">
        {items.map((item) => {
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
            >
              <div className="bottom-nav-icon-wrapper">
                <Icon className="bottom-nav-icon" />
              </div>
              <span className="bottom-nav-label">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
