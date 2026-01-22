import { useNavigate } from "react-router-dom";
import UserAvatarDropdown from "./UserAvatarDropdown";
import { NexoLogo } from "./layout/NexoHeader";

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
}
