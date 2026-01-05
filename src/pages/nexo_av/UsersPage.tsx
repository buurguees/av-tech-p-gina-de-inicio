import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import UserManagement from "./components/UserManagement";

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

const UsersPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/nexo-av');
          return;
        }

        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error || !data || data.length === 0) {
          navigate('/nexo-av');
          return;
        }

        const currentUserInfo = data[0];

        // Verify URL user_id matches authenticated user
        if (userId && userId !== currentUserInfo.user_id) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // Check if user is admin
        if (!currentUserInfo.roles?.includes('admin')) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        setIsAdmin(true);
        setLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/nexo-av');
      }
    };

    checkAuth();
  }, [navigate, userId]);

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acceso Denegado</h1>
          <p className="text-white/60">No tienes permiso para acceder a este recurso.</p>
          <Button 
            onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
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

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <NexoLogo />
              <div>
                <h1 className="text-white font-semibold tracking-wide">Gestión de Usuarios</h1>
                <p className="text-white/40 text-xs">NEXO AV</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserManagement />
      </main>
    </div>
  );
};

export default UsersPage;
