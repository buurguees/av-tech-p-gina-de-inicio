import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Tags, Receipt, FileText, Loader2, Settings2 } from 'lucide-react';
import NexoHeader from './components/NexoHeader';
import { CompanyDataTab } from './components/settings/CompanyDataTab';
import { ProductCategoriesTab } from './components/settings/ProductCategoriesTab';
import { TaxesTab } from './components/settings/TaxesTab';
import { TemplatesTab } from './components/settings/TemplatesTab';
import { PreferencesTab } from './components/settings/PreferencesTab';
import { useIsMobile } from '@/hooks/use-mobile';
import { lazy, Suspense } from 'react';

// Lazy load mobile tabs
const DetailTabsMobile = lazy(() => import('./components/mobile/DetailTabsMobile'));

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  job_position: string;
  department: string;
  roles: string[];
}

export default function SettingsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState("company");

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

          // Check if user is admin
          if (!user.roles?.includes('admin')) {
            navigate(`/nexo-av/${userId}/dashboard`);
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
        title="Configuración"
        userId={userId || ''}
        showBack
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isMobile ? (
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white"></div>
            </div>
          }>
            <DetailTabsMobile
              value={activeTab}
              onValueChange={setActiveTab}
              tabs={[
                { value: "company", label: "Empresa", icon: Building2 },
                { value: "preferences", label: "Preferencias", icon: Settings2 },
                { value: "categories", label: "Categorías", icon: Tags },
                { value: "taxes", label: "Impuestos", icon: Receipt },
                { value: "templates", label: "Plantillas", icon: FileText },
              ]}
            >
            <TabsContent value="company" className="mt-6">
              <CompanyDataTab />
            </TabsContent>

            <TabsContent value="preferences" className="mt-6">
              <PreferencesTab />
            </TabsContent>

            <TabsContent value="categories" className="mt-6">
              <ProductCategoriesTab />
            </TabsContent>

            <TabsContent value="taxes" className="mt-6">
              <TaxesTab />
            </TabsContent>

            <TabsContent value="templates" className="mt-6">
              <TemplatesTab />
            </TabsContent>
            </DetailTabsMobile>
          </Suspense>
        ) : (
          <Tabs defaultValue="company" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger 
                value="company" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Datos de la Empresa
              </TabsTrigger>
              <TabsTrigger 
                value="preferences" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Preferencias
              </TabsTrigger>
              <TabsTrigger 
                value="categories" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                <Tags className="w-4 h-4 mr-2" />
                Categorías de Producto
              </TabsTrigger>
              <TabsTrigger 
                value="taxes" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Impuestos
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                <FileText className="w-4 h-4 mr-2" />
                Plantillas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <CompanyDataTab />
            </TabsContent>

            <TabsContent value="preferences">
              <PreferencesTab />
            </TabsContent>

            <TabsContent value="categories">
              <ProductCategoriesTab />
            </TabsContent>

            <TabsContent value="taxes">
              <TaxesTab />
            </TabsContent>

            <TabsContent value="templates">
              <TemplatesTab />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
