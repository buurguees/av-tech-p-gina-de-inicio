import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import UserManagement from "../components/users/UserManagement";

const UsersPage = () => {
  const { userId } = useParams<{ userId: string }>();

  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full h-full p-6">
      <UserManagement />
    </div>
  );
};

export default UsersPage;
