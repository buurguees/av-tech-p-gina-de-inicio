import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import CreateClientDialog from "../components/clients/CreateClientDialog";
import DashboardView from "../components/dashboard/DashboardView";

const Dashboard = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  
  // Get user info for admin check
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        if (!error && data && data.length > 0) {
          const user = data[0];
          setIsAdmin(user.roles?.includes('admin') || false);
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };
    fetchUserInfo();
  }, []);

  return (
    <>
      <DashboardView userId={userId} />
      
      <CreateClientDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
        onSuccess={() => {
          toast({
            title: "Cliente creado",
            description: "El cliente se ha creado correctamente.",
          });
        }}
        currentUserId={userId || null}
        isAdmin={isAdmin}
      />
    </>
  );
};


export default Dashboard;
