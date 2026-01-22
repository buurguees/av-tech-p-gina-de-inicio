import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarDropdownProps {
  fullName: string;
  email: string;
  userId: string;
  phone?: string;
  position?: string;
  themePreference: 'light' | 'dark';
  onLogout: () => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export default function UserAvatarDropdown({
  fullName,
  email,
  userId,
  phone,
  position,
  themePreference,
  onLogout,
  onThemeChange,
}: UserAvatarDropdownProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Generar iniciales del nombre
  const initials = fullName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Generar color consistente basado en el nombre
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-amber-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleEditData = () => {
    navigate(`/nexo-av/${userId}/settings`);
    setOpen(false);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    onThemeChange(newTheme);
    setOpen(false);
  };

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Menú de usuario"
        >
          <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
            <AvatarImage src="" alt={fullName} />
            <AvatarFallback className={cn("font-semibold text-white", getAvatarColor(fullName))}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {/* User Info Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-foreground text-sm">{fullName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{email}</p>
          {position && (
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {position}
            </p>
          )}
          {phone && (
            <p className="text-xs text-muted-foreground mt-0.5">{phone}</p>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Edit Data Option */}
        <DropdownMenuItem
          onClick={handleEditData}
          className="cursor-pointer flex items-center gap-2 py-2"
        >
          <User className="h-4 w-4" />
          <span>Editar Datos</span>
        </DropdownMenuItem>

        {/* Theme Toggle */}
        <div className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wide">
            Tema
          </p>
          <div className="flex gap-1 p-1">
            <button
              onClick={() => handleThemeChange('light')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                themePreference === 'light'
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <Sun className="h-4 w-4" />
              Claro
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                themePreference === 'dark'
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <Moon className="h-4 w-4" />
              Oscuro
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Logout Option */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer flex items-center gap-2 py-2 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30 focus:text-red-600 dark:focus:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
