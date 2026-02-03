import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Boxes, Wrench } from 'lucide-react';
import DetailNavigationBar from '../components/navigation/DetailNavigationBar';
import ProductsTab from '../components/catalog/ProductsTab';
import PacksTab from '../components/catalog/PacksTab';


interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  job_position: string;
  department: string;
  roles: string[];
}

function CatalogPageDesktop() {
  const { userId } = useParams<{ userId: string }>();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState("products");

  const isAdmin = userInfo?.roles?.includes('admin') || false;

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setUserInfo(data[0]);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6">
      <div className="w-full h-full flex flex-col overflow-hidden">
        <DetailNavigationBar
          pageTitle="Catálogo"
          backPath={userId ? `/nexo-av/${userId}/dashboard` : undefined}
          contextInfo="Productos · Servicios · Packs"
        />
        <div className="flex flex-col flex-1 min-h-0 mt-4">
          <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="bg-muted/60 border border-border rounded-xl p-1.5 h-10 w-full max-w-md grid grid-cols-3 flex-shrink-0">
              <TabsTrigger value="products" className="rounded-lg gap-2">
                <Package className="w-4 h-4 shrink-0" />
                Productos
              </TabsTrigger>
              <TabsTrigger value="services" className="rounded-lg gap-2">
                <Wrench className="w-4 h-4 shrink-0" />
                Servicios
              </TabsTrigger>
              <TabsTrigger value="packs" className="rounded-lg gap-2">
                <Boxes className="w-4 h-4 shrink-0" />
                Packs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden data-[state=inactive]:hidden">
              <ProductsTab isAdmin={isAdmin} filterType="product" />
            </TabsContent>

            <TabsContent value="services" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden data-[state=inactive]:hidden">
              <ProductsTab isAdmin={isAdmin} filterType="service" />
            </TabsContent>

            <TabsContent value="packs" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden data-[state=inactive]:hidden">
              <PacksTab isAdmin={isAdmin} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default CatalogPageDesktop;
