import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Settings2, FileText, Tags, Receipt, Loader2 } from "lucide-react";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import { CompanyDataTab } from "../components/settings/CompanyDataTab";
import { PreferencesTab } from "../components/settings/PreferencesTab";
import { TemplatesTab } from "../components/settings/TemplatesTab";
import { TaxesTab } from "../components/settings/TaxesTab";
import { ProductCategoriesTab } from "../components/settings/ProductCategoriesTab";
import TabNav, { TabItem } from "../components/navigation/TabNav";

interface UserInfo {
  user_id: string;
  roles: string[];
}

const SETTINGS_TABS: TabItem[] = [
  { value: "company", label: "Datos de la Empresa", icon: Building2 },
  { value: "preferences", label: "Preferencias", icon: Settings2 },
  { value: "categories", label: "Categorías", icon: Tags },
  { value: "taxes", label: "Impuestos", icon: Receipt },
  { value: "templates", label: "Plantillas", icon: FileText },
];

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "company":
        return <CompanyDataTab />;
      case "preferences":
        return <PreferencesTab />;
      case "categories":
        return <ProductCategoriesTab />;
      case "taxes":
        return <TaxesTab />;
      case "templates":
        return <TemplatesTab />;
      default:
        return <CompanyDataTab />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6">
      {/* Tab Navigation */}
      <TabNav
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pt-4">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default SettingsPageDesktop;
