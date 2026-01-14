import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexoLogo } from "../NexoHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UserAvatarDropdown from "../UserAvatarDropdown";

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  job_position?: string;
  theme_preference?: 'light' | 'dark';
}

interface NexoHeaderMobileProps {
  title: string;
  subtitle?: string;
  userId: string;
  showBack?: boolean;
  showHome?: boolean;
  backTo?: string;
  customTitle?: React.ReactNode;
  showUserMenu?: boolean;
}

const NexoHeaderMobile = ({ 
  title, 
  subtitle = "NEXO AV", 
  userId, 
  showBack = true, 
  showHome = false,
  backTo,
  customTitle,
  showUserMenu = true,
}: NexoHeaderMobileProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        if (!error && data && data.length > 0) {
          const userData = data[0] as UserInfo;
          setUserInfo(userData);
          // Set theme preference
          const theme = (userData.theme_preference || 'light') as 'light' | 'dark';
          setCurrentTheme(theme);
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };

    if (showUserMenu) {
      fetchUserInfo();
    }
  }, [showUserMenu]);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setCurrentTheme(theme);
    // Reload page to apply theme change
    window.location.reload();
  };

  // Back navigation: always use browser history to go to previous page
  const handleBack = () => {
    // Always use navigate(-1) to go back in browser history
    // This ensures we go to the actual previous page, not a predefined route
    navigate(-1);
  };

  const handleHome = () => {
    // En móvil, siempre redirigir al Mapa Comercial como página inicial
    navigate(`/nexo-av/${userId}/lead-map`);
  };

  const handleLogoClick = () => {
    // En móvil, siempre redirigir al Mapa Comercial como página inicial
    navigate(`/nexo-av/${userId}/lead-map`);
  };

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

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50 shadow-sm safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="rounded-xl touch-target shrink-0"
                aria-label="Volver"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {showHome && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleHome}
                className="rounded-xl touch-target shrink-0"
                aria-label="Inicio"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
            <button
              onClick={handleLogoClick}
              className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-200 touch-target"
              aria-label="Ir al inicio"
            >
              <NexoLogo />
            </button>
            <div className="min-w-0 flex-1">
              {customTitle ? (
                <h1 className="text-foreground font-semibold tracking-wide truncate text-sm sm:text-base">
                  {customTitle}
                </h1>
              ) : (
                <h1 className="text-foreground font-semibold tracking-wide truncate text-sm sm:text-base">
                  {title}
                </h1>
              )}
              <p className="text-muted-foreground text-xs truncate">{subtitle}</p>
            </div>
          </div>

          {/* User Menu */}
          {showUserMenu && userInfo && (
            <UserAvatarDropdown
              fullName={userInfo.full_name || ''}
              email={userInfo.email || ''}
              userId={userInfo.user_id || ''}
              phone={userInfo.phone || ''}
              position={userInfo.job_position || ''}
              themePreference={currentTheme}
              onLogout={handleLogout}
              onThemeChange={handleThemeChange}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default NexoHeaderMobile;
