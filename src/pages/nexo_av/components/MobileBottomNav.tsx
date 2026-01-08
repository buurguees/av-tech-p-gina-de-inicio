import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, FileText, Package, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  userId: string;
}

const MobileBottomNav = ({ userId }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: Home,
      path: `/nexo-av/${userId}/dashboard`,
      matchPaths: ['/dashboard'],
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      path: `/nexo-av/${userId}/clients`,
      matchPaths: ['/clients'],
    },
    {
      id: 'quotes',
      label: 'Presupuestos',
      icon: FileText,
      path: `/nexo-av/${userId}/quotes`,
      matchPaths: ['/quotes'],
    },
    {
      id: 'catalog',
      label: 'Catálogo',
      icon: Package,
      path: `/nexo-av/${userId}/catalog`,
      matchPaths: ['/catalog'],
    },
    {
      id: 'calculator',
      label: 'Calculadora',
      icon: Calculator,
      path: `/nexo-av/${userId}/calculator`,
      matchPaths: ['/calculator'],
    },
  ];

  const isActive = (matchPaths: string[]) => {
    return matchPaths.some(path => location.pathname.includes(path));
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.matchPaths);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-lg transition-colors',
                active
                  ? 'text-orange-500'
                  : 'text-white/50 active:bg-white/5'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-transform',
                  active && 'scale-110'
                )}
              />
              <span className={cn(
                'text-[10px] font-medium truncate max-w-full',
                active ? 'text-orange-500' : 'text-white/50'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
