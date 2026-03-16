import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import PlatformBrand from "../common/PlatformBrand";
import UserAvatar from "../common/UserAvatar";

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  department: string;
  roles: string[];
  phone?: string;
  job_position?: string;
  theme_preference?: 'light' | 'dark';
}

interface MobileHeaderProps {
  userId: string | undefined;
  userInfo: UserInfo | null;
  currentTheme: 'light' | 'dark';
  onLogout: () => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export const MobileHeader = ({
  userId,
  userInfo,
  currentTheme,
  onLogout,
  onThemeChange,
}: MobileHeaderProps) => {
  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/projects')) {
      if (pathname.match(/\/projects\/[^/]+$/)) return 'Detalle Proyecto';
      return 'Proyectos';
    }
    if (pathname.includes('/clients')) {
      if (pathname.match(/\/clients\/[^/]+$/)) return 'Detalle Cliente';
      return 'Clientes';
    }
    if (pathname.includes('/scanner')) return 'Escáner';
    if (pathname.includes('/quotes')) {
      if (pathname.includes('/new')) return 'Nuevo Presupuesto';
      if (pathname.match(/\/quotes\/[^/]+$/)) return 'Detalle Presupuesto';
      if (pathname.includes('/edit')) return 'Editar Presupuesto';
      return 'Presupuestos';
    }
    if (pathname.includes('/invoices')) {
      if (pathname.match(/\/invoices\/new$/)) return 'Nueva Factura';
      if (pathname.match(/\/invoices\/[^/]+\/edit$/)) return 'Editar Factura';
      if (pathname.match(/\/invoices\/[^/]+$/)) return 'Detalle Factura';
      return 'Facturas';
    }
    if (pathname.includes('/purchase-invoices')) {
      if (pathname.match(/\/purchase-invoices\/new$/)) return 'Nueva Compra';
      if (pathname.match(/\/purchase-invoices\/[^/]+\/edit$/)) return 'Editar Compra';
      if (pathname.match(/\/purchase-invoices\/[^/]+$/)) return 'Detalle Compra';
      return 'Compras';
    }
    if (pathname.includes('/expenses')) {
      if (pathname.match(/\/expenses\/new$/)) return 'Nuevo Gasto';
      if (pathname.match(/\/expenses\/[^/]+\/edit$/)) return 'Editar Gasto';
      if (pathname.match(/\/expenses\/[^/]+$/)) return 'Detalle Gasto';
      return 'Gastos';
    }
    if (pathname.includes('/settings')) return 'Configuración';
    if (pathname.includes('/audit')) return 'Auditoría';
    if (pathname.includes('/catalog')) return 'Catálogo';
    if (pathname.includes('/calculator')) return 'Calculadora';
    if (pathname.includes('/mapa')) return 'Mapa';
    if (pathname.includes('/technicians')) {
      if (pathname.match(/\/technicians\/[^/]+$/)) return 'Detalle Técnico';
      return 'Técnicos';
    }
    if (pathname.includes('/suppliers')) return 'Proveedores';
    if (pathname.includes('/users')) return 'Usuarios';
    return 'NEXO AV';
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-background/92 backdrop-blur-xl border-b border-border/60"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(var(--mobile-header-height) + env(safe-area-inset-top, 0px))'
      }}
    >
      <div className="w-full h-[var(--mobile-header-height)] px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="flex-shrink-0 active:scale-95 transition-all duration-200"
            style={{ touchAction: 'manipulation' }}
          >
            <PlatformBrand
              userId={userId}
              logoOnly
              compact
              className="scale-90"
            />
          </div>
          <h1 className="text-base font-medium text-foreground truncate">
            {pageTitle}
          </h1>
        </div>

        {userInfo && (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-2xl active:scale-95 transition-all duration-200"
              style={{ touchAction: 'manipulation' }}
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
            </Button>

            <UserAvatar
              fullName={userInfo.full_name}
              email={userInfo.email}
              userId={userInfo.user_id}
              phone={userInfo.phone || ''}
              position={userInfo.job_position || ''}
              themePreference={currentTheme}
              onLogout={onLogout}
              onThemeChange={onThemeChange}
              compact
            />
          </div>
        )}
      </div>
    </header>
  );
};
