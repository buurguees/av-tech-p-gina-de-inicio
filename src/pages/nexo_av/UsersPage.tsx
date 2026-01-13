import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import UserManagement from "./components/UserManagement";

const UsersPage = () => {
  const { userId } = useParams<{ userId: string }>();
  
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full">
      <div className="w-[90%] max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserManagement />
      </div>
    </div>
  );
};

export default UsersPage;
