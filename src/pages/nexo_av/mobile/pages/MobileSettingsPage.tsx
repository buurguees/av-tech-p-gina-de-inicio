import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  User,
  Bell,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

const MobileSettingsPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        if (error) throw error;
        if (data && data.length > 0) {
          setUserInfo(data[0]);
          setCurrentTheme(data[0].theme_preference || 'light');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleThemeToggle = async () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);

    try {
      await supabase
        .from('users')
        .update({ theme_preference: newTheme })
        .eq('id', userId);

      // Apply theme to document
      document.documentElement.classList.toggle('dark', newTheme === 'dark');

      toast({
        title: "Tema actualizado",
        description: `Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`,
      });
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('nexo_av_last_login');
      await supabase.auth.signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
      navigate('/nexo-av');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const settingsSections = [
    {
      title: 'Cuenta',
      items: [
        {
          id: 'profile',
          label: 'Mi perfil',
          description: userInfo?.email || 'Gestiona tu información personal',
          icon: User,
          onClick: () => navigate(`/nexo-av/${userId}/settings/profile`),
        },
        {
          id: 'notifications',
          label: 'Notificaciones',
          description: 'Configura tus alertas y avisos',
          icon: Bell,
          onClick: () => navigate(`/nexo-av/${userId}/settings/notifications`),
        },
      ],
    },
    {
      title: 'Apariencia',
      items: [
        {
          id: 'theme',
          label: 'Tema',
          description: currentTheme === 'dark' ? 'Oscuro' : 'Claro',
          icon: currentTheme === 'dark' ? Moon : Sun,
          onClick: handleThemeToggle,
          toggle: true,
        },
      ],
    },
    {
      title: 'Ayuda',
      items: [
        {
          id: 'help',
          label: 'Centro de ayuda',
          description: 'Encuentra respuestas a tus preguntas',
          icon: HelpCircle,
          onClick: () => {},
        },
        {
          id: 'about',
          label: 'Acerca de',
          description: 'Versión 1.0.0',
          icon: Info,
          onClick: () => {},
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-12 w-12 bg-primary/20 rounded-xl" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* User Card */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xl font-semibold text-primary">
              {userInfo?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">
              {userInfo?.full_name || 'Usuario'}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {userInfo?.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="h-3 w-3 text-primary" />
              <span className="text-xs text-primary capitalize">
                {userInfo?.roles?.[0] || 'Usuario'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      {settingsSections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            {section.title}
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {section.items.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={cn(
                    "w-full flex items-center justify-between p-4",
                    "active:bg-muted/50 transition-colors",
                    index !== section.items.length - 1 && "border-b border-border"
                  )}
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-xl">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full h-12 text-red-500 border-red-500/20 hover:bg-red-500/10"
      >
        <LogOut className="h-5 w-5 mr-2" />
        Cerrar sesión
      </Button>
    </div>
  );
};

export default MobileSettingsPage;
