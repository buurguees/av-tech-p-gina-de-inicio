import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Boxes, Loader2, Wrench } from 'lucide-react';
import NexoHeader from './components/NexoHeader';
import ProductsTab from './components/catalog/ProductsTab';
import PacksTab from './components/catalog/PacksTab';

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

  const isAdmin = userInfo?.roles?.includes('admin') || false;

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

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger 
              value="products" 
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/60"
            >
              <Package className="w-4 h-4 mr-2" />
              Productos
            </TabsTrigger>
            <TabsTrigger 
              value="services"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/60"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Servicios
            </TabsTrigger>
            <TabsTrigger 
              value="packs"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/60"
            >
              <Boxes className="w-4 h-4 mr-2" />
              Packs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsTab isAdmin={isAdmin} filterType="product" />
          </TabsContent>

          <TabsContent value="services">
            <ProductsTab isAdmin={isAdmin} filterType="service" />
          </TabsContent>

          <TabsContent value="packs">
            <PacksTab isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
