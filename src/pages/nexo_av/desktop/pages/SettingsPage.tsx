import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Settings2, FileText, Tags, Receipt, Loader2 } from "lucide-react";
import { useNexoAvTheme } from "../../hooks/useNexoAvTheme";
import { CompanyDataTab } from "../components/settings/CompanyDataTab";
import { PreferencesTab } from "../components/settings/PreferencesTab";
import { TemplatesTab } from "../components/settings/TemplatesTab";
import { TaxesTab } from "../components/settings/TaxesTab";
import { ProductCategoriesTab } from "../components/settings/ProductCategoriesTab";

interface UserInfo {
  user_id: string;
  roles: string[];
}

function SettingsPageDesktop() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(true);

  // Apply nexo-av theme
  useNexoAvTheme();

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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
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
    </div>
  );
}

export default SettingsPageDesktop;
