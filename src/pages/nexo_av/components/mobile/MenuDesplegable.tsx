import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Bell, 
  Settings, 
  Shield, 
  HelpCircle, 
  LogOut,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MenuDesplegableProps {
  userId: string;
  isAdmin: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const MenuDesplegable = ({ userId, isAdmin, onClose, onLogout }: MenuDesplegableProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const menuItems = [
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
      path: `/nexo-av/${userId}/settings`,
      available: true,
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: Bell,
      path: '#',
      available: true,
      onClick: () => {
        toast({
          title: 'Próximamente',
          description: 'Las notificaciones estarán disponibles pronto.',
        });
      },
    },
    ...(isAdmin
      ? [
          {
            id: 'settings',
            label: 'Configuración',
            icon: Settings,
            path: `/nexo-av/${userId}/settings`,
            available: true,
          },
          {
            id: 'audit',
            label: 'Auditoría',
            icon: Shield,
            path: `/nexo-av/${userId}/audit`,
            available: true,
          },
        ]
      : []),
    {
      id: 'help',
      label: 'Ayuda',
      icon: HelpCircle,
      path: '#',
      available: true,
      onClick: () => {
        toast({
          title: 'Ayuda',
          description: 'Para soporte, contacta con el administrador.',
        });
      },
    },
    {
      id: 'logout',
      label: 'Cerrar sesión',
      icon: LogOut,
      path: '#',
      available: true,
      onClick: onLogout,
      className: 'text-destructive',
    },
  ];

  const handleItemClick = (item: any) => {
    if (item.onClick) {
      item.onClick();
      onClose();
    } else if (item.path && item.path !== '#') {
      navigate(item.path);
      onClose();
    }
  };

  // Bloquear scroll del body cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Más opciones</h3>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="max-h-[60vh] overflow-y-auto">
            {menuItems
              .filter((item) => item.available)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors active:bg-secondary/80',
                      item.className
                    )}
                  >
                    <Icon className={cn('w-5 h-5', item.className || 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', item.className || 'text-foreground')}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MenuDesplegable;
