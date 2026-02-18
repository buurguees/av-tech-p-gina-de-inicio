import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Package, Boxes, Wrench } from 'lucide-react';
import DetailNavigationBar from '../components/navigation/DetailNavigationBar';
import TabNav, { TabItem } from '../components/navigation/TabNav';
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

const TABS: TabItem[] = [
  { value: "products", label: "Productos", icon: Package },
  { value: "services", label: "Servicios", icon: Wrench },
  { value: "packs", label: "Packs", icon: Boxes },
];

function CatalogPageDesktop() {
  const { userId } = useParams<{ userId: string }>();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState("products");

  const isAdmin = userInfo?.roles?.includes('admin') || false;
  const isManager = userInfo?.roles?.includes('manager') || false;

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
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle="Catálogo"
        backPath={userId ? `/nexo-av/${userId}/dashboard` : undefined}
        contextInfo="Productos · Servicios · Packs"
      />

      <TabNav
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 h-full flex flex-col">
          {activeTab === "products" && (
            <ProductsTab isAdmin={isAdmin || isManager} filterType="product" />
          )}
          {activeTab === "services" && (
            <ProductsTab isAdmin={isAdmin || isManager} filterType="service" />
          )}
          {activeTab === "packs" && (
            <PacksTab isAdmin={isAdmin || isManager} />
          )}
        </div>
      </div>
    </div>
  );
}

export default CatalogPageDesktop;
