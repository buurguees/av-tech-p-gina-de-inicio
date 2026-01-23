import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "../common/UserAvatar";
import UserInfo from "../common/UserInfo";
import PlatformBrand from "../common/PlatformBrand";

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  job_position?: string;
  theme_preference?: 'light' | 'dark';
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
            <PlatformBrand
              title={customTitle ? (typeof customTitle === 'string' ? customTitle : title) : title}
              subtitle={subtitle}
              userId={userId}
              onClick={handleLogoClick}
            />
          </div>

          {/* User Menu */}
          {showUserMenu && userInfo && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <UserInfo
                  name={userInfo.full_name}
                  role={userInfo.job_position || userInfo.email}
                  align="right"
                />
              </div>
              <UserAvatar
                fullName={userInfo.full_name || ''}
                email={userInfo.email || ''}
                userId={userInfo.user_id || ''}
                phone={userInfo.phone || ''}
                position={userInfo.job_position || ''}
                themePreference={currentTheme}
                onLogout={handleLogout}
                onThemeChange={handleThemeChange}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default NexoHeader;
