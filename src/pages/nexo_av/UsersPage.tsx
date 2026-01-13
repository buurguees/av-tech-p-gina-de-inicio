import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import UserManagement from "./components/UserManagement";
import NexoHeader, { NexoLogo } from "./components/NexoHeader";
import { useNexoAvTheme } from "./hooks/useNexoAvTheme";

const UsersPage = () => {
  const { userId } = useParams<{ userId: string }>();
  
  // Apply nexo-av theme
  useNexoAvTheme();
  
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
      <NexoHeader 
        title="Gestión de Usuarios" 
        userId={userId || ''} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserManagement />
      </main>
    </div>
  );
};

export default UsersPage;
