import { useState, useEffect } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useIsMobile } from "@/hooks/use-mobile";
import { lazy, Suspense } from "react";
import Sidebar from "./components/desktop/Sidebar";
import UserAvatarDropdown from "./components/UserAvatarDropdown";
import MobileBottomNav from "./components/MobileBottomNav";
import { useNexoAvTheme } from "./hooks/useNexoAvTheme";
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
} from "lucide-react";

// Lazy load mobile components
const DashboardMobile = lazy(() => import("./components/mobile/DashboardMobile"));

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

const NexoLogo = () => {
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsLightTheme(document.body.classList.contains('nexo-av-theme'));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Re-check when theme changes
  useEffect(() => {
    setIsLightTheme(document.body.classList.contains('nexo-av-theme'));
  }, [document.body.className]);

  if (isLightTheme) {
    return (
      <svg
        width="32"
        height="32"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-8"
      >
        <path d="M500 493.902L256.098 250H340.779L500 409.045V493.902Z" fill="currentColor" />
        <path d="M256.098 250L500 6.09766V90.7789L340.955 250H256.098Z" fill="currentColor" />
        <path d="M250 243.902L6.09753 -7.62939e-05H90.7788L250 159.045V243.902Z" fill="currentColor" />
        <path d="M493.902 -0.000106812L250 243.902V159.221L409.045 -0.000106812H493.902Z" fill="currentColor" />
        <path d="M250 256.098L493.902 500H409.221L250 340.955V256.098Z" fill="currentColor" />
        <path d="M6.09753 500L250 256.098V340.779L90.9553 500H6.09753Z" fill="currentColor" />
        <path d="M3.05176e-05 6.09766L243.902 250H159.221L3.05176e-05 90.9554V6.09766Z" fill="currentColor" />
        <path d="M243.902 250L4.57764e-05 493.902V409.221L159.045 250H243.902Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-8 h-8"
    >
      <path d="M750 743.902L506.098 500H590.779L750 659.045V743.902Z" fill="white" />
      <path d="M506.098 500L750 256.098V340.779L590.955 500H506.098Z" fill="white" />
      <path d="M500 493.902L256.098 250H340.779L500 409.045V493.902Z" fill="white" />
      <path d="M743.902 250L500 493.902V409.221L659.045 250H743.902Z" fill="white" />
      <path d="M500 506.098L743.902 750H659.221L500 590.955V506.098Z" fill="white" />
      <path d="M256.098 750L500 506.098V590.779L340.955 750H256.098Z" fill="white" />
      <path d="M250 256.098L493.902 500H409.221L250 340.955V256.098Z" fill="white" />
      <path d="M493.902 500L250 743.902V659.221L409.045 500H493.902Z" fill="white" />
    </svg>
  );
};

/**
 * Componente principal de navegación para NEXO AV
 * Maneja el layout con header fijo superior y sidebar fijo izquierdo
 */
const NexoAv = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
          const targetPath = isMobile 
            ? `/nexo-av/${currentUserInfo.user_id}/lead-map`
            : `/nexo-av/${currentUserInfo.user_id}/dashboard`;
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
  }, [navigate, userId, isMobile]);

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

  // Inactivity logout hook - 30 minutes timeout with 5 minute warning
  useInactivityLogout({
    timeoutMinutes: 30,
    warningMinutes: 5,
    enabled: !loading && !accessDenied && !!userInfo,
  });

  // Check if we're on dashboard route to show mobile dashboard
  const isDashboardRoute = location.pathname === `/nexo-av/${userId}/dashboard`;
  
  // Redirect mobile users from dashboard to lead-map
  // También redirige si acceden directamente a la ruta base sin especificar página
  useEffect(() => {
    if (isMobile && userInfo && !loading && !accessDenied && userId) {
      const currentPath = location.pathname;
      const basePath = `/nexo-av/${userId}`;
      
      // Si está en dashboard o en la ruta base exacta, redirigir a lead-map
      if (isDashboardRoute || currentPath === basePath) {
        navigate(`${basePath}/lead-map`, { replace: true });
      }
    }
  }, [isMobile, isDashboardRoute, userId, navigate, userInfo, loading, accessDenied, location.pathname]);

  // Function to get page title based on current route
  const getPageTitle = (pathname: string): string => {
    if (!userId) return "NEXO AV";
    
    const basePath = `/nexo-av/${userId}`;
    
    // Exact matches
    if (pathname === `${basePath}/lead-map`) return "Mapa Comercial";
    if (pathname === `${basePath}/client-map`) return "Mapa Clientes";
    if (pathname === `${basePath}/project-map`) return "Mapa Proyectos";
    if (pathname === `${basePath}/tech-map`) return "Mapa Técnicos";
    if (pathname === `${basePath}/clients`) return "Clientes";
    if (pathname === `${basePath}/quotes`) return "Presupuestos";
    if (pathname === `${basePath}/invoices`) return "Facturas";
    if (pathname === `${basePath}/purchase-invoices`) return "Facturas de Compra";
    if (pathname === `${basePath}/expenses`) return "Gastos";
    if (pathname === `${basePath}/projects`) return "Proyectos";
    if (pathname === `${basePath}/catalog`) return "Catálogo";
    if (pathname === `${basePath}/calculator`) return "Calculadora";
    if (pathname === `${basePath}/reports`) return "Informes";
    if (pathname === `${basePath}/users`) return "Usuarios";
    if (pathname === `${basePath}/settings`) return "Configuración";
    if (pathname === `${basePath}/audit`) return "Auditoría";
    if (pathname === `${basePath}/dashboard`) return "Dashboard";
    
    // Pattern matches for detail pages
    if (pathname.includes(`${basePath}/clients/`)) return "Detalle Cliente";
    if (pathname.includes(`${basePath}/quotes/`)) return "Detalle Presupuesto";
    if (pathname.includes(`${basePath}/invoices/`)) return "Detalle Factura";
    if (pathname.includes(`${basePath}/projects/`)) return "Detalle Proyecto";
    if (pathname.includes(`${basePath}/catalog/`)) return "Detalle Producto";
    if (pathname.includes(`${basePath}/quotes/`) && pathname.includes("/edit")) return "Editar Presupuesto";
    if (pathname.includes(`${basePath}/invoices/`) && pathname.includes("/edit")) return "Editar Factura";
    if (pathname.includes(`${basePath}/quotes/new`)) return "Nuevo Presupuesto";
    if (pathname.includes(`${basePath}/invoices/new`)) return "Nueva Factura";
    
    return "NEXO AV";
  };

  const currentPageTitle = getPageTitle(location.pathname);
  
  // Handle back navigation - always use browser history
  const handleBack = () => {
    navigate(-1);
  };

  // Build modules list
  const modules = [
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
  ];

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
    <div className="h-screen w-full overflow-hidden bg-background flex flex-col">
      {/* Header - Fijo en la parte superior */}
      <header className="flex-shrink-0 border-b border-border bg-background z-50 shadow-sm h-[3.25rem]">
        <div className="w-full h-full px-4 sm:px-6 lg:px-8">
          {isMobile ? (
            // Mobile Header Layout: Back Button | Title (centered) | Avatar
            <div className="flex items-center justify-between h-full">
              {/* Left: Back Button */}
              <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="rounded-xl touch-target shrink-0 h-9 w-9"
                  aria-label="Volver"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Center: Page Title */}
              <div className="flex-1 flex items-center justify-center min-w-0 px-2">
                <h1 className="text-foreground font-semibold tracking-wide text-sm sm:text-base truncate text-center">
                  {currentPageTitle}
                </h1>
              </div>
              
              {/* Right: User Avatar */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <UserAvatarDropdown
                  fullName={userInfo?.full_name || ''}
                  email={userInfo?.email || ''}
                  userId={userInfo?.user_id || ''}
                  phone={userInfo?.phone || ''}
                  position={userInfo?.job_position || ''}
                  themePreference={currentTheme}
                  onLogout={handleLogout}
                  onThemeChange={setCurrentTheme}
                />
              </div>
            </div>
          ) : (
            // Desktop Header Layout: Logo + Title | User Info
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-2.5 md:gap-3">
                <button
                  onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
                  className="cursor-pointer hover:opacity-80 transition-opacity duration-200 flex-shrink-0"
                  aria-label="Ir al inicio"
                >
                  <NexoLogo />
                </button>
                <div className="flex flex-col justify-center">
                  <h1 className="text-foreground font-semibold tracking-wide text-sm md:text-base leading-tight">NEXO AV</h1>
                  <p className="text-muted-foreground text-[10px] md:text-xs hidden md:block leading-tight">Plataforma de Gestión</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 md:gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-foreground text-sm font-medium">{userInfo?.full_name}</p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {userInfo?.roles?.join(', ')}
                  </p>
                </div>
                <UserAvatarDropdown
                  fullName={userInfo?.full_name || ''}
                  email={userInfo?.email || ''}
                  userId={userInfo?.user_id || ''}
                  phone={userInfo?.phone || ''}
                  position={userInfo?.job_position || ''}
                  themePreference={currentTheme}
                  onLogout={handleLogout}
                  onThemeChange={setCurrentTheme}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content area */}
      {isMobile ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* En móvil, el contenido empieza después del header fijo */}
          <div className="flex-1 overflow-y-auto">
            {isDashboardRoute ? (
              <main className="w-full min-h-full">
                <div className="w-[90%] max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-8">
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
                    </div>
                  }>
                    <DashboardMobile
                      userInfo={userInfo}
                      modules={modules}
                      isAdmin={isAdmin}
                      isManager={isManager}
                      isSales={hasSalesAccess}
                      isTech={hasTechAccess}
                      userId={userId}
                      navigate={navigate}
                      onNewLead={() => {}}
                    />
                  </Suspense>
                </div>
              </main>
            ) : (
              <main className="w-full min-h-full">
                <div className="w-[90%] max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-8">
                  <Outlet />
                </div>
              </main>
            )}
          </div>
          {/* Mobile Bottom Navigation */}
          <MobileBottomNav 
            userId={userId || ''} 
            userRoles={userInfo?.roles || []}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Fijo a la izquierda */}
          <Sidebar 
            userId={userId}
            modules={modules}
            userRole={isAdmin ? 'admin' : undefined}
          />
          
          {/* Contenido principal - Ocupa el espacio restante con scroll independiente */}
          {/* El contenido ocupa el 90% del espacio disponible (descontando el sidebar de 224px) */}
          <main className="flex-1 min-w-0 overflow-y-auto bg-background">
            <div className="w-[90%] max-w-[1800px] mx-auto px-4 lg:px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default NexoAv;
export { NexoLogo };
