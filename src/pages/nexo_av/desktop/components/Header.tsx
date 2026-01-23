import { cn } from "@/lib/utils";
import UserAvatar from "./common/UserAvatar";
import UserInfo from "./common/UserInfo";
import PlatformBrand from "./common/PlatformBrand";
import "../../styles/components/layout/header.css";

interface HeaderProps {
  userId: string | undefined;
  userInfo: {
    full_name: string;
    email: string;
    user_id: string;
    phone?: string;
    job_position?: string;
    roles?: string[];
  } | null;
  currentTheme: 'light' | 'dark';
  onLogout: () => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function Header({ 
  userId, 
  userInfo, 
  currentTheme, 
  onLogout, 
  onThemeChange 
}: HeaderProps) {

  return (
    <header className="nexo-header">
      <div className="nexo-header__container">
        <div className="nexo-header__content">
          <PlatformBrand userId={userId} />
          
          {userInfo && (
            <div className="nexo-header__user-section">
              <UserInfo
                name={userInfo.full_name}
                role={userInfo.roles}
                align="right"
                className="nexo-header__user-info"
              />
              <UserAvatar
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
}
