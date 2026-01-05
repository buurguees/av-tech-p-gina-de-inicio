import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserAvatarDropdownProps {
  fullName: string;
  email: string;
  userId: string;
  onLogout: () => void;
}

const UserAvatarDropdown = ({ fullName, email, userId, onLogout }: UserAvatarDropdownProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: fullName,
  });
  const { toast } = useToast();

  // Get initials from full name (first letter of first name + first letter of first surname)
  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(fullName);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Update in Supabase using service role via edge function or direct update
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No session found");
      }

      // Call edge function to update user info
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://takvthfatlcjsqgssnta.supabase.co'}/functions/v1/admin-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'update_own_info',
            userId: userId,
            full_name: editForm.full_name,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error updating user info');
      }

      toast({
        title: "Información actualizada",
        description: "Tu información ha sido actualizada correctamente.",
      });

      setIsEditDialogOpen(false);
      // Reload to reflect changes
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la información.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-white/30">
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-zinc-900 border-white/10 text-white z-[100]"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{fullName}</p>
            <p className="text-xs text-white/50">{email}</p>
          </div>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={() => setIsEditDialogOpen(true)}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Editar información</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={onLogout}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-red-400"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Editar información</DialogTitle>
            <DialogDescription className="text-white/60">
              Actualiza tu información personal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">Email</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-white/5 border-white/10 text-white/50"
                />
                <p className="text-xs text-white/40">El email no se puede cambiar.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-white/80">Nombre completo</Label>
                <Input
                  id="full_name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white focus:border-white/30"
                  placeholder="Tu nombre completo"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-white text-black hover:bg-white/90"
              >
                {isLoading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserAvatarDropdown;
