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

  // Smart back navigation: use backTo if provided, otherwise go back in history
  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      // Use navigate(-1) to go back in browser history
      // React Router will handle cases where there's no history gracefully
      navigate(-1);
    }
  };

  const handleHome = () => {
    navigate(`/nexo-av/${userId}/dashboard`);
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
    <header className="border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-50 shadow-lg safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="text-white hover:bg-white/10 rounded-xl touch-target shrink-0"
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
                className="text-white hover:bg-white/10 rounded-xl touch-target shrink-0"
                aria-label="Inicio"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
            <div className="shrink-0">
              <NexoLogo />
            </div>
            <div className="min-w-0 flex-1">
              {customTitle ? (
                <h1 className="text-white font-semibold tracking-wide truncate text-sm sm:text-base">
                  {customTitle}
                </h1>
              ) : (
                <h1 className="text-white font-semibold tracking-wide truncate text-sm sm:text-base">
                  {title}
                </h1>
              )}
              <p className="text-white/40 text-xs truncate">{subtitle}</p>
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
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default NexoHeaderMobile;
