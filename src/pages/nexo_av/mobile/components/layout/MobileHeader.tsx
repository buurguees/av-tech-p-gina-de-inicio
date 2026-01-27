import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlatformBrand from "../common/PlatformBrand";
import UserAvatar from "../common/UserAvatar";
import RoleSimulator, { type SimulatedRole } from "../common/RoleSimulator";

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

interface MobileHeaderProps {
  userId: string | undefined;
  userInfo: UserInfo | null;
  currentTheme: 'light' | 'dark';
  onLogout: () => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
  isRealAdmin: boolean;
  simulatedRole: string | null;
  onSimulatedRoleChange: (role: string | null) => void;
}

export const MobileHeader = ({
  userId,
  userInfo,
  currentTheme,
  onLogout,
  onThemeChange,
  isRealAdmin,
  simulatedRole,
  onSimulatedRoleChange,
}: MobileHeaderProps) => {
  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(3.25rem + env(safe-area-inset-top, 0px))'
      }}
    >
      <div className="w-full h-[3.25rem] px-3 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div 
            className="flex-shrink-0 active:scale-95 transition-all duration-200"
            style={{ touchAction: 'manipulation' }}
          >
            <PlatformBrand 
              userId={userId} 
              logoOnly 
              compact
              className="scale-90"
            />
          </div>
        </div>

        {/* Right: Notifications + Avatar */}
        {userInfo && (
          <div className="flex items-center gap-2">
            {/* Role Simulator - solo visible para admin real */}
            {isRealAdmin && (
              <RoleSimulator
                currentRole={simulatedRole as SimulatedRole}
                onRoleChange={onSimulatedRoleChange}
                isVisible={true}
              />
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl active:scale-95 transition-all duration-200"
              style={{ touchAction: 'manipulation' }}
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
            </Button>
            
            <UserAvatar
              fullName={userInfo.full_name}
              email={userInfo.email}
              userId={userInfo.user_id}
              phone={userInfo.phone || ''}
              position={userInfo.job_position || ''}
              themePreference={currentTheme}
              onLogout={onLogout}
              onThemeChange={onThemeChange}
              compact
            />
          </div>
        )}
      </div>
    </header>
  );
};
