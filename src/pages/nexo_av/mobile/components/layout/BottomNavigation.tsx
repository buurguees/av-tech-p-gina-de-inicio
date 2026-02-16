import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FolderKanban, FileText, ScanLine, Users, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import "../../styles/components/layout/bottom-navigation.css";

interface BottomNavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  isAction?: boolean;
}

export interface MoreMenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

interface BottomNavigationProps {
  userId: string;
  moreMenuItems?: MoreMenuItem[];
}

export const BottomNavigation = ({ userId, moreMenuItems = [] }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
  
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
  
  const isMoreActive = moreMenuItems.some(mi => location.pathname.includes(mi.id));
  
  return (
    <>
      {/* Overlay + floating menu */}
      {showMore && moreMenuItems.length > 0 && (
        <div className="fixed inset-0 z-[9998]" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div 
            className="absolute bottom-[100px] right-4 z-[9999]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[220px]">
              {moreMenuItems.map((menuItem, idx) => {
                const MenuIcon = menuItem.icon;
                return (
                  <button
                    key={menuItem.id}
                    onClick={() => {
                      setShowMore(false);
                      navigate(menuItem.path);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-foreground",
                      "active:bg-secondary/80 transition-colors",
                      idx < moreMenuItems.length - 1 && "border-b border-border/50"
                    )}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <MenuIcon className="h-5 w-5 text-muted-foreground" />
                    <span>{menuItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav 
        className="mobile-bottom-nav"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="mobile-bottom-nav-container">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.id === 'more' ? (isMoreActive || showMore) : isActive(item.id);
            
            if (item.isAction && item.id === 'more' && moreMenuItems.length > 0) {
              return (
                <button
                  key={item.id}
                  onClick={() => setShowMore(!showMore)}
                  className={cn(
                    "bottom-nav-item",
                    active && "active"
                  )}
                  aria-label={item.label}
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className="bottom-nav-icon-wrapper">
                    {showMore ? (
                      <X className="bottom-nav-icon" />
                    ) : (
                      <Icon className="bottom-nav-icon" />
                    )}
                  </div>
                  <span className="bottom-nav-label">
                    {item.label}
                  </span>
                </button>
              );
            }
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setShowMore(false);
                  navigate(item.path);
                }}
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
    </>
  );
};
