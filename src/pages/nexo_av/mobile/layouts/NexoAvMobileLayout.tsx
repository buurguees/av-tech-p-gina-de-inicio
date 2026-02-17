import { useState, useEffect } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { Receipt, FileCheck, Truck, UserRound, FileText } from "lucide-react";
import { MobileHeader } from "../components/layout/MobileHeader";
import { BottomNavigation, MoreMenuItem } from "../components/layout/BottomNavigation";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import "../styles/global.css";

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

const NexoAvMobileLayout = () => {
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

        const { data, error } = await supabase.rpc('get_current_user_info');

        if (error || !data || data.length === 0) {
          console.error('Error getting user info:', error);
          await supabase.auth.signOut();
          navigate('/nexo-av');
          return;
        }

        const currentUserInfo = data[0] as UserInfo;

        if (userId && userId !== currentUserInfo.user_id) {
          console.error('Access denied: URL user_id does not match authenticated user');
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        if (!userId) {
          const targetPath = `/nexo-av/${currentUserInfo.user_id}/dashboard`;
          navigate(targetPath, { replace: true });
          return;
        }

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

  useEffect(() => {
    if (!loading && !accessDenied && userId && userInfo) {
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

  const isRealAdmin = userInfo?.roles?.includes('admin');
  const effectiveRole = userInfo?.roles?.[0] || null;
  
  const isAdmin = effectiveRole === 'admin' || isRealAdmin;
  const isManager = effectiveRole === 'manager';
  const isComercial = effectiveRole === 'comercial' || effectiveRole === 'sales';
  const isTech = effectiveRole === 'tecnico' || effectiveRole === 'tech';

  const hasSalesAccess = isComercial;
  const hasTechAccess = isTech;

  useInactivityLogout({
    timeoutMinutes: 60,
    warningMinutes: 5,
    enabled: !loading && !accessDenied && !!userInfo,
  });

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Acceso Denegado</h1>
          <p className="text-muted-foreground">No tienes permiso para acceder a este recurso.</p>
          <Button onClick={() => navigate('/nexo-av')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-primary/20 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <MobileHeader
        userId={userId}
        userInfo={userInfo}
        currentTheme={currentTheme}
        onLogout={handleLogout}
        onThemeChange={setCurrentTheme}
      />

      {/* Main Content - Fixed height container, no scroll here */}
      <main 
        className="bg-background overflow-hidden px-[15px] w-full"
        style={{ 
          paddingTop: 'calc(5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '5px',
          height: '100dvh'
        }}
      >
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        userId={userId || ''}
        moreMenuItems={(() => {
          const items: MoreMenuItem[] = [];
          if (isAdmin || isManager) {
            items.push({
              id: 'invoices',
              label: 'Facturas',
              icon: FileText,
              path: `/nexo-av/${userId}/invoices`
            });
            items.push({
              id: 'purchase-invoices',
              label: 'Facturas de Compra',
              icon: Receipt,
              path: `/nexo-av/${userId}/purchase-invoices`
            });
            items.push({
              id: 'expenses',
              label: 'Tickets / Gastos',
              icon: FileCheck,
              path: `/nexo-av/${userId}/expenses`
            });
            items.push({
              id: 'suppliers',
              label: 'Proveedores',
              icon: Truck,
              path: `/nexo-av/${userId}/suppliers`
            });
            items.push({
              id: 'technicians',
              label: 'Técnicos',
              icon: UserRound,
              path: `/nexo-av/${userId}/technicians`
            });
          }
          return items;
        })()}
      />
    </div>
  );
};

export default NexoAvMobileLayout;
