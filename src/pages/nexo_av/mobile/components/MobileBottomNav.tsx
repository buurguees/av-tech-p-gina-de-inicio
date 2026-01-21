import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, MapPin, FileText, Calculator, MoreHorizontal, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import MenuDesplegable from './mobile/MenuDesplegable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsNexoAvDarkTheme } from '../../hooks/useNexoAvThemeMode';

interface MobileBottomNavProps {
  userId: string;
  userRoles?: string[];
}

const MobileBottomNav = ({ userId, userRoles = [] }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const isDark = useIsNexoAvDarkTheme();

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
        className={cn(
          'nexo-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40',
          isDark && 'nexo-dark'
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div className="nexo-nav-container flex items-center justify-around h-16 px-1 py-1.5 gap-1">
          {navItems.map((item) => {
            const active = isActive(item.matchPaths) && !item.isMenu && item.available !== false;
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
                  'nexo-nav-button flex flex-col items-center justify-center transition-all duration-300',
                  active && 'nexo-nav-active',
                  !isAvailable && 'opacity-40 cursor-not-allowed'
                )}
                aria-label={item.label}
                aria-disabled={!isAvailable}
                style={{ touchAction: 'manipulation' }}
              >
                <div className={cn(
                  'nexo-icon-container relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300',
                  active && 'nexo-icon-active'
                )}>
                  <item.icon className={cn(
                    'nexo-nav-icon h-5 w-5 shrink-0 transition-all duration-300',
                    !isAvailable && 'opacity-40'
                  )} />
                </div>
                <span className={cn(
                  'nexo-nav-label mt-0.5 text-[10px] font-semibold whitespace-nowrap transition-all duration-300',
                  !isAvailable && 'opacity-40'
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
