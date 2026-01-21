import { useState, useEffect, useMemo } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import Sidebar from "../components/layout/Sidebar";
import UserAvatarDropdown from "../components/layout/UserAvatarDropdown";
import { NexoLogo } from "../components/layout/NexoHeader";
import { useNexoAvTheme } from "../../hooks/useNexoAvTheme";
import "../styles/global.css";
import {
  Users,
  FileText,
  FolderKanban,
  Package,
  Settings,
  BarChart3,
  UserCog,
  Calculator,
  Shield,
  Receipt,
  MapPin,
  BookOpen,
} from "lucide-react";

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

// Header Component
interface HeaderProps {
  userId: string | undefined;
  userInfo: UserInfo | null;
  currentTheme: 'light' | 'dark';
  onLogout: () => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
}

const Header = ({ 
  userId, 
  userInfo, 
  currentTheme, 
  onLogout, 
  onThemeChange 
}: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="w-full h-[3.25rem] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
              className="cursor-pointer hover:opacity-80 transition-opacity duration-200 flex-shrink-0"
              aria-label="Ir al inicio"
            >
              <NexoLogo />
            </button>
            <div className="flex flex-col justify-center">
              <h1 className="text-foreground font-semibold tracking-wide leading-tight">
                NEXO AV
              </h1>
              <p className="text-muted-foreground text-xs leading-tight">
                Plataforma de Gestión
              </p>
            </div>
          </div>
          
          {userInfo && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-foreground text-sm font-medium">
                  {userInfo.full_name}
                </p>
                <p className="text-muted-foreground text-xs capitalize">
                  {userInfo.roles?.join(', ')}
                </p>
              </div>
              <UserAvatarDropdown
                fullName={userInfo.full_name}
                email={userInfo.email}
                userId={userInfo.user_id}
                phone={userInfo.phone || ''}
                position={userInfo.job_position || ''}
                themePreference={currentTheme}
                onLogout={onLogout}
                onThemeChange={onThemeChange}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const NexoAvLayout = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  // Apply nexo-av theme
  useNexoAvTheme(currentTheme);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/nexo-av');
          return;
        }

        // Get user info from internal.authorized_users
        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error || !data || data.length === 0) {
          console.error('Error getting user info:', error);
          await supabase.auth.signOut();
          navigate('/nexo-av');
          return;
        }

        const currentUserInfo = data[0] as UserInfo;

        // CRITICAL SECURITY: Verify URL user_id matches authenticated user
        if (userId && userId !== currentUserInfo.user_id) {
          console.error('Access denied: URL user_id does not match authenticated user');
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // If no userId in URL, redirect to proper URL with user_id
        if (!userId) {
          // Desktop siempre va al dashboard
          const targetPath = `/nexo-av/${currentUserInfo.user_id}/dashboard`;
          navigate(targetPath, { replace: true });
          return;
        }

        // Set theme preference
        const theme = (currentUserInfo.theme_preference || 'light') as 'light' | 'dark';
        setCurrentTheme(theme);

        setUserInfo(currentUserInfo);
        setLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/nexo-av');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/nexo-av');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, userId]);

  // Redirect to dashboard if we're on the base route (only userId, no specific page)
  useEffect(() => {
    if (!loading && !accessDenied && userId && userInfo) {
      // If path is exactly /nexo-av/:userId (no sub-route), redirect to dashboard
      if (location.pathname === `/nexo-av/${userId}`) {
        navigate(`/nexo-av/${userId}/dashboard`, { replace: true });
      }
    }
  }, [location.pathname, userId, userInfo, loading, accessDenied, navigate]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('nexo_av_last_login');
    } catch {
      // Ignore localStorage errors
    }
    
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
    navigate('/nexo-av');
  };

  const isAdmin = userInfo?.roles?.includes('admin');
  const isManager = userInfo?.roles?.includes('manager');
  const isComercial = userInfo?.roles?.includes('comercial') || userInfo?.roles?.includes('sales');
  const isTech = userInfo?.roles?.includes('tecnico') || userInfo?.roles?.includes('tech');
  
  const hasSalesAccess = isComercial;
  const hasTechAccess = isTech;

  // Inactivity logout hook - 60 minutes timeout with 5 minute warning
  useInactivityLogout({
    timeoutMinutes: 60,
    warningMinutes: 5,
    enabled: !loading && !accessDenied && !!userInfo,
  });

  // Build modules list - Memoizado para evitar recálculos innecesarios
  const modules = useMemo(() => [
    {
      id: 'lead-map',
      title: 'Mapa Comercial',
      icon: MapPin,
      color: 'from-teal-500/20 to-teal-600/10',
      borderColor: 'border-teal-500/30',
      available: isAdmin || isManager || hasSalesAccess,
      path: `/nexo-av/${userId}/lead-map`,
    },
    {
      id: 'clients',
      title: 'Clientes / Leads',
      icon: Users,
      color: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      available: isAdmin || isManager || hasSalesAccess,
      path: `/nexo-av/${userId}/clients`,
    },
    {
      id: 'quotes',
      title: 'Presupuestos',
      icon: FileText,
      color: 'from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
      available: isAdmin || isManager || hasSalesAccess,
      path: `/nexo-av/${userId}/quotes`,
    },
    {
      id: 'invoices',
      title: 'Facturas',
      icon: Receipt,
      color: 'from-emerald-500/20 to-emerald-600/10',
      borderColor: 'border-emerald-500/30',
      available: isAdmin || isManager || hasSalesAccess,
      path: `/nexo-av/${userId}/invoices`,
    },
    {
      id: 'projects',
      title: 'Proyectos',
      icon: FolderKanban,
      color: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      available: isAdmin || isManager || hasSalesAccess || hasTechAccess,
      path: `/nexo-av/${userId}/projects`,
    },
    {
      id: 'catalog',
      title: 'Catálogo',
      icon: Package,
      color: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      available: true,
      path: `/nexo-av/${userId}/catalog`,
    },
    {
      id: 'calculator',
      title: 'Calculadora',
      icon: Calculator,
      color: 'from-pink-500/20 to-pink-600/10',
      borderColor: 'border-pink-500/30',
      available: true,
      path: `/nexo-av/${userId}/calculator`,
    },
    {
      id: 'reports',
      title: 'Informes',
      icon: BarChart3,
      color: 'from-cyan-500/20 to-cyan-600/10',
      borderColor: 'border-cyan-500/30',
      available: isAdmin || isManager,
      path: `/nexo-av/${userId}/reports`,
    },
    {
      id: 'users',
      title: 'Usuarios',
      icon: UserCog,
      color: 'from-rose-500/20 to-rose-600/10',
      borderColor: 'border-rose-500/30',
      available: isAdmin,
      path: `/nexo-av/${userId}/users`,
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: Settings,
      color: 'from-gray-500/20 to-gray-600/10',
      borderColor: 'border-gray-500/30',
      available: isAdmin,
      path: `/nexo-av/${userId}/settings`,
    },
    {
      id: 'audit',
      title: 'Auditoría',
      icon: Shield,
      color: 'from-red-500/20 to-red-600/10',
      borderColor: 'border-red-500/30',
      available: isAdmin,
      path: `/nexo-av/${userId}/audit`,
    },
    {
      id: 'accounting',
      title: 'Contabilidad',
      icon: BookOpen,
      color: 'from-indigo-500/20 to-indigo-600/10',
      borderColor: 'border-indigo-500/30',
      available: isAdmin,
      path: `/nexo-av/${userId}/accounting`,
    },
  ], [userId, isAdmin, isManager, hasSalesAccess, hasTechAccess]);

  // Access denied screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Acceso Denegado</h1>
          <p className="text-muted-foreground">No tienes permiso para acceder a este recurso.</p>
          <Button 
            onClick={() => navigate('/nexo-av')}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">
          <NexoLogo />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header - Fijo en la parte superior - NUNCA se mueve */}
      <Header 
        userId={userId}
        userInfo={userInfo}
        currentTheme={currentTheme}
        onLogout={handleLogout}
        onThemeChange={setCurrentTheme}
      />

      {/* Sidebar - Fijo a la izquierda debajo del header - NUNCA se mueve */}
      <aside className="fixed left-0 top-[3.25rem] z-40 hidden md:block w-56 h-[calc(100vh-3.25rem)] overflow-hidden">
        <Sidebar 
          userId={userId}
          modules={modules}
          userRole={isAdmin ? 'admin' : undefined}
        />
      </aside>
        
      {/* Contenido principal - Área donde se cargan las páginas dinámicamente */}
      {/* Respetando márgenes: left-56 (sidebar) y top-[3.25rem] (header) */}
      <main className="hidden md:block fixed left-56 top-[3.25rem] right-0 bottom-0 overflow-y-auto overflow-x-hidden bg-background">
        <div className="w-full min-h-full p-4 lg:p-6">
          {/* Outlet renderiza las páginas hijas según la navegación del sidebar */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default NexoAvLayout;
