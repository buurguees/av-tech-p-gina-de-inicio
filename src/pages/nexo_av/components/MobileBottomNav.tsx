import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, MapPin, FileText, Calculator, MoreHorizontal, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import MenuDesplegable from './mobile/MenuDesplegable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MobileBottomNavProps {
  userId: string;
  userRoles?: string[];
}

const MobileBottomNav = ({ userId, userRoles = [] }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);

  const isAdmin = userRoles.includes('admin');

  const navItems = [
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      path: `/nexo-av/${userId}/clients`,
      matchPaths: ['/clients'],
      available: true, // Página implementada
    },
    {
      id: 'lead-map',
      label: 'Mapa Comercial',
      icon: MapPin,
      path: `/nexo-av/${userId}/lead-map`,
      matchPaths: ['/lead-map'],
      available: true, // Página implementada
    },
    {
      id: 'quotes',
      label: 'Presupuestos',
      icon: FileText,
      path: `/nexo-av/${userId}/quotes`,
      matchPaths: ['/quotes'],
      available: true, // Página implementada
    },
    {
      id: 'calculator',
      label: 'Calculadora',
      icon: Calculator,
      path: `/nexo-av/${userId}/calculator`,
      matchPaths: ['/calculator'],
      available: true, // Página implementada
    },
    {
      id: 'more',
      label: 'Más',
      icon: MoreHorizontal,
      path: '#',
      matchPaths: [],
      isMenu: true,
      available: true,
    },
  ];

  const isActive = (matchPaths: string[]) => {
    if (matchPaths.length === 0) return false;
    return matchPaths.some(path => location.pathname.includes(path));
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('nexo_av_last_login');
      await supabase.auth.signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
      navigate('/nexo-av');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <>
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-lg"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.matchPaths);
            const isMenuButton = item.isMenu;
            const isAvailable = item.available !== false; // Por defecto disponible si no se especifica
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isAvailable) {
                    toast({
                      title: "No disponible",
                      description: "Esta funcionalidad estará disponible próximamente.",
                      variant: "default",
                    });
                    return;
                  }
                  if (isMenuButton) {
                    setShowMenu(true);
                  } else {
                    navigate(item.path);
                  }
                }}
                disabled={!isAvailable}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-xl transition-all duration-200 relative',
                  'min-h-[44px] min-w-[44px]', // Ensure minimum touch target
                  isAvailable && 'active:scale-[0.95] active:bg-secondary', // Better active feedback
                  !isAvailable && 'opacity-50 cursor-not-allowed',
                  active && !isMenuButton && isAvailable
                    ? 'text-primary'
                    : isAvailable
                    ? 'text-muted-foreground hover:bg-secondary'
                    : 'text-muted-foreground/50'
                )}
                aria-label={item.label}
                aria-disabled={!isAvailable}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-transform duration-200',
                    active && !isMenuButton && isAvailable && 'scale-110'
                  )}
                />
                <span className={cn(
                  'text-[10px] font-medium truncate max-w-full',
                  active && !isMenuButton && isAvailable ? 'text-primary' : isAvailable ? 'text-muted-foreground' : 'text-muted-foreground/50'
                )}>
                  {item.label}
                </span>
                {active && !isMenuButton && isAvailable && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                {!isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Lock className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Menu Desplegable */}
      {showMenu && (
        <MenuDesplegable
          userId={userId}
          isAdmin={isAdmin}
          onClose={() => setShowMenu(false)}
          onLogout={handleLogout}
        />
      )}
    </>
  );
};

export default MobileBottomNav;
