/**
 * CatalogPageMobile
 * 
 * Versión optimizada para móviles de la página de catálogo.
 * Diseñada para consulta rápida de productos y packs en campo.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TabsContent } from '@/components/ui/tabs';
import { Package, Boxes, Loader2 } from 'lucide-react';
import ProductsTab from '../components/catalog/ProductsTab';
import PacksTab from '../components/catalog/PacksTab';
import DetailTabsMobile from '../components/mobile/DetailTabsMobile';
import MobileBottomNav from '../components/MobileBottomNav';
import { NexoLogo } from '../components/NexoHeader';

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  job_position: string;
  department: string;
  roles: string[];
}

export default function CatalogPageMobile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState("products");

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <main className="px-3 py-3">
        <DetailTabsMobile
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={[
            { value: "products", label: "Productos", icon: Package },
            { value: "packs", label: "Packs", icon: Boxes },
          ]}
        >
          <TabsContent value="products" className="mt-3">
            <ProductsTab isAdmin={isAdmin} filterType="product" />
          </TabsContent>

          <TabsContent value="packs" className="mt-3">
            <PacksTab isAdmin={isAdmin} />
          </TabsContent>
        </DetailTabsMobile>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
}
