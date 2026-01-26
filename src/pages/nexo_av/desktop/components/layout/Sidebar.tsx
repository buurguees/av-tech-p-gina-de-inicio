import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  LucideIcon,
  ChevronRight,
  MapPin,
  Users,
  FolderKanban,
  FileText,
  Receipt,
  ShoppingCart,
  DollarSign,
  Package,
  Calculator,
  BarChart3,
  Settings,
  Shield,
  Wrench,
  Truck,
  BookOpen,
  Code2,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import "../../styles/components/layout/sidebar.css";

interface Module {
  id: string;
  title: string;
  icon: LucideIcon;
  path: string;
  available: boolean;
}

interface SidebarProps {
  userId: string | undefined;
  modules: Module[];
  userRole?: string;
}

interface FolderItem {
  id: string;
  title: string;
  icon: LucideIcon;
  path: string;
  available: boolean;
}

interface Folder {
  id: string;
  title: string;
  icon: LucideIcon;
  items: FolderItem[];
}

const Sidebar = ({ userId, modules, userRole }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const availableModules = modules.filter(m => m.available);
  const isAdmin = userRole === 'admin' || modules.some(m => m.id === 'settings' && m.available);
  const isAdminOrManager = isAdmin || userRole === 'manager';

  // Obtener módulos individuales
  const getModule = (id: string) => availableModules.find(m => m.id === id);
  // Construir estructura de carpetas
  const folders: Folder[] = [
    {
      id: 'mapas',
      title: 'Mapas',
      icon: MapPin,
      items: [
        {
          id: 'lead-map',
          title: 'Mapa Comercial',
          icon: MapPin,
          path: `/nexo-av/${userId}/lead-map`,
          available: getModule('lead-map')?.available || false,
        },
        {
          id: 'client-map',
          title: 'Mapa Clientes',
          icon: Users,
          path: `/nexo-av/${userId}/client-map`,
          available: getModule('clients')?.available || false,
        },
        {
          id: 'project-map',
          title: 'Mapa Proyectos',
          icon: FolderKanban,
          path: `/nexo-av/${userId}/project-map`,
          available: getModule('projects')?.available || false,
        },
        {
          id: 'tech-map',
          title: 'Mapa Técnicos',
          icon: Wrench,
          path: `/nexo-av/${userId}/tech-map`,
          available: getModule('projects')?.available || false,
        },
      ],
    },
    {
      id: 'ventas',
      title: 'Ventas',
      icon: FileText,
      items: [
        {
          id: 'projects',
          title: 'Proyectos',
          icon: FolderKanban,
          path: `/nexo-av/${userId}/projects`,
          available: getModule('projects')?.available || false,
        },
        {
          id: 'quotes',
          title: 'Presupuestos',
          icon: FileText,
          path: `/nexo-av/${userId}/quotes`,
          available: getModule('quotes')?.available || false,
        },
        {
          id: 'invoices',
          title: 'Facturas',
          icon: Receipt,
          path: `/nexo-av/${userId}/invoices`,
          available: getModule('invoices')?.available || false,
        },
      ],
    },
    {
      id: 'compras',
      title: 'Compras',
      icon: ShoppingCart,
      items: [
        {
          id: 'scanner',
          title: 'Escáner',
          icon: Receipt,
          path: `/nexo-av/${userId}/scanner`,
          available: isAdminOrManager,
        },
        {
          id: 'purchase-invoices',
          title: 'Facturas de Compra',
          icon: ShoppingCart,
          path: `/nexo-av/${userId}/purchase-invoices`,
          available: isAdminOrManager,
        },
        {
          id: 'expenses',
          title: 'Gastos',
          icon: DollarSign,
          path: `/nexo-av/${userId}/expenses`,
          available: isAdminOrManager,
        },
      ],
    },
    {
      id: 'rrhh',
      title: 'RRHH',
      icon: UserCog,
      items: [
        {
          id: 'partners',
          title: 'Socios',
          icon: Users,
          path: `/nexo-av/${userId}/partners`,
          available: isAdmin,
        },
      ],
    },
  ];

  // Módulos individuales (no en carpetas)
  const individualModules = [
    {
      id: 'clients',
      title: 'Clientes',
      icon: Users,
      path: `/nexo-av/${userId}/clients`,
      available: getModule('clients')?.available || false,
    },
    {
      id: 'technicians',
      title: 'Técnicos',
      icon: Wrench,
      path: `/nexo-av/${userId}/technicians`,
      available: getModule('projects')?.available || false,
    },
    {
      id: 'suppliers',
      title: 'Proveedores',
      icon: Truck,
      path: `/nexo-av/${userId}/suppliers`,
      available: isAdminOrManager,
    },
    {
      id: 'catalog',
      title: 'Catálogo',
      icon: Package,
      path: `/nexo-av/${userId}/catalog`,
      available: getModule('catalog')?.available || false,
    },
    {
      id: 'calculator',
      title: 'Calculadora',
      icon: Calculator,
      path: `/nexo-av/${userId}/calculator`,
      available: getModule('calculator')?.available || false,
    },
    {
      id: 'reports',
      title: 'Informes',
      icon: BarChart3,
      path: `/nexo-av/${userId}/reports`,
      available: getModule('reports')?.available || false,
    },
  ];

  // Módulos admin
  const adminModules = [
    {
      id: 'accounting',
      title: 'Contabilidad',
      icon: BookOpen,
      path: `/nexo-av/${userId}/accounting`,
      available: getModule('accounting')?.available || false,
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: Settings,
      path: `/nexo-av/${userId}/settings`,
      available: getModule('settings')?.available || false,
    },
    {
      id: 'audit',
      title: 'Auditoría',
      icon: Shield,
      path: `/nexo-av/${userId}/audit`,
      available: getModule('audit')?.available || false,
    },
    {
      id: 'developer',
      title: 'Developer',
      icon: Code2,
      path: `/nexo-av/${userId}/developer`,
      available: isAdmin,
    },
  ];

  /**
   * Determina si una ruta está activa basándose en la ubicación actual
   */
  const isActive = (path: string) => {
    if (!userId) return false;

    const currentPath = location.pathname;

    // Para dashboard, solo activo si es exactamente esa ruta
    if (path === `/nexo-av/${userId}/dashboard`) {
      return currentPath === path;
    }

    // Para otras rutas, está activo si:
    // 1. La ruta actual coincide exactamente con la ruta del módulo
    // 2. La ruta actual comienza con la ruta del módulo seguida de /
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  /**
   * Verifica si alguna ruta dentro de una carpeta está activa
   */
  const isFolderActive = (folder: Folder) => {
    return folder.items.some(item => item.available && isActive(item.path));
  };

  /**
   * Toggle de apertura/cierre de carpeta
   */
  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Auto-abrir carpetas si alguna de sus rutas está activa
  useEffect(() => {
    const foldersToOpen = new Set<string>();
    folders.forEach(folder => {
      if (isFolderActive(folder)) {
        foldersToOpen.add(folder.id);
      }
    });

    if (foldersToOpen.size > 0) {
      setOpenFolders(prev => {
        const newSet = new Set(prev);
        foldersToOpen.forEach(id => newSet.add(id));
        return newSet;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, userId]);

  return (
    <aside className="nexo-sidebar">
      <nav className="nexo-sidebar__nav">
        {/* Sección Principal - Scrollable */}
        <div className="nexo-sidebar__main">
          {/* Dashboard Home - Fijo */}
          <motion.button
            onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
            className={cn(
              "nexo-sidebar__item",
              isActive(`/nexo-av/${userId}/dashboard`) && "nexo-sidebar__item--active"
            )}
            whileTap={{ scale: 0.98 }}
          >
            <Home className="nexo-sidebar__icon" />
            <span className="nexo-sidebar__text">Dashboard</span>
          </motion.button>

          {/* Divider */}
          <div className="nexo-sidebar__divider" />

          {/* Carpetas */}
          {folders.map((folder) => {
            const hasAvailableItems = folder.items.some(item => item.available);
            if (!hasAvailableItems) return null;

            const isOpen = openFolders.has(folder.id);
            const folderActive = isFolderActive(folder);
            const FolderIcon = folder.icon;

            return (
              <div key={folder.id} className="nexo-sidebar__folder">
                {/* Botón de carpeta */}
                <motion.button
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  className={cn(
                    "nexo-sidebar__item nexo-sidebar__item--folder",
                    folderActive && "nexo-sidebar__item--folder-active"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <FolderIcon className="nexo-sidebar__icon" />
                  <span className="nexo-sidebar__text">{folder.title}</span>
                  <ChevronRight
                    className={cn(
                      "nexo-sidebar__chevron",
                      isOpen && "nexo-sidebar__chevron--open"
                    )}
                  />
                </motion.button>

                {/* Items de la carpeta */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="nexo-sidebar__folder-items">
                        {folder.items
                          .filter(item => item.available)
                          .map((item) => {
                            const ItemIcon = item.icon;
                            const active = isActive(item.path);

                            return (
                              <motion.button
                                key={item.id}
                                type="button"
                                onClick={() => navigate(item.path)}
                                className={cn(
                                  "nexo-sidebar__item nexo-sidebar__item--nested",
                                  active && "nexo-sidebar__item--active"
                                )}
                                whileTap={{ scale: 0.98 }}
                              >
                                <ItemIcon className="nexo-sidebar__icon nexo-sidebar__icon--nested" />
                                <span className="nexo-sidebar__text">{item.title}</span>
                              </motion.button>
                            );
                          })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Módulos individuales */}
          {individualModules
            .filter(m => m.available)
            .map((module) => {
              const Icon = module.icon;
              const active = isActive(module.path);

              return (
                <motion.button
                  key={module.id}
                  onClick={() => navigate(module.path)}
                  className={cn(
                    "nexo-sidebar__item",
                    active && "nexo-sidebar__item--active"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="nexo-sidebar__icon" />
                  <span className="nexo-sidebar__text">{module.title}</span>
                </motion.button>
              );
            })}
        </div>

        {/* Separador Visual y Sección Admin - Fija en la parte inferior */}
        {isAdmin && adminModules.some(m => m.available) && (
          <>
            <hr className="nexo-sidebar__divider" />
            <div className="nexo-sidebar__admin">
              {adminModules
                .filter(m => m.available)
                .map((module) => {
                  const Icon = module.icon;
                  const active = isActive(module.path);

                  return (
                    <motion.button
                      key={module.id}
                      onClick={() => navigate(module.path)}
                      className={cn(
                        "nexo-sidebar__item",
                        active && "nexo-sidebar__item--active"
                      )}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="nexo-sidebar__icon" />
                      <span className="nexo-sidebar__text">{module.title}</span>
                    </motion.button>
                  );
                })}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
