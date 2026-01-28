import { useState } from "react";
import { User, LogOut, Sun, Moon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  fullName: string;
  email: string;
  userId: string;
  phone?: string;
  position?: string;
  themePreference?: 'light' | 'dark';
  onLogout: () => void;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  compact?: boolean; // Versión compacta para mobile
}

export default function UserAvatar({
  fullName,
  email,
  userId,
  phone = '',
  position = '',
  themePreference = 'light',
  onLogout,
  onThemeChange,
  compact = false,
}: UserAvatarProps) {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(themePreference);

  // Get initials from full name
  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // Generate consistent color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-pink-500",
      "bg-indigo-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleThemeToggle = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  const initials = getInitials(fullName);
  const avatarColor = getAvatarColor(fullName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "rounded-full flex items-center justify-center text-white font-normal",
            "active:scale-95 transition-all duration-200",
            avatarColor,
            compact ? "h-10 w-10" : "h-10 w-10"
          )}
          style={{ 
            touchAction: 'manipulation', 
            fontSize: compact ? 'clamp(1rem, 1.25rem, 1.5rem)' : 'clamp(1.125rem, 1.375rem, 1.625rem)'
          }}
          aria-label="Menú de usuario"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          {position && (
            <p className="text-xs text-muted-foreground mt-0.5">{position}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleThemeToggle}>
          {currentTheme === 'light' ? (
            <>
              <Moon className="mr-2 h-4 w-4" />
              Modo oscuro
            </>
          ) : (
            <>
              <Sun className="mr-2 h-4 w-4" />
              Modo claro
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
