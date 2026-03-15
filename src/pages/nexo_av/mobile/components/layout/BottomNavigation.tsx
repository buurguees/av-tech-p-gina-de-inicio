import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FolderKanban, FileText, ScanLine, Users, Plus, Settings, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  isAction?: boolean;
}

export interface MoreMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
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
  const hasMoreMenu = moreMenuItems.length > 0;
  
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
      label: hasMoreMenu ? 'Más' : 'Ajustes',
      icon: hasMoreMenu ? Plus : Settings,
      path: `/nexo-av/${userId}/settings`,
      isAction: hasMoreMenu
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
            className="absolute bottom-[96px] right-4 z-[9999]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card/98 border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[220px] backdrop-blur-xl">
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
                      "w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-foreground min-h-11",
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

      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-container">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.id === 'more' ? (isMoreActive || showMore) : isActive(item.id);
            
            if (item.isAction && item.id === 'more' && hasMoreMenu) {
              return (
                <button
                  key={item.id}
                  onClick={() => setShowMore(!showMore)}
                  className={cn(
                    "bottom-nav-item",
                    active && "active"
                  )}
                  aria-label={item.label}
                  aria-pressed={showMore}
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
                aria-current={active ? "page" : undefined}
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
