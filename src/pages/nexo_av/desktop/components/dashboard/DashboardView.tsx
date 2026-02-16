import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import AdminDashboard from "./roles/AdminDashboard";
import ManagerDashboard from "./roles/ManagerDashboard";
import CommercialDashboard from "./roles/CommercialDashboard";
import TechnicianDashboard from "./roles/TechnicianDashboard";

interface DashboardViewProps {
  userId: string | undefined;
}

const DashboardView = ({ userId }: DashboardViewProps) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data, error } = await supabase.rpc("get_current_user_info");
        if (!error && data && data.length > 0) {
          const roles: string[] = data[0].roles || [];
          // Priority: admin > manager > comercial > tecnico
          if (roles.includes("admin")) setUserRole("admin");
          else if (roles.includes("manager")) setUserRole("manager");
          else if (roles.includes("comercial")) setUserRole("comercial");
          else if (roles.includes("tecnico")) setUserRole("tecnico");
          else setUserRole("admin"); // fallback
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setUserRole("admin"); // fallback
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col p-4 space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  switch (userRole) {
    case "admin":
      return <AdminDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "comercial":
      return <CommercialDashboard />;
    case "tecnico":
      return <TechnicianDashboard />;
    default:
      return <AdminDashboard />;
  }
};

export default DashboardView;
