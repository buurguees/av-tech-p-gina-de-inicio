import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, FileText, Receipt, Package } from 'lucide-react';
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
      label: 'Presup.',
      icon: FileText,
      path: `/nexo-av/${userId}/quotes`,
      matchPaths: ['/quotes'],
    },
    {
      id: 'invoices',
      label: 'Facturas',
      icon: Receipt,
      path: `/nexo-av/${userId}/invoices`,
      matchPaths: ['/invoices'],
    },
    {
      id: 'catalog',
      label: 'Catálogo',
      icon: Package,
      path: `/nexo-av/${userId}/catalog`,
      matchPaths: ['/catalog'],
    },
  ];

  const isActive = (matchPaths: string[]) => {
    return matchPaths.some(path => location.pathname.includes(path));
  };

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-t border-white/10 shadow-2xl"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset">
        {navItems.map((item) => {
          const active = isActive(item.matchPaths);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-xl transition-all duration-200',
                'touch-target min-h-[44px]', // Ensure minimum touch target
                'active:scale-[0.95] active:bg-white/10', // Better active feedback
                active
                  ? 'text-orange-500 bg-white/5'
                  : 'text-white/50 hover:bg-white/5'
              )}
              aria-label={item.label}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
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
