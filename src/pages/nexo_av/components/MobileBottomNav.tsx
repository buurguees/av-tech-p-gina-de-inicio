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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.15)]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const active = isActive(item.matchPaths);
            const isMenuButton = item.isMenu;
            const isAvailable = item.available !== false;
            
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
                  'flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-2xl transition-all duration-300 relative',
                  'min-h-[56px] min-w-[56px]',
                  isAvailable && 'active:scale-90',
                  !isAvailable && 'opacity-40 cursor-not-allowed',
                  active && !isMenuButton && isAvailable
                    ? 'text-primary bg-primary/15'
                    : isAvailable
                    ? 'text-foreground/60 hover:bg-accent/50 hover:text-foreground'
                    : 'text-muted-foreground/50'
                )}
                aria-label={item.label}
                aria-disabled={!isAvailable}
                style={{ touchAction: 'manipulation' }}
              >
                <div className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300',
                  active && !isMenuButton && isAvailable && 'bg-primary/15'
                )}>
                  <item.icon
                    className={cn(
                      'h-6 w-6 transition-all duration-300',
                      active && !isMenuButton && isAvailable && 'scale-110',
                      active && !isMenuButton && isAvailable ? 'stroke-[2.5]' : 'stroke-[2]'
                    )}
                  />
                  {active && !isMenuButton && isAvailable && (
                    <div className="absolute inset-0 bg-primary/5 rounded-xl animate-pulse" />
                  )}
                </div>
                <span className={cn(
                  'text-[11px] font-semibold truncate max-w-full transition-all duration-300',
                  active && !isMenuButton && isAvailable 
                    ? 'text-primary scale-105' 
                    : isAvailable 
                    ? 'text-foreground/70' 
                    : 'text-muted-foreground/50'
                )}>
                  {item.label}
                </span>
                {!isAvailable && (
                  <div className="absolute top-1 right-1">
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
