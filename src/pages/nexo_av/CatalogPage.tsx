import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Loader2 } from 'lucide-react';
import NexoHeader from './components/NexoHeader';

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  job_position: string;
  department: string;
  roles: string[];
}

export default function CatalogPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/nexo-av');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const user = data[0];
          
          if (user.user_id !== userId) {
            navigate('/nexo-av');
            return;
          }
          
          setUserInfo(user);
        } else {
          navigate('/nexo-av');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        navigate('/nexo-av');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <NexoHeader
        title="Catálogo"
        userId={userId || ''}
        showBack
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Catálogo de Productos
            </CardTitle>
            <CardDescription className="text-white/60">
              Gestiona tu catálogo de productos con precios, costes e impuestos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-white/40 text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Próximamente...</p>
              <p className="text-sm mt-2">
                Aquí podrás ver y gestionar todos los productos del catálogo con exportación a Excel.
              </p>
              <p className="text-sm mt-1 text-orange-400">
                Primero configura las categorías en Configuración → Categorías de Producto
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
