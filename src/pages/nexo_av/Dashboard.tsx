import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LogOut, 
  Users, 
  FileText, 
  FolderKanban, 
  Package,
  Settings,
  BarChart3,
  Plus,
  Home,
  UserCog,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UserManagement from "./components/UserManagement";

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  department: string;
  roles: string[];
}

const NexoLogo = () => (
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

const Dashboard = () => {
  const { userId } = useParams<{ userId: string }>();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/nexo-av');
          return;
        }

        // Get user info from internal.authorized_users
        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error || !data || data.length === 0) {
          console.error('Error getting user info:', error);
          await supabase.auth.signOut();
          navigate('/nexo-av');
          return;
        }

        const currentUserInfo = data[0] as UserInfo;

        // CRITICAL SECURITY: Verify URL user_id matches authenticated user
        if (userId && userId !== currentUserInfo.user_id) {
          console.error('Access denied: URL user_id does not match authenticated user');
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // If no userId in URL, redirect to proper URL with user_id
        if (!userId) {
          navigate(`/nexo-av/${currentUserInfo.user_id}/dashboard`, { replace: true });
          return;
        }

        setUserInfo(currentUserInfo);
        setLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/nexo-av');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/nexo-av');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
    navigate('/nexo-av');
  };

  const isAdmin = userInfo?.roles?.includes('admin');
  const isManager = userInfo?.roles?.includes('manager');
  const isSales = userInfo?.roles?.includes('sales');
  const isTech = userInfo?.roles?.includes('tech');

  // Access denied screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acceso Denegado</h1>
          <p className="text-white/60">No tienes permiso para acceder a este recurso.</p>
          <Button 
            onClick={() => navigate('/nexo-av')}
            className="bg-white text-black hover:bg-white/90"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  const modules = [
    {
      id: 'clients',
      title: 'Clientes / Leads',
      description: 'Gestión de clientes potenciales y activos',
      icon: Users,
      color: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      available: isAdmin || isManager || isSales,
      count: null,
    },
    {
      id: 'quotes',
      title: 'Presupuestos',
      description: 'Crear y gestionar presupuestos',
      icon: FileText,
      color: 'from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
      available: isAdmin || isManager || isSales,
      count: null,
    },
    {
      id: 'projects',
      title: 'Proyectos',
      description: 'Gestión de proyectos técnicos',
      icon: FolderKanban,
      color: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      available: isAdmin || isManager || isTech,
      count: null,
    },
    {
      id: 'catalog',
      title: 'Catálogo',
      description: 'Productos y servicios',
      icon: Package,
      color: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      available: true,
      count: null,
    },
    {
      id: 'reports',
      title: 'Informes',
      description: 'Estadísticas y métricas',
      icon: BarChart3,
      color: 'from-cyan-500/20 to-cyan-600/10',
      borderColor: 'border-cyan-500/30',
      available: isAdmin || isManager,
      count: null,
    },
    {
      id: 'settings',
      title: 'Configuración',
      description: 'Usuarios y sistema',
      icon: Settings,
      color: 'from-gray-500/20 to-gray-600/10',
      borderColor: 'border-gray-500/30',
      available: isAdmin,
      count: null,
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <NexoLogo />
              <div>
                <h1 className="text-white font-semibold tracking-wide">NEXO AV</h1>
                <p className="text-white/40 text-xs">Plataforma de Gestión</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white text-sm font-medium">{userInfo?.full_name}</p>
                <p className="text-white/40 text-xs capitalize">
                  {userInfo?.roles?.join(', ')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with tabs for admin */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin ? (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
              >
                <UserCog className="h-4 w-4 mr-2" />
                Gestión de Usuarios
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <DashboardContent 
                userInfo={userInfo} 
                modules={modules}
                isAdmin={isAdmin}
                isManager={isManager}
                isSales={isSales}
                isTech={isTech}
                userId={userId}
              />
            </TabsContent>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          </Tabs>
        ) : (
          <DashboardContent 
            userInfo={userInfo} 
            modules={modules}
            isAdmin={isAdmin}
            isManager={isManager}
            isSales={isSales}
            isTech={isTech}
            userId={userId}
          />
        )}
      </main>
    </div>
  );
};

// Extracted dashboard content component
const DashboardContent = ({ 
  userInfo, 
  modules, 
  isAdmin, 
  isManager, 
  isSales, 
  isTech,
  userId,
}: {
  userInfo: UserInfo | null;
  modules: any[];
  isAdmin: boolean | undefined;
  isManager: boolean | undefined;
  isSales: boolean | undefined;
  isTech: boolean | undefined;
  userId: string | undefined;
}) => {
  return (
    <>
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-white mb-2">
          Bienvenido, {userInfo?.full_name?.split(' ')[0]}
        </h2>
        <p className="text-white/50">
          ¿Qué quieres hacer hoy?
        </p>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3 mb-8"
      >
        {(isAdmin || isManager || isSales) && (
          <Button className="bg-white text-black hover:bg-white/90">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Lead
          </Button>
        )}
        {(isAdmin || isManager || isSales) && (
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Presupuesto
          </Button>
        )}
        {(isAdmin || isManager || isTech) && (
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Proyecto
          </Button>
        )}
      </motion.div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.filter(m => m.available).map((module, index) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <button
              className={`w-full p-6 rounded-xl border ${module.borderColor} bg-gradient-to-br ${module.color} hover:border-white/40 transition-all group text-left`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                {module.count !== null && (
                  <span className="text-white/40 text-sm font-medium">
                    {module.count}
                  </span>
                )}
              </div>
              <h3 className="text-white font-semibold mb-1">{module.title}</h3>
              <p className="text-white/50 text-sm">{module.description}</p>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Coming soon notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <p className="text-white/30 text-sm">
          Los módulos están en desarrollo. Próximamente más funcionalidades.
        </p>
      </motion.div>
    </>
  );
};

export default Dashboard;
