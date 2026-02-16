import { useNavigate, useLocation } from "react-router-dom";
import { FolderKanban, FileText, ScanLine, Users, Plus, Receipt, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <nav 
      className="mobile-bottom-nav"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mobile-bottom-nav-container">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === 'more' ? isMoreActive : isActive(item.id);
          
          if (item.isAction && item.id === 'more' && moreMenuItems.length > 0) {
            return (
              <DropdownMenu key={item.id}>
                <DropdownMenuTrigger asChild>
                  <button
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
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="end"
                  sideOffset={12}
                  className="min-w-[200px] z-[9999] bg-card border border-border shadow-xl mb-1"
                >
                  {moreMenuItems.map((menuItem) => {
                    const MenuIcon = menuItem.icon;
                    return (
                      <DropdownMenuItem
                        key={menuItem.id}
                        onClick={() => navigate(menuItem.path)}
                        className="cursor-pointer py-3 px-4 text-sm"
                      >
                        <MenuIcon className="h-4 w-4 mr-3 flex-shrink-0" />
                        <span>{menuItem.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
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
