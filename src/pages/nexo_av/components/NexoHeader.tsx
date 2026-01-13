import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UserAvatarDropdown from "./UserAvatarDropdown";

// Lazy load mobile header
const NexoHeaderMobile = lazy(() => import("./mobile/NexoHeaderMobile"));

const NexoLogo = () => {
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    // Verificar si el body tiene la clase nexo-av-theme
    const checkTheme = () => {
      setIsLightTheme(document.body.classList.contains('nexo-av-theme'));
    };

    // Verificar al montar
    checkTheme();

    // Observar cambios en las clases del body
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Si está en modo light, usar el SVG con fill black
  if (isLightTheme) {
    return (
      <svg
        width="40"
        height="40"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10"
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

  // Si está en modo dark, usar el SVG original
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-10 h-10"
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

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  job_position?: string;
}

interface NexoHeaderProps {
  title: string;
  subtitle?: string;
  userId: string;
  showBack?: boolean;
  showHome?: boolean;
  backTo?: string; // Custom back destination
  customTitle?: React.ReactNode; // Custom title element (overrides title)
  showUserMenu?: boolean; // Whether to show user avatar dropdown
}

const NexoHeader = ({ 
  title, 
  subtitle = "NEXO AV", 
  userId, 
  showBack = true, 
  showHome = false,
  backTo,
  customTitle,
  showUserMenu = true,
}: NexoHeaderProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        if (!error && data && data.length > 0) {
          setUserInfo(data[0] as UserInfo);
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };

    if (showUserMenu) {
      fetchUserInfo();
    }
  }, [showUserMenu]);

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

  // Use mobile version on mobile devices
  if (isMobile) {
    return (
      <Suspense fallback={
        <header className="border-b border-border bg-background sticky top-0 z-50 shadow-sm safe-area-top">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
            <div className="animate-pulse w-32 h-4 bg-muted rounded-2xl"></div>
          </div>
        </header>
      }>
        <NexoHeaderMobile
          title={title}
          subtitle={subtitle}
          userId={userId}
          showBack={showBack}
          showHome={showHome}
          backTo={backTo}
          customTitle={customTitle}
        />
      </Suspense>
    );
  }

  // Back navigation: always use browser history to go to previous page
  const handleBack = () => {
    // Always use navigate(-1) to go back in browser history
    // This ensures we go to the actual previous page, not a predefined route
    navigate(-1);
  };

  const handleHome = () => {
    navigate(`/nexo-av/${userId}/dashboard`);
  };

  const handleLogoClick = () => {
    navigate(`/nexo-av/${userId}/dashboard`);
  };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="rounded-2xl transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {showHome && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleHome}
                className="rounded-2xl transition-all duration-200"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
            <button
              onClick={handleLogoClick}
              className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
              aria-label="Ir al inicio"
            >
              <NexoLogo />
            </button>
            <div>
              {customTitle ? (
                <h1 className="text-foreground font-semibold tracking-wide">{customTitle}</h1>
              ) : (
                <h1 className="text-foreground font-semibold tracking-wide">{title}</h1>
              )}
              <p className="text-muted-foreground text-xs">{subtitle}</p>
            </div>
          </div>

          {/* User Menu */}
          {showUserMenu && userInfo && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-foreground text-sm font-medium">{userInfo.full_name}</p>
                <p className="text-muted-foreground text-xs">{userInfo.email}</p>
              </div>
              <UserAvatarDropdown
                fullName={userInfo.full_name || ''}
                email={userInfo.email || ''}
                userId={userInfo.user_id || ''}
                phone={userInfo.phone || ''}
                position={userInfo.job_position || ''}
                onLogout={handleLogout}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default NexoHeader;
export { NexoLogo };
